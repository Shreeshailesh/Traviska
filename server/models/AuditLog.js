const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      default: () => "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8),
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    actorEmail: {
      type: String,
      default: "System",
    },
    actorRole: {
      type: String,
      default: "System",
    },
    targetId: {
      type: String,
      default: "",
    },
    targetEmail: {
      type: String,
      default: "",
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    result: {
      type: String,
      enum: ["success", "failure", "blocked"],
      default: "success",
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
    details: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);

