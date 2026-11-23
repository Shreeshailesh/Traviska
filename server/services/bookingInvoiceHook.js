const PaymentEvent = require("../models/PaymentEvent");
const {
  rupeesToPaise,
  createOrReconcileInvoiceForBooking,
} = require("./invoiceService");
const { ensureInvoicePdfFile } = require("./pdfService");
const { sendInvoiceEmail } = require("./emailService");
const { prepareWhatsAppPreview } = require("./whatsappService");

/**
 * Automatically ensures a verified PaymentEvent, issues/reconciles an Invoice,
 * generates the A4 PDF, and dispatches email + WhatsApp notifications as
 * separate, durable, idempotent stages.
 *
 * - Works for both Admin manual/offline bookings and Customer online checkout.
 * - Non-blocking on email/WhatsApp errors so a confirmed booking is never rolled back.
 * - If email fails, WhatsApp still runs; if WhatsApp fails, email & invoice remain intact.
 */
async function issueInvoiceAndNotifyForBooking({
  booking,
  currentUser = null,
  origin = "",
  paymentEvent = null,
  allowPartial = false,
  emailEventKey = "invoice_initial",
  whatsappEventKey = "invoice_initial",
}) {
  if (!booking) return null;
  const eligible =
    booking.paymentStatus === "Paid" ||
    (allowPartial && booking.status === "Confirmed");
  if (!eligible) {
    return null;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const environment = isProduction ? "live" : "test";
  const isSample = !isProduction;

  let invoice = null;
  let pdfBuffer = null;
  let pdfFileName = "";

  // Stage 1: Verified PaymentEvent + Invoice + A4 PDF
  try {
    if (!paymentEvent) {
      const eventId = `MANUAL_PAY_${booking._id}`;
      const existingEvent = await PaymentEvent.findOne({ eventId });

      if (!existingEvent) {
        await PaymentEvent.create({
          eventId,
          environment,
          isSimulated: !isProduction,
          bookingId: booking._id,
          bookingCode: booking.bookingCode || "",
          provider: "admin_manual",
          providerPaymentId:
            booking.paymentReference || `MAN_${String(booking._id).slice(-8).toUpperCase()}`,
          paymentType: "Full",
          paymentMethod: booking.paymentMethod || "UPI",
          amountPaise: rupeesToPaise(booking.total || 0),
          currency: "INR",
          status: "succeeded",
          verified: true,
          notes: `Admin manual booking payment (${booking.paymentMethod || "Offline"})`,
          occurredAt: new Date(),
          createdBy: currentUser?._id || null,
        });
      }
    }

    invoice = await createOrReconcileInvoiceForBooking({
      bookingId: booking._id,
      environment,
      isSample,
      actor: {
        email: currentUser?.email || booking.email || "system",
        role: currentUser?.role || "system",
      },
    });

    if (paymentEvent && !paymentEvent.invoiceId) {
      paymentEvent.invoiceId = invoice._id;
      await paymentEvent.save();
    }

    const pdf = await ensureInvoicePdfFile(invoice);
    pdfBuffer = pdf.buffer;
    pdfFileName = pdf.fileName;
  } catch (err) {
    console.error("Invoice/PDF generation hook error:", err.message);
    return {
      invoice: null,
      emailResult: { status: "Failed", error: err.message },
      whatsappPreview: { status: "Failed", error: err.message },
      warning: err.message,
    };
  }

  // Stage 2: Isolated Email Dispatch (idempotent per invoice)
  let emailResult = { status: "Not Configured" };
  try {
    const alreadySentEmail =
      Array.isArray(invoice.emailDelivery?.attempts) &&
      invoice.emailDelivery.attempts.some(
        (a) => a.status === "Accepted by Provider" || a.status === "Delivered"
      );

    if (alreadySentEmail) {
      emailResult = {
        status: invoice.emailDelivery.status,
        duplicatePrevented: true,
        recipient: invoice.customerSnapshot?.email || "",
      };
    } else if (booking.email || !isProduction) {
      emailResult = await sendInvoiceEmail({
        invoice,
        pdfBuffer,
        pdfFileName,
      });
    }
  } catch (emailErr) {
    console.error("Invoice email dispatch error:", emailErr.message);
    emailResult = { status: "Failed", error: emailErr.message };
  }

  // Stage 3: Isolated WhatsApp Dispatch (respects optIn + dispatchedEventKeys)
  let whatsappPreview = { status: invoice.whatsappDelivery?.status || "Not Configured" };
  try {
    whatsappPreview = await prepareWhatsAppPreview({
      invoice,
      baseUrl: origin,
      pdfBuffer,
      pdfFileName,
      eventKey: whatsappEventKey,
      optInConfirmed: Boolean(booking.whatsappOptIn || invoice.whatsappDelivery?.optIn),
    });
  } catch (waErr) {
    console.error("Invoice WhatsApp dispatch error:", waErr.message);
    whatsappPreview = { status: "Failed", error: waErr.message };
  }

  return {
    invoice,
    emailResult,
    whatsappPreview,
    emailEventKey,
  };
}

module.exports = {
  issueInvoiceAndNotifyForBooking,
};
