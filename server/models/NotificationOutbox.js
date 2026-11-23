const mongoose = require("mongoose");

const notificationOutboxSchema = new mongoose.Schema(
  {
    channel: {
      type: String,
      enum: ["email", "whatsapp"],
      required: true,
      index: true,
    },
    audience: {
      type: String,
      enum: ["customer", "staff"],
      default: "customer",
    },
    eventType: { type: String, required: true, index: true },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
      index: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BookingRequest",
      default: null,
    },
    recipient: { type: String, required: true },
    templateName: { type: String, default: "" },
    subject: { type: String, default: "" },
    textBody: { type: String, default: "" },
    htmlBody: { type: String, default: "" },
    attachPolicyVersion: { type: String, default: "" },
    templateParams: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["Pending", "Sent", "Accepted", "Delivered", "Failed"],
      default: "Pending",
      index: true,
    },
    provider: { type: String, default: "" },
    providerMessageId: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextRetryAt: { type: Date, default: null, index: true },
    lastError: { type: String, default: "" },
    lastAttemptAt: { type: Date, default: null },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("NotificationOutbox", notificationOutboxSchema);
