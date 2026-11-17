const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    travellerName: {
      type: String,
      required: true,
      trim: true,
    },
    travellerIndex: {
      type: Number,
      default: 0,
    },
    pickupLocation: {
      type: String,
      default: "Majestic",
    },
    status: {
      type: String,
      enum: ["Pending", "Present", "Absent", "No-show"],
      default: "Pending",
    },
    markedBy: {
      type: String,
      default: "Admin",
    },
    markedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ slotId: 1, bookingId: 1, travellerIndex: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);

