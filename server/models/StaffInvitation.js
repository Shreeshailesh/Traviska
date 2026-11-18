const mongoose = require("mongoose");

const staffInvitationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "sales_lead", "sales_executive", "captain_admin"],
      required: true,
    },
    department: {
      type: String,
      default: "Operations",
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    teamName: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
    tokenHash: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "pending_delivery", "sent", "accepted", "expired", "revoked"],
      default: "pending_delivery",
      index: true,
    },
    deliveryStatus: {
      type: String,
      enum: ["sent", "pending_delivery", "failed", "manual_handoff"],
      default: "manual_handoff",
    },
    deliveryError: {
      type: String,
      default: "",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    invitedByEmail: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isEmailOwnershipVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCodeHash: {
      type: String,
    },
    emailVerificationCodeExpiresAt: {
      type: Date,
    },
    acceptedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StaffInvitation", staffInvitationSchema);

