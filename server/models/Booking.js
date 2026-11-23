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
  pickupLocation: String,
  pickupLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  pickupDetails: {
    name: { type: String, default: "" },
    address: { type: String, default: "" },
    landmark: { type: String, default: "" },
    pickupTime: { type: String, default: "" },
    googleMapsUrl: { type: String, default: "" },
  },
  bookingCode: String,
  travellers: Number,
  travellerDetails: [
    {
      name: String,
      phone: String,
      gender: String,
      age: String,
    },
  ],
  requests: String,
  total: Number,
  originalTotal: {
    type: Number,
    default: null,
  },
  couponCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: null,
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
    default: null,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  paymentId: String,

   bookingSource: {
  type: String,
  enum: ["Online", "Admin", "Sales", "Manual"],
  default: "Online",
},

enquiryId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Enquiry",
  default: null,
},

salesRepId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
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

  checkoutRequestId: {
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

  isRescheduled: {
    type: Boolean,
    default: false,
  },

  rescheduledAt: {
    type: Date,
  },

  rescheduledFrom: {
    type: String,
  },

  rescheduleReason: {
    type: String,
  },

  rescheduleHistory: [
    {
      previousSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TripSlot",
      },
      previousDate: String,
      newSlotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TripSlot",
      },
      newDate: String,
      reason: String,
      rescheduledAt: {
        type: Date,
        default: Date.now,
      },
      rescheduledBy: String,
    },
  ],

  cancelledAt: {
    type: Date,
  },

  cancellationReason: {
    type: String,
  },

  cancellationNotes: {
    type: String,
  },

  refundStatus: {
    type: String,
    enum: ["None", "Pending", "Processed", "Rejected"],
    default: "None",
  },

  refundAmount: {
    type: Number,
    default: 0,
  },

  whatsappOptIn: {
    type: Boolean,
    default: false,
  },

  whatsappOptInAt: {
    type: Date,
    default: null,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Booking", bookingSchema);