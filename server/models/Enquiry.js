const mongoose = require("mongoose");

const enquirySchema = new mongoose.Schema(
  {
    enquiryId: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      default: null,
      index: true,
    },
    tripTitle: {
      type: String,
      default: "",
    },
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
      default: null,
    },
    departureDate: {
      type: String,
      default: "",
    },
    numTravelers: {
      type: Number,
      default: 1,
      min: 1,
    },
    budget: {
      type: Number,
      default: 0,
    },
    preferredDestinations: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      enum: ["Website", "Instagram", "WhatsApp", "Phone Call", "Referral", "Walk-in", "Other"],
      default: "Website",
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"],
      default: "New",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    assignedToName: {
      type: String,
      default: "Unassigned",
    },
    notes: {
      type: String,
      default: "",
    },
    lostReason: {
      type: String,
      default: "",
    },
    convertedBookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      default: null,
    },
    convertedAt: {
      type: Date,
      default: null,
    },

    /* ------------------------------------------------------------------ */
    /* ODOO CRM INTEGRATION MAPPINGS (Disabled until Odoo credentials set) */
    /* ------------------------------------------------------------------ */
    odooLeadId: {
      type: Number,
      default: null,
      index: true,
    },
    odooPartnerId: {
      type: Number,
      default: null,
    },
    odooSyncStatus: {
      type: String,
      enum: ["disabled", "pending", "synced", "failed"],
      default: "disabled",
      index: true,
    },
    odooLastSyncedAt: {
      type: Date,
      default: null,
    },
    odooSyncError: {
      type: String,
      default: null,
    },
    odooMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate stable readable Enquiry ID e.g. TRV-ENQ-2026-XXXXX
enquirySchema.pre("validate", async function () {
  if (!this.enquiryId) {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const count = await mongoose.model("Enquiry").countDocuments();
    const serial = String(count + 1).padStart(4, "0");
    this.enquiryId = `TRV-ENQ-${year}-${serial}-${randomSuffix}`;
  }
});

module.exports = mongoose.model("Enquiry", enquirySchema);

