const nodemailer = require("nodemailer");
const { formatINR } = require("./invoiceService");
const { renderCustomerEmail } = require("./emailTemplateService");
const { OFFICIAL_CANCELLATION_POLICY, POLICY_VERSION } = require("./cancellationPolicyService");
const { generatePolicyPdfBuffer, getPolicyAttachmentFilename } = require("./policyPdfService");

const TEST_SAFE_RECIPIENT = "travelwithtraviska@gmail.com";

function getHttpsEmailProvider() {
  const resendKey = (process.env.RESEND_API_KEY || "").trim();
  if (resendKey) return { provider: "resend", apiKey: resendKey };
  const brevoKey = (process.env.BREVO_API_KEY || "").trim();
  if (brevoKey) return { provider: "brevo", apiKey: brevoKey };
  return null;
}

function parseFromNameAndEmail(fromStr) {
  const m = String(fromStr || "").match(/^(?:"([^"]+)"\s*)?<([^>\s]+@[^>\s]+)>$/);
  if (m) return { name: (m[1] || "Traviska Team").trim(), email: m[2].trim() };
  return { name: "Traviska Team", email: String(fromStr || "admin@traviska.com").trim() };
}

async function sendViaHttpsProvider(httpsCfg, { from, replyTo, to, subject, text, html, attachments }) {
  const validAttachments = Array.isArray(attachments)
    ? attachments.filter((a) => a && a.filename && a.content)
    : [];
  if (httpsCfg.provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${httpsCfg.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        reply_to: replyTo,
        to: [to],
        subject,
        text,
        html,
        ...(validAttachments.length > 0
          ? {
              attachments: validAttachments.map((att) => ({
                filename: att.filename,
                content: Buffer.isBuffer(att.content)
                  ? att.content.toString("base64")
                  : Buffer.from(att.content).toString("base64"),
              })),
            }
          : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error?.message || `Resend HTTP ${res.status}`);
    }
    return { messageId: data?.id || "", provider: "resend" };
  }

  if (httpsCfg.provider === "brevo") {
    const sender = parseFromNameAndEmail(from);
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": httpsCfg.apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender,
        replyTo: { email: replyTo },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html,
        ...(validAttachments.length > 0
          ? {
              attachment: validAttachments.map((att) => ({
                name: att.filename,
                content: Buffer.isBuffer(att.content)
                  ? att.content.toString("base64")
                  : Buffer.from(att.content).toString("base64"),
              })),
            }
          : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || `Brevo HTTP ${res.status}`);
    }
    return { messageId: data?.messageId || "", provider: "brevo" };
  }
  throw new Error("Unsupported HTTPS email provider");
}

function getSmtpConfigSummary() {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = port === 465 || (process.env.SMTP_SECURE === "true" && port !== 587);
  return {
    configured: Boolean(host && user && pass),
    host,
    port,
    secure,
    user,
    from: getFromAddress(),
    replyTo: (process.env.SMTP_REPLY_TO || "admin@traviska.com").trim(),
  };
}

function createTransporterWithPort(cfg, portOverride = null) {
  const port = portOverride || cfg.port;
  const secure = port === 465 || (process.env.SMTP_SECURE === "true" && port !== 587);
  return nodemailer.createTransport({
    host: cfg.host,
    port,
    secure,
    family: 4, // Force IPv4 on cloud hosts like Render where IPv6 SMTP times out
    auth: { user: cfg.user, pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD },
    connectionTimeout: 12000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

function getSmtpTransporter() {
  const cfg = getSmtpConfigSummary();
  if (!cfg.configured) {
    return null;
  }

  return createTransporterWithPort(cfg);
}

function getFromAddress() {
  const raw = String(
    process.env.SMTP_FROM ||
      process.env.EMAIL_FROM ||
      '"Traviska Team" <admin@traviska.com>'
  ).trim();
  // Clean stray escaped/unmatched quotes while preserving "Display Name" <addr@domain>
  const match = raw.match(/^(?:["\\]*([^"<]+?)["\\]*\s*)?<([^>\s]+@[^>\s]+)>$/);
  if (match) {
    const displayName = match[1] ? match[1].replace(/["\\]/g, "").trim() : "Traviska Team";
    const emailAddr = match[2].trim();
    return displayName ? `"${displayName}" <${emailAddr}>` : emailAddr;
  }
  return raw;
}

function canAttachPolicyPdf() {
  return (
    OFFICIAL_CANCELLATION_POLICY.legalApprovalStatus !== "PENDING_LEGAL_REVIEW" ||
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_POLICY_PDF_ATTACHMENT === "true"
  );
}

/**
 * Builds the exact invoice email subject & body (text + HTML).
 */
function buildInvoiceEmailContent(invoice) {
  const isTest = invoice.isSample || process.env.NODE_ENV !== "production";
  const subject = isTest
    ? "Traviska — Booking Confirmation & Invoice [TEST]"
    : "Traviska — Booking Confirmation & Invoice";

  const customerName = invoice.customerSnapshot?.name || "Traveller";
  const tripName = invoice.tripSnapshot?.title || "Traviska Trip";
  const bookingId = invoice.bookingCode || "—";
  const travelDate = invoice.tripSnapshot?.travelDate || "—";
  const amountReceived = formatINR(invoice.pricing?.netPaidPaise || 0);
  const paymentStatus = invoice.paymentStatus || "Paid";

  const testWarning = invoice.isSample
    ? "[TEST / SAMPLE NOTICE: No money was collected and no actual booking was confirmed.]"
    : "";

  const policyAttachName = canAttachPolicyPdf() ? getPolicyAttachmentFilename(POLICY_VERSION) : "";

  const rendered = renderCustomerEmail({
    eyebrow: "BOOKING CONFIRMATION",
    statusLabel: paymentStatus,
    statusTone: paymentStatus === "Paid" ? "success" : "warning",
    title: "Booking Confirmed",
    previewText: `Booking ${bookingId} confirmed for ${tripName}`,
    customerName,
    introParagraphs: [
      testWarning,
      "Thank you for choosing Traviska. Your booking payment has been processed and your invoice is attached.",
    ],
    details: [
      { label: "Invoice Number", value: invoice.invoiceNumber || "—" },
      { label: "Booking ID", value: bookingId },
      { label: "Trip", value: tripName },
      { label: "Travel Date", value: travelDate },
      { label: "Payment Status", value: paymentStatus },
      { label: "Amount Received", value: amountReceived, highlight: true },
    ],
    nextStepsTitle: "What happens next?",
    nextStepsBody:
      "Please find your invoice attached as a PDF. You can view your booking details, pickup point, and itinerary anytime in My Trips.",
    ctaLabel: "View My Trips",
    ctaUrl: "https://traviska.com/customer/dashboard",
    policyAttachmentName: policyAttachName,
    policyAttachmentNote: policyAttachName
      ? "Please find the applicable Cancellation, Refund & Rescheduling Policy attached for your reference."
      : "",
  });

  return { subject, text: rendered.text, html: rendered.html };
}

/**
 * Builds refund lifecycle email content:
 * - stage = "initiated": sent immediately when refund is processed/initiated
 * - stage = "completed": sent when refund is credited/settled to customer's account
 */
function buildRefundEmailContent({
  invoice,
  stage = "initiated",
  refundAmountPaise = 0,
  refundReference = "",
  reason = "",
}) {
  const isTest = invoice.isSample || process.env.NODE_ENV !== "production";
  const isCompleted = stage === "completed";
  const suffix = isTest ? " [TEST]" : "";

  const subject = isCompleted
    ? `Traviska — Refund Credited & Completed (${invoice.invoiceNumber})${suffix}`
    : `Traviska — Refund Initiated (${invoice.invoiceNumber})${suffix}`;

  const customerName = invoice.customerSnapshot?.name || "Traveller";
  const tripName = invoice.tripSnapshot?.title || "Traviska Trip";
  const bookingId = invoice.bookingCode || "—";
  const amountFormatted = formatINR(
    refundAmountPaise || invoice.pricing?.refundedAmountPaise || 0
  );
  const netPaidFormatted = formatINR(invoice.pricing?.netPaidPaise || 0);
  const refText = refundReference || "—";

  const headline = isCompleted
    ? "Your refund has been credited and completed."
    : "Your refund has been initiated and is being processed.";
  const timelineNote = isCompleted
    ? "The refunded amount has now been credited to your original payment method. Please check your bank/payment statement."
    : "It typically takes 5–7 business days for the refunded amount to reflect in your original payment method. We will send your updated adjustment receipt PDF once the credit is completed.";

  const receiptSentence = isCompleted
    ? "Please find your updated adjustment receipt attached as a PDF."
    : "Your updated adjustment receipt PDF will be sent once the refund is credited.";

  const testWarningText = invoice.isSample
    ? "\n[TEST / SAMPLE NOTICE: This is a localhost simulation. No real money was refunded.]\n"
    : "";

  const displayStatus = isCompleted
    ? invoice.paymentStatus === "Partially Refunded"
      ? "Partially Refunded (Credited)"
      : "Refunded (Credited)"
    : "Refund Initiated";

  const text = `Hello ${customerName},
${testWarningText}
${headline}

Invoice Number: ${invoice.invoiceNumber}
Trip: ${tripName}
Booking ID: ${bookingId}
Refund Amount: ${amountFormatted}
Refund Reference: ${refText}
Status: ${displayStatus}
Net Amount Retained: ${netPaidFormatted}${reason ? `\nReason: ${reason}` : ""}

${timelineNote}

${receiptSentence}

Thank you,
Team Traviska
Website: traviska.com`;

  const rendered = renderCustomerEmail({
    eyebrow: "REFUND UPDATE",
    statusLabel: displayStatus,
    statusTone: isCompleted ? "success" : "info",
    title: isCompleted ? "Refund Completed & Credited" : "Refund Initiated",
    previewText: `${displayStatus} for ${bookingId} (${amountFormatted})`,
    customerName,
    introParagraphs: [
      invoice.isSample ? "[TEST / SAMPLE NOTICE: This is a localhost simulation. No real money was refunded.]" : "",
      headline,
    ],
    details: [
      { label: "Invoice No.", value: invoice.invoiceNumber },
      { label: "Trip", value: tripName },
      { label: "Booking ID", value: bookingId },
      { label: "Refund Reference", value: refText },
      { label: "Status", value: displayStatus },
      { label: "Net Amount Retained", value: netPaidFormatted },
      ...(reason ? [{ label: "Reason", value: reason }] : []),
      { label: "Refund Amount", value: amountFormatted, highlight: true },
    ],
    nextStepsTitle: "What happens next?",
    nextStepsBody: `${timelineNote} ${receiptSentence}`,
    ctaLabel: "View My Trips",
    ctaUrl: "https://traviska.com/customer/dashboard",
  });

  return { subject, text: rendered.text, html: rendered.html };
}

async function dispatchEmailWithAttachment({
  invoice,
  pdfBuffer,
  pdfFileName,
  subject,
  text,
  html,
}) {
  const recipient =
    (invoice.customerSnapshot?.email || "").trim() || TEST_SAFE_RECIPIENT;

  const httpsProvider = getHttpsEmailProvider();
  const transporter = getSmtpTransporter();
  const now = new Date();

  if (!httpsProvider && !transporter) {
    invoice.emailDelivery.status = "Not Configured";
    invoice.emailDelivery.lastAttemptAt = now;
    invoice.emailDelivery.lastError =
      "Email credentials (RESEND_API_KEY, BREVO_API_KEY, or SMTP_HOST/USER/PASS) are not configured.";
    invoice.emailDelivery.attempts.push({
      attemptedAt: now,
      status: "Not Configured",
      provider: "smtp",
      recipient: recipient || "",
      error: invoice.emailDelivery.lastError,
    });
    await invoice.save();
    return {
      status: "Not Configured",
      recipient,
      error: invoice.emailDelivery.lastError,
    };
  }

  if (!recipient) {
    invoice.emailDelivery.status = "Failed";
    invoice.emailDelivery.lastAttemptAt = now;
    invoice.emailDelivery.lastError = "No recipient email address available.";
    invoice.emailDelivery.attempts.push({
      attemptedAt: now,
      status: "Failed",
      provider: "smtp",
      recipient: "",
      error: invoice.emailDelivery.lastError,
    });
    await invoice.save();
    return { status: "Failed", error: invoice.emailDelivery.lastError };
  }

  invoice.emailDelivery.status = "Sending";
  await invoice.save();

  try {
    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      });
    }
    if (canAttachPolicyPdf()) {
      try {
        const policyBuf = await generatePolicyPdfBuffer({ policyVersion: POLICY_VERSION });
        attachments.push({
          filename: getPolicyAttachmentFilename(POLICY_VERSION),
          content: policyBuf,
          contentType: "application/pdf",
        });
      } catch {
        // Non-fatal if policy PDF fails
      }
    }

    const mailPayload = {
      from: getFromAddress(),
      replyTo: process.env.SMTP_REPLY_TO || "admin@traviska.com",
      to: recipient,
      subject,
      text,
      html,
      attachments,
    };

    let info;
    let usedProvider = "smtp";
    if (httpsProvider) {
      info = await sendViaHttpsProvider(httpsProvider, mailPayload);
      usedProvider = info.provider;
    } else {
      try {
        info = await transporter.sendMail(mailPayload);
      } catch (primaryErr) {
        const cfg = getSmtpConfigSummary();
        const isTimeoutOrConn = /timeout|ETIMEDOUT|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH/i.test(
          primaryErr?.message || ""
        );
        if (isTimeoutOrConn) {
          const altPort = cfg.port === 587 ? 465 : 587;
          const fallbackTransporter = createTransporterWithPort(cfg, altPort);
          info = await fallbackTransporter.sendMail(mailPayload);
        } else {
          throw primaryErr;
        }
      }
    }

    invoice.emailDelivery.status = "Accepted by Provider";
    invoice.emailDelivery.lastAttemptAt = new Date();
    invoice.emailDelivery.lastError = "";
    invoice.emailDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "Accepted by Provider",
      provider: usedProvider,
      messageId: info.messageId || "",
      recipient,
    });
    await invoice.save();

    return {
      status: "Accepted by Provider",
      recipient,
      messageId: info.messageId,
    };
  } catch (err) {
    invoice.emailDelivery.status = "Failed";
    invoice.emailDelivery.lastAttemptAt = new Date();
    invoice.emailDelivery.lastError = err.message;
    invoice.emailDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "Failed",
      provider: "smtp",
      recipient,
      error: err.message,
    });
    await invoice.save();

    return {
      status: "Failed",
      recipient,
      error: err.message,
    };
  }
}

/**
 * Sends invoice PDF email and updates delivery tracking on the Invoice document.
 * Never marks "Delivered" merely because SMTP accepted the message — marks "Accepted by Provider".
 */
async function sendInvoiceEmail({ invoice, pdfBuffer, pdfFileName }) {
  const { subject, text, html } = buildInvoiceEmailContent(invoice);
  return dispatchEmailWithAttachment({
    invoice,
    pdfBuffer,
    pdfFileName,
    subject,
    text,
    html,
  });
}

async function sendRefundEmail({
  invoice,
  pdfBuffer,
  pdfFileName,
  stage = "initiated",
  refundAmountPaise = 0,
  refundReference = "",
  reason = "",
}) {
  const { subject, text, html } = buildRefundEmailContent({
    invoice,
    stage,
    refundAmountPaise,
    refundReference,
    reason,
  });
  return dispatchEmailWithAttachment({
    invoice,
    pdfBuffer: stage === "completed" ? pdfBuffer : null,
    pdfFileName: stage === "completed" ? pdfFileName : "",
    subject,
    text,
    html,
  });
}

module.exports = {
  TEST_SAFE_RECIPIENT,
  getHttpsEmailProvider,
  sendViaHttpsProvider,
  getSmtpConfigSummary,
  getSmtpTransporter,
  getFromAddress,
  buildInvoiceEmailContent,
  buildRefundEmailContent,
  sendInvoiceEmail,
  sendRefundEmail,
};

