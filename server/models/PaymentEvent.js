const mongoose = require("mongoose");

const paymentEventSchema = new mongoose.Schema(
  {
    eventId: {
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
    isSimulated: {
      type: Boolean,
      default: false,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    bookingCode: {
      type: String,
      default: "",
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
      index: true,
    },
    provider: {
      type: String,
      default: "simulator",
    },
    providerOrderId: {
      type: String,
      default: "",
    },
    providerPaymentId: {
      type: String,
      default: "",
    },
    providerRefundId: {
      type: String,
      default: "",
    },
    paymentType: {
      type: String,
      enum: ["Full", "Advance", "Balance", "Refund"],
      required: true,
    },
    paymentMethod: {
      type: String,
      default: "Simulated Online",
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed", "refunded", "partially_refunded"],
      required: true,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: "",
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    occurredAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentEvent", paymentEventSchema);

