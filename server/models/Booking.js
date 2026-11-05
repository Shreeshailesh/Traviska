const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
    customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
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

   bookingSource: {
  type: String,
  enum: ["Online", "Admin"],
  default: "Online",
},

paymentMethod: {
  type: String,
  enum: ["Razorpay", "UPI", "Bank Transfer", "Cash"],
  default: "Razorpay",
},

paymentReference: {
  type: String,
  trim: true,
},

paymentReferenceKey: {
  type: String,
  unique: true,
  sparse: true,
},

 orderId: {
  type: String,
  unique: true,
  sparse: true,
},

  paymentStatus: {
  type: String,
  enum: ["Pending", "Paid", "Failed"],
  default: "Pending",
},
 
  status: {
  type: String,
  enum: ["Pending", "Confirmed", "Cancelled"],
  default: "Pending",
},

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);