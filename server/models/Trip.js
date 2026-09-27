const mongoose = require("mongoose");

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

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Trip", tripSchema);