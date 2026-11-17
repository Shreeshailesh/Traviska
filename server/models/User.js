
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
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
    enum: ["admin", "customer", "sales", "sales_lead"],
    default: "customer",
  },
  department: {
    type: String,
    default: "Operations",
  },
  isActive: {
    type: Boolean,
    default: true,
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
