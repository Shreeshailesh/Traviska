const mongoose = require("mongoose");

const sectionPointSchema = new mongoose.Schema(
  {
    heading: { type: String, default: "" },
    description: { type: String, default: "" },
    icon: { type: String, default: "" },
  },
  { _id: false }
);

const tripSectionSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    items: { type: [sectionPointSchema], default: [] },
  },
  { _id: false }
);

const defaultSection = () => ({ enabled: true, items: [] });

const pickupDateOverrideSchema = new mongoose.Schema(
  {
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TripSlot",
    },
    date: {
      type: String,
      default: "",
    },
    pickupTime: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const pickupLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      default: "",
      trim: true,
    },
    landmark: {
      type: String,
      default: "",
      trim: true,
    },
    pickupTime: {
      type: String,
      default: "",
      trim: true,
    },
    googleMapsUrl: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    dateOverrides: {
      type: [pickupDateOverrideSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const tripSchema = new mongoose.Schema({
  title: String,
  location: String,
  duration: String,
  price: Number,
  image: String,

  photos: {
    type: [String],
    default: [],
  },

  description: String,
  itinerary: { type: String, default: "" },
  highlights: { type: String, default: "" },
  inclusions: { type: String, default: "" },
  exclusions: { type: String, default: "" },
  thingsToCarry: { type: String, default: "" },

  safetyInformation: {
    type: tripSectionSchema,
    default: defaultSection,
  },
  whyChooseUs: {
    type: tripSectionSchema,
    default: defaultSection,
  },
  cancellationPolicy: {
    type: tripSectionSchema,
    default: defaultSection,
  },
  termsAndConditions: {
    type: tripSectionSchema,
    default: defaultSection,
  },
  importantNotes: {
    type: tripSectionSchema,
    default: defaultSection,
  },

  pickupLocations: {
    type: [pickupLocationSchema],
    default: [],
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Trip", tripSchema);