const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema(
  {
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      required: true,
      index: true,
    },
    enquiryCode: {
      type: String,
      default: "",
    },
    customerName: {
      type: String,
      default: "",
    },
    customerPhone: {
      type: String,
      default: "",
    },
    salesEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    salesEmployeeName: {
      type: String,
      default: "",
    },
    scheduledAt: {
      type: Date,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["Call", "WhatsApp", "Email", "Meeting", "Note"],
      default: "Call",
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Missed"],
      default: "Scheduled",
      index: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    outcome: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
      default: null,
    },

    /* ------------------------------------------------------------------ */
    /* ODOO CRM INTEGRATION MAPPINGS (mail.activity)                      */
    /* ------------------------------------------------------------------ */
    odooActivityId: {
      type: Number,
      default: null,
    },
    odooSyncStatus: {
      type: String,
      enum: ["disabled", "pending", "synced", "failed"],
      default: "disabled",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("FollowUp", followUpSchema);

