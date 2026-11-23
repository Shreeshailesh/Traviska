const nodemailer = require("nodemailer");
const { formatINR } = require("./invoiceService");

const TEST_SAFE_RECIPIENT = "travelwithtraviska@gmail.com";

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

function getFromAddress() {
  return (
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    '"Traviska Team" <admin@traviska.com>'
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
  const paymentStatus = invoice.paymentStatus;

  const testWarningText = invoice.isSample
    ? "\n[TEST / SAMPLE NOTICE: No money was collected and no actual booking was confirmed.]\n"
    : "";

  const text = `Hello ${customerName},
${testWarningText}
Thank you for choosing Traviska.

Your booking payment has been processed.

Trip: ${tripName}
Booking ID: ${bookingId}
Travel Date: ${travelDate}
Amount Received: ${amountReceived}
Payment Status: ${paymentStatus}

Please find your invoice attached as a PDF.
You can also view your booking details in My Trips.

Thank you,
Team Traviska
Website: traviska.com`;

  const testBannerHtml = invoice.isSample
    ? `<div style="background:#fef2f2;border:1px solid #dc2626;color:#991b1b;padding:10px 14px;border-radius:6px;font-weight:700;margin-bottom:16px;">
         TEST / SAMPLE NOTICE: No money was collected and no actual booking was confirmed.
       </div>`
    : "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.5;">
      <div style="background:#114224;padding:20px 24px;border-radius:8px 8px 0 0;color:#ffffff;">
        <h2 style="margin:0;font-size:20px;">TRAVISKA</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#bbf7d0;">Travel • Explore • Experience</p>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        ${testBannerHtml}
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Thank you for choosing Traviska. Your booking payment has been processed.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;">
          <tr><td style="padding:8px 12px;color:#64748b;width:140px;">Trip</td><td style="padding:8px 12px;font-weight:600;">${tripName}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Booking ID</td><td style="padding:8px 12px;font-weight:600;">${bookingId}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Travel Date</td><td style="padding:8px 12px;font-weight:600;">${travelDate}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Amount Received</td><td style="padding:8px 12px;font-weight:600;">${amountReceived}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Payment Status</td><td style="padding:8px 12px;font-weight:600;">${paymentStatus}</td></tr>
        </table>
        <p>Please find your invoice attached as a PDF.<br/>You can also view your booking details in <strong>My Trips</strong>.</p>
        <p style="margin-top:20px;">Thank you,<br/><strong>Team Traviska</strong><br/>Website: <a href="https://traviska.com">traviska.com</a></p>
        <p style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
          This is an automated email. Please do not reply directly to noreply@traviska.com. For billing or trip support, contact <a href="mailto:admin@traviska.com">admin@traviska.com</a>.
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
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

  const testBannerHtml = invoice.isSample
    ? `<div style="background:#fef2f2;border:1px solid #dc2626;color:#991b1b;padding:10px 14px;border-radius:6px;font-weight:700;margin-bottom:16px;">
         TEST / SAMPLE NOTICE: This is a localhost simulation. No real money was refunded.
       </div>`
    : "";

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#1e293b;line-height:1.5;">
      <div style="background:#114224;padding:20px 24px;border-radius:8px 8px 0 0;color:#ffffff;">
        <h2 style="margin:0;font-size:20px;">TRAVISKA</h2>
        <p style="margin:4px 0 0;font-size:12px;color:#bbf7d0;">${
          isCompleted ? "Refund Credited & Completed" : "Refund Initiated"
        }</p>
      </div>
      <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
        ${testBannerHtml}
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>${headline}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border:1px solid #e2e8f0;">
          <tr><td style="padding:8px 12px;color:#64748b;width:150px;">Invoice No.</td><td style="padding:8px 12px;font-weight:600;">${invoice.invoiceNumber}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Trip</td><td style="padding:8px 12px;font-weight:600;">${tripName}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Booking ID</td><td style="padding:8px 12px;font-weight:600;">${bookingId}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Refund Amount</td><td style="padding:8px 12px;font-weight:700;color:#166534;">${amountFormatted}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Refund Reference</td><td style="padding:8px 12px;font-family:monospace;">${refText}</td></tr>
          <tr><td style="padding:8px 12px;color:#64748b;">Status</td><td style="padding:8px 12px;font-weight:600;">${displayStatus}</td></tr>
        </table>
        <p style="font-size:13px;color:#475569;">${timelineNote}</p>
        <p>${receiptSentence}</p>
        <p style="margin-top:20px;">Thank you,<br/><strong>Team Traviska</strong><br/>Website: <a href="https://traviska.com">traviska.com</a></p>
        <p style="margin-top:16px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
          This is an automated email. Please do not reply directly to noreply@traviska.com. For billing or trip support, contact <a href="mailto:admin@traviska.com">admin@traviska.com</a>.
        </p>
      </div>
    </div>
  `;

  return { subject, text, html };
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

  const transporter = getSmtpTransporter();
  const now = new Date();

  if (!transporter) {
    invoice.emailDelivery.status = "Not Configured";
    invoice.emailDelivery.lastAttemptAt = now;
    invoice.emailDelivery.lastError =
      "SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in server/.env.";
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
    const info = await transporter.sendMail({
      from: getFromAddress(),
      replyTo: process.env.SMTP_REPLY_TO || "admin@traviska.com",
      to: recipient,
      subject,
      text,
      html,
      attachments: pdfBuffer
        ? [
            {
              filename: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ]
        : [],
    });

    invoice.emailDelivery.status = "Accepted by Provider";
    invoice.emailDelivery.lastAttemptAt = new Date();
    invoice.emailDelivery.lastError = "";
    invoice.emailDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "Accepted by Provider",
      provider: "smtp",
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
  buildInvoiceEmailContent,
  buildRefundEmailContent,
  sendInvoiceEmail,
  sendRefundEmail,
};

