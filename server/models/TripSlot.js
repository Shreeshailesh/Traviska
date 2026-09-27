const mongoose = require("mongoose");

const tripSlotSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
    required: true,
  },

  date: {
    type: Date,
    required: true,
  },

  totalSlots: {
    type: Number,
    required: true,
    min: 1,
  },

  bookedSlots: {
    type: Number,
    default: 0,
    min: 0,
  },

  isClosed: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TripSlot", tripSlotSchema);