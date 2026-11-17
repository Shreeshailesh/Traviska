const mongoose = require("mongoose");

const captainSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      default: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200",
    },
    bio: {
      type: String,
      default: "Certified Traviska Trip Captain & Wilderness First Responder.",
    },
    age: {
      type: Number,
    },
    dateOfBirth: {
      type: Date,
    },
    rating: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Unavailable", "On Trip"],
      default: "Active",
    },
    role: {
      type: String,
      enum: ["Head Captain", "Main Captain", "Trainee Captain"],
      default: "Main Captain",
    },
    specialties: {
      type: [String],
      default: ["Trekking", "Camping", "First Aid"],
    },
    specialities: {
      type: [String],
      default: ["Trekking", "Camping", "First Aid"],
    },
    emergencyContact: {
      type: String,
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      ifsc: String,
      bankName: String,
      upiId: String,
    },
    defaultTripFee: {
      type: Number,
      default: 3500,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Captain", captainSchema);
