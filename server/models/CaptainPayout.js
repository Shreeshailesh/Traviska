const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Bank Transfer", "Cash", "Company Card", "IMPS/NEFT", "Razorpay"],
      default: "UPI",
    },
    paymentReference: {
      type: String,
      required: true,
      trim: true,
    },
    settledBy: {
      type: String,
      default: "Admin",
    },
    settledAt: {
      type: Date,
      default: Date.now,
    },
    notes: String,
  },
  { _id: true }
);

const captainPayoutSchema = new mongoose.Schema(
  {
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Captain",
      required: true,
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
      required: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },
    assignmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaptainAssignment",
    },
    payoutPeriod: {
      type: String,
      default: "Trip Completion",
    },
    tripFee: {
      type: Number,
      default: 0,
    },
    companyAdvance: {
      type: Number,
      default: 0,
    },
    approvedExpenses: {
      type: Number,
      default: 0,
    },
    approvedSelfExpenses: {
      type: Number,
      default: 0,
    },
    traviskaCardExpenses: {
      type: Number,
      default: 0,
    },
    traviskaUpiExpenses: {
      type: Number,
      default: 0,
    },
    totalPayout: {
      type: Number,
      default: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Settled"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      default: "UPI",
    },
    paymentReference: String,
    settledBy: String,
    settledAt: Date,
    notes: String,
    transactions: [transactionSchema],
  },
  { timestamps: true }
);

captainPayoutSchema.index({ captainId: 1, slotId: 1 }, { unique: true });

module.exports = mongoose.model("CaptainPayout", captainPayoutSchema);
