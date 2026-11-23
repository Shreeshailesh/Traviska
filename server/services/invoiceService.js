const crypto = require("crypto");
const Invoice = require("../models/Invoice");
const InvoiceCounter = require("../models/InvoiceCounter");
const PaymentEvent = require("../models/PaymentEvent");
const Booking = require("../models/Booking");
const {
  getCompanyProfile,
  validateLiveIssuanceProfile,
} = require("../config/companyProfile");

/**
 * Converts a rupee amount (number or string like "₹6,999") to integer paise.
 */
function rupeesToPaise(value) {
  if (value === null || value === undefined || value === "") return 0;
  const cleaned =
    typeof value === "string" ? value.replace(/[₹,\s]/g, "") : value;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid currency amount: ${value}`);
  }
  return Math.round(num * 100);
}

function paiseToRupees(paise) {
  return Math.round(Number(paise || 0)) / 100;
}

function formatINR(paise) {
  const rupees = paiseToRupees(paise);
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Indian Financial Year (April 1 - March 31) formatted as "26-27"
 */
function getFinancialYear(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1..12
  const startYear = month >= 4 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
}

/**
 * Atomic sequential invoice number generator.
 * Separate sequences for "test" and "live" so test runs never consume live numbers.
 */
async function generateNextInvoiceNumber(environment = "test", date = new Date()) {
  const env = environment === "live" ? "live" : "test";
  const fy = getFinancialYear(date);

  const counter = await InvoiceCounter.findOneAndUpdate(
    { environment: env, financialYear: fy },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  const padded = String(counter.seq).padStart(4, "0");
  return {
    invoiceNumber: env === "live" ? `TVK/${fy}/${padded}` : `TEST-TVK/${fy}/${padded}`,
    financialYear: fy,
    sequence: counter.seq,
  };
}

/**
 * Pure integer-paise booking and tax calculation engine.
 * Prevents negative totals, invalid quantities, and floating-point drift.
 */
function calculateInvoicePricing({
  travellers,
  packagePricePaise,
  discountPaise = 0,
  additionalChargesPaise = 0,
  taxRatePercent = 0,
  taxMode = "none", // "none" | "exclusive" | "inclusive"
  amountPaidPaise = 0,
  refundedAmountPaise = 0,
  isCancelled = false,
  latestPaymentFailed = false,
}) {
  const qty = Number(travellers);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error("Travellers must be an integer >= 1");
  }

  const unitPrice = Math.round(Number(packagePricePaise));
  const discount = Math.round(Number(discountPaise || 0));
  const additional = Math.round(Number(additionalChargesPaise || 0));
  const paid = Math.round(Number(amountPaidPaise || 0));
  const refunded = Math.round(Number(refundedAmountPaise || 0));
  const rate = Number(taxRatePercent || 0);

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Package price cannot be negative or invalid");
  }
  if (!Number.isFinite(discount) || discount < 0) {
    throw new Error("Discount cannot be negative");
  }
  if (!Number.isFinite(additional) || additional < 0) {
    throw new Error("Additional charges cannot be negative");
  }
  if (!Number.isFinite(paid) || paid < 0) {
    throw new Error("Amount paid cannot be negative");
  }
  if (!Number.isFinite(refunded) || refunded < 0) {
    throw new Error("Refunded amount cannot be negative");
  }
  if (refunded > paid) {
    throw new Error("Refunded amount cannot exceed total amount paid");
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    throw new Error("Tax rate must be between 0 and 100");
  }

  const subtotalPaise = qty * unitPrice;
  const grossBeforeDiscount = subtotalPaise + additional;
  if (discount > grossBeforeDiscount) {
    throw new Error("Discount cannot exceed subtotal plus additional charges");
  }

  const netAfterDiscount = grossBeforeDiscount - discount;

  let taxableAmountPaise = netAfterDiscount;
  let taxAmountPaise = 0;
  let totalPayablePaise = netAfterDiscount;
  const effectiveTaxMode = rate > 0 && taxMode !== "none" ? taxMode : "none";

  if (effectiveTaxMode === "exclusive") {
    taxableAmountPaise = netAfterDiscount;
    taxAmountPaise = Math.round((taxableAmountPaise * rate) / 100);
    totalPayablePaise = taxableAmountPaise + taxAmountPaise;
  } else if (effectiveTaxMode === "inclusive") {
    totalPayablePaise = netAfterDiscount;
    taxableAmountPaise = Math.round((totalPayablePaise * 100) / (100 + rate));
    taxAmountPaise = totalPayablePaise - taxableAmountPaise;
  }

  const netPaidPaise = Math.max(0, paid - refunded);
  const balanceDuePaise =
    isCancelled || refunded > 0
      ? 0
      : Math.max(0, totalPayablePaise - netPaidPaise);

  const paymentStatus = derivePaymentStatus({
    totalPayablePaise,
    amountPaidPaise: paid,
    refundedAmountPaise: refunded,
    netPaidPaise,
    isCancelled,
    latestPaymentFailed,
  });

  return {
    pricing: {
      subtotalPaise,
      discountPaise: discount,
      additionalChargesPaise: additional,
      taxableAmountPaise,
      taxMode: effectiveTaxMode,
      taxRatePercent: effectiveTaxMode === "none" ? 0 : rate,
      taxAmountPaise,
      totalPayablePaise,
      amountPaidPaise: paid,
      refundedAmountPaise: refunded,
      netPaidPaise,
      balanceDuePaise,
    },
    paymentStatus,
  };
}

function derivePaymentStatus({
  totalPayablePaise,
  amountPaidPaise,
  refundedAmountPaise,
  netPaidPaise,
  isCancelled = false,
  latestPaymentFailed = false,
}) {
  if (refundedAmountPaise > 0) {
    if (refundedAmountPaise >= amountPaidPaise && amountPaidPaise > 0) {
      return "Refunded";
    }
    return "Partially Refunded";
  }

  if (isCancelled) {
    return "Cancelled";
  }

  if (netPaidPaise >= totalPayablePaise && totalPayablePaise > 0) {
    return "Paid";
  }

  if (netPaidPaise > 0 && netPaidPaise < totalPayablePaise) {
    return "Partially Paid";
  }

  if (latestPaymentFailed && netPaidPaise === 0) {
    return "Failed";
  }

  return "Pending Payment";
}

/**
 * Extracts trusted pricing snapshot from a stored Booking document.
 * Never relies on live Trip price if the booking already captured a snapshot.
 */
function extractBookingPricingSnapshot(booking) {
  const travellers = Math.max(1, parseInt(booking.travellers || 1, 10));
  const tripUnitFromSnapshot = booking.trip?.price
    ? rupeesToPaise(booking.trip.price)
    : 0;
  const originalTotalPaise =
    booking.originalTotal != null
      ? rupeesToPaise(booking.originalTotal)
      : booking.total != null
      ? rupeesToPaise(booking.total) + rupeesToPaise(booking.discountAmount || 0)
      : travellers * tripUnitFromSnapshot;

  const packagePricePaise =
    tripUnitFromSnapshot > 0
      ? tripUnitFromSnapshot
      : Math.round(originalTotalPaise / travellers);

  const discountPaise = Math.max(0, rupeesToPaise(booking.discountAmount || 0));

  return {
    travellers,
    packagePricePaise,
    discountPaise,
  };
}

/**
 * Aggregates verified PaymentEvents for a booking to prevent trusting browser amounts.
 */
async function aggregateBookingPaymentEvents(bookingId) {
  const events = await PaymentEvent.find({ bookingId }).sort({ occurredAt: 1 });

  let amountPaidPaise = 0;
  let refundedAmountPaise = 0;
  let latestSuccessEvent = null;
  let latestEvent = null;

  for (const ev of events) {
    latestEvent = ev;
    if (ev.verified && ev.status === "succeeded" && ev.paymentType !== "Refund") {
      amountPaidPaise += ev.amountPaise;
      latestSuccessEvent = ev;
    } else if (
      ev.verified &&
      (ev.status === "refunded" || ev.status === "partially_refunded" || ev.paymentType === "Refund")
    ) {
      refundedAmountPaise += ev.amountPaise;
    }
  }

  return {
    events,
    amountPaidPaise,
    refundedAmountPaise,
    latestSuccessEvent,
    latestPaymentFailed: Boolean(latestEvent && latestEvent.status === "failed"),
  };
}

/**
 * Issues or reconciles an invoice for a booking.
 * - Blocks LIVE issuance if mandatory legal/tax profile details are missing.
 * - Preserves immutability: once issued, financial totals on an existing invoice
 *   are only updated via payment settlement reconciliation or refund/credit adjustments,
 *   never silently deleting or overwriting numbers.
 */
async function createOrReconcileInvoiceForBooking({
  bookingId,
  environment = "test",
  isSample = false,
  actor = { email: "system", role: "system" },
}) {
  const companyProfile = getCompanyProfile();

  if (environment === "live" && !isSample) {
    const check = validateLiveIssuanceProfile(companyProfile);
    if (!check.readyForLiveIssuance) {
      const err = new Error(
        `Cannot issue live invoice until company legal/tax profile is configured: ${check.missingFields.join("; ")}`
      );
      err.code = "COMPANY_PROFILE_INCOMPLETE";
      err.missingFields = check.missingFields;
      throw err;
    }
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new Error("Booking not found");
  }

  const snapshot = extractBookingPricingSnapshot(booking);
  const paymentAgg = await aggregateBookingPaymentEvents(booking._id);
  const isCancelled = booking.status === "Cancelled";

  const { pricing, paymentStatus } = calculateInvoicePricing({
    travellers: snapshot.travellers,
    packagePricePaise: snapshot.packagePricePaise,
    discountPaise: snapshot.discountPaise,
    additionalChargesPaise: 0,
    taxRatePercent: companyProfile.taxRatePercent,
    taxMode: companyProfile.taxMode,
    amountPaidPaise: paymentAgg.amountPaidPaise,
    refundedAmountPaise: paymentAgg.refundedAmountPaise,
    isCancelled,
    latestPaymentFailed: paymentAgg.latestPaymentFailed,
  });

  const lineItems = [
    {
      slNo: 1,
      description: `${booking.trip?.title || "Traviska Group Trip"}${
        booking.trip?.duration ? ` – ${booking.trip.duration}` : ""
      }`,
      subtext: `${snapshot.travellers} ${
        snapshot.travellers === 1 ? "Traveller" : "Travellers"
      } × ${formatINR(snapshot.packagePricePaise)}`,
      quantity: snapshot.travellers,
      unitPricePaise: snapshot.packagePricePaise,
      amountPaise: pricing.subtotalPaise,
    },
  ];

  const existingInvoice = await Invoice.findOne({
    bookingId: booking._id,
    environment,
  });

  if (existingInvoice) {
    // Reconcile payment settlement & status cleanly with audit entry
    existingInvoice.pricing = pricing;
    existingInvoice.paymentStatus = paymentStatus;
    if (paymentAgg.latestSuccessEvent) {
      existingInvoice.paymentSummary = {
        mode: paymentAgg.latestSuccessEvent.paymentMethod || existingInvoice.paymentSummary.mode,
        reference:
          paymentAgg.latestSuccessEvent.providerPaymentId ||
          paymentAgg.latestSuccessEvent.eventId,
        paidAt: paymentAgg.latestSuccessEvent.occurredAt,
        paymentType: paymentAgg.latestSuccessEvent.paymentType,
      };
    }
    if (isCancelled && existingInvoice.status === "issued") {
      existingInvoice.status = "cancelled";
    }
    if (
      paymentStatus === "Paid" &&
      existingInvoice.documentType === "ADVANCE_RECEIPT" &&
      !isSample
    ) {
      existingInvoice.documentType = companyProfile.gstRegistered
        ? "TAX_INVOICE"
        : "BILL_OF_SUPPLY";
    }
    existingInvoice.auditTrail.push({
      action: "invoice.reconciled",
      actorEmail: actor.email || "",
      actorRole: actor.role || "",
      note: `Reconciled payment status: ${paymentStatus}, netPaid: ${formatINR(
        pricing.netPaidPaise
      )}`,
    });
    await existingInvoice.save();
    return existingInvoice;
  }

  const { invoiceNumber, financialYear } = await generateNextInvoiceNumber(
    environment,
    new Date()
  );

  let documentType = "SAMPLE_INVOICE";
  if (!isSample) {
    if (paymentStatus === "Partially Paid") {
      documentType = "ADVANCE_RECEIPT";
    } else {
      documentType = companyProfile.gstRegistered
        ? "TAX_INVOICE"
        : "BILL_OF_SUPPLY";
    }
  }

  const invoice = await Invoice.create({
    invoiceNumber,
    environment,
    isSample,
    documentType,
    financialYear,
    bookingId: booking._id,
    bookingCode: booking.bookingCode || `TVK-BK-${String(booking._id).slice(-6).toUpperCase()}`,
    customerId: booking.customerId || null,
    customerSnapshot: {
      name: booking.name || "Customer",
      email: (booking.email || "").toLowerCase().trim(),
      phone: booking.phone || "",
      billingAddress: booking.pickupDetails?.address || "",
    },
    tripSnapshot: {
      title: booking.trip?.title || "Traviska Trip",
      location: booking.trip?.location || "",
      duration: booking.trip?.duration || "",
      travelDate: booking.date || "",
      departureDate: booking.date || "",
      bookingDate: booking.createdAt || new Date(),
      travellers: snapshot.travellers,
      packagePricePaise: snapshot.packagePricePaise,
    },
    lineItems,
    pricing,
    paymentStatus,
    paymentSummary: {
      mode:
        paymentAgg.latestSuccessEvent?.paymentMethod ||
        (isSample ? "Online Payment (Test)" : booking.paymentMethod || "Online"),
      reference:
        paymentAgg.latestSuccessEvent?.providerPaymentId ||
        paymentAgg.latestSuccessEvent?.eventId ||
        booking.paymentReference ||
        `REF_${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      paidAt: paymentAgg.latestSuccessEvent?.occurredAt || new Date(),
      paymentType: paymentAgg.latestSuccessEvent?.paymentType || "Full",
    },
    companySnapshot: companyProfile,
    whatsappDelivery: {
      optIn: Boolean(booking.whatsappOptIn),
    },
    status: isCancelled ? "cancelled" : "issued",
    auditTrail: [
      {
        action: "invoice.created",
        actorEmail: actor.email || "",
        actorRole: actor.role || "",
        note: `Issued ${invoiceNumber} (${documentType}) — Status: ${paymentStatus}`,
      },
    ],
    issuedAt: new Date(),
  });

  return invoice;
}

module.exports = {
  rupeesToPaise,
  paiseToRupees,
  formatINR,
  getFinancialYear,
  generateNextInvoiceNumber,
  calculateInvoicePricing,
  derivePaymentStatus,
  extractBookingPricingSnapshot,
  aggregateBookingPaymentEvents,
  createOrReconcileInvoiceForBooking,
};

