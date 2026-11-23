const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    slNo: { type: Number, required: true },
    description: { type: String, required: true },
    subtext: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPricePaise: { type: Number, required: true, min: 0 },
    amountPaise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const deliveryAttemptSchema = new mongoose.Schema(
  {
    attemptedAt: { type: Date, default: Date.now },
    status: { type: String, required: true },
    provider: { type: String, default: "" },
    templateName: { type: String, default: "" },
    messageId: { type: String, default: "" },
    recipient: { type: String, default: "" },
    eventKey: { type: String, default: "" },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    errorCode: { type: String, default: "" },
    error: { type: String, default: "" },
  },
  { _id: false }
);

const auditEntrySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    actorEmail: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    note: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    environment: {
      type: String,
      enum: ["test", "live"],
      required: true,
      index: true,
    },
    isSample: {
      type: Boolean,
      default: false,
      index: true,
    },
    documentType: {
      type: String,
      enum: [
        "TAX_INVOICE",
        "BILL_OF_SUPPLY",
        "ADVANCE_RECEIPT",
        "SAMPLE_INVOICE",
        "CREDIT_NOTE",
      ],
      default: "SAMPLE_INVOICE",
    },
    financialYear: {
      type: String,
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    bookingCode: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customerSnapshot: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String, default: "" },
      billingAddress: { type: String, default: "" },
    },
    tripSnapshot: {
      title: { type: String, required: true },
      location: { type: String, default: "" },
      duration: { type: String, default: "" },
      travelDate: { type: String, default: "" },
      departureDate: { type: String, default: "" },
      bookingDate: { type: Date, default: Date.now },
      travellers: { type: Number, required: true, min: 1 },
      packagePricePaise: { type: Number, required: true, min: 0 },
    },
    lineItems: [lineItemSchema],
    pricing: {
      subtotalPaise: { type: Number, required: true, min: 0 },
      discountPaise: { type: Number, default: 0, min: 0 },
      additionalChargesPaise: { type: Number, default: 0, min: 0 },
      taxableAmountPaise: { type: Number, required: true, min: 0 },
      taxMode: {
        type: String,
        enum: ["inclusive", "exclusive", "none"],
        default: "none",
      },
      taxRatePercent: { type: Number, default: 0, min: 0 },
      taxAmountPaise: { type: Number, default: 0, min: 0 },
      totalPayablePaise: { type: Number, required: true, min: 0 },
      amountPaidPaise: { type: Number, default: 0, min: 0 },
      refundedAmountPaise: { type: Number, default: 0, min: 0 },
      netPaidPaise: { type: Number, default: 0, min: 0 },
      balanceDuePaise: { type: Number, default: 0, min: 0 },
    },
    paymentStatus: {
      type: String,
      enum: [
        "Pending Payment",
        "Partially Paid",
        "Paid",
        "Failed",
        "Cancelled",
        "Refunded",
        "Partially Refunded",
      ],
      default: "Pending Payment",
      index: true,
    },
    paymentSummary: {
      mode: { type: String, default: "Online Payment (Test)" },
      reference: { type: String, default: "" },
      paidAt: { type: Date, default: null },
      paymentType: { type: String, default: "Full" },
    },
    companySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    pdfStorage: {
      storageType: { type: String, default: "local_secure" },
      fileName: { type: String, default: "" },
      relativePath: { type: String, default: "" },
      sha256: { type: String, default: "" },
      sizeBytes: { type: Number, default: 0 },
      generatedAt: { type: Date, default: null },
    },
    emailDelivery: {
      status: {
        type: String,
        enum: [
          "Not Configured",
          "Queued",
          "Sending",
          "Accepted by Provider",
          "Delivered",
          "Failed",
        ],
        default: "Not Configured",
      },
      lastAttemptAt: { type: Date, default: null },
      lastError: { type: String, default: "" },
      attempts: [deliveryAttemptSchema],
    },
    whatsappDelivery: {
      status: {
        type: String,
        enum: [
          "Preview Only / Not Configured",
          "Opt-In Required",
          "Template Pending Approval",
          "Queued",
          "Sending",
          "API Accepted",
          "Sent",
          "Delivered",
          "Read",
          "Failed",
        ],
        default: "Preview Only / Not Configured",
      },
      previewMessage: { type: String, default: "" },
      secureLink: { type: String, default: "" },
      normalizedPhone: { type: String, default: "" },
      templateName: { type: String, default: "" },
      lastMessageId: { type: String, default: "" },
      optIn: { type: Boolean, default: false },
      lastAttemptAt: { type: Date, default: null },
      deliveredAt: { type: Date, default: null },
      readAt: { type: Date, default: null },
      errorCode: { type: String, default: "" },
      lastError: { type: String, default: "" },
      dispatchedEventKeys: [{ type: String }],
      attempts: [deliveryAttemptSchema],
    },
    status: {
      type: String,
      enum: ["issued", "cancelled", "credited"],
      default: "issued",
    },
    cancellationReason: { type: String, default: "" },
    creditNoteNumber: { type: String, default: "" },
    refundSettlement: {
      status: {
        type: String,
        enum: ["Not Applicable", "Initiated", "Credited"],
        default: "Not Applicable",
      },
      initiatedAt: { type: Date, default: null },
      creditedAt: { type: Date, default: null },
      refundReference: { type: String, default: "" },
      gatewayEventId: { type: String, default: "" },
    },
    auditTrail: [auditEntrySchema],
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ environment: 1, issuedAt: -1 });
invoiceSchema.index({ "customerSnapshot.email": 1, environment: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);

