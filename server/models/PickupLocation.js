const mongoose = require("mongoose");

const pickupLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    reportingTime: {
      type: String,
      required: true,
      trim: true,
    },
    routeOrder: {
      type: Number,
      default: 1,
    },
    landmark: String,
    mapLink: String,
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PickupLocation", pickupLocationSchema);

