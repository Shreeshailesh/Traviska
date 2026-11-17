const mongoose = require("mongoose");

const userCheckSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
      required: true,
      unique: true,
      index: true,
    },
    // Array of checked traveller identifiers: e.g. `${bookingId}_${travellerIndex}`
    checkedTravellers: [
      {
        type: String,
      },
    ],
    lastUpdatedBy: {
      type: String,
      default: "Captain",
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
    resetAuditTrail: [
      {
        resetBy: {
          type: String,
          default: "Captain",
        },
        resetAt: {
          type: Date,
          default: Date.now,
        },
        totalCheckedBeforeReset: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserCheck", userCheckSchema);

