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

const globalTripSectionsSchema = new mongoose.Schema(
  {
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
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: "global_trip_sections" }
);

module.exports = mongoose.model(
  "GlobalTripSections",
  globalTripSectionsSchema
);

