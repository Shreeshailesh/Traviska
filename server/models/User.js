
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: function () {
      return this.role === "admin";
    },
  },

  password: {
    type: String,
    required: function () {
      return this.role === "admin";
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
    enum: ["admin", "customer"],
    default: "customer",
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
