const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Invoice = require("../models/Invoice");
const PaymentEvent = require("../models/PaymentEvent");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");

const {
  getCompanyProfile,
  validateLiveIssuanceProfile,
} = require("../config/companyProfile");
const {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  calculateInvoicePricing,
  createOrReconcileInvoiceForBooking,
} = require("../services/invoiceService");
const {
  renderInvoiceHtml,
  generateInvoicePdfBuffer,
  ensureInvoicePdfFile,
} = require("../services/pdfService");
const { sendInvoiceEmail, sendRefundEmail } = require("../services/emailService");
const {
  prepareWhatsAppPreview,
  sendOrPrepareWhatsAppRefund,
  processWhatsAppWebhookPayload,
  isWhatsAppConfigured,
} = require("../services/whatsappService");
const { getGatewayAdapter } = require("../services/paymentGatewayAdapter");

module.exports = function invoiceRoutes({ authMiddleware, adminMiddleware }) {
  const router = express.Router();

  const isProduction = () => process.env.NODE_ENV === "production";

  function assertSimulatorAllowed(res) {
    if (isProduction()) {
      res.status(403).json({
        success: false,
        message: "Test Payment Simulator is disabled in production.",
      });
      return false;
    }
    return true;
  }

  async function resolvePdfBuffer(invoice) {
    if (invoice.pdfStorage?.relativePath) {
      const fullPath = path.join(__dirname, "..", invoice.pdfStorage.relativePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath);
      }
    }
    // Deterministic regeneration from immutable invoice snapshot if ephemeral disk reset
    const generated = await ensureInvoicePdfFile(invoice);
    return generated.buffer;
  }

  // =========================================================================
  // 3. ADMIN: List & Filter Invoices
  // =========================================================================
  router.get(
    "/api/admin/invoices",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const { search, status, trip, dateFrom, dateTo, environment } = req.query;
        const query = {};

        if (environment === "test" || environment === "live") {
          query.environment = environment;
        }
        if (status && status !== "all") {
          query.paymentStatus = status;
        }
        if (trip && trip !== "all") {
          query["tripSnapshot.title"] = { $regex: trip, $options: "i" };
        }
        if (dateFrom || dateTo) {
          query.issuedAt = {};
          if (dateFrom) query.issuedAt.$gte = new Date(dateFrom);
          if (dateTo) {
            const end = new Date(dateTo);
            end.setHours(23, 59, 59, 999);
            query.issuedAt.$lte = end;
          }
        }
        if (search && search.trim()) {
          const rx = new RegExp(search.trim(), "i");
          query.$or = [
            { invoiceNumber: rx },
            { bookingCode: rx },
            { "customerSnapshot.name": rx },
            { "customerSnapshot.email": rx },
            { "tripSnapshot.title": rx },
          ];
        }

        const invoices = await Invoice.find(query)
          .sort({ issuedAt: -1 })
          .limit(200);

        res.json({
          success: true,
          invoices,
          companyProfileCheck: validateLiveIssuanceProfile(),
        });
      } catch (err) {
        console.error("List invoices error:", err);
        res.status(500).json({
          success: false,
          message: "Failed to fetch invoices.",
        });
      }
    }
  );

  // =========================================================================
  // 4. ADMIN: Single Invoice Details, HTML Preview & PDF Download
  // =========================================================================
  router.get(
    "/api/admin/invoices/:id",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
          return res.status(404).json({ success: false, message: "Invoice not found." });
        }
        const paymentEvents = await PaymentEvent.find({
          bookingId: invoice.bookingId,
        }).sort({ occurredAt: 1 });

        res.json({
          success: true,
          invoice,
          paymentEvents,
          htmlPreview: renderInvoiceHtml(invoice),
        });
      } catch (err) {
        res.status(500).json({ success: false, message: "Failed to load invoice." });
      }
    }
  );

  router.get(
    "/api/admin/invoices/:id/html",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
          return res.status(404).send("Invoice not found");
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.send(renderInvoiceHtml(invoice));
      } catch (err) {
        res.status(500).send("Failed to render invoice preview");
      }
    }
  );

  router.get(
    "/api/admin/invoices/:id/pdf",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
          return res.status(404).json({ success: false, message: "Invoice not found." });
        }
        const buffer = await resolvePdfBuffer(invoice);
        const downloadName = `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${downloadName}"`
        );
        res.send(buffer);
      } catch (err) {
        console.error("Admin PDF download error:", err);
        res.status(500).json({ success: false, message: "Failed to generate PDF." });
      }
    }
  );

  // =========================================================================
  // 5. ADMIN: Retry Email & Retry WhatsApp (Idempotent — never creates duplicate invoice)
  // =========================================================================
  router.post(
    "/api/admin/invoices/:id/resend-email",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
          return res.status(404).json({ success: false, message: "Invoice not found." });
        }
        const buffer = await resolvePdfBuffer(invoice);
        const fileName = `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`;
        const emailResult = await sendInvoiceEmail({
          invoice,
          pdfBuffer: buffer,
          pdfFileName: fileName,
        });

        invoice.auditTrail.push({
          action: "email.retry",
          actorEmail: req.currentUser?.email || "",
          actorRole: req.currentUser?.role || "",
          note: `Email retry status: ${emailResult.status}`,
        });
        await invoice.save();

        res.json({
          success: true,
          emailResult,
          invoice,
        });
      } catch (err) {
        res.status(500).json({ success: false, message: "Failed to resend email." });
      }
    }
  );

  router.post(
    "/api/admin/invoices/:id/retry-whatsapp",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
          return res.status(404).json({ success: false, message: "Invoice not found." });
        }
        const buffer = await resolvePdfBuffer(invoice);
        const fileName = `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`;
        const whatsappPreview = await prepareWhatsAppPreview({
          invoice,
          baseUrl: req.headers.origin,
          pdfBuffer: buffer,
          pdfFileName: fileName,
          allowRetry: true,
          optInConfirmed: Boolean(req.body?.optInConfirmed),
        });

        res.json({
          success: true,
          whatsappPreview,
          invoice,
        });
      } catch (err) {
        res.status(500).json({
          success: false,
          message: "Failed to prepare WhatsApp notification.",
        });
      }
    }
  );

  // =========================================================================
  // 6. ADMIN: Record Refund / Cancellation Adjustment (Preserves immutable invoice)
  // =========================================================================
  router.post(
    "/api/admin/invoices/:id/refund",
    authMiddleware,
    adminMiddleware,
    async (req, res) => {
      try {
        const activeProvider = (process.env.PAYMENT_GATEWAY_PROVIDER || "").trim();
        if (!activeProvider || activeProvider === "simulator") {
          if (isProduction()) {
            return res.status(403).json({
              success: false,
              message:
                "Live payment gateway is not connected. Real bank refunds cannot be submitted in production.",
            });
          }
        }

        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
          return res.status(404).json({ success: false, message: "Invoice not found." });
        }

        if (!activeProvider || activeProvider === "simulator") {
          if (!invoice.isSample) {
            return res.status(403).json({
              success: false,
              message:
                "Without a live payment gateway, refund simulation is restricted to sample/test invoices only.",
            });
          }
        }

        const refundPaise = rupeesToPaise(req.body.refundAmount || 0);
        if (refundPaise <= 0 || refundPaise > invoice.pricing.netPaidPaise) {
          return res.status(400).json({
            success: false,
            message: `Refund amount must be between ₹1 and ${formatINR(
              invoice.pricing.netPaidPaise
            )}.`,
          });
        }

        const isFullRefund = refundPaise === invoice.pricing.netPaidPaise;
        const adapter = getGatewayAdapter(activeProvider || "simulator");
        const isSimulated = adapter.providerName === "simulator";
        const refundEventData = await adapter.processRefundEvent({
          bookingId: invoice.bookingId,
          amountPaise: refundPaise,
          fullRefund: isFullRefund,
        });

        await PaymentEvent.create({
          ...refundEventData,
          environment: invoice.environment,
          isSimulated: isSimulated || invoice.isSample,
          bookingId: invoice.bookingId,
          bookingCode: invoice.bookingCode,
          invoiceId: invoice._id,
          notes: isSimulated
            ? `[DEV SIMULATOR — No bank refund submitted] ${req.body.reason || "Simulated refund test"}`
            : req.body.reason || "Admin recorded refund",
          createdBy: req.currentUser?._id || null,
        });

        const updatedInvoice = await createOrReconcileInvoiceForBooking({
          bookingId: invoice.bookingId,
          environment: invoice.environment,
          isSample: invoice.isSample,
          actor: {
            email: req.currentUser?.email || "",
            role: req.currentUser?.role || "",
          },
        });
        const refundRef = refundEventData.providerRefundId || refundEventData.eventId;
        updatedInvoice.refundSettlement = {
          status: "Initiated",
          initiatedAt: new Date(),
          creditedAt: null,
          refundReference: refundRef,
          gatewayEventId: refundEventData.eventId || "",
        };
        await updatedInvoice.save();

        const { buffer, fileName } = await ensureInvoicePdfFile(updatedInvoice);

        const emailResult = await sendRefundEmail({
          invoice: updatedInvoice,
          pdfBuffer: buffer,
          pdfFileName: fileName,
          stage: "initiated",
          refundAmountPaise: refundPaise,
          refundReference: refundRef,
          reason: req.body?.reason || "",
        });

        const whatsappResult = await sendOrPrepareWhatsAppRefund({
          invoice: updatedInvoice,
          stage: "initiated",
          refundAmountPaise: refundPaise,
          refundReference: refundRef,
          baseUrl: req.headers.origin,
        });

        res.json({
          success: true,
          simulated: isSimulated,
          message: isSimulated
            ? `[DEV SIMULATOR] Simulated refund of ${formatINR(refundPaise)} initiated (no real bank refund submitted). Email: ${emailResult.status} • WhatsApp: ${whatsappResult.status}.`
            : `Refund of ${formatINR(refundPaise)} submitted to payment gateway. Email: ${emailResult.status} • WhatsApp: ${whatsappResult.status}.`,
          invoice: updatedInvoice,
          emailResult,
          whatsappResult,
        });
      } catch (err) {
        res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || "Failed to record refund.",
        });
      }
    }
  );

  /**
   * Shared idempotent handler for "Refund Credited" settlement events.
   * Called automatically by the Payment Gateway / Bank webhook in production,
   * or by the localhost simulator button during development testing.
   */
  async function processRefundCreditedSettlement({
    invoice,
    refundReference = "",
    gatewayEventId = "",
    actor = { email: "gateway-webhook", role: "system" },
  }) {
    if (!invoice.pricing?.refundedAmountPaise || invoice.pricing.refundedAmountPaise <= 0) {
      const err = new Error("No refund has been initiated on this invoice yet.");
      err.statusCode = 400;
      throw err;
    }

    // Idempotency guard: do not send duplicate completed emails for the same settlement event
    if (
      invoice.refundSettlement?.status === "Credited" &&
      gatewayEventId &&
      invoice.refundSettlement?.gatewayEventId === gatewayEventId
    ) {
      return {
        alreadyProcessed: true,
        invoice,
        emailResult: { status: invoice.emailDelivery?.status || "Accepted by Provider" },
      };
    }

    const latestRefundEvent = await PaymentEvent.findOne({
      bookingId: invoice.bookingId,
      paymentType: "Refund",
    }).sort({ occurredAt: -1 });

    const finalRef =
      refundReference ||
      invoice.refundSettlement?.refundReference ||
      latestRefundEvent?.providerRefundId ||
      latestRefundEvent?.eventId ||
      "";

    invoice.refundSettlement = {
      status: "Credited",
      initiatedAt: invoice.refundSettlement?.initiatedAt || latestRefundEvent?.occurredAt || new Date(),
      creditedAt: new Date(),
      refundReference: finalRef,
      gatewayEventId: gatewayEventId || invoice.refundSettlement?.gatewayEventId || "",
    };

    const { buffer, fileName } = await ensureInvoicePdfFile(invoice);

    const emailResult = await sendRefundEmail({
      invoice,
      pdfBuffer: buffer,
      pdfFileName: fileName,
      stage: "completed",
      refundAmountPaise: invoice.pricing.refundedAmountPaise,
      refundReference: finalRef,
    });

    const whatsappResult = await sendOrPrepareWhatsAppRefund({
      invoice,
      stage: "completed",
      refundAmountPaise: invoice.pricing.refundedAmountPaise,
      refundReference: finalRef,
      pdfBuffer: buffer,
      pdfFileName: fileName,
    });

    invoice.auditTrail.push({
      action: "refund.credited",
      actorEmail: actor.email || "system",
      actorRole: actor.role || "system",
      note: `Bank/gateway refund credited (${formatINR(
        invoice.pricing.refundedAmountPaise
      )}). Email: ${emailResult.status} • WhatsApp: ${whatsappResult.status} (Ref: ${finalRef})`,
    });
    await invoice.save();

    return { alreadyProcessed: false, invoice, emailResult, whatsappResult };
  }

  // Automatic Gateway / Bank Webhook Endpoint for Refund Settlement
  router.post("/api/payments/webhook/:provider", async (req, res) => {
    try {
      const { provider } = req.params;
      if (provider === "simulator") {
        return res.status(403).json({
          success: false,
          message: "Use admin simulator routes in development only.",
        });
      }

      const adapter = getGatewayAdapter(provider);
      const normalizedEvent = await adapter.verifyWebhook(req);
      if (!normalizedEvent?.verified) {
        return res.status(401).json({
          success: false,
          message: "Unverified payment gateway webhook event.",
        });
      }

      if (
        normalizedEvent.paymentType === "Refund" &&
        (normalizedEvent.status === "refunded" || normalizedEvent.status === "partially_refunded")
      ) {
        const invoice = await Invoice.findOne({
          $or: [
            ...(normalizedEvent.bookingId ? [{ bookingId: normalizedEvent.bookingId }] : []),
            ...(normalizedEvent.providerRefundId
              ? [{ "refundSettlement.refundReference": normalizedEvent.providerRefundId }]
              : []),
          ],
        });

        if (!invoice) {
          return res.status(404).json({ success: false, message: "Matching invoice not found." });
        }

        const result = await processRefundCreditedSettlement({
          invoice,
          refundReference: normalizedEvent.providerRefundId || normalizedEvent.eventId,
          gatewayEventId: normalizedEvent.eventId,
          actor: { email: `webhook:${provider}`, role: "gateway" },
        });

        return res.json({
          success: true,
          alreadyProcessed: result.alreadyProcessed,
          emailStatus: result.emailResult?.status,
        });
      }

      return res.json({ success: true, ignored: true });
    } catch (err) {
      console.error("Payment webhook error:", err);
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || "Webhook verification failed.",
      });
    }
  });

  // =========================================================================
  // 7. CUSTOMER MY TRIPS: Authenticated Ownership-Protected Invoice Access
  // =========================================================================
  async function verifyCustomerOwnsInvoice(req, invoice) {
    if (!invoice) {
      return false;
    }
    if (isProduction() && (invoice.isSample || invoice.environment !== "live")) {
      return false;
    }
    const userId = req.currentUser?._id ? String(req.currentUser._id) : null;
    const userEmail = (req.currentUser?.email || "").toLowerCase().trim();

    if (invoice.customerId && userId && String(invoice.customerId) === userId) {
      return true;
    }
    if (
      userEmail &&
      invoice.customerSnapshot?.email &&
      invoice.customerSnapshot.email.toLowerCase().trim() === userEmail
    ) {
      return true;
    }
    if (invoice.bookingId) {
      const booking = await Booking.findById(invoice.bookingId);
      if (booking) {
        if (booking.customerId && userId && String(booking.customerId) === userId) {
          return true;
        }
        if (
          userEmail &&
          booking.email &&
          booking.email.toLowerCase().trim() === userEmail
        ) {
          return true;
        }
      }
    }
    return false;
  }

  router.get("/api/customer/invoices", authMiddleware, async (req, res) => {
    try {
      const userId = req.currentUser?._id;
      const userEmail = (req.currentUser?.email || "").toLowerCase().trim();

      const ownershipOr = [];
      if (userId) ownershipOr.push({ customerId: userId });
      if (userEmail) ownershipOr.push({ "customerSnapshot.email": userEmail });

      if (ownershipOr.length === 0) {
        return res.json({ success: true, invoices: [] });
      }

      const envFilter = isProduction()
        ? { isSample: false, environment: "live" }
        : { environment: { $in: ["test", "live"] } };

      const invoices = await Invoice.find({
        ...envFilter,
        $or: ownershipOr,
      }).sort({ issuedAt: -1 });

      res.json({
        success: true,
        invoices: invoices.map((inv) => ({
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          bookingId: inv.bookingId,
          bookingCode: inv.bookingCode,
          tripTitle: inv.tripSnapshot?.title,
          travelDate: inv.tripSnapshot?.travelDate,
          totalPayablePaise: inv.pricing?.totalPayablePaise,
          netPaidPaise: inv.pricing?.netPaidPaise,
          balanceDuePaise: inv.pricing?.balanceDuePaise,
          paymentStatus: inv.paymentStatus,
          issuedAt: inv.issuedAt,
        })),
      });
    } catch (err) {
      console.error("Customer invoices list error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to load your invoices.",
      });
    }
  });

  router.get("/api/customer/invoices/:id/pdf", authMiddleware, async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      const allowed = await verifyCustomerOwnsInvoice(req, invoice);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to access this invoice.",
        });
      }
      const buffer = await resolvePdfBuffer(invoice);
      const downloadName = `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${downloadName}"`
      );
      res.send(buffer);
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to download invoice." });
    }
  });

  router.get("/api/customer/invoices/:id/html", authMiddleware, async (req, res) => {
    try {
      const invoice = await Invoice.findById(req.params.id);
      const allowed = await verifyCustomerOwnsInvoice(req, invoice);
      if (!allowed) {
        return res.status(403).send("Unauthorized");
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderInvoiceHtml(invoice));
    } catch (err) {
      res.status(500).send("Failed to render invoice");
    }
  });

  // Meta WhatsApp Cloud API webhook verification
  router.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expectedToken = (process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim();

    if (mode === "subscribe" && expectedToken && token === expectedToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
  });

  // Meta WhatsApp Cloud API delivery status webhook (sent, delivered, read, failed)
  router.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const appSecret = (process.env.META_APP_SECRET || "").trim();
      if (process.env.NODE_ENV === "production" && !appSecret) {
        console.error("[WhatsApp Webhook] META_APP_SECRET is missing in production.");
        return res.status(403).json({ success: false, message: "Webhook secret not configured." });
      }
      if (appSecret) {
        const sigHeader = String(req.headers["x-hub-signature-256"] || "");
        const rawBuf = Buffer.isBuffer(req.rawBody)
          ? req.rawBody
          : Buffer.from(JSON.stringify(req.body || {}), "utf8");
        const expectedSig =
          "sha256=" +
          crypto.createHmac("sha256", appSecret).update(rawBuf).digest("hex");

        const sigBuf = Buffer.from(sigHeader, "utf8");
        const expBuf = Buffer.from(expectedSig, "utf8");
        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          return res.status(401).json({ success: false, message: "Invalid webhook signature." });
        }
      }

      const updates = await processWhatsAppWebhookPayload(req.body);
      return res.status(200).json({ success: true, processed: updates.length, updates });
    } catch (err) {
      console.error("[WhatsApp Webhook] Error:", err);
      return res.status(500).json({ success: false, message: "Webhook processing error." });
    }
  });

  return router;
};

