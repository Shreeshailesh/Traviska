const mongoose = require("mongoose");

const tripExpenseSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
      required: true,
    },
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Captain",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        // Standard expense types from spec
        "Breakfast",
        "Parking",
        "Tickets",
        "Tolls",
        "Transport",
        "Hotel",
        "Coordinator Food",
        "Others",
        // Extended/Legacy compatibility
        "Fuel",
        "Toll",
        "Food",
        "Stay",
        "Activities",
        "Driver Allowance",
        "Miscellaneous",
        "Food & Snacks",
        "Fuel & Diesel",
        "Tolls & Parking",
        "Entry Permits",
        "Medical & First Aid",
        "Emergency",
      ],
      default: "Food",
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMode: {
      type: String,
      enum: [
        "Traviska Card",
        "Traviska UPI",
        "Self (Any Mode)",
        "Self",
        "Captain UPI",
        "Captain Cash",
        "Company Fastag",
        "Company Card",
        "UPI",
        "Cash",
        "Card",
      ],
      default: "Self",
    },
    isCompanyPaid: {
      type: Boolean,
      default: false,
    },
    isAutoApproved: {
      type: Boolean,
      default: false,
    },
    verificationStatus: {
      type: String,
      enum: ["Unverified", "Verified", "Flagged"],
      default: "Unverified",
    },
    receiptUrl: String,
    notes: String,
    status: {
      type: String,
      enum: ["Pending", "Approved", "Auto Approved", "Rejected", "Settled"],
      default: "Pending",
    },
    approvedBy: String,
    approvedAt: Date,
    rejectionReason: String,
    rejectedAt: Date,
    isSettled: {
      type: Boolean,
      default: false,
    },
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CaptainPayout",
    },
  },
  { timestamps: true }
);

// Pre-save hook to ensure Traviska Card & Traviska UPI are automatically company paid and auto-approved
tripExpenseSchema.pre("save", function () {
  if (this.paymentMode === "Traviska Card" || this.paymentMode === "Traviska UPI" || this.paymentMode === "Company Card" || this.paymentMode === "Company Fastag") {
    this.isCompanyPaid = true;
    if (this.isNew && (!this.status || this.status === "Pending")) {
      this.status = "Auto Approved";
      this.isAutoApproved = true;
      this.verificationStatus = this.verificationStatus || "Unverified";
    }
  } else {
    this.isCompanyPaid = false;
    if (this.paymentMode === "Self (Any Mode)") {
      this.paymentMode = "Self";
    }
  }
});

module.exports = mongoose.model("TripExpense", tripExpenseSchema);
