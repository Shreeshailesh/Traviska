const mongoose = require("mongoose");

const paymentIssueSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    paymentId: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["NeedsReview", "Resolved", "Refunded"],
      default: "NeedsReview",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentIssue", paymentIssueSchema);