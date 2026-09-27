const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  trip: {
  title: String,
  location: String,
  duration: String,
  price: String,
  image: String,
  description: String,
},

slotId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "TripSlot",
  required: true,
},

  date: String,
  travellers: Number,
  requests: String,
  total: Number,
  paymentId: String,
  orderId: String,
  status: {
    type: String,
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);