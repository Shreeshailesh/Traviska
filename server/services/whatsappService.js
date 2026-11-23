const { formatINR } = require("./invoiceService");

/**
 * WhatsApp Notification Service (Meta WhatsApp Cloud API + Preview)
 * Uses official Meta Graph API when WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID
 * are configured in server/.env. Otherwise remains in "Preview Only / Not Configured".
 */

function getWhatsAppProvider() {
  const explicit = (process.env.WHATSAPP_PROVIDER || "").trim().toLowerCase();
  if (explicit) return explicit;
  if (process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
    return "meta";
  }
  return "none";
}

function isWhatsAppConfigured() {
  const provider = getWhatsAppProvider();
  if (provider === "meta") {
    return Boolean(
      process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID
    );
  }
  if (provider === "interakt" || provider === "aisensy") {
    return Boolean(process.env.WHATSAPP_API_KEY);
  }
  return false;
}

/**
 * Normalizes and validates phone numbers into E.164 format.
 * - 10-digit Indian numbers (6-9 start) -> +91XXXXXXXXXX
 * - 11-digit leading-0 Indian numbers (0[6-9]...) -> +91XXXXXXXXXX
 * - 12-digit 91[6-9]... -> +91XXXXXXXXXX (never prepends +91 twice)
 * - Other international numbers with explicit + or country code (8-15 digits) -> +<digits>
 * - Rejects invalid/too-short/all-zero numbers by returning { valid: false }.
 */
function parseAndValidatePhone(phone) {
  const raw = String(phone || "").trim();
  if (!raw) return { valid: false, e164: "", waDigits: "", reason: "Phone number is empty" };

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (!digits || /^0+$/.test(digits)) {
    return { valid: false, e164: "", waDigits: "", reason: "Phone number is invalid" };
  }

  let finalDigits = digits;

  if (!hasPlus && digits.length === 10) {
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return { valid: false, e164: "", waDigits: "", reason: "Invalid 10-digit Indian mobile number" };
    }
    finalDigits = `91${digits}`;
  } else if (!hasPlus && digits.length === 11 && digits.startsWith("0")) {
    const trimmed = digits.slice(1);
    if (!/^[6-9]\d{9}$/.test(trimmed)) {
      return { valid: false, e164: "", waDigits: "", reason: "Invalid Indian mobile number" };
    }
    finalDigits = `91${trimmed}`;
  } else {
    if (finalDigits.length < 8 || finalDigits.length > 15) {
      return {
        valid: false,
        e164: "",
        waDigits: "",
        reason: "Phone number must be 8–15 digits in E.164 format",
      };
    }
    if (finalDigits.startsWith("91") && finalDigits.length === 12 && !/^91[6-9]\d{9}$/.test(finalDigits)) {
      return { valid: false, e164: "", waDigits: "", reason: "Invalid +91 Indian mobile number" };
    }
  }

  return {
    valid: true,
    e164: `+${finalDigits}`,
    waDigits: finalDigits,
    reason: "",
  };
}

function normalizeWhatsAppPhone(phone) {
  const parsed = parseAndValidatePhone(phone);
  return parsed.valid ? parsed.waDigits : "";
}

/**
 * Meta rejects template parameters containing newlines, tabs, >4 spaces, or empty strings.
 */
function sanitizeTemplateParam(val, maxLen = 250) {
  const cleaned = String(val ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!cleaned) return "—";
  return cleaned.length > maxLen ? `${cleaned.slice(0, maxLen - 3)}...` : cleaned;
}

function buildWhatsAppInvoiceMessage(invoice, secureLink) {
  const customerName = invoice.customerSnapshot?.name || "Traveller";
  const tripName = invoice.tripSnapshot?.title || "Traviska Trip";
  const bookingId = invoice.bookingCode || "—";
  const travelDate = invoice.tripSnapshot?.travelDate || "—";
  const amountPaid = formatINR(invoice.pricing?.netPaidPaise || 0);
  const balanceDue = formatINR(invoice.pricing?.balanceDuePaise || 0);
  const status =
    invoice.refundSettlement?.status === "Initiated"
      ? "Refund Initiated"
      : invoice.refundSettlement?.status === "Credited"
      ? invoice.paymentStatus === "Partially Refunded"
        ? "Partially Refunded (Credited)"
        : "Refunded (Credited)"
      : invoice.paymentStatus || "Paid";

  const headline =
    status === "Partially Paid"
      ? `Your advance payment has been received. Remaining balance: ${balanceDue}.`
      : status === "Paid"
      ? "Your booking payment has been confirmed in full."
      : `Your booking payment status is: ${status}.`;

  const testPrefix = invoice.isSample
    ? "[TEST] SAMPLE PREVIEW — No actual payment was collected and no real booking was confirmed.\n\n"
    : "";

  const balanceLine =
    invoice.pricing?.balanceDuePaise > 0
      ? `\nRemaining Balance: ${balanceDue}`
      : "";

  return `${testPrefix}Hello ${customerName}!

Thank you for choosing Traviska.
${headline}

Trip: ${tripName}
Booking ID: ${bookingId}
Travel Date: ${travelDate}
Payment Status: ${status}
Amount Paid: ${amountPaid}${balanceLine}

Your invoice is available here:
${secureLink}

We look forward to travelling with you!
Team Traviska`;
}

function buildWhatsAppRefundMessage({
  invoice,
  stage = "initiated",
  refundAmountPaise = 0,
  refundReference = "",
  secureLink = "",
}) {
  const customerName = invoice.customerSnapshot?.name || "Traveller";
  const tripName = invoice.tripSnapshot?.title || "Traviska Trip";
  const bookingId = invoice.bookingCode || "—";
  const amountFormatted = formatINR(
    refundAmountPaise || invoice.pricing?.refundedAmountPaise || 0
  );
  const isCompleted = stage === "completed";
  const statusLabel = isCompleted
    ? invoice.paymentStatus === "Partially Refunded"
      ? "Partially Refunded (Credited)"
      : "Refunded (Credited)"
    : "Refund Initiated";

  const testPrefix = invoice.isSample
    ? "[TEST] SAMPLE PREVIEW — This is a localhost simulation. No real money was refunded.\n\n"
    : "";

  const headline = isCompleted
    ? "Your refund has been credited to your original payment method."
    : "Your refund has been initiated and typically reflects within 5–7 business days.";

  const receiptLine = isCompleted
    ? `Your updated adjustment receipt is attached and available here:\n${secureLink}`
    : `We will send your updated receipt PDF once the refund is credited.\nTrack status here: ${secureLink}`;

  return `${testPrefix}Hello ${customerName}!

${headline}

Invoice No.: ${invoice.invoiceNumber}
Trip: ${tripName}
Booking ID: ${bookingId}
Refund Amount: ${amountFormatted}
Refund Reference: ${refundReference || "—"}
Status: ${statusLabel}

${receiptLine}

Team Traviska`;
}

/**
 * Uploads the PDF buffer to Meta WhatsApp Media API and returns the media_id.
 */
async function uploadWhatsAppPdfMedia({ pdfBuffer, fileName, phoneNumberId, token }) {
  const formData = new FormData();
  const blob = new Blob([pdfBuffer], { type: "application/pdf" });
  formData.append("file", blob, fileName || "Traviska-Invoice.pdf");
  formData.append("type", "application/pdf");
  formData.append("messaging_product", "whatsapp");

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );
  const data = await res.json();
  if (!res.ok || !data.id) {
    throw new Error(data?.error?.message || "WhatsApp media upload failed");
  }
  return data.id;
}

/**
 * Sends a message via Meta WhatsApp Cloud API.
 */
async function sendMetaWhatsAppPayload({ phoneNumberId, token, payload }) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...payload,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data?.error?.message || "WhatsApp API request failed");
    err.code = String(data?.error?.code || "");
    throw err;
  }
  return data;
}

async function sendViaInterakt({ invoice, recipientPhone, secureLink }) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const templateName = (process.env.WHATSAPP_TEMPLATE_NAME || "traviska_booking_invoice").trim();
  const countryCode = "+91";
  const localPhone = recipientPhone.startsWith("91") && recipientPhone.length === 12
    ? recipientPhone.slice(2)
    : recipientPhone;

  const res = await fetch("https://api.interakt.ai/v1/public/message/", {
    method: "POST",
    headers: {
      Authorization: `Basic ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      countryCode,
      phoneNumber: localPhone,
      callbackData: invoice.invoiceNumber,
      type: "Template",
      template: {
        name: templateName,
        languageCode: process.env.WHATSAPP_TEMPLATE_LANG || "en",
        bodyValues: [
          invoice.customerSnapshot?.name || "Traveller",
          invoice.tripSnapshot?.title || "Traviska Trip",
          invoice.bookingCode || "—",
          invoice.tripSnapshot?.travelDate || "—",
          formatINR(invoice.pricing?.netPaidPaise || 0),
          secureLink,
        ],
      },
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.result === false) {
    throw new Error(data?.message || "Interakt API request failed");
  }
  return data?.id || "";
}

async function sendViaAiSensy({ invoice, recipientPhone, secureLink }) {
  const apiKey = process.env.WHATSAPP_API_KEY;
  const campaignName = (process.env.WHATSAPP_TEMPLATE_NAME || "traviska_booking_invoice").trim();

  const res = await fetch("https://backend.aisensy.com/campaign/t1/api/v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey,
      campaignName,
      destination: recipientPhone,
      userName: invoice.customerSnapshot?.name || "Traveller",
      templateParams: [
        invoice.customerSnapshot?.name || "Traveller",
        invoice.tripSnapshot?.title || "Traviska Trip",
        invoice.bookingCode || "—",
        invoice.tripSnapshot?.travelDate || "—",
        formatINR(invoice.pricing?.netPaidPaise || 0),
        secureLink,
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "AiSensy API request failed");
  }
  return data?.submitted_message_id || "";
}

/**
 * Verifies explicit customer WhatsApp opt-in before initiating template messages.
 */
function hasWhatsAppOptIn(invoice, optInConfirmed = false) {
  if (optInConfirmed === true) return true;
  return invoice?.whatsappDelivery?.optIn === true;
}

/**
 * Prepares the WhatsApp preview and, when WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID
 * (or Interakt/AiSensy Coexistence API key) are configured, dispatches the message.
 */
async function sendOrPrepareWhatsApp({
  invoice,
  baseUrl,
  pdfBuffer = null,
  pdfFileName = "",
  allowRetry = false,
  eventKey = "booking_invoice",
  optInConfirmed = false,
}) {
  const origin =
    baseUrl ||
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://traviska.com"
      : "http://localhost:5173");

  const secureLink = `${origin}/customer/dashboard#invoice-${invoice._id}`;
  const previewMessage = buildWhatsAppInvoiceMessage(invoice, secureLink);
  const provider = getWhatsAppProvider();
  const configured = isWhatsAppConfigured();

  invoice.whatsappDelivery.secureLink = secureLink;
  invoice.whatsappDelivery.previewMessage = previewMessage;
  if (optInConfirmed === true) {
    invoice.whatsappDelivery.optIn = true;
  }

  // Duplicate prevention for automatic notifications
  const alreadyDispatched =
    !allowRetry &&
    Array.isArray(invoice.whatsappDelivery.dispatchedEventKeys) &&
    invoice.whatsappDelivery.dispatchedEventKeys.includes(eventKey);

  if (alreadyDispatched) {
    return {
      configured,
      duplicatePrevented: true,
      status: invoice.whatsappDelivery.status,
      previewMessage,
      secureLink,
    };
  }

  if (!configured) {
    invoice.whatsappDelivery.status = "Preview Only / Not Configured";
    invoice.whatsappDelivery.lastError =
      "WhatsApp Business Platform API credentials not configured.";
    await invoice.save();
    return {
      configured: false,
      status: invoice.whatsappDelivery.status,
      previewMessage,
      secureLink,
    };
  }

  if (!hasWhatsAppOptIn(invoice, optInConfirmed)) {
    invoice.whatsappDelivery.status = "Opt-In Required";
    invoice.whatsappDelivery.lastAttemptAt = new Date();
    invoice.whatsappDelivery.errorCode = "OPT_IN_REQUIRED";
    invoice.whatsappDelivery.lastError =
      "Customer has not opted in to WhatsApp notifications.";
    await invoice.save();
    return {
      configured: true,
      optInRequired: true,
      status: "Opt-In Required",
      previewMessage,
      secureLink,
      errorCode: "OPT_IN_REQUIRED",
      error: invoice.whatsappDelivery.lastError,
    };
  }

  const parsedPhone = parseAndValidatePhone(invoice.customerSnapshot?.phone);
  if (!parsedPhone.valid) {
    invoice.whatsappDelivery.status = "Failed";
    invoice.whatsappDelivery.lastAttemptAt = new Date();
    invoice.whatsappDelivery.errorCode = "INVALID_PHONE";
    invoice.whatsappDelivery.lastError = parsedPhone.reason;
    invoice.whatsappDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "Failed",
      provider: "whatsapp_cloud_api",
      recipient: invoice.customerSnapshot?.phone || "",
      eventKey,
      errorCode: "INVALID_PHONE",
      error: parsedPhone.reason,
    });
    await invoice.save();
    return {
      configured: true,
      status: "Failed",
      previewMessage,
      secureLink,
      error: parsedPhone.reason,
    };
  }

  const recipientPhone = parsedPhone.waDigits;
  invoice.whatsappDelivery.normalizedPhone = parsedPhone.e164;
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const customTemplate = (process.env.WHATSAPP_TEMPLATE_NAME || "").trim();
  const isProduction = process.env.NODE_ENV === "production";

  invoice.whatsappDelivery.status = "Sending";
  invoice.whatsappDelivery.templateName = customTemplate || provider;
  await invoice.save();

  try {
    let messageId = "";
    let templatePending = false;
    let pendingReason = "";

    if (provider === "interakt") {
      messageId = await sendViaInterakt({ invoice, recipientPhone, secureLink });
    } else if (provider === "aisensy") {
      messageId = await sendViaAiSensy({ invoice, recipientPhone, secureLink });
    } else {
      let sentViaCustomTemplate = false;
      if (customTemplate && customTemplate !== "hello_world") {
        try {
          const components = [];
          if (pdfBuffer) {
            const mediaId = await uploadWhatsAppPdfMedia({
              pdfBuffer,
              fileName: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
              phoneNumberId,
              token,
            });
            components.push({
              type: "header",
              parameters: [
                {
                  type: "document",
                  document: {
                    id: mediaId,
                    filename: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
                  },
                },
              ],
            });
          }

          const amountParam =
            invoice.pricing?.balanceDuePaise > 0
              ? `${formatINR(invoice.pricing?.netPaidPaise || 0)} (Partially Paid - Balance: ${formatINR(
                  invoice.pricing.balanceDuePaise
                )})`
              : `${formatINR(invoice.pricing?.netPaidPaise || 0)} (${
                  invoice.paymentStatus || "Paid"
                })`;

          components.push({
            type: "body",
            parameters: [
              { type: "text", text: sanitizeTemplateParam(invoice.customerSnapshot?.name || "Traveller") },
              { type: "text", text: sanitizeTemplateParam(invoice.tripSnapshot?.title || "Traviska Trip") },
              { type: "text", text: sanitizeTemplateParam(invoice.bookingCode || "—") },
              { type: "text", text: sanitizeTemplateParam(invoice.tripSnapshot?.travelDate || "—") },
              { type: "text", text: sanitizeTemplateParam(amountParam) },
              { type: "text", text: sanitizeTemplateParam(secureLink) },
            ],
          });

          const tplRes = await sendMetaWhatsAppPayload({
            phoneNumberId,
            token,
            payload: {
              to: recipientPhone,
              type: "template",
              template: {
                name: customTemplate,
                language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
                components,
              },
            },
          });
          messageId = tplRes.messages?.[0]?.id || "";
          sentViaCustomTemplate = true;
        } catch (tplErr) {
          if (tplErr.code === "132001") {
            templatePending = true;
            pendingReason = tplErr.message;
          } else {
            throw tplErr;
          }
        }
      }

      if (!sentViaCustomTemplate) {
        if (isProduction) {
          // Never send unpermitted free-form messages or hello_world in production when template is pending
          invoice.whatsappDelivery.status = "Template Pending Approval";
          invoice.whatsappDelivery.lastAttemptAt = new Date();
          invoice.whatsappDelivery.errorCode = "132001";
          invoice.whatsappDelivery.lastError =
            pendingReason || `Template "${customTemplate}" is pending Meta approval.`;
          invoice.whatsappDelivery.attempts.push({
            attemptedAt: new Date(),
            status: "Template Pending Approval",
            provider: "whatsapp_cloud_api",
            templateName: customTemplate,
            recipient: parsedPhone.e164,
            eventKey,
            errorCode: "132001",
            error: invoice.whatsappDelivery.lastError,
          });
          await invoice.save();
          return {
            configured: true,
            status: "Template Pending Approval",
            recipient: parsedPhone.e164,
            previewMessage,
            secureLink,
          };
        }

        // Development-only 24h session test fallback
        const textRes = await sendMetaWhatsAppPayload({
          phoneNumberId,
          token,
          payload: {
            to: recipientPhone,
            type: "text",
            text: { body: previewMessage },
          },
        });
        messageId = textRes.messages?.[0]?.id || "";

        if (pdfBuffer) {
          const mediaId = await uploadWhatsAppPdfMedia({
            pdfBuffer,
            fileName: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
            phoneNumberId,
            token,
          });
          await sendMetaWhatsAppPayload({
            phoneNumberId,
            token,
            payload: {
              to: recipientPhone,
              type: "document",
              document: {
                id: mediaId,
                filename: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
                caption: `Traviska Invoice ${invoice.invoiceNumber}`,
              },
            },
          });
        }
      }
    }

    // Mark "API Accepted" — true "Delivered"/"Read" only arrives via Meta Webhook
    invoice.whatsappDelivery.status = "API Accepted";
    invoice.whatsappDelivery.lastMessageId = messageId;
    invoice.whatsappDelivery.lastAttemptAt = new Date();
    invoice.whatsappDelivery.errorCode = "";
    invoice.whatsappDelivery.lastError = "";
    if (!Array.isArray(invoice.whatsappDelivery.dispatchedEventKeys)) {
      invoice.whatsappDelivery.dispatchedEventKeys = [];
    }
    if (!invoice.whatsappDelivery.dispatchedEventKeys.includes(eventKey)) {
      invoice.whatsappDelivery.dispatchedEventKeys.push(eventKey);
    }
    invoice.whatsappDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "API Accepted",
      provider: provider === "meta" ? "whatsapp_cloud_api" : provider,
      templateName: customTemplate || provider,
      messageId,
      recipient: parsedPhone.e164,
      eventKey,
    });
    await invoice.save();

    return {
      configured: true,
      status: "API Accepted",
      messageId,
      recipient: parsedPhone.e164,
      previewMessage,
      secureLink,
    };
  } catch (err) {
    invoice.whatsappDelivery.status = "Failed";
    invoice.whatsappDelivery.lastAttemptAt = new Date();
    invoice.whatsappDelivery.errorCode = String(err.code || "");
    invoice.whatsappDelivery.lastError = err.message;
    invoice.whatsappDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "Failed",
      provider: provider === "meta" ? "whatsapp_cloud_api" : provider,
      templateName: customTemplate || provider,
      recipient: parsedPhone.e164,
      eventKey,
      errorCode: String(err.code || ""),
      error: err.message,
    });
    await invoice.save();

    return {
      configured: true,
      status: "Failed",
      recipient: parsedPhone.e164,
      previewMessage,
      secureLink,
      errorCode: String(err.code || ""),
      error: err.message,
    };
  }
}

async function prepareWhatsAppPreview({ invoice, baseUrl, pdfBuffer = null, pdfFileName = "", allowRetry = false, eventKey = "invoice_initial", optInConfirmed = false }) {
  return sendOrPrepareWhatsApp({ invoice, baseUrl, pdfBuffer, pdfFileName, allowRetry, eventKey, optInConfirmed });
}

async function sendOrPrepareWhatsAppRefund({
  invoice,
  stage = "initiated",
  refundAmountPaise = 0,
  refundReference = "",
  baseUrl = "",
  pdfBuffer = null,
  pdfFileName = "",
  allowRetry = false,
  optInConfirmed = false,
}) {
  const origin =
    baseUrl ||
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://traviska.com"
      : "http://localhost:5173");
  const secureLink = `${origin}/customer/dashboard#invoice-${invoice._id}`;
  const previewMessage = buildWhatsAppRefundMessage({
    invoice,
    stage,
    refundAmountPaise,
    refundReference,
    secureLink,
  });

  invoice.whatsappDelivery.secureLink = secureLink;
  invoice.whatsappDelivery.previewMessage = previewMessage;
  if (optInConfirmed === true) {
    invoice.whatsappDelivery.optIn = true;
  }

  if (!isWhatsAppConfigured()) {
    invoice.whatsappDelivery.status = "Preview Only / Not Configured";
    await invoice.save();
    return {
      configured: false,
      status: invoice.whatsappDelivery.status,
      previewMessage,
      secureLink,
    };
  }

  if (!hasWhatsAppOptIn(invoice, optInConfirmed)) {
    invoice.whatsappDelivery.status = "Opt-In Required";
    invoice.whatsappDelivery.lastAttemptAt = new Date();
    invoice.whatsappDelivery.errorCode = "OPT_IN_REQUIRED";
    invoice.whatsappDelivery.lastError =
      "Customer has not opted in to WhatsApp notifications.";
    await invoice.save();
    return {
      configured: true,
      optInRequired: true,
      status: "Opt-In Required",
      previewMessage,
      secureLink,
      errorCode: "OPT_IN_REQUIRED",
      error: invoice.whatsappDelivery.lastError,
    };
  }

  const parsedPhone = parseAndValidatePhone(invoice.customerSnapshot?.phone);
  if (!parsedPhone.valid) {
    invoice.whatsappDelivery.status = "Failed";
    invoice.whatsappDelivery.lastError = parsedPhone.reason;
    invoice.whatsappDelivery.errorCode = "INVALID_PHONE";
    await invoice.save();
    return {
      configured: true,
      status: "Failed",
      errorCode: "INVALID_PHONE",
      error: parsedPhone.reason,
    };
  }

  const recipientPhone = parsedPhone.waDigits;
  invoice.whatsappDelivery.normalizedPhone = parsedPhone.e164;

  const eventKey = `refund_${stage}_${refundReference || "default"}`;
  const alreadyDispatched = Array.isArray(invoice.whatsappDelivery.dispatchedEventKeys)
    ? invoice.whatsappDelivery.dispatchedEventKeys.includes(eventKey)
    : false;
  if (alreadyDispatched && !allowRetry) {
    return {
      configured: true,
      duplicatePrevented: true,
      status: invoice.whatsappDelivery.status,
      messageId: invoice.whatsappDelivery.lastMessageId || "",
      recipient: parsedPhone.e164,
      previewMessage,
      secureLink,
    };
  }

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const isCompleted = stage === "completed";
  const refundTemplate = isCompleted
    ? (process.env.WHATSAPP_REFUND_TEMPLATE_NAME || "").trim()
    : (process.env.WHATSAPP_REFUND_INITIATED_TEMPLATE_NAME || "").trim();
  const effectivePdfBuffer = isCompleted ? pdfBuffer : null;

  try {
    let messageId = "";
    let sentViaTemplate = false;

    if (refundTemplate) {
      invoice.whatsappDelivery.templateName = refundTemplate;
      try {
        const components = [];
        if (effectivePdfBuffer) {
          const mediaId = await uploadWhatsAppPdfMedia({
            pdfBuffer: effectivePdfBuffer,
            fileName: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
            phoneNumberId,
            token,
          });
          components.push({
            type: "header",
            parameters: [
              {
                type: "document",
                document: {
                  id: mediaId,
                  filename: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
                },
              },
            ],
          });
        }
        const refundStatusParam = isCompleted
          ? invoice.paymentStatus === "Partially Refunded"
            ? "Partially Refunded (Credited)"
            : "Refunded (Credited)"
          : "Refund Initiated";

        components.push({
          type: "body",
          parameters: [
            { type: "text", text: sanitizeTemplateParam(invoice.customerSnapshot?.name || "Traveller") },
            { type: "text", text: sanitizeTemplateParam(invoice.invoiceNumber) },
            { type: "text", text: sanitizeTemplateParam(invoice.tripSnapshot?.title || "Traviska Trip") },
            { type: "text", text: sanitizeTemplateParam(formatINR(refundAmountPaise || invoice.pricing?.refundedAmountPaise || 0)) },
            { type: "text", text: sanitizeTemplateParam(refundReference || "—") },
            { type: "text", text: sanitizeTemplateParam(refundStatusParam) },
          ],
        });

        const tplRes = await sendMetaWhatsAppPayload({
          phoneNumberId,
          token,
          payload: {
            to: recipientPhone,
            type: "template",
            template: {
              name: refundTemplate,
              language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
              components,
            },
          },
        });
        messageId = tplRes.messages?.[0]?.id || "";
        sentViaTemplate = true;
      } catch (tplErr) {
        const isPendingOrMissing = Number(tplErr.code) === 132001 || /not exist|translation/i.test(tplErr.message || "");
        if (!isPendingOrMissing) {
          throw tplErr;
        }
        if (process.env.NODE_ENV === "production") {
          invoice.whatsappDelivery.status = "Template Pending Approval";
          invoice.whatsappDelivery.lastAttemptAt = new Date();
          invoice.whatsappDelivery.errorCode = String(tplErr.code || "132001");
          invoice.whatsappDelivery.lastError = `Template "${refundTemplate}" is awaiting Meta approval.`;
          invoice.whatsappDelivery.attempts.push({
            attemptedAt: new Date(),
            status: "Template Pending Approval",
            provider: "whatsapp_cloud_api",
            templateName: refundTemplate,
            recipient: parsedPhone.e164,
            eventKey,
            errorCode: String(tplErr.code || "132001"),
            error: tplErr.message,
          });
          await invoice.save();
          return {
            configured: true,
            status: "Template Pending Approval",
            recipient: parsedPhone.e164,
            previewMessage,
            secureLink,
          };
        }
        console.log(`[WhatsApp] Refund template "${refundTemplate}" not ready (${tplErr.message}), falling back to dev session message.`);
      }
    }

    if (!sentViaTemplate) {
      if (process.env.NODE_ENV === "production") {
        invoice.whatsappDelivery.status = "Template Pending Approval";
        invoice.whatsappDelivery.lastAttemptAt = new Date();
        invoice.whatsappDelivery.lastError = "No approved WhatsApp refund template configured for production.";
        await invoice.save();
        return {
          configured: true,
          status: "Template Pending Approval",
          recipient: parsedPhone.e164,
          previewMessage,
          secureLink,
        };
      }

      const textRes = await sendMetaWhatsAppPayload({
        phoneNumberId,
        token,
        payload: {
          to: recipientPhone,
          type: "text",
          text: { body: previewMessage },
        },
      });
      messageId = textRes.messages?.[0]?.id || "";

      if (effectivePdfBuffer) {
        const mediaId = await uploadWhatsAppPdfMedia({
          pdfBuffer: effectivePdfBuffer,
          fileName: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
          phoneNumberId,
          token,
        });
        await sendMetaWhatsAppPayload({
          phoneNumberId,
          token,
          payload: {
            to: recipientPhone,
            type: "document",
            document: {
              id: mediaId,
              filename: pdfFileName || `${invoice.invoiceNumber.replace(/\//g, "-")}.pdf`,
              caption: `Traviska Refund Receipt ${invoice.invoiceNumber}`,
            },
          },
        });
      }
    }

    invoice.whatsappDelivery.status = "API Accepted";
    invoice.whatsappDelivery.lastMessageId = messageId;
    invoice.whatsappDelivery.lastAttemptAt = new Date();
    invoice.whatsappDelivery.errorCode = "";
    invoice.whatsappDelivery.lastError = "";
    if (!Array.isArray(invoice.whatsappDelivery.dispatchedEventKeys)) {
      invoice.whatsappDelivery.dispatchedEventKeys = [];
    }
    if (!invoice.whatsappDelivery.dispatchedEventKeys.includes(eventKey)) {
      invoice.whatsappDelivery.dispatchedEventKeys.push(eventKey);
    }
    invoice.whatsappDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "API Accepted",
      provider: "whatsapp_cloud_api",
      templateName: refundTemplate || "session_text",
      messageId,
      recipient: parsedPhone.e164,
      eventKey,
    });
    await invoice.save();

    return { configured: true, status: "API Accepted", messageId, recipient: parsedPhone.e164, previewMessage };
  } catch (err) {
    invoice.whatsappDelivery.status = "Failed";
    invoice.whatsappDelivery.lastAttemptAt = new Date();
    invoice.whatsappDelivery.errorCode = String(err.code || "");
    invoice.whatsappDelivery.lastError = err.message;
    invoice.whatsappDelivery.attempts.push({
      attemptedAt: new Date(),
      status: "Failed",
      provider: "whatsapp_cloud_api",
      templateName: refundTemplate || "session_text",
      recipient: parsedPhone.e164,
      eventKey,
      errorCode: String(err.code || ""),
      error: err.message,
    });
    await invoice.save();
    return { configured: true, status: "Failed", recipient: parsedPhone.e164, errorCode: String(err.code || ""), error: err.message };
  }
}

const WHATSAPP_STATUS_RANK = {
  "Not Configured": 0,
  "Preview Only / Not Configured": 0,
  "Opt-In Required": 0,
  "Template Pending Approval": 1,
  Queued: 1,
  Sending: 2,
  "API Accepted": 3,
  Sent: 4,
  Delivered: 5,
  Read: 6,
};

async function processWhatsAppWebhookPayload(body, InvoiceModel = require("../models/Invoice")) {
  const results = [];
  const entries = Array.isArray(body?.entry) ? body.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];
      for (const item of statuses) {
        const msgId = item?.id;
        if (!msgId) continue;

        const rawStatus = String(item.status || "").toLowerCase();
        const mappedStatus =
          rawStatus === "sent"
            ? "Sent"
            : rawStatus === "delivered"
            ? "Delivered"
            : rawStatus === "read"
            ? "Read"
            : rawStatus === "failed"
            ? "Failed"
            : "";
        if (!mappedStatus) continue;

        const invoice = await InvoiceModel.findOne({
          $or: [
            { "whatsappDelivery.lastMessageId": msgId },
            { "whatsappDelivery.attempts.messageId": msgId },
          ],
        });
        if (!invoice) {
          results.push({ messageId: msgId, matched: false, status: mappedStatus });
          continue;
        }

        const eventDate = item.timestamp
          ? new Date(Number(item.timestamp) * 1000)
          : new Date();
        const errObj = Array.isArray(item.errors) && item.errors[0] ? item.errors[0] : null;
        const errCode = errObj?.code ? String(errObj.code) : "";
        const errDesc = errObj ? errObj.title || errObj.message || errObj.error_data?.details || "" : "";

        const currentRank = WHATSAPP_STATUS_RANK[invoice.whatsappDelivery.status] ?? 0;
        const nextRank = WHATSAPP_STATUS_RANK[mappedStatus] ?? 0;

        if (mappedStatus === "Failed") {
          if (currentRank < WHATSAPP_STATUS_RANK.Delivered) {
            invoice.whatsappDelivery.status = "Failed";
          }
          invoice.whatsappDelivery.errorCode = errCode;
          invoice.whatsappDelivery.lastError = errDesc || "Meta WhatsApp delivery failed.";
        } else if (nextRank > currentRank) {
          invoice.whatsappDelivery.status = mappedStatus;
          if (mappedStatus === "Delivered" && !invoice.whatsappDelivery.deliveredAt) {
            invoice.whatsappDelivery.deliveredAt = eventDate;
          }
          if (mappedStatus === "Read") {
            if (!invoice.whatsappDelivery.deliveredAt) {
              invoice.whatsappDelivery.deliveredAt = eventDate;
            }
            if (!invoice.whatsappDelivery.readAt) {
              invoice.whatsappDelivery.readAt = eventDate;
            }
          }
        }

        const attempt = Array.isArray(invoice.whatsappDelivery.attempts)
          ? invoice.whatsappDelivery.attempts.find((a) => a.messageId === msgId)
          : null;
        if (attempt) {
          const attRank = WHATSAPP_STATUS_RANK[attempt.status] ?? 0;
          if (mappedStatus === "Failed") {
            if (attRank < WHATSAPP_STATUS_RANK.Delivered) attempt.status = "Failed";
            attempt.errorCode = errCode;
            attempt.error = errDesc;
          } else if (nextRank > attRank) {
            attempt.status = mappedStatus;
            if (mappedStatus === "Delivered" && !attempt.deliveredAt) attempt.deliveredAt = eventDate;
            if (mappedStatus === "Read") {
              if (!attempt.deliveredAt) attempt.deliveredAt = eventDate;
              if (!attempt.readAt) attempt.readAt = eventDate;
            }
          }
        }

        await invoice.save();
        results.push({
          messageId: msgId,
          matched: true,
          invoiceId: String(invoice._id),
          status: invoice.whatsappDelivery.status,
        });
      }
    }
  }

  return results;
}

async function sendCaptainOtpWhatsApp({ phone, otpCode }) {
  if (!isWhatsAppConfigured()) {
    return {
      configured: false,
      status: "Not Configured",
      error: "WhatsApp Business Platform API credentials not configured.",
    };
  }

  const parsedPhone = parseAndValidatePhone(phone);
  if (!parsedPhone.valid) {
    return {
      configured: true,
      status: "Failed",
      errorCode: "INVALID_PHONE",
      error: parsedPhone.reason,
    };
  }

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = (process.env.WHATSAPP_OTP_TEMPLATE_NAME || "traviska_captain_otp").trim();
  const langCode = (process.env.WHATSAPP_OTP_TEMPLATE_LANG || process.env.WHATSAPP_TEMPLATE_LANG || "en").trim();
  const cleanOtp = String(otpCode || "").trim();

  try {
    const tplRes = await sendMetaWhatsAppPayload({
      phoneNumberId,
      token,
      payload: {
        to: parsedPhone.waDigits,
        type: "template",
        template: {
          name: templateName,
          language: { code: langCode },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: cleanOtp }],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [{ type: "text", text: cleanOtp }],
            },
          ],
        },
      },
    });
    return {
      configured: true,
      status: "API Accepted",
      messageId: tplRes.messages?.[0]?.id || "",
      recipient: parsedPhone.e164,
      templateName,
    };
  } catch (err) {
    const isPending = Number(err.code) === 132001 || /not exist|translation/i.test(err.message || "");
    return {
      configured: true,
      status: isPending ? "Template Pending Approval" : "Failed",
      errorCode: String(err.code || ""),
      error: isPending
        ? `Template "${templateName}" is awaiting Meta approval.`
        : err.message,
      recipient: parsedPhone.e164,
      templateName,
    };
  }
}

async function sendDepartureGroupLinkWhatsApp({
  phone,
  customerName,
  tripTitle,
  departureDate,
  groupLink,
  bookingCode,
}) {
  if (!isWhatsAppConfigured()) {
    return {
      configured: false,
      status: "Not Configured",
      error: "WhatsApp Business Platform API credentials not configured.",
    };
  }

  const parsedPhone = parseAndValidatePhone(phone);
  if (!parsedPhone.valid) {
    return {
      configured: true,
      status: "Failed",
      errorCode: "INVALID_PHONE",
      error: parsedPhone.reason,
    };
  }

  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = (process.env.WHATSAPP_GROUP_TEMPLATE_NAME || "traviska_departure_group_v1").trim();
  const langCode = (process.env.WHATSAPP_TEMPLATE_LANG || "en").trim();

  try {
    const tplRes = await sendMetaWhatsAppPayload({
      phoneNumberId,
      token,
      payload: {
        to: parsedPhone.waDigits,
        type: "template",
        template: {
          name: templateName,
          language: { code: langCode },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: sanitizeTemplateParam(customerName || "Traveller") },
                { type: "text", text: sanitizeTemplateParam(tripTitle || "Traviska Trip") },
                { type: "text", text: sanitizeTemplateParam(departureDate || "Upcoming Departure") },
                { type: "text", text: sanitizeTemplateParam(groupLink) },
                { type: "text", text: sanitizeTemplateParam(bookingCode || "—") },
              ],
            },
          ],
        },
      },
    });
    return {
      configured: true,
      status: "API Accepted",
      messageId: tplRes.messages?.[0]?.id || "",
      recipient: parsedPhone.e164,
      templateName,
    };
  } catch (err) {
    const isPending = Number(err.code) === 132001 || /not exist|translation/i.test(err.message || "");
    return {
      configured: true,
      status: isPending ? "Template Pending Approval" : "Failed",
      errorCode: String(err.code || ""),
      error: isPending
        ? `Template "${templateName}" is awaiting Meta approval.`
        : err.message,
      recipient: parsedPhone.e164,
      templateName,
    };
  }
}

module.exports = {
  isWhatsAppConfigured,
  hasWhatsAppOptIn,
  normalizeWhatsAppPhone,
  parseAndValidatePhone,
  sanitizeTemplateParam,
  buildWhatsAppInvoiceMessage,
  buildWhatsAppRefundMessage,
  prepareWhatsAppPreview,
  sendOrPrepareWhatsApp,
  sendOrPrepareWhatsAppRefund,
  sendCaptainOtpWhatsApp,
  sendDepartureGroupLinkWhatsApp,
  processWhatsAppWebhookPayload,
};
