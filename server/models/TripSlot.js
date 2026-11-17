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

  assignedCaptain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Captain",
  },

  assignedCaptains: [
    {
      captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Captain",
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
    },
  ],

  status: {
    type: String,
    enum: ["Scheduled", "In Progress", "Completed", "Cancelled"],
    default: "Scheduled",
  },

  photoDriveLink: {
    type: String,
    default: "",
    trim: true,
  },

  billDriveLink: {
    type: String,
    default: "",
    trim: true,
  },

  whatsappGroupLink: {
    type: String,
    default: "",
    trim: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("TripSlot", tripSlotSchema);