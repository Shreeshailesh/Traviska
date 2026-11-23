const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");
const Coupon = require("../models/Coupon");
const Invoice = require("../models/Invoice");
const BookingRequest = require("../models/BookingRequest");
const NotificationOutbox = require("../models/NotificationOutbox");
const {
  POLICY_VERSION,
  calculateCancellationRefund,
  calculateRescheduleBreakdown,
  OFFICIAL_CANCELLATION_POLICY,
} = require("../services/cancellationPolicyService");
const {
  queueAndSendEmail,
  queueAndSendWhatsApp,
  sendStaffAlertEmail,
  deliverOutboxEmail,
  deliverOutboxWhatsApp,
} = require("../services/notificationOutboxService");
const { getGatewayAdapter } = require("../services/paymentGatewayAdapter");
const { rupeesToPaise } = require("../services/invoiceService");
const { renderCustomerEmail } = require("../services/emailTemplateService");
const { getPolicyAttachmentFilename } = require("../services/policyPdfService");

function formatReqCode() {
  return `REQ-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function formatISTDate(d) {
  if (!d) return "TBA";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return String(d);
  return parsed.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getPaidRupees(booking, invoice) {
  if (invoice?.pricing?.netPaidPaise !== undefined) {
    return Math.round(Number(invoice.pricing.netPaidPaise) / 100);
  }
  if (booking?.paymentStatus === "Paid") {
    return Math.round(Number(booking.total || 0));
  }
  return 0;
}

module.exports = function cancellationRescheduleRoutes({ authMiddleware, adminMiddleware }) {
  const router = express.Router();

  // =========================================================================
  // PUBLIC POLICY ENDPOINT
  // =========================================================================
  router.get("/api/policy/cancellation", (_req, res) => {
    res.json({ success: true, policy: OFFICIAL_CANCELLATION_POLICY });
  });

  // =========================================================================
  // CUSTOMER ROUTES (Firebase / Customer JWT verified + Ownership verified)
  // =========================================================================
  async function loadOwnedBooking(bookingId, currentUser) {
    if (!mongoose.isValidObjectId(bookingId)) return { error: { code: 400, msg: "Invalid booking ID" } };
    const booking = await Booking.findById(bookingId);
    if (!booking) return { error: { code: 404, msg: "Booking not found" } };

    const isOwner =
      (booking.customerId && currentUser?._id && String(booking.customerId) === String(currentUser._id)) ||
      (booking.email && currentUser?.email && booking.email.toLowerCase() === currentUser.email.toLowerCase());

    if (!isOwner) {
      return { error: { code: 403, msg: "You are not authorized to access this booking" } };
    }
    return { booking };
  }

  // Customer: List own BookingRequests (proposals, cancellation/reschedule tracking)
  router.get("/api/customer/booking-requests", authMiddleware, async (req, res) => {
    try {
      const bookings = await Booking.find({
        $or: [
          { customerId: req.currentUser?._id },
          ...(req.currentUser?.email ? [{ email: req.currentUser.email.toLowerCase() }] : []),
        ],
      })
        .select("_id")
        .lean();
      const bookingIds = bookings.map((b) => b._id);
      const requests = await BookingRequest.find({ bookingId: { $in: bookingIds } })
        .sort({ createdAt: -1 })
        .lean();
      res.json({ success: true, requests });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to load booking requests" });
    }
  });

  // Customer: Cancellation refund preview
  router.get("/api/customer/bookings/:id/cancellation-preview", authMiddleware, async (req, res) => {
    try {
      const { booking, error } = await loadOwnedBooking(req.params.id, req.currentUser);
      if (error) return res.status(error.code).json({ success: false, message: error.msg });

      const [slot, invoice] = await Promise.all([
        booking.slotId ? TripSlot.findById(booking.slotId).lean() : null,
        Invoice.findOne({ bookingId: booking._id }).lean(),
      ]);

      const amountPaidRupees = getPaidRupees(booking, invoice);
      const preview = calculateCancellationRefund({
        amountPaidRupees,
        departureDate: slot?.date || booking.date,
        source: "Customer",
      });

      res.json({
        success: true,
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        bookingState: booking.bookingState || booking.status,
        policyVersion: booking.policyVersion || POLICY_VERSION,
        preview,
        policy: OFFICIAL_CANCELLATION_POLICY,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to compute cancellation preview" });
    }
  });

  // Customer: Cancel Booking (idempotent, server-recalculated, atomic seat release)
  router.post("/api/customer/bookings/:id/cancel", authMiddleware, async (req, res) => {
    const { reason = "Change of travel plans", explanation = "", idempotencyKey } = req.body || {};
    const { booking, error } = await loadOwnedBooking(req.params.id, req.currentUser);
    if (error) return res.status(error.code).json({ success: false, message: error.msg });

    if (idempotencyKey) {
      const existingReq = await BookingRequest.findOne({ idempotencyKey: String(idempotencyKey) });
      if (existingReq) {
        return res.json({ success: true, duplicatePrevented: true, booking, request: existingReq });
      }
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "This booking is already cancelled." });
    }

    const session = await mongoose.startSession();
    let createdRequest = null;
    let preview = null;

    try {
      session.startTransaction();

      const freshBooking = await Booking.findById(booking._id).session(session);
      if (!freshBooking || freshBooking.status === "Cancelled") {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "This booking is already cancelled." });
      }

      const [slot, invoice] = await Promise.all([
        freshBooking.slotId ? TripSlot.findById(freshBooking.slotId).session(session) : null,
        Invoice.findOne({ bookingId: freshBooking._id }).session(session),
      ]);

      const amountPaidRupees = getPaidRupees(freshBooking, invoice);
      preview = calculateCancellationRefund({
        amountPaidRupees,
        departureDate: slot?.date || freshBooking.date,
        source: "Customer",
      });

      const wasConfirmed = freshBooking.status === "Confirmed";
      const pax = Number(freshBooking.travellers) || 1;

      if (wasConfirmed && freshBooking.slotId) {
        await TripSlot.findOneAndUpdate(
          { _id: freshBooking.slotId, bookedSlots: { $gte: pax } },
          { $inc: { bookedSlots: -pax } },
          { new: true, session }
        );
      }

      if (wasConfirmed && freshBooking.couponCode) {
        await Coupon.updateOne(
          { code: freshBooking.couponCode, usageCount: { $gt: 0 } },
          { $inc: { usageCount: -1 } },
          { session }
        );
      }

      freshBooking.status = "Cancelled";
      freshBooking.bookingState = "Cancelled";
      freshBooking.cancellationSource = "Customer";
      freshBooking.cancelledAt = new Date();
      freshBooking.cancelledBy = req.currentUser?.email || "Customer";
      freshBooking.cancellationReason = String(reason || "Customer cancelled").trim();
      freshBooking.cancellationNotes = String(explanation || "").trim();
      freshBooking.customerFacingReason = String(reason || "Customer cancelled").trim();
      freshBooking.refundAmount = preview.eligibleRefundRupees;
      freshBooking.refundStatus = preview.eligibleRefundRupees > 0 ? "Pending" : "None";
      freshBooking.refundState =
        preview.eligibleRefundRupees > 0 ? "Pending Admin Approval" : "Not Applicable";
      await freshBooking.save({ session });

      createdRequest = await BookingRequest.create(
        [
          {
            requestCode: formatReqCode(),
            bookingId: freshBooking._id,
            bookingCode: freshBooking.bookingCode || "",
            customerId: freshBooking.customerId || req.currentUser?._id || null,
            customerSnapshot: {
              name: freshBooking.name || "",
              email: freshBooking.email || "",
              phone: freshBooking.phone || "",
            },
            tripTitle: freshBooking.trip?.title || "",
            requestType: preview.eligibleRefundRupees > 0 ? "ManualRefundAction" : "CustomerCancel",
            status: preview.eligibleRefundRupees > 0 ? "Pending Review" : "Completed",
            reason: freshBooking.cancellationReason,
            customerExplanation: freshBooking.cancellationNotes,
            oldSlotId: freshBooking.slotId,
            oldDate: formatISTDate(slot?.date || freshBooking.date),
            travellers: pax,
            eligibleRefundAmount: preview.eligibleRefundRupees,
            refundPercentage: preview.refundPercentage,
            amountPaidRupees,
            cancellationFeeRupees: preview.cancellationFeeRupees,
            cancellationSource: "Customer",
            originalPaymentMethod: freshBooking.paymentMethod || "Razorpay",
            gatewayTransactionRef: freshBooking.paymentId || freshBooking.orderId || freshBooking.paymentReference || "",
            policyVersion: freshBooking.policyVersion || POLICY_VERSION,
            refundState: preview.eligibleRefundRupees > 0 ? "Pending Admin Approval" : "Not Applicable",
            idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
            auditHistory: [
              {
                action: "Customer Cancelled Booking",
                actor: req.currentUser?.email || "Customer",
                note: `${preview.tierLabel}. Eligible refund: ₹${preview.eligibleRefundRupees} (${preview.eligibleRefundRupees > 0 ? "Pending Admin Approval" : "Not Applicable"}).`,
              },
            ],
          },
        ],
        { session }
      );

      await session.commitTransaction();

      // Fire notifications safely outside transaction
      const reqDoc = createdRequest[0];
      const baseUrl = (process.env.PUBLIC_WEBSITE_URL || "https://traviska.com").replace(/\/+$/, "");
      const policyFile = getPolicyAttachmentFilename(freshBooking.policyVersion || POLICY_VERSION);
      const cancelEmail = renderCustomerEmail({
        eyebrow: "BOOKING UPDATE",
        statusLabel: freshBooking.refundState,
        statusTone: preview.eligibleRefundRupees > 0 ? "warning" : "neutral",
        title: "Booking Cancellation Confirmed",
        customerName: freshBooking.name || "Traveller",
        introParagraphs: [
          `Your booking ${freshBooking.bookingCode} for ${freshBooking.trip?.title} has been cancelled.`,
        ],
        details: [
          { label: "Booking ID", value: freshBooking.bookingCode },
          { label: "Trip", value: freshBooking.trip?.title || "Traviska Trip" },
          { label: "Departure Date", value: formatISTDate(slot?.date || freshBooking.date) },
          { label: "Reason", value: freshBooking.cancellationReason },
          { label: "Amount Paid", value: `₹${amountPaidRupees.toLocaleString("en-IN")}` },
          { label: "Cancellation Charge", value: `₹${preview.cancellationFeeRupees.toLocaleString("en-IN")}` },
          { label: "Eligible Refund", value: `₹${preview.eligibleRefundRupees.toLocaleString("en-IN")} (${preview.refundPercentage}%)`, highlight: true },
        ],
        nextStepsBody:
          preview.eligibleRefundRupees > 0
            ? "Your refund entitlement has been recorded and is awaiting Admin payout approval. You will receive an update once initiated."
            : "Per the applicable cancellation policy (<72 hours before departure), no refund is due for this cancellation.",
        ctaLabel: "View My Trips",
        ctaUrl: `${baseUrl}/customer/dashboard`,
        policyAttachmentName: policyFile,
        policyAttachmentNote: "Please find the applicable Cancellation, Refund & Rescheduling Policy attached for your reference.",
      });
      await queueAndSendEmail({
        audience: "customer",
        eventType: "CustomerBookingCancelled",
        bookingId: freshBooking._id,
        requestId: reqDoc._id,
        recipient: freshBooking.email,
        subject: `Traviska — Booking Cancelled (${freshBooking.bookingCode})`,
        textBody: cancelEmail.text,
        htmlBody: cancelEmail.html,
        attachPolicyVersion: freshBooking.policyVersion || POLICY_VERSION,
        idempotencyKey: `cust-cancel-email:${freshBooking._id}`,
      });

      await queueAndSendWhatsApp({
        booking: freshBooking,
        eventType: "CustomerBookingCancelled",
        requestId: reqDoc._id,
        templateName: process.env.WHATSAPP_CANCELLED_TEMPLATE_NAME || "traviska_booking_cancelled",
        templateParams: [
          freshBooking.name || "Traveller",
          freshBooking.bookingCode || String(freshBooking._id),
          freshBooking.trip?.title || "Traviska Trip",
          formatISTDate(slot?.date || freshBooking.date),
          freshBooking.customerFacingReason || freshBooking.cancellationReason || "Cancelled by customer",
          `₹${preview.eligibleRefundRupees} (${freshBooking.refundState})`,
        ],
        idempotencyKey: `cust-cancel-wa:${freshBooking._id}`,
      });

      await sendStaffAlertEmail({
        eventType: preview.eligibleRefundRupees > 0 ? "Cancellation & Refund Pending Action" : "Customer Booking Cancelled",
        booking: freshBooking,
        request: reqDoc,
        summaryText: `Customer cancelled (${freshBooking.cancellationReason}). Eligible refund: ₹${preview.eligibleRefundRupees} (${preview.refundPercentage}%).`,
        idempotencyKeyPrefix: `staff-cancel:${freshBooking._id}`,
      });

      return res.json({
        success: true,
        message: "Booking cancelled successfully.",
        booking: freshBooking,
        preview,
        request: reqDoc,
      });
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(500).json({ success: false, message: err.message || "Failed to cancel booking" });
    } finally {
      await session.endSession();
    }
  });

  // Customer: Available reschedule dates + price breakdown
  router.get("/api/customer/bookings/:id/reschedule-options", authMiddleware, async (req, res) => {
    try {
      const { booking, error } = await loadOwnedBooking(req.params.id, req.currentUser);
      if (error) return res.status(error.code).json({ success: false, message: error.msg });

      const currentSlot = booking.slotId ? await TripSlot.findById(booking.slotId).lean() : null;
      const pax = Number(booking.travellers) || 1;
      const oldUnitPrice = Number(booking.trip?.price) || 0;

      let candidateSlots = [];
      if (currentSlot?.trip) {
        candidateSlots = await TripSlot.find({
          trip: currentSlot.trip,
          _id: { $ne: currentSlot._id },
          isClosed: false,
          date: { $gt: new Date() },
        })
          .populate("trip", "title price pickupLocations")
          .sort({ date: 1 })
          .lean();
      }

      const options = candidateSlots
        .filter((s) => (Number(s.totalSlots) || 0) - (Number(s.bookedSlots) || 0) >= pax)
        .map((s) => {
          const newUnitPrice = Number(s.trip?.price) || oldUnitPrice;
          const breakdown = calculateRescheduleBreakdown({
            departureDate: currentSlot?.date || booking.date,
            travellers: pax,
            priorRescheduleCount: booking.rescheduleCount || 0,
            oldUnitPrice,
            newUnitPrice,
          });
          return {
            slotId: s._id,
            date: s.date,
            formattedDate: formatISTDate(s.date),
            availableSlots: (Number(s.totalSlots) || 0) - (Number(s.bookedSlots) || 0),
            breakdown,
          };
        });

      res.json({ success: true, options, policy: OFFICIAL_CANCELLATION_POLICY });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to load reschedule options" });
    }
  });

  // Customer: Request Reschedule (durable BookingRequest + staff alert; moves seats only when approved/executed)
  router.post("/api/customer/bookings/:id/reschedule-request", authMiddleware, async (req, res) => {
    try {
      const { targetSlotId, reason = "Schedule conflict", explanation = "", idempotencyKey } = req.body || {};
      const { booking, error } = await loadOwnedBooking(req.params.id, req.currentUser);
      if (error) return res.status(error.code).json({ success: false, message: error.msg });

      if (booking.status !== "Confirmed") {
        return res.status(400).json({ success: false, message: "Only confirmed bookings can be rescheduled." });
      }
      if (!mongoose.isValidObjectId(targetSlotId)) {
        return res.status(400).json({ success: false, message: "Please select a valid target departure." });
      }
      if (idempotencyKey) {
        const existing = await BookingRequest.findOne({ idempotencyKey: String(idempotencyKey) });
        if (existing) return res.json({ success: true, duplicatePrevented: true, request: existing, booking });
      }

      const [oldSlot, targetSlot] = await Promise.all([
        booking.slotId ? TripSlot.findById(booking.slotId).lean() : null,
        TripSlot.findById(targetSlotId).populate("trip").lean(),
      ]);

      if (!targetSlot || targetSlot.isClosed) {
        return res.status(400).json({ success: false, message: "Selected departure is closed or unavailable." });
      }

      const pax = Number(booking.travellers) || 1;
      const avail = (Number(targetSlot.totalSlots) || 0) - (Number(targetSlot.bookedSlots) || 0);
      if (avail < pax) {
        return res.status(409).json({ success: false, message: "Not enough seats available on the selected departure." });
      }

      const breakdown = calculateRescheduleBreakdown({
        departureDate: oldSlot?.date || booking.date,
        travellers: pax,
        priorRescheduleCount: booking.rescheduleCount || 0,
        oldUnitPrice: Number(booking.trip?.price) || 0,
        newUnitPrice: Number(targetSlot.trip?.price) || Number(booking.trip?.price) || 0,
      });

      const requestDoc = await BookingRequest.create({
        requestCode: formatReqCode(),
        bookingId: booking._id,
        bookingCode: booking.bookingCode || "",
        customerId: booking.customerId || req.currentUser?._id || null,
        customerSnapshot: { name: booking.name || "", email: booking.email || "", phone: booking.phone || "" },
        tripTitle: booking.trip?.title || "",
        requestType: "CustomerReschedule",
        status: "Pending Review",
        reason: String(reason).trim(),
        customerExplanation: String(explanation).trim(),
        oldSlotId: booking.slotId,
        oldDate: formatISTDate(oldSlot?.date || booking.date),
        proposedSlotId: targetSlot._id,
        proposedDate: formatISTDate(targetSlot.date),
        travellers: pax,
        rescheduleFee: breakdown.rescheduleFeeTotal,
        priceDifference: breakdown.priceDifferenceTotal,
        idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
        auditHistory: [
          {
            action: "Customer Requested Reschedule",
            actor: req.currentUser?.email || "Customer",
            note: `Requested move to ${formatISTDate(targetSlot.date)}. Fee: ₹${breakdown.rescheduleFeeTotal}.`,
          },
        ],
      });

      booking.bookingState = "Reschedule Requested";
      await booking.save();

      const websiteBaseUrl = (process.env.PUBLIC_WEBSITE_URL || "https://traviska.com").replace(/\/+$/, "");
      const reschedReqPolicyFile = getPolicyAttachmentFilename(booking.policyVersion || POLICY_VERSION);
      const reschedReqDetails = [
        { label: "Booking ID", value: booking.bookingCode || String(booking._id) },
        { label: "Trip", value: booking.trip?.title || "Traviska Trip" },
        { label: "Current Departure", value: requestDoc.oldDate },
        { label: "Requested Departure", value: requestDoc.proposedDate, highlight: true },
        { label: "Reason", value: requestDoc.reason },
        { label: "Reschedule Fee", value: `₹${Number(breakdown.rescheduleFeeTotal || 0).toLocaleString("en-IN")}` },
      ];
      if (Number(breakdown.priceDifferenceTotal || 0) !== 0) {
        reschedReqDetails.push({
          label: "Fare Difference",
          value: `₹${Number(breakdown.priceDifferenceTotal).toLocaleString("en-IN")}`,
        });
      }
      const reschedReqEmail = renderCustomerEmail({
        eyebrow: "RESCHEDULE REQUEST",
        statusLabel: "Pending Review",
        statusTone: "warning",
        title: "Reschedule Request Received",
        customerName: booking.name || "Traveller",
        introParagraphs: [
          `We have received your reschedule request for ${booking.trip?.title || "your trip"} (${booking.bookingCode}).`,
          "Your original seats remain reserved while our operations team reviews availability and your request.",
        ],
        details: reschedReqDetails,
        nextStepsBody:
          "Our team will review your request and send you an update shortly once it is approved or if any action is needed.",
        ctaLabel: "View My Trips",
        ctaUrl: `${websiteBaseUrl}/customer/dashboard`,
        policyAttachmentName: reschedReqPolicyFile,
        policyAttachmentNote:
          "Please find the applicable Cancellation, Refund & Rescheduling Policy attached for your reference.",
      });
      await queueAndSendEmail({
        audience: "customer",
        eventType: "CustomerRescheduleRequestReceived",
        bookingId: booking._id,
        requestId: requestDoc._id,
        recipient: booking.email,
        subject: `Traviska — Reschedule Request Received (${booking.bookingCode})`,
        textBody: reschedReqEmail.text,
        htmlBody: reschedReqEmail.html,
        attachPolicyVersion: booking.policyVersion || POLICY_VERSION,
        idempotencyKey: `cust-resched-req-email:${requestDoc._id}`,
      });

      await queueAndSendWhatsApp({
        booking,
        eventType: "CustomerRescheduleRequestReceived",
        requestId: requestDoc._id,
        templateName: process.env.WHATSAPP_RESCHEDULE_REQ_TEMPLATE_NAME || "traviska_reschedule_request_received",
        templateParams: [
          booking.name || "Traveller",
          booking.bookingCode || String(booking._id),
          booking.trip?.title || "Traviska Trip",
          requestDoc.proposedDate,
        ],
        idempotencyKey: `cust-resched-req-wa:${requestDoc._id}`,
      });

      await sendStaffAlertEmail({
        eventType: "Customer Reschedule Request",
        booking,
        request: requestDoc,
        summaryText: `Requested move from ${requestDoc.oldDate} to ${requestDoc.proposedDate}. Reschedule Fee: ₹${breakdown.rescheduleFeeTotal}, Price Diff: ₹${breakdown.priceDifferenceTotal}.`,
        idempotencyKeyPrefix: `staff-resched:${requestDoc._id}`,
      });

      res.status(201).json({ success: true, request: requestDoc, booking, breakdown });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message || "Failed to submit reschedule request" });
    }
  });

  // Customer: Decide on Company-Initiated Reschedule Proposal (Accept New Date OR Request 100% Refund)
  router.post("/api/customer/bookings/:id/reschedule-decision", authMiddleware, async (req, res) => {
    const { decision, requestId, idempotencyKey } = req.body || {};
    if (!["Accept New Date", "Request 100% Refund"].includes(decision)) {
      return res.status(400).json({ success: false, message: "Invalid reschedule decision." });
    }

    const { booking, error } = await loadOwnedBooking(req.params.id, req.currentUser);
    if (error) return res.status(error.code).json({ success: false, message: error.msg });

    const proposalQuery = requestId
      ? { _id: requestId, bookingId: booking._id, requestType: "CompanyRescheduleProposal" }
      : { bookingId: booking._id, requestType: "CompanyRescheduleProposal", status: "Awaiting Customer Response" };

    const proposal = await BookingRequest.findOne(proposalQuery);
    if (!proposal) {
      return res.status(404).json({ success: false, message: "No active reschedule proposal found." });
    }

    if (
      proposal.status !== "Awaiting Customer Response" ||
      (proposal.customerDecision && proposal.customerDecision !== "None")
    ) {
      return res.status(409).json({
        success: false,
        message: `This proposal has already been completed (${proposal.customerDecision}).`,
      });
    }

    if (idempotencyKey && proposal.idempotencyKey === String(idempotencyKey)) {
      return res.json({ success: true, duplicatePrevented: true, proposal, booking });
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const freshProposal = await BookingRequest.findById(proposal._id).session(session);
      const freshBooking = await Booking.findById(booking._id).session(session);

      if (freshProposal.status !== "Awaiting Customer Response") {
        await session.abortTransaction();
        return res.status(409).json({ success: false, message: "Proposal already processed." });
      }

      const pax = Number(freshBooking.travellers) || 1;

      if (decision === "Accept New Date") {
        const reservedNew = await TripSlot.findOneAndUpdate(
          {
            _id: freshProposal.proposedSlotId,
            isClosed: false,
            $expr: { $gte: [{ $subtract: ["$totalSlots", "$bookedSlots"] }, pax] },
          },
          { $inc: { bookedSlots: pax } },
          { new: true, session }
        );
        if (!reservedNew) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            message: "Proposed departure no longer has enough seats. You may choose 100% Refund instead.",
          });
        }

        if (freshBooking.slotId) {
          await TripSlot.findOneAndUpdate(
            { _id: freshBooking.slotId, bookedSlots: { $gte: pax } },
            { $inc: { bookedSlots: -pax } },
            { new: true, session }
          );
        }

        freshBooking.slotId = reservedNew._id;
        freshBooking.date = formatISTDate(reservedNew.date);
        freshBooking.isRescheduled = true;
        freshBooking.rescheduledAt = new Date();
        freshBooking.rescheduledFrom = freshProposal.oldDate;
        freshBooking.rescheduleReason = freshProposal.reason || "Traviska departure change accepted";
        freshBooking.bookingState = "Rescheduled";
        freshBooking.rescheduleHistory.push({
          previousSlotId: freshProposal.oldSlotId,
          previousDate: freshProposal.oldDate,
          newSlotId: reservedNew._id,
          newDate: formatISTDate(reservedNew.date),
          reason: freshProposal.reason || "Company reschedule accepted by customer",
          rescheduledBy: req.currentUser?.email || "Customer",
        });

        freshProposal.customerDecision = "Accept New Date";
        freshProposal.decisionAt = new Date();
        freshProposal.status = "Completed";
        freshProposal.auditHistory.push({
          action: "Customer Accepted New Date",
          actor: req.currentUser?.email || "Customer",
          note: `Moved ${pax} seat(s) to ${formatISTDate(reservedNew.date)} with ₹0 fee.`,
        });
      } else {
        // Request 100% Refund
        if (freshBooking.status === "Confirmed" && freshBooking.slotId) {
          await TripSlot.findOneAndUpdate(
            { _id: freshBooking.slotId, bookedSlots: { $gte: pax } },
            { $inc: { bookedSlots: -pax } },
            { new: true, session }
          );
        }

        const invoice = await Invoice.findOne({ bookingId: freshBooking._id }).session(session);
        const fullPaid = getPaidRupees(freshBooking, invoice);

        freshBooking.status = "Cancelled";
        freshBooking.bookingState = "Cancelled";
        freshBooking.cancellationSource = "Traviska";
        freshBooking.cancelledAt = new Date();
        freshBooking.cancelledBy = req.currentUser?.email || "Customer (Proposal Decline)";
        freshBooking.cancellationReason = "Declined company reschedule — 100% refund requested";
        freshBooking.refundAmount = fullPaid;
        freshBooking.refundStatus = fullPaid > 0 ? "Pending" : "None";
        freshBooking.refundState = fullPaid > 0 ? "Pending Admin Approval" : "Not Applicable";

        freshProposal.customerDecision = "Request 100% Refund";
        freshProposal.decisionAt = new Date();
        freshProposal.status = "Completed";
        freshProposal.eligibleRefundAmount = fullPaid;
        freshProposal.refundPercentage = 100;
        freshProposal.auditHistory.push({
          action: "Customer Requested 100% Refund",
          actor: req.currentUser?.email || "Customer",
          note: `Booking cancelled under company reschedule guarantee. 100% refund entitlement: ₹${fullPaid} (Pending Admin Approval).`,
        });

        if (fullPaid > 0) {
          await BookingRequest.create(
            [
              {
                requestCode: formatReqCode(),
                bookingId: freshBooking._id,
                bookingCode: freshBooking.bookingCode || "",
                customerId: freshBooking.customerId || null,
                customerSnapshot: {
                  name: freshBooking.name || "",
                  email: freshBooking.email || "",
                  phone: freshBooking.phone || "",
                },
                tripTitle: freshBooking.trip?.title || "",
                requestType: "ManualRefundAction",
                status: "Pending Review",
                reason: freshBooking.cancellationReason,
                customerExplanation: "Customer selected 100% refund after company departure reschedule.",
                oldSlotId: freshProposal.oldSlotId,
                oldDate: freshProposal.oldDate,
                travellers: pax,
                amountPaidRupees: fullPaid,
                cancellationFeeRupees: 0,
                eligibleRefundAmount: fullPaid,
                refundPercentage: 100,
                cancellationSource: "Traviska",
                originalPaymentMethod: freshBooking.paymentMethod || "Razorpay",
                gatewayTransactionRef: freshBooking.paymentId || freshBooking.orderId || "",
                policyVersion: freshBooking.policyVersion || POLICY_VERSION,
                refundState: "Pending Admin Approval",
                auditHistory: [
                  {
                    action: "Refund Approval Task Created (100% Company Reschedule Guarantee)",
                    actor: req.currentUser?.email || "Customer",
                    note: `Eligible refund: ₹${fullPaid}. Awaiting Admin approval.`,
                  },
                ],
              },
            ],
            { session }
          );
        }
      }

      await freshBooking.save({ session });
      await freshProposal.save({ session });
      await session.commitTransaction();

      const decisionEmail = renderCustomerEmail({
        eyebrow: "RESCHEDULE DECISION",
        statusLabel: decision === "Accept New Date" ? "Confirmed" : freshBooking.refundState,
        statusTone: decision === "Accept New Date" ? "success" : "warning",
        title: decision === "Accept New Date" ? "New Departure Confirmed" : "100% Refund Requested",
        customerName: freshBooking.name || "Traveller",
        introParagraphs: [
          decision === "Accept New Date"
            ? `Thank you for confirming. Your booking ${freshBooking.bookingCode} has been moved to the new departure date with ₹0 rescheduling fee.`
            : `Your booking ${freshBooking.bookingCode} has been cancelled with ₹0 cancellation fee under Traviska's 100% refund guarantee.`,
        ],
        details: [
          { label: "Booking ID", value: freshBooking.bookingCode },
          { label: "Trip", value: freshBooking.trip?.title || "Traviska Trip" },
          { label: "Original Date", value: freshProposal.oldDate },
          ...(decision === "Accept New Date"
            ? [{ label: "Confirmed New Date", value: freshProposal.proposedDate, highlight: true }]
            : [{ label: "100% Eligible Refund", value: `₹${Number(freshBooking.refundAmount || 0).toLocaleString("en-IN")}`, highlight: true }]),
        ],
        nextStepsBody:
          decision === "Accept New Date"
            ? "Your seats are confirmed on the new departure. View updated itinerary details in My Trips."
            : "Your 100% refund request is awaiting Admin payout approval.",
        ctaLabel: "View My Trips",
        ctaUrl: "https://traviska.com/customer/dashboard",
        policyAttachmentName: getPolicyAttachmentFilename(freshBooking.policyVersion || POLICY_VERSION),
      });
      await queueAndSendEmail({
        audience: "customer",
        eventType:
          decision === "Accept New Date"
            ? "CompanyRescheduleAccepted"
            : "CompanyRescheduleRefundRequested",
        bookingId: freshBooking._id,
        requestId: freshProposal._id,
        recipient: freshBooking.email,
        subject:
          decision === "Accept New Date"
            ? `Traviska — New Departure Confirmed (${freshBooking.bookingCode})`
            : `Traviska — 100% Refund Requested (${freshBooking.bookingCode})`,
        textBody: decisionEmail.text,
        htmlBody: decisionEmail.html,
        attachPolicyVersion: freshBooking.policyVersion || POLICY_VERSION,
        idempotencyKey: `cust-decision-email:${freshProposal._id}:${decision}`,
      });

      await sendStaffAlertEmail({
        eventType: `Company Reschedule — ${decision}`,
        booking: freshBooking,
        request: freshProposal,
        summaryText: `Customer chose "${decision}" for proposal ${freshProposal.requestCode}.`,
        idempotencyKeyPrefix: `staff-decision:${freshProposal._id}:${decision}`,
      });

      return res.json({ success: true, booking: freshBooking, proposal: freshProposal });
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(500).json({ success: false, message: err.message || "Failed to process decision" });
    } finally {
      await session.endSession();
    }
  });

  // =========================================================================
  // ADMIN ROUTES
  // =========================================================================
  router.get("/api/admin/booking-requests", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { type, status, search } = req.query;
      const filter = {};
      if (type && type !== "ALL") filter.requestType = type;
      if (status && status !== "ALL") filter.status = status;
      if (search && String(search).trim()) {
        const rx = new RegExp(String(search).trim(), "i");
        filter.$or = [
          { requestCode: rx },
          { bookingCode: rx },
          { tripTitle: rx },
          { "customerSnapshot.name": rx },
          { "customerSnapshot.email": rx },
        ];
      }

      const [requests, allRequests, failedNotifications] = await Promise.all([
        BookingRequest.find(filter).sort({ createdAt: -1 }).lean(),
        BookingRequest.find({}).select("requestType status isReadByAdmin").lean(),
        NotificationOutbox.find({ status: "Failed" }).sort({ createdAt: -1 }).limit(50).lean(),
      ]);

      const counts = {
        total: allRequests.length,
        unread: allRequests.filter((r) => !r.isReadByAdmin).length,
        pendingCancellations: allRequests.filter(
          (r) => r.requestType === "CustomerCancel" && r.status === "Pending Review"
        ).length,
        pendingReschedules: allRequests.filter(
          (r) => r.requestType === "CustomerReschedule" && r.status === "Pending Review"
        ).length,
        awaitingCustomer: allRequests.filter(
          (r) => r.requestType === "CompanyRescheduleProposal" && r.status === "Awaiting Customer Response"
        ).length,
        pendingRefunds: allRequests.filter(
          (r) => r.requestType === "ManualRefundAction" && r.status === "Pending Review"
        ).length,
        failedNotifications: failedNotifications.length,
      };

      res.json({ success: true, requests, counts, failedNotifications });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to load booking requests" });
    }
  });

  router.post("/api/admin/booking-requests/mark-all-read", authMiddleware, adminMiddleware, async (_req, res) => {
    await BookingRequest.updateMany({ isReadByAdmin: false }, { $set: { isReadByAdmin: true } });
    res.json({ success: true });
  });

  router.post("/api/admin/booking-requests/:id/mark-read", authMiddleware, adminMiddleware, async (req, res) => {
    await BookingRequest.findByIdAndUpdate(req.params.id, { $set: { isReadByAdmin: true } });
    res.json({ success: true });
  });

  // Admin: Approve / Reject Customer Reschedule or Cancellation Request
  router.post("/api/admin/booking-requests/:id/review", authMiddleware, adminMiddleware, async (req, res) => {
    const { action, internalNotes = "" } = req.body || {};
    if (!["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be approve or reject" });
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const requestDoc = await BookingRequest.findById(req.params.id).session(session);
      if (!requestDoc) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Request not found" });
      }
      if (["Completed", "Rejected"].includes(requestDoc.status)) {
        await session.abortTransaction();
        return res.status(409).json({ success: false, message: "Request already finalized" });
      }

      const booking = await Booking.findById(requestDoc.bookingId).session(session);
      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Associated booking not found" });
      }

      if (action === "approve" && requestDoc.requestType === "CustomerReschedule") {
        const pax = Number(booking.travellers) || 1;
        const reservedNew = await TripSlot.findOneAndUpdate(
          {
            _id: requestDoc.proposedSlotId,
            isClosed: false,
            $expr: { $gte: [{ $subtract: ["$totalSlots", "$bookedSlots"] }, pax] },
          },
          { $inc: { bookedSlots: pax } },
          { new: true, session }
        );
        if (!reservedNew) {
          await session.abortTransaction();
          return res.status(409).json({ success: false, message: "Target slot no longer has enough seats" });
        }
        if (booking.slotId) {
          await TripSlot.findOneAndUpdate(
            { _id: booking.slotId, bookedSlots: { $gte: pax } },
            { $inc: { bookedSlots: -pax } },
            { new: true, session }
          );
        }
        booking.slotId = reservedNew._id;
        booking.date = formatISTDate(reservedNew.date);
        booking.isRescheduled = true;
        booking.rescheduledAt = new Date();
        booking.rescheduledFrom = requestDoc.oldDate;
        booking.rescheduleCount = (booking.rescheduleCount || 0) + 1;
        booking.rescheduleFeeCharged = (booking.rescheduleFeeCharged || 0) + (requestDoc.rescheduleFee || 0);
        booking.bookingState = "Rescheduled";
        booking.rescheduleHistory.push({
          previousSlotId: requestDoc.oldSlotId,
          previousDate: requestDoc.oldDate,
          newSlotId: reservedNew._id,
          newDate: formatISTDate(reservedNew.date),
          reason: requestDoc.reason,
          rescheduledBy: req.user?.email || "Admin",
        });
      } else if (action === "reject" && requestDoc.requestType === "CustomerReschedule") {
        booking.bookingState = "Confirmed";
      }

      requestDoc.status = action === "approve" ? "Completed" : "Rejected";
      requestDoc.reviewedBy = req.user?.email || "Admin";
      requestDoc.reviewedAt = new Date();
      requestDoc.isReadByAdmin = true;
      if (internalNotes) requestDoc.internalNotes = internalNotes;
      requestDoc.auditHistory.push({
        action: `Admin ${action === "approve" ? "Approved" : "Rejected"}`,
        actor: req.user?.email || "Admin",
        note: internalNotes || "",
      });

      await booking.save({ session });
      await requestDoc.save({ session });
      await session.commitTransaction();

      if (requestDoc.requestType === "CustomerReschedule") {
        const isApproved = action === "approve";
        const reviewEmail = renderCustomerEmail({
          eyebrow: "RESCHEDULE UPDATE",
          statusLabel: isApproved ? "Confirmed" : "Declined",
          statusTone: isApproved ? "success" : "danger",
          title: isApproved ? "Reschedule Confirmed" : "Reschedule Request Declined",
          customerName: booking.name || "Traveller",
          introParagraphs: [
            isApproved
              ? `Your reschedule request for ${booking.trip?.title} (${booking.bookingCode}) has been approved.`
              : `Your reschedule request for ${booking.trip?.title} (${booking.bookingCode}) could not be approved. Your original departure remains confirmed.`,
          ],
          details: [
            { label: "Booking ID", value: booking.bookingCode },
            { label: "Trip", value: booking.trip?.title || "Traviska Trip" },
            { label: "Original Date", value: requestDoc.oldDate },
            ...(isApproved ? [{ label: "New Confirmed Date", value: requestDoc.proposedDate, highlight: true }] : []),
            { label: "Reason", value: requestDoc.reason || "—" },
          ],
          nextStepsBody: isApproved
            ? "Your seats have been moved to the new departure date. View details in My Trips."
            : "Your original booking and seats remain active. Contact admin@traviska.com for assistance.",
          ctaLabel: "View My Trips",
          ctaUrl: "https://traviska.com/customer/dashboard",
          policyAttachmentName: getPolicyAttachmentFilename(booking.policyVersion || POLICY_VERSION),
        });
        await queueAndSendEmail({
          audience: "customer",
          eventType: isApproved ? "CustomerRescheduleApproved" : "CustomerRescheduleRejected",
          bookingId: booking._id,
          requestId: requestDoc._id,
          recipient: booking.email,
          subject: isApproved
            ? `Traviska — Reschedule Confirmed (${booking.bookingCode})`
            : `Traviska — Reschedule Request Update (${booking.bookingCode})`,
          textBody: reviewEmail.text,
          htmlBody: reviewEmail.html,
          attachPolicyVersion: booking.policyVersion || POLICY_VERSION,
          idempotencyKey: `cust-resched-review-email:${requestDoc._id}:${action}`,
        });

        await queueAndSendWhatsApp({
          booking,
          eventType: isApproved ? "CustomerRescheduleApproved" : "CustomerRescheduleRejected",
          requestId: requestDoc._id,
          templateName: isApproved
            ? process.env.WHATSAPP_RESCHEDULE_CONFIRMED_TEMPLATE_NAME || "traviska_reschedule_confirmed"
            : process.env.WHATSAPP_RESCHEDULE_REJECTED_TEMPLATE_NAME || "traviska_reschedule_rejected",
          templateParams: isApproved
            ? [
                booking.name || "Traveller",
                booking.bookingCode || String(booking._id),
                booking.trip?.title || "Traviska Trip",
                requestDoc.proposedDate,
              ]
            : [
                booking.name || "Traveller",
                booking.bookingCode || String(booking._id),
                booking.trip?.title || "Traviska Trip",
                requestDoc.reason || "Operational constraints",
                requestDoc.oldDate,
              ],
          idempotencyKey: `cust-resched-review-wa:${requestDoc._id}:${action}`,
        });
      }

      return res.json({ success: true, request: requestDoc, booking });
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(500).json({ success: false, message: err.message || "Failed to review request" });
    } finally {
      await session.endSession();
    }
  });

  // Admin: Propose Reschedule for an individual booking (requires customer Accept / 100% Refund)
  router.post("/api/admin/bookings/:id/propose-reschedule", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { newSlotId, reason = "Departure update proposed by Traviska", customerExplanation = "", responseDeadline } = req.body || {};
      if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(newSlotId)) {
        return res.status(400).json({ success: false, message: "Invalid booking or target departure ID" });
      }

      const [booking, targetSlot] = await Promise.all([
        Booking.findById(req.params.id),
        TripSlot.findById(newSlotId).lean(),
      ]);

      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
      if (booking.status === "Cancelled") {
        return res.status(400).json({ success: false, message: "Cancelled bookings cannot be rescheduled." });
      }
      if (!targetSlot || targetSlot.isClosed) {
        return res.status(400).json({ success: false, message: "Target departure slot is closed or unavailable." });
      }
      const pax = Number(booking.travellers) || 1;
      if ((Number(targetSlot.totalSlots) || 0) - (Number(targetSlot.bookedSlots) || 0) < pax) {
        return res.status(409).json({ success: false, message: "Not enough seats available on target departure." });
      }

      const oldSlot = booking.slotId ? await TripSlot.findById(booking.slotId).lean() : null;
      const oldDateStr = formatISTDate(oldSlot?.date || booking.date);
      const proposedDateStr = formatISTDate(targetSlot.date);

      const proposal = await BookingRequest.create({
        requestCode: formatReqCode(),
        bookingId: booking._id,
        bookingCode: booking.bookingCode || "",
        customerId: booking.customerId || null,
        customerSnapshot: { name: booking.name || "", email: booking.email || "", phone: booking.phone || "" },
        tripTitle: booking.trip?.title || "",
        requestType: "CompanyRescheduleProposal",
        status: "Awaiting Customer Response",
        reason: String(reason).trim(),
        customerExplanation: String(customerExplanation || reason).trim(),
        oldSlotId: booking.slotId || null,
        oldDate: oldDateStr,
        proposedSlotId: targetSlot._id,
        proposedDate: proposedDateStr,
        responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
        travellers: pax,
        auditHistory: [
          {
            action: "Admin Proposed Reschedule (Awaiting Customer Response)",
            actor: req.user?.email || req.user?.name || "Admin",
            note: `Proposed move from ${oldDateStr} to ${proposedDateStr}. Seats remain on original slot until customer accepts.`,
          },
        ],
      });

      booking.bookingState = "Awaiting Customer Response";
      await booking.save();

      const baseUrl = (process.env.PUBLIC_WEBSITE_URL || "https://traviska.com").replace(/\/+$/, "");
      const proposalPolicyFile = getPolicyAttachmentFilename(booking.policyVersion || POLICY_VERSION);
      const proposalDetails = [
        { label: "Booking ID", value: booking.bookingCode || String(booking._id) },
        { label: "Trip", value: booking.trip?.title || "Traviska Trip" },
        { label: "Original Departure", value: oldDateStr },
        { label: "Proposed Departure", value: proposedDateStr, highlight: true },
        { label: "Reason", value: proposal.customerExplanation || proposal.reason },
      ];
      if (proposal.responseDeadline) {
        proposalDetails.push({
          label: "Respond By",
          value: formatISTDate(proposal.responseDeadline),
        });
      }
      const proposalEmail = renderCustomerEmail({
        eyebrow: "ACTION REQUIRED",
        statusLabel: "Awaiting Your Response",
        statusTone: "warning",
        title: "Proposed Departure Date Update",
        customerName: booking.name || "Traveller",
        introParagraphs: [
          `Traviska has proposed a new departure date for your booking ${booking.bookingCode} (${booking.trip?.title || "Traviska Trip"}).`,
          "Your seats remain held on your original departure until you confirm. Please choose one of the two options below in My Trips:",
          "1. Accept New Date (₹0 rescheduling fee) — move your booking to the proposed date.\n2. Request 100% Refund (₹0 cancellation fee) — cancel for a full refund.",
        ],
        details: proposalDetails,
        nextStepsBody:
          "Open My Trips to review this proposal and select Accept New Date or Request 100% Refund.",
        ctaLabel: "Review Rescheduling Options",
        ctaUrl: `${baseUrl}/customer/dashboard`,
        policyAttachmentName: proposalPolicyFile,
        policyAttachmentNote:
          "Please find the applicable Cancellation, Refund & Rescheduling Policy attached for your reference.",
      });
      await queueAndSendEmail({
        audience: "customer",
        eventType: "CompanyRescheduleProposed",
        bookingId: booking._id,
        requestId: proposal._id,
        recipient: booking.email,
        subject: `Action Required: Departure Update for ${booking.trip?.title} (${booking.bookingCode})`,
        textBody: proposalEmail.text,
        htmlBody: proposalEmail.html,
        attachPolicyVersion: booking.policyVersion || POLICY_VERSION,
        idempotencyKey: `co-resched-email:${proposal._id}`,
      });

      await queueAndSendWhatsApp({
        booking,
        eventType: "CompanyRescheduleProposed",
        requestId: proposal._id,
        templateName: process.env.WHATSAPP_RESCHEDULE_PROPOSED_TEMPLATE_NAME || "traviska_reschedule_proposed",
        templateParams: [
          booking.name || "Traveller",
          booking.trip?.title || "Traviska Trip",
          booking.bookingCode || String(booking._id),
          oldDateStr,
          proposedDateStr,
        ],
        idempotencyKey: `co-resched-wa:${proposal._id}`,
      });

      return res.json({
        success: true,
        message: `Reschedule proposal sent to customer (${proposedDateStr}). Awaiting customer response.`,
        proposal,
        booking,
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Failed to propose reschedule" });
    }
  });

  // Admin: Company-Wide Reschedule Proposal for an entire TripSlot
  router.post("/api/admin/trip-slots/:slotId/propose-reschedule", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { proposedSlotId, reason, customerExplanation = "", internalNotes = "", responseDeadline, closeOriginalSlot = true } = req.body || {};
      const { slotId } = req.params;

      if (!mongoose.isValidObjectId(slotId) || !mongoose.isValidObjectId(proposedSlotId)) {
        return res.status(400).json({ success: false, message: "Invalid departure slot IDs" });
      }
      if (String(slotId) === String(proposedSlotId)) {
        return res.status(400).json({ success: false, message: "Proposed departure must be different from original" });
      }

      const [origSlot, targetSlot, affectedBookings] = await Promise.all([
        TripSlot.findById(slotId),
        TripSlot.findById(proposedSlotId).lean(),
        Booking.find({ slotId, status: "Confirmed" }),
      ]);

      if (!origSlot || !targetSlot || targetSlot.isClosed) {
        return res.status(400).json({ success: false, message: "Original or target departure is unavailable/closed" });
      }

      if (closeOriginalSlot) {
        origSlot.isClosed = true;
        await origSlot.save();
      }

      const createdProposals = [];
      for (const b of affectedBookings) {
        const proposal = await BookingRequest.create({
          requestCode: formatReqCode(),
          bookingId: b._id,
          bookingCode: b.bookingCode || "",
          customerId: b.customerId || null,
          customerSnapshot: { name: b.name || "", email: b.email || "", phone: b.phone || "" },
          tripTitle: b.trip?.title || "",
          requestType: "CompanyRescheduleProposal",
          status: "Awaiting Customer Response",
          reason: String(reason || "Operational departure update").trim(),
          customerExplanation: String(customerExplanation).trim(),
          internalNotes: String(internalNotes).trim(),
          oldSlotId: origSlot._id,
          oldDate: formatISTDate(origSlot.date),
          proposedSlotId: targetSlot._id,
          proposedDate: formatISTDate(targetSlot.date),
          responseDeadline: responseDeadline ? new Date(responseDeadline) : null,
          travellers: Number(b.travellers) || 1,
          auditHistory: [
            {
              action: "Company Reschedule Proposed",
              actor: req.user?.email || "Admin",
              note: `Proposed move to ${formatISTDate(targetSlot.date)}. Awaiting customer decision (Accept New Date or Request 100% Refund).`,
            },
          ],
        });

        b.bookingState = "Awaiting Customer Response";
        await b.save();
        createdProposals.push(proposal);

        const baseUrl = (process.env.PUBLIC_WEBSITE_URL || "https://traviska.com").replace(/\/+$/, "");
        const slotProposalPolicyFile = getPolicyAttachmentFilename(b.policyVersion || POLICY_VERSION);
        const slotProposalDetails = [
          { label: "Booking ID", value: b.bookingCode || String(b._id) },
          { label: "Trip", value: b.trip?.title || "Traviska Trip" },
          { label: "Original Departure", value: proposal.oldDate },
          { label: "Proposed Departure", value: proposal.proposedDate, highlight: true },
          { label: "Reason", value: proposal.customerExplanation || proposal.reason },
        ];
        if (proposal.responseDeadline) {
          slotProposalDetails.push({
            label: "Respond By",
            value: formatISTDate(proposal.responseDeadline),
          });
        }
        const slotProposalEmail = renderCustomerEmail({
          eyebrow: "ACTION REQUIRED",
          statusLabel: "Awaiting Your Response",
          statusTone: "warning",
          title: "Proposed Departure Date Update",
          customerName: b.name || "Traveller",
          introParagraphs: [
            `Traviska has proposed a new departure date for your booking ${b.bookingCode} (${b.trip?.title || "Traviska Trip"}).`,
            "Your seats remain held on your original departure until you confirm. Please choose one of the two options below in My Trips:",
            "1. Accept New Date (₹0 rescheduling fee) — move your booking to the proposed date.\n2. Request 100% Refund (₹0 cancellation fee) — cancel for a full refund.",
          ],
          details: slotProposalDetails,
          nextStepsBody:
            "Open My Trips to review this proposal and select Accept New Date or Request 100% Refund.",
          ctaLabel: "Review Rescheduling Options",
          ctaUrl: `${baseUrl}/customer/dashboard`,
          policyAttachmentName: slotProposalPolicyFile,
          policyAttachmentNote:
            "Please find the applicable Cancellation, Refund & Rescheduling Policy attached for your reference.",
        });
        await queueAndSendEmail({
          audience: "customer",
          eventType: "CompanyRescheduleProposed",
          bookingId: b._id,
          requestId: proposal._id,
          recipient: b.email,
          subject: `Action Required: Departure Update for ${b.trip?.title} (${b.bookingCode})`,
          textBody: slotProposalEmail.text,
          htmlBody: slotProposalEmail.html,
          attachPolicyVersion: b.policyVersion || POLICY_VERSION,
          idempotencyKey: `co-resched-email:${proposal._id}`,
        });

        await queueAndSendWhatsApp({
          booking: b,
          eventType: "CompanyRescheduleProposed",
          requestId: proposal._id,
          templateName: process.env.WHATSAPP_RESCHEDULE_PROPOSED_TEMPLATE_NAME || "traviska_reschedule_proposed",
          templateParams: [
            b.name || "Traveller",
            b.trip?.title || "Traviska Trip",
            b.bookingCode || String(b._id),
            proposal.oldDate,
            proposal.proposedDate,
          ],
          idempotencyKey: `co-resched-wa:${proposal._id}`,
        });
      }

      res.json({
        success: true,
        message: `Created ${createdProposals.length} reschedule proposal(s) awaiting customer response.`,
        proposals: createdProposals,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message || "Failed to propose company reschedule" });
    }
  });

  // Admin: Approve Refund Payout (atomic double-approval guard + gateway vs manual workflow)
  router.post("/api/admin/booking-requests/:id/approve-refund", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const actor = req.user?.email || req.user?.name || "Admin";
      const existingReq = await BookingRequest.findById(req.params.id);
      if (!existingReq) {
        return res.status(404).json({ success: false, message: "Refund request not found." });
      }
      if (existingReq.requestType !== "ManualRefundAction") {
        return res.status(400).json({ success: false, message: "Request is not a refund approval task." });
      }
      if (existingReq.refundState !== "Pending Admin Approval") {
        return res.status(409).json({
          success: false,
          duplicatePrevented: true,
          message: `Refund cannot be approved again (current state: ${existingReq.refundState}).`,
          request: existingReq,
        });
      }

      // Atomic lock: only ONE Admin request can transition Pending Admin Approval -> Initiation In Progress
      const lockedReq = await BookingRequest.findOneAndUpdate(
        { _id: req.params.id, refundState: "Pending Admin Approval" },
        {
          $set: {
            refundState: "Initiation In Progress",
            refundApprovedBy: actor,
            refundApprovedAt: new Date(),
            reviewedBy: actor,
            reviewedAt: new Date(),
            isReadByAdmin: true,
          },
          $push: {
            auditHistory: {
              action: "Admin Approved Refund Payout",
              actor,
              note: `Authorized refund of ₹${existingReq.eligibleRefundAmount || 0}.`,
            },
          },
        },
        { new: true }
      );

      if (!lockedReq) {
        return res.status(409).json({
          success: false,
          duplicatePrevented: true,
          message: "Refund was already approved by another Admin.",
        });
      }

      const booking = await Booking.findById(lockedReq.bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Associated booking not found." });
      }

      const invoice = await Invoice.findOne({ bookingId: booking._id });
      const amountPaidRupees = getPaidRupees(booking, invoice);
      const approvedAmount = Math.min(Number(lockedReq.eligibleRefundAmount || 0), amountPaidRupees || Number(lockedReq.eligibleRefundAmount || 0));

      if (approvedAmount <= 0) {
        lockedReq.refundState = "Not Applicable";
        lockedReq.status = "Completed";
        await lockedReq.save();
        return res.json({ success: true, request: lockedReq, booking });
      }

      const activeProvider = (process.env.PAYMENT_GATEWAY_PROVIDER || "").trim();
      const hasLiveGateway = Boolean(activeProvider && activeProvider !== "simulator");

      if (hasLiveGateway) {
        try {
          const adapter = getGatewayAdapter(activeProvider);
          const refundEvent = await adapter.processRefundEvent({
            bookingId: booking._id,
            amountPaise: rupeesToPaise(approvedAmount),
            fullRefund: approvedAmount >= amountPaidRupees,
          });
          const refundRef = refundEvent.providerRefundId || refundEvent.eventId || "";
          lockedReq.refundState = "Initiated";
          lockedReq.status = "Approved";
          lockedReq.gatewayRefundId = refundRef;
          lockedReq.gatewayRefundResponse = refundEvent;
          lockedReq.auditHistory.push({
            action: "Gateway Refund Initiated",
            actor,
            note: `Provider: ${activeProvider}, Ref: ${refundRef}`,
          });
          await lockedReq.save();

          booking.refundState = "Initiated";
          booking.refundReference = refundRef;
          booking.refundInitiatedAt = new Date();
          await booking.save();

          await queueAndSendWhatsApp({
            booking,
            eventType: "RefundInitiated",
            requestId: lockedReq._id,
            templateName: process.env.WHATSAPP_REFUND_INITIATED_TEMPLATE_NAME || "traviska_refund_initiated",
            templateParams: [
              booking.name || "Traveller",
              booking.bookingCode || String(booking._id),
              `₹${approvedAmount}`,
              refundRef || "Processing",
            ],
            idempotencyKey: `refund-init-wa:${lockedReq._id}`,
          });
        } catch (gwErr) {
          const isTimeout = /timeout|ETIMEDOUT|ECONNRESET/i.test(gwErr?.message || "");
          lockedReq.refundState = isTimeout ? "Reconciliation Required" : "Failed — Requires Action";
          lockedReq.auditHistory.push({
            action: isTimeout ? "Gateway Timeout — Reconciliation Required" : "Gateway Refund Failed",
            actor: "System",
            note: gwErr?.message || "Gateway refund error",
          });
          await lockedReq.save();

          booking.refundState = lockedReq.refundState;
          await booking.save();

          await sendStaffAlertEmail({
            eventType: lockedReq.refundState,
            booking,
            request: lockedReq,
            summaryText: `Refund of ₹${approvedAmount} failed/timed out after Admin approval: ${gwErr?.message}`,
            idempotencyKeyPrefix: `staff-refund-err:${lockedReq._id}`,
          });
          return res.status(502).json({ success: false, message: gwErr?.message || "Gateway refund failed", request: lockedReq });
        }
      } else {
        // No live gateway configured: mark Approved — Pending Initiation (manual payout required)
        lockedReq.refundState = "Approved — Pending Initiation";
        lockedReq.status = "Approved";
        lockedReq.auditHistory.push({
          action: "Approved — Manual Payout Required",
          actor,
          note: "Live gateway refund unavailable; Admin must execute manual payout and record verified reference.",
        });
        await lockedReq.save();

        booking.refundState = "Approved — Pending Initiation";
        await booking.save();

        await sendStaffAlertEmail({
          eventType: "Refund Approved — Manual Payout Required",
          booking,
          request: lockedReq,
          summaryText: `Admin (${actor}) approved ₹${approvedAmount} refund. Please execute manual payout and record verified reference.`,
          idempotencyKeyPrefix: `staff-manual-payout:${lockedReq._id}`,
        });
      }

      return res.json({ success: true, request: lockedReq, booking });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Refund approval failed" });
    }
  });

  // Admin: Flag refund request for investigation
  router.post("/api/admin/booking-requests/:id/flag-investigation", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { note = "Flagged for investigation" } = req.body || {};
      const actor = req.user?.email || "Admin";
      const reqDoc = await BookingRequest.findByIdAndUpdate(
        req.params.id,
        {
          $set: { flaggedForInvestigation: true, investigationNote: String(note).trim(), isReadByAdmin: true },
          $push: { auditHistory: { action: "Flagged for Investigation", actor, note: String(note).trim() } },
        },
        { new: true }
      );
      if (!reqDoc) return res.status(404).json({ success: false, message: "Request not found" });
      res.json({ success: true, request: reqDoc });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to flag request" });
    }
  });

  // Admin: Record verified manual refund completion
  router.post("/api/admin/bookings/:id/manual-refund-complete", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { refundReference, refundAmount } = req.body || {};
      if (!String(refundReference || "").trim()) {
        return res.status(400).json({ success: false, message: "Verified bank/gateway refund reference is required." });
      }
      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

      if (booking.refundState === "Completed") {
        // Ensure any stale BookingRequest is also marked Completed without resending email
        const syncRes = await BookingRequest.updateMany(
          {
            bookingId: booking._id,
            requestType: "ManualRefundAction",
            refundState: { $ne: "Completed" },
          },
          {
            $set: {
              status: "Completed",
              refundState: "Completed",
              reviewedBy: req.user?.email || "Admin",
              reviewedAt: new Date(),
              isReadByAdmin: true,
            },
          }
        );
        if (syncRes?.modifiedCount > 0) {
          return res.json({ success: true, synced: true, booking });
        }
        return res.status(409).json({
          success: false,
          duplicatePrevented: true,
          message: "Refund has already been marked completed.",
          booking,
        });
      }

      const finalAmount = refundAmount !== undefined ? Number(refundAmount) : Number(booking.refundAmount || 0);
      booking.refundAmount = finalAmount;
      booking.refundStatus = "Processed";
      booking.refundState = "Completed";
      booking.refundReference = String(refundReference).trim();
      booking.refundCompletedAt = new Date();
      await booking.save();

      await BookingRequest.updateMany(
        {
          bookingId: booking._id,
          requestType: "ManualRefundAction",
          refundState: { $ne: "Completed" },
        },
        {
          $set: {
            status: "Completed",
            refundState: "Completed",
            reviewedBy: req.user?.email || "Admin",
            reviewedAt: new Date(),
            isReadByAdmin: true,
          },
          $push: {
            auditHistory: {
              action: "Manual Refund Marked Completed",
              actor: req.user?.email || "Admin",
              note: `Ref: ${booking.refundReference}, Amount: ₹${finalAmount}`,
            },
          },
        }
      );

      const refundDoneEmail = renderCustomerEmail({
        eyebrow: "REFUND UPDATE",
        statusLabel: "Refund Completed",
        statusTone: "success",
        title: "Refund Completed & Credited",
        customerName: booking.name || "Traveller",
        introParagraphs: [
          `Your refund for booking ${booking.bookingCode} (${booking.trip?.title || "Traviska Trip"}) has been completed.`,
        ],
        details: [
          { label: "Booking ID", value: booking.bookingCode },
          { label: "Trip", value: booking.trip?.title || "Traviska Trip" },
          { label: "Transaction Reference", value: booking.refundReference },
          { label: "Refunded Amount", value: `₹${Number(finalAmount || 0).toLocaleString("en-IN")}`, highlight: true },
        ],
        nextStepsBody: "Please check your bank or original payment account statement. Funds typically reflect within 1–3 business days depending on your bank.",
        ctaLabel: "View My Trips",
        ctaUrl: "https://traviska.com/customer/dashboard",
      });
      await queueAndSendEmail({
        audience: "customer",
        eventType: "RefundCompleted",
        bookingId: booking._id,
        recipient: booking.email,
        subject: `Traviska — Refund Completed (${booking.bookingCode})`,
        textBody: refundDoneEmail.text,
        htmlBody: refundDoneEmail.html,
        idempotencyKey: `refund-complete-email:${booking._id}:${booking.refundReference}`,
      });

      await queueAndSendWhatsApp({
        booking,
        eventType: "RefundCompleted",
        templateName: process.env.WHATSAPP_REFUND_TEMPLATE_NAME || "traviska_refund_completed",
        templateParams: [
          booking.name || "Traveller",
          booking.bookingCode || String(booking._id),
          booking.trip?.title || "Traviska Trip",
          "Refund Completed (Credited)",
          `₹${Number(finalAmount || 0).toLocaleString("en-IN")}`,
          booking.refundReference || "—",
        ],
        idempotencyKey: `refund-complete-wa:${booking._id}:${booking.refundReference}`,
      });

      res.json({ success: true, booking });
    } catch (err) {
      res.status(500).json({ success: false, message: "Failed to record refund completion" });
    }
  });

  // Admin: Cancel Booking with explicit Customer vs Traviska source, 100% guarantee, & notifications
  router.post("/api/admin/bookings/:id/admin-cancel", authMiddleware, adminMiddleware, async (req, res) => {
    const {
      cancellationSource = "Customer",
      reason = "Customer cancelled",
      customerFacingExplanation = "",
      internalNotes = "",
      idempotencyKey,
    } = req.body || {};

    if (!["Customer", "Traviska"].includes(cancellationSource)) {
      return res.status(400).json({ success: false, message: "Invalid cancellation source." });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Booking not found" });
      }
      if (booking.status === "Cancelled") {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: "Booking is already cancelled." });
      }

      const [slot, invoice] = await Promise.all([
        booking.slotId ? TripSlot.findById(booking.slotId).session(session) : null,
        Invoice.findOne({ bookingId: booking._id }).session(session),
      ]);

      const amountPaidRupees = getPaidRupees(booking, invoice);
      const preview = calculateCancellationRefund({
        amountPaidRupees,
        departureDate: slot?.date || booking.date,
        source: cancellationSource,
      });

      const wasConfirmed = booking.status === "Confirmed";
      const pax = Number(booking.travellers) || 1;
      if (wasConfirmed && booking.slotId) {
        await TripSlot.findOneAndUpdate(
          { _id: booking.slotId, bookedSlots: { $gte: pax } },
          { $inc: { bookedSlots: -pax } },
          { new: true, session }
        );
      }
      if (wasConfirmed && booking.couponCode) {
        await Coupon.updateOne(
          { code: booking.couponCode, usageCount: { $gt: 0 } },
          { $inc: { usageCount: -1 } },
          { session }
        );
      }

      booking.status = "Cancelled";
      booking.bookingState = "Cancelled";
      booking.cancellationSource = cancellationSource;
      booking.cancelledAt = new Date();
      booking.cancelledBy = req.user?.email || req.user?.name || "Admin";
      booking.cancellationReason = String(reason).trim();
      booking.customerFacingReason = String(customerFacingExplanation || reason).trim();
      booking.cancellationNotes = String(internalNotes).trim();
      booking.refundAmount = preview.eligibleRefundRupees;
      booking.refundStatus = preview.eligibleRefundRupees > 0 ? "Pending" : "None";
      booking.refundState = preview.eligibleRefundRupees > 0 ? "Pending Admin Approval" : "Not Applicable";
      await booking.save({ session });

      const [reqDoc] = await BookingRequest.create(
        [
          {
            requestCode: formatReqCode(),
            bookingId: booking._id,
            bookingCode: booking.bookingCode || "",
            customerId: booking.customerId || null,
            customerSnapshot: { name: booking.name || "", email: booking.email || "", phone: booking.phone || "" },
            tripTitle: booking.trip?.title || "",
            requestType: preview.eligibleRefundRupees > 0 ? "ManualRefundAction" : "CustomerCancel",
            status: preview.eligibleRefundRupees > 0 ? "Pending Review" : "Completed",
            reason: booking.cancellationReason,
            customerExplanation: booking.customerFacingReason,
            internalNotes: booking.cancellationNotes,
            oldSlotId: booking.slotId,
            oldDate: formatISTDate(slot?.date || booking.date),
            travellers: pax,
            amountPaidRupees,
            cancellationFeeRupees: preview.cancellationFeeRupees,
            eligibleRefundAmount: preview.eligibleRefundRupees,
            refundPercentage: preview.refundPercentage,
            cancellationSource,
            originalPaymentMethod: booking.paymentMethod || "Razorpay",
            gatewayTransactionRef: booking.paymentId || booking.orderId || booking.paymentReference || "",
            policyVersion: booking.policyVersion || POLICY_VERSION,
            refundState: preview.eligibleRefundRupees > 0 ? "Pending Admin Approval" : "Not Applicable",
            reviewedBy: preview.eligibleRefundRupees > 0 ? "" : req.user?.email || "Admin",
            reviewedAt: preview.eligibleRefundRupees > 0 ? null : new Date(),
            isReadByAdmin: preview.eligibleRefundRupees === 0,
            idempotencyKey: idempotencyKey ? String(idempotencyKey) : undefined,
            auditHistory: [
              {
                action: `Admin Cancelled (${cancellationSource})`,
                actor: req.user?.email || "Admin",
                note: `${preview.tierLabel}. Refund: ₹${preview.eligibleRefundRupees} (${preview.eligibleRefundRupees > 0 ? "Pending Admin Approval" : "Not Applicable"}).`,
              },
            ],
          },
        ],
        { session }
      );

      await session.commitTransaction();

      const baseUrl = (process.env.PUBLIC_WEBSITE_URL || "https://traviska.com").replace(/\/+$/, "");
      const adminCancelEmail = renderCustomerEmail({
        eyebrow: cancellationSource === "Traviska" ? "TRIP CANCELLATION" : "BOOKING UPDATE",
        statusLabel: booking.refundState,
        statusTone: cancellationSource === "Traviska" ? "info" : preview.eligibleRefundRupees > 0 ? "warning" : "neutral",
        title: cancellationSource === "Traviska" ? "Trip Cancelled — 100% Refund" : "Booking Cancellation Confirmed",
        customerName: booking.name || "Traveller",
        introParagraphs: [
          cancellationSource === "Traviska"
            ? `We regret to inform you that ${booking.trip?.title} (${booking.bookingCode}) has been cancelled by Traviska. You are entitled to a 100% refund of the amount paid.`
            : `Your booking ${booking.bookingCode} for ${booking.trip?.title} has been cancelled.`,
        ],
        details: [
          { label: "Booking ID", value: booking.bookingCode },
          { label: "Trip", value: booking.trip?.title || "Traviska Trip" },
          { label: "Departure Date", value: formatISTDate(slot?.date || booking.date) },
          { label: "Reason", value: booking.customerFacingReason },
          { label: "Amount Paid", value: `₹${amountPaidRupees.toLocaleString("en-IN")}` },
          { label: "Cancellation Charge", value: `₹${preview.cancellationFeeRupees.toLocaleString("en-IN")}` },
          { label: "Eligible Refund", value: `₹${preview.eligibleRefundRupees.toLocaleString("en-IN")} (${preview.refundPercentage}%)`, highlight: true },
        ],
        nextStepsBody:
          preview.eligibleRefundRupees > 0
            ? "Your refund payout is awaiting Admin approval and will be processed to your original payment method or verified bank account."
            : "Per the applicable cancellation policy, no refund is due for this cancellation.",
        ctaLabel: "View My Trips",
        ctaUrl: `${baseUrl}/customer/dashboard`,
        policyAttachmentName: getPolicyAttachmentFilename(booking.policyVersion || POLICY_VERSION),
      });
      await queueAndSendEmail({
        audience: "customer",
        eventType: cancellationSource === "Traviska" ? "CompanyTripCancelled" : "CustomerBookingCancelled",
        bookingId: booking._id,
        requestId: reqDoc._id,
        recipient: booking.email,
        subject:
          cancellationSource === "Traviska"
            ? `Important Update: ${booking.trip?.title} Cancelled — 100% Refund (${booking.bookingCode})`
            : `Traviska — Booking Cancelled (${booking.bookingCode})`,
        textBody: adminCancelEmail.text,
        htmlBody: adminCancelEmail.html,
        attachPolicyVersion: booking.policyVersion || POLICY_VERSION,
        idempotencyKey: `admin-cancel-email:${booking._id}`,
      });

      await queueAndSendWhatsApp({
        booking,
        eventType: cancellationSource === "Traviska" ? "CompanyTripCancelled" : "CustomerBookingCancelled",
        requestId: reqDoc._id,
        templateName:
          cancellationSource === "Traviska"
            ? process.env.WHATSAPP_COMPANY_CANCELLED_TEMPLATE_NAME || "traviska_company_trip_cancelled"
            : process.env.WHATSAPP_CANCELLED_TEMPLATE_NAME || "traviska_booking_cancelled",
        templateParams:
          cancellationSource === "Traviska"
            ? [
                booking.name || "Traveller",
                booking.trip?.title || "Traviska Trip",
                booking.bookingCode || String(booking._id),
                formatISTDate(slot?.date || booking.date),
                booking.customerFacingReason || booking.cancellationReason || "Operational reasons",
                `₹${preview.eligibleRefundRupees} (100% Refund — ${booking.refundState})`,
              ]
            : [
                booking.name || "Traveller",
                booking.bookingCode || String(booking._id),
                booking.trip?.title || "Traviska Trip",
                formatISTDate(slot?.date || booking.date),
                booking.customerFacingReason || booking.cancellationReason || "Cancelled",
                `₹${preview.eligibleRefundRupees} (${booking.refundState})`,
              ],
        idempotencyKey: `admin-cancel-wa:${booking._id}`,
      });

      return res.json({ success: true, booking, preview, request: reqDoc });
    } catch (err) {
      if (session.inTransaction()) await session.abortTransaction();
      return res.status(500).json({ success: false, message: err.message || "Admin cancellation failed" });
    } finally {
      await session.endSession();
    }
  });

  // Admin: Safely retry failed email or WhatsApp notification
  router.post("/api/admin/notifications/:outboxId/retry", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const doc = await NotificationOutbox.findById(req.params.outboxId);
      if (!doc) return res.status(404).json({ success: false, message: "Notification record not found" });
      const updated = doc.channel === "whatsapp" ? await deliverOutboxWhatsApp(doc) : await deliverOutboxEmail(doc);
      res.json({ success: true, notification: updated });
    } catch (err) {
      res.status(500).json({ success: false, message: "Retry failed" });
    }
  });

  return router;
};
