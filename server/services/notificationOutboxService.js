const NotificationOutbox = require("../models/NotificationOutbox");
const {
  getHttpsEmailProvider,
  sendViaHttpsProvider,
  getSmtpTransporter,
  getFromAddress,
} = require("./emailService");
const {
  isWhatsAppConfigured,
  parseAndValidatePhone,
  sanitizeTemplateParam,
} = require("./whatsappService");
const { renderStaffAlertEmail } = require("./emailTemplateService");
const { OFFICIAL_CANCELLATION_POLICY } = require("./cancellationPolicyService");
const { generatePolicyPdfBuffer, getPolicyAttachmentFilename } = require("./policyPdfService");

/**
 * Staff alert recipient list (configurable via STAFF_ALERT_EMAILS, defaults to admin@traviska.com).
 */
function getStaffAlertRecipients() {
  const raw = (process.env.STAFF_ALERT_EMAILS || "admin@traviska.com").trim();
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/**
 * Safe feature gate for Meta WhatsApp Utility templates.
 * Only templates explicitly configured in WHATSAPP_APPROVED_TEMPLATES (comma-separated)
 * or approved existing templates (traviska_invoice_v1, traviska_refund_initiated, traviska_refund_completed)
 * are allowed to be dispatched automatically.
 */
function isWhatsAppTemplateApproved(templateName) {
  if (!templateName) return false;
  const approvedSet = new Set(
    String(
      process.env.WHATSAPP_APPROVED_TEMPLATES ||
        "traviska_invoice_v1,traviska_booking_invoice,traviska_refund_initiated,traviska_refund_completed"
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return approvedSet.has(templateName);
}

async function deliverOutboxEmail(outboxDoc) {
  const httpsProvider = getHttpsEmailProvider();
  const transporter = getSmtpTransporter();
  const from = getFromAddress();
  const replyTo = (process.env.SMTP_REPLY_TO || "admin@traviska.com").trim();

  outboxDoc.attempts = (outboxDoc.attempts || 0) + 1;
  outboxDoc.lastAttemptAt = new Date();

  if (!httpsProvider && !transporter) {
    outboxDoc.status = "Failed";
    outboxDoc.provider = "none";
    outboxDoc.lastError = "No email provider configured (BREVO_API_KEY, RESEND_API_KEY, or SMTP_*).";
    await outboxDoc.save();
    return outboxDoc;
  }

  try {
    const attachments = [];
    const allowPolicyAttach =
      Boolean(outboxDoc.attachPolicyVersion) &&
      (OFFICIAL_CANCELLATION_POLICY.legalApprovalStatus !== "PENDING_LEGAL_REVIEW" ||
        process.env.NODE_ENV !== "production" ||
        process.env.ENABLE_POLICY_PDF_ATTACHMENT === "true");
    if (allowPolicyAttach) {
      try {
        const policyBuf = await generatePolicyPdfBuffer({
          policyVersion: outboxDoc.attachPolicyVersion,
        });
        attachments.push({
          filename: getPolicyAttachmentFilename(outboxDoc.attachPolicyVersion),
          content: policyBuf,
          contentType: "application/pdf",
        });
      } catch {
        // Non-fatal
      }
    }

    if (httpsProvider) {
      const info = await sendViaHttpsProvider(httpsProvider, {
        from,
        replyTo,
        to: outboxDoc.recipient,
        subject: outboxDoc.subject,
        text: outboxDoc.textBody,
        html: outboxDoc.htmlBody,
        attachments,
      });
      outboxDoc.status = "Accepted";
      outboxDoc.provider = info.provider;
      outboxDoc.providerMessageId = info.messageId || "";
      outboxDoc.lastError = "";
    } else {
      const info = await transporter.sendMail({
        from,
        replyTo,
        to: outboxDoc.recipient,
        subject: outboxDoc.subject,
        text: outboxDoc.textBody,
        html: outboxDoc.htmlBody,
        attachments,
      });
      outboxDoc.status = "Accepted";
      outboxDoc.provider = "smtp";
      outboxDoc.providerMessageId = info.messageId || "";
      outboxDoc.lastError = "";
    }
  } catch (err) {
    outboxDoc.status = "Failed";
    outboxDoc.lastError = err?.message || "Email dispatch failed";
    const backoffMinutes = [2, 10, 30, 60, 120][Math.min(outboxDoc.attempts - 1, 4)] || 120;
    outboxDoc.nextRetryAt =
      outboxDoc.attempts < (outboxDoc.maxAttempts || 5)
        ? new Date(Date.now() + backoffMinutes * 60 * 1000)
        : null;
  }

  await outboxDoc.save();
  return outboxDoc;
}

async function deliverOutboxWhatsApp(outboxDoc) {
  outboxDoc.attempts = (outboxDoc.attempts || 0) + 1;
  outboxDoc.lastAttemptAt = new Date();

  if (!isWhatsAppTemplateApproved(outboxDoc.templateName)) {
    outboxDoc.status = "Failed";
    outboxDoc.provider = "meta";
    outboxDoc.lastError = `Template '${outboxDoc.templateName}' is awaiting Meta approval (not in WHATSAPP_APPROVED_TEMPLATES).`;
    await outboxDoc.save();
    return outboxDoc;
  }

  if (!isWhatsAppConfigured()) {
    outboxDoc.status = "Failed";
    outboxDoc.provider = "meta";
    outboxDoc.lastError = "WhatsApp Cloud API is not configured.";
    await outboxDoc.save();
    return outboxDoc;
  }

  const parsed = parseAndValidatePhone(outboxDoc.recipient);
  if (!parsed.valid) {
    outboxDoc.status = "Failed";
    outboxDoc.provider = "meta";
    outboxDoc.lastError = parsed.reason || "Invalid phone number";
    await outboxDoc.save();
    return outboxDoc;
  }

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVer = (process.env.WHATSAPP_API_VERSION || "v21.0").trim();
  const lang = (process.env.WHATSAPP_TEMPLATE_LANG || "en").trim();

  try {
    const res = await fetch(`https://graph.facebook.com/${apiVer}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: parsed.waDigits,
        type: "template",
        template: {
          name: outboxDoc.templateName,
          language: { code: lang },
          components: [
            {
              type: "body",
              parameters: (outboxDoc.templateParams || []).map((p) => ({
                type: "text",
                text: sanitizeTemplateParam(p),
              })),
            },
          ],
        },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error?.message || `Meta API HTTP ${res.status}`);
    }
    outboxDoc.status = "Accepted";
    outboxDoc.provider = "meta";
    outboxDoc.providerMessageId = data?.messages?.[0]?.id || "";
    outboxDoc.lastError = "";
  } catch (err) {
    outboxDoc.status = "Failed";
    outboxDoc.provider = "meta";
    outboxDoc.lastError = err?.message || "Meta WhatsApp dispatch failed";
    const backoffMinutes = [2, 10, 30, 60, 120][Math.min(outboxDoc.attempts - 1, 4)] || 120;
    outboxDoc.nextRetryAt =
      outboxDoc.attempts < (outboxDoc.maxAttempts || 5)
        ? new Date(Date.now() + backoffMinutes * 60 * 1000)
        : null;
  }

  await outboxDoc.save();
  return outboxDoc;
}

/**
 * Queues and dispatches a transactional email safely via NotificationOutbox (idempotent).
 */
async function queueAndSendEmail({
  audience = "customer",
  eventType,
  bookingId = null,
  requestId = null,
  recipient,
  subject,
  textBody,
  htmlBody,
  attachPolicyVersion = "",
  idempotencyKey,
}) {
  if (!recipient) return null;
  if (idempotencyKey) {
    const existing = await NotificationOutbox.findOne({ idempotencyKey });
    if (existing) return existing;
  }

  const doc = await NotificationOutbox.create({
    channel: "email",
    audience,
    eventType,
    bookingId,
    requestId,
    recipient,
    subject,
    textBody,
    htmlBody,
    attachPolicyVersion,
    status: "Pending",
    idempotencyKey: idempotencyKey || undefined,
  });

  return deliverOutboxEmail(doc);
}

/**
 * Queues and dispatches a gated Meta WhatsApp notification only if whatsappOptIn === true.
 */
async function queueAndSendWhatsApp({
  booking,
  eventType,
  requestId = null,
  templateName,
  templateParams = [],
  idempotencyKey,
}) {
  if (!booking || booking.whatsappOptIn !== true) {
    return null;
  }
  if (idempotencyKey) {
    const existing = await NotificationOutbox.findOne({ idempotencyKey });
    if (existing) return existing;
  }

  const doc = await NotificationOutbox.create({
    channel: "whatsapp",
    audience: "customer",
    eventType,
    bookingId: booking._id,
    requestId,
    recipient: booking.phone || "",
    templateName,
    templateParams,
    status: "Pending",
    idempotencyKey: idempotencyKey || undefined,
  });

  return deliverOutboxWhatsApp(doc);
}

/**
 * Sends internal staff operational alert email(s) to configured recipients (defaults to admin@traviska.com).
 */
async function sendStaffAlertEmail({
  eventType,
  booking,
  request = null,
  summaryText,
  idempotencyKeyPrefix,
}) {
  const recipients = getStaffAlertRecipients();
  const baseUrl = (process.env.PUBLIC_WEBSITE_URL || "https://traviska.com").replace(/\/+$/, "");
  const adminLink = `${baseUrl}/admin/booking-requests`;
  const bookingCode = booking?.bookingCode || String(booking?._id || "");
  const tripTitle = booking?.trip?.title || "Traviska Trip";

  const subject = `[Traviska Admin Alert] ${eventType} — ${bookingCode}`;
  const rendered = renderStaffAlertEmail({
    urgencyLabel: /fail|reconciliation|manual/i.test(eventType) ? "URGENT ACTION" : "ACTION REQUIRED",
    urgencyTone: /fail|reconciliation/i.test(eventType) ? "danger" : "warning",
    title: eventType,
    bookingCode,
    customerSummary: `${booking?.name || "—"} (${booking?.phone || "—"} • ${booking?.email || "—"})`,
    tripTitle,
    reason: request?.reason || "",
    amountSummary: request?.eligibleRefundAmount ? `₹${Number(request.eligibleRefundAmount).toLocaleString("en-IN")}` : "",
    actionRequired: summaryText || "Review this booking request in Regular Admin.",
    adminUrl: adminLink,
  });
  const textBody = rendered.text;
  const htmlBody = rendered.html;

  const results = [];
  for (const recipient of recipients) {
    const key = idempotencyKeyPrefix ? `${idempotencyKeyPrefix}:${recipient}` : undefined;
    const res = await queueAndSendEmail({
      audience: "staff",
      eventType,
      bookingId: booking?._id || null,
      requestId: request?._id || null,
      recipient,
      subject,
      textBody,
      htmlBody,
      idempotencyKey: key,
    });
    results.push(res);
  }
  return results;
}

let outboxWorkerTimer = null;
let outboxWorkerRunning = false;

/**
 * Processes due failed/pending outbox notifications in the background on Render
 * even when no customer or Admin is online.
 */
async function processDueOutboxNotifications() {
  if (outboxWorkerRunning) return { processed: 0 };
  outboxWorkerRunning = true;
  let processed = 0;
  try {
    const now = new Date();
    const dueJobs = await NotificationOutbox.find({
      status: { $in: ["Pending", "Failed"] },
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    })
      .sort({ createdAt: 1 })
      .limit(20);

    for (const job of dueJobs) {
      if ((job.attempts || 0) >= (job.maxAttempts || 5)) continue;
      if (job.channel === "whatsapp") {
        await deliverOutboxWhatsApp(job);
      } else {
        await deliverOutboxEmail(job);
      }
      processed += 1;
    }
  } catch (err) {
    console.warn("NotificationOutbox worker tick warning:", err.message);
  } finally {
    outboxWorkerRunning = false;
  }
  return { processed };
}

function startNotificationOutboxWorker(intervalMs = 60000) {
  if (outboxWorkerTimer) return outboxWorkerTimer;
  outboxWorkerTimer = setInterval(() => {
    processDueOutboxNotifications().catch(() => {});
  }, intervalMs);
  if (typeof outboxWorkerTimer.unref === "function") {
    outboxWorkerTimer.unref();
  }
  console.log("📬 NotificationOutbox background retry worker started.");
  return outboxWorkerTimer;
}

module.exports = {
  getStaffAlertRecipients,
  isWhatsAppTemplateApproved,
  deliverOutboxEmail,
  deliverOutboxWhatsApp,
  queueAndSendEmail,
  queueAndSendWhatsApp,
  sendStaffAlertEmail,
  processDueOutboxNotifications,
  startNotificationOutboxWorker,
};
