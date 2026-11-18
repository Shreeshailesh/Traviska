
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: function () {
      return this.role === "admin" || this.role === "sales" || this.role === "sales_lead";
    },
  },

  password: {
    type: String,
    required: function () {
      return this.role === "admin" || this.role === "sales" || this.role === "sales_lead";
    },
  },

  phone: {
    type: String,
  },

  firebaseUid: {
    type: String,
  },

  role: {
    type: String,
    enum: [
      "super_admin",
      "admin",
      "customer",
      "sales",
      "sales_lead",
      "sales_executive",
      "captain_admin",
    ],
    default: "customer",
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
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isSuspended: {
    type: Boolean,
    default: false,
  },
  suspendedAt: {
    type: Date,
  },
  suspensionReason: {
    type: String,
  },
  sessionsRevokedAt: {
    type: Date,
  },
  lastLogin: {
    type: Date,
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  authProvider: {
    type: String,
    enum: ["google", "password", "phone", "legacy", "firebase"],
    default: "firebase",
  },
  photoUrl: {
    type: String,
    default: "",
  },
});

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: "string" } } }
);

userSchema.index(
  { firebaseUid: 1 },
  { unique: true, partialFilterExpression: { firebaseUid: { $type: "string" } } }
);

userSchema.index(
  { phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: "string" } } }
);

module.exports = mongoose.model("User", userSchema);
