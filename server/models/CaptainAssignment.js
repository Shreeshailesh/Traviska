const mongoose = require("mongoose");

const captainAssignmentSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
      required: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    captainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Captain",
      required: true,
    },
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
    },
    captain: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Captain",
    },
    captainFee: {
      type: Number,
      default: 0,
    },
    advancePaid: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Assigned", "Confirmed", "Completed", "Cancelled"],
      default: "Assigned",
    },
    role: {
      type: String,
      enum: ["Head Captain", "Main Captain", "Trainee Captain", "Lead Captain", "Assistant Captain"],
      default: "Head Captain",
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    assignedBy: {
      type: String,
      default: "Admin",
    },
    notes: String,
  },
  { timestamps: true }
);

captainAssignmentSchema.index({ slotId: 1, captainId: 1 }, { unique: true });

module.exports = mongoose.model("CaptainAssignment", captainAssignmentSchema);

