const mongoose = require("mongoose");

const invoiceCounterSchema = new mongoose.Schema(
  {
    environment: {
      type: String,
      enum: ["test", "live"],
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

invoiceCounterSchema.index(
  { environment: 1, financialYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("InvoiceCounter", invoiceCounterSchema);

