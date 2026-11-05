require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("./models/Booking");
const PaymentIssue = require("./models/PaymentIssue");
const Trip = require("./models/Trip");
const TripSlot = require("./models/TripSlot");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const firebaseAdmin = require("./firebaseAdmin");
const multer = require("multer");
const FileType = require("file-type");

const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WebP images are allowed"));
    }

    cb(null, true);
  },
});



const app = express();

app.use("/uploads", express.static("uploads"));

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:");
    console.error(err);
  });

const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  })
);
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get("/", (req, res) => {
  res.send("Traviska Backend is Running 🚀");
});

app.post("/booking", async (req, res) => {
  return res.status(503).json({
    success: false,
    message: "Booking is temporarily unavailable while payment setup is completed",
  });
  try {
    const {
      trip,
      slotId,
      name,
      email,
      phone,
      date,
      travellers,
      requests,
      total,
    } = req.body;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: "Please select a trip date",
      });
    }

    const travellerCount = Number(travellers) || 1;

    const slot = await TripSlot.findOneAndUpdate(
      {
        _id: slotId,
        isClosed: false,
        $expr: {
          $gte: [
            { $subtract: ["$totalSlots", "$bookedSlots"] },
            travellerCount,
          ],
        },
      },
      {
        $inc: {
          bookedSlots: travellerCount,
        },
      },
      {
        new: true,
      }
    );

    if (!slot) {
      return res.status(400).json({
        success: false,
        message: "Sorry, there are not enough slots available for this date.",
      });
    }

    const booking = new Booking({
      trip,
      slotId,
      name,
      email,
      phone,
      date,
      travellers: travellerCount,
      requests,
      total,
      paymentStatus: "Pending",
    });

    try {
      await booking.save();
    } catch (bookingError) {
      await TripSlot.findByIdAndUpdate(slotId, {
        $inc: {
          bookedSlots: -travellerCount,
        },
      });

      throw bookingError;
    }

    res.json({
      success: true,
      message: "Booking received successfully!",
      booking,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to save booking",
    });
  }
});

app.post("/create-order", async (req, res) => {
  try {
    const { tripId, slotId, travellers } = req.body;

    const travellerCount = Number(travellers);

    if (
      !tripId ||
      !slotId ||
      !Number.isSafeInteger(travellerCount) ||
      travellerCount < 1
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip, date or traveller count",
      });
    }

    const trip = await Trip.findById(tripId);
    const slot = await TripSlot.findOne({
      _id: slotId,
      trip: tripId,
      isClosed: false,
    });

    if (!trip || !slot) {
      return res.status(400).json({
        success: false,
        message: "Trip or travel date is unavailable",
      });
    }

    if (slot.totalSlots - slot.bookedSlots < travellerCount) {
      return res.status(400).json({
        success: false,
        message: "Not enough seats available",
      });
    }

    const amount = Math.round(trip.price * travellerCount * 100);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip price",
      });
    }

    const order = await razorpay.orders.create({
  amount,
  currency: "INR",
  receipt: `trip_${Date.now()}`,
  notes: {
    tripId: String(tripId),
    slotId: String(slotId),
    travellers: String(travellerCount),
    priceAtOrder: String(trip.price),
  },
});

    res.json({
      success: true,
      order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
});

app.post("/verify-payment", async (req, res) => {
  try {

    let authenticatedCustomerId = null;

    const authorization = req.headers.authorization;

    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice(7).trim();

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role === "customer") {
          const customer = await User.findOne({
            _id: decoded.id,
            role: "customer",
          });

          if (customer) {
            authenticatedCustomerId = customer._id;
          }
        }
      } catch (error) {
        console.log("Customer token invalid or expired; continuing as guest");
      }
    }

   const {
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  bookingDetails,
} = req.body;
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing payment details",
      });
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(razorpay_signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const razorpayOrder = await razorpay.orders.fetch(
  razorpay_order_id
);

const existingBooking = await Booking.findOne({
  orderId: razorpay_order_id,
});

if (existingBooking) {
  return res.json({
    success: true,
    paymentVerified: true,
    bookingConfirmed:
  existingBooking.status === "Confirmed" &&
  existingBooking.paymentStatus === "Paid",
    message: "This payment order has already been processed",
    booking: existingBooking,
  });
}

const orderNotes = razorpayOrder.notes || {};

const priceAtOrder = Number(orderNotes.priceAtOrder);
const orderedTravellers = Number(orderNotes.travellers);

if (
  !Number.isFinite(priceAtOrder) ||
  priceAtOrder <= 0 ||
  !Number.isSafeInteger(orderedTravellers) ||
  orderedTravellers < 1 ||
  Math.round(priceAtOrder * orderedTravellers * 100) !==
    razorpayOrder.amount
) {
  return res.status(400).json({
    success: false,
    message: "Payment order amount is invalid",
  });
}

if (
  !bookingDetails ||
  String(bookingDetails.tripId) !== String(orderNotes.tripId) ||
  String(bookingDetails.slotId) !== String(orderNotes.slotId) ||
  Number(bookingDetails.travellers) !== Number(orderNotes.travellers)
) {
  return res.status(400).json({
    success: false,
    message: "Booking details do not match the payment order",
  });
}

const bookedTrip = await Trip.findById(orderNotes.tripId);

const travellerCount = Number(orderNotes.travellers);

if (
  !bookedTrip ||
  !Number.isSafeInteger(travellerCount) ||
  travellerCount < 1
) {
  return res.status(400).json({
    success: false,
    message: "Invalid trip or traveller count",
  });
}

if (
  razorpayOrder.status === "created" ||
  !Number.isSafeInteger(razorpayOrder.amount) ||
  razorpayOrder.amount <= 0 ||
  razorpayOrder.currency !== "INR"
) {
  return res.status(400).json({
    success: false,
    message: "Invalid or unpaid Razorpay order",
  });
}

const bookingSlot = await TripSlot.findOne({
  _id: orderNotes.slotId,
  trip: bookedTrip._id,
});

if (!bookingSlot) {
  return res.status(400).json({
    success: false,
    message: "Selected trip date no longer exists",
  });
}

const customerName = String(bookingDetails.name || "").trim();
const customerEmail = String(bookingDetails.email || "").trim();
const customerPhone = String(bookingDetails.phone || "").trim();

if (
  !customerName ||
  !customerEmail ||
  !customerPhone
) {
  return res.status(400).json({
    success: false,
    message: "Customer name, email and phone are required",
  });
}


const razorpayPayment = await razorpay.payments.fetch(
  razorpay_payment_id
);

if (
  razorpayPayment.order_id !== razorpay_order_id ||
  razorpayPayment.status !== "captured" ||
  razorpayPayment.amount !== razorpayOrder.amount ||
  razorpayPayment.currency !== "INR" ||
  razorpayOrder.currency !== "INR"
) {
  return res.status(400).json({
    success: false,
    message: "Payment has not been captured or order details do not match",
  });
}

if (
  bookingSlot.isClosed ||
  bookingSlot.totalSlots - bookingSlot.bookedSlots < travellerCount
) {

  try {
  await PaymentIssue.findOneAndUpdate(
  { orderId: razorpay_order_id },
  {
    $setOnInsert: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      reason: "Seats unavailable after payment",
      status: "NeedsReview",
      details: {
        tripId: String(bookedTrip._id),
        slotId: String(bookingSlot._id),
        travellers: travellerCount,
        amount: razorpayOrder.amount,
      },
    },
  },
  { upsert: true, new: true }
);
} catch (recoveryError) {
  console.error("CRITICAL: Could not save payment issue", {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    error: recoveryError,
  });
}
  return res.status(409).json({
    success: false,
    paymentVerified: true,
    bookingConfirmed: false,
    message:
      "Seats are no longer available. Payment requires refund or manual resolution.",
  });
}

const session = await mongoose.startSession();

try {
  session.startTransaction();

  const alreadyBooked = await Booking.findOne({
  orderId: razorpay_order_id,
}).session(session);

if (alreadyBooked) {
  await session.abortTransaction();

  return res.json({
    success: true,
    paymentVerified: true,
    bookingConfirmed:
      alreadyBooked.status === "Confirmed" &&
      alreadyBooked.paymentStatus === "Paid",
    message: "This payment order has already been processed",
    booking: alreadyBooked,
  });
}

const reservedSlot = await TripSlot.findOneAndUpdate(
  {
    _id: bookingSlot._id,
    isClosed: false,
    $expr: {
      $gte: [
        { $subtract: ["$totalSlots", "$bookedSlots"] },
        travellerCount,
      ],
    },
  },
  {
    $inc: { bookedSlots: travellerCount },
  },
    { new: true, session }
);
if (!reservedSlot) {
  await session.abortTransaction();
try {
  await PaymentIssue.findOneAndUpdate(
  { orderId: razorpay_order_id },
  {
    $setOnInsert: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      reason: "Atomic seat reservation failed after payment",
      status: "NeedsReview",
      details: {
        tripId: String(bookedTrip._id),
        slotId: String(bookingSlot._id),
        travellers: travellerCount,
        amount: razorpayOrder.amount,
      },
    },
  },
  { upsert: true, new: true }
);

} catch (recoveryError) {
  console.error("CRITICAL: Could not save payment issue", {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    error: recoveryError,
  });
}

  console.error("PAID ORDER REQUIRES RESOLUTION:", {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    reason: "Seats unavailable",
  });

  return res.status(409).json({
    success: false,
    paymentVerified: true,
    bookingConfirmed: false,
    orderId: razorpay_order_id,
    message:
      "Payment captured, but seats are unavailable. Contact support for a refund or manual resolution.",
  });
}

    const confirmedBooking = new Booking({

        ...(authenticatedCustomerId
    ? { customerId: authenticatedCustomerId }
    : {}),

  name: customerName,
  email: customerEmail,
  phone: customerPhone,
  trip: {
    title: bookedTrip.title,
    location: bookedTrip.location,
    duration: bookedTrip.duration,
    price: bookedTrip.price,
    image: bookedTrip.image,
    description: bookedTrip.description,
  },
  slotId: bookingSlot._id,
  date: bookingSlot.date,
  travellers: travellerCount,
  requests: String(bookingDetails.requests || ""),
  total: razorpayOrder.amount / 100,
  paymentId: razorpay_payment_id,
  orderId: razorpay_order_id,
  paymentStatus: "Paid",
  status: "Confirmed",
});

await confirmedBooking.save({ session });

await session.commitTransaction();


return res.json({
  success: true,
  paymentVerified: true,
  bookingConfirmed: true,
  message: "Payment successful! Your booking is confirmed.",
  booking: confirmedBooking,
});

} catch (transactionError) {
  if (session.inTransaction()) {
    await session.abortTransaction();
  }

  console.error("Booking transaction failed:", transactionError);

  const completedBooking = await Booking.findOne({
  orderId: razorpay_order_id,
});

if (
  completedBooking &&
  completedBooking.status === "Confirmed" &&
  completedBooking.paymentStatus === "Paid"
) {
  return res.json({
    success: true,
    paymentVerified: true,
    bookingConfirmed:
      completedBooking.status === "Confirmed" &&
      completedBooking.paymentStatus === "Paid",
    message: "This payment order has already been processed",
    booking: completedBooking,
  });
}

try {
await PaymentIssue.findOneAndUpdate(
  { orderId: razorpay_order_id },
  {
    $setOnInsert: {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      reason: "Booking transaction failed after payment",
      status: "NeedsReview",
      details: {
        tripId: String(bookedTrip._id),
        slotId: String(bookingSlot._id),
        travellers: travellerCount,
        amount: razorpayOrder.amount,
        error: String(transactionError.message || transactionError),
      },
    },
  },
  { upsert: true, new: true }
);

} catch (recoveryError) {
  console.error("CRITICAL: Could not save payment issue", {
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    error: recoveryError,
  });
}

  return res.status(500).json({
    success: false,
    paymentVerified: true,
    bookingConfirmed: false,
    orderId: razorpay_order_id,
    message:
      "Payment received, but booking confirmation failed. Please contact support with your order ID.",
  });
} finally {
  await session.endSession();
}

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Payment verification error",
    });
  }
});

app.get("/bookings", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error("Failed to fetch bookings:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
    });
  }
});

app.get("/customer/verify", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Customer access required",
      });
    }

    const customer = await User.findById(req.user.id);

    if (!customer || customer.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Customer account not found",
      });
    }

    return res.json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        phone: customer.phone,
        role: customer.role,
      },
    });

      } catch (error) {
    console.error("Customer verification failed:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify customer",
    });
  }
});

  app.get("/customer/profile", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Customer access required",
      });
    }

    const customer = await User.findOne({
      _id: req.user.id,
      role: "customer",
    }).select("name email phone");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    return res.json({
      success: true,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone,
      },
    });
  } catch (error) {
    console.error("Failed to fetch customer profile:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load customer profile",
    });
  }
});

app.put("/customer/profile", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Customer access required",
      });
    }

    const { name, email } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        message: "Name must be 100 characters or fewer",
      });
    }

    if (
      email !== undefined &&
      (typeof email !== "string" ||
        (email.trim() !== "" &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())))
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const customer = await User.findOne({
      _id: req.user.id,
      role: "customer",
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    customer.name = name.trim();

    if (email !== undefined) {
      customer.email = email.trim().toLowerCase() || undefined;
    }

    await customer.save();

    return res.json({
      success: true,
      message: "Profile updated successfully",
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    console.error("Failed to update customer profile:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update customer profile",
    });
  }
});

app.get("/customer/bookings", authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== "customer") {
      return res.status(403).json({
        success: false,
        message: "Customer access required",
      });
    }

    const customer = await User.findOne({
      _id: req.user.id,
      role: "customer",
    });

    if (!customer) {
      return res.status(403).json({
        success: false,
        message: "Customer account not found",
      });
    }

    const bookings = await Booking.find({
      customerId: customer._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error("Failed to fetch customer bookings:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load bookings",
    });
  }
});

app.get("/admin/verify", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    success: true,
    role: "admin",
  });
});

// Admin: create a manual booking for offline payments
app.post(
  "/admin/manual-bookings",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const {
      name, email, phone, slotId, travellers,
      requests, paymentMethod, paymentReference,
      paymentConfirmed,
    } = req.body;

    const count = Number(travellers);

    if (
      !name?.trim() ||
      !phone?.trim() ||
      !mongoose.isValidObjectId(slotId) ||
      !Number.isSafeInteger(count) ||
      count < 1 ||
      !["UPI", "Bank Transfer", "Cash"].includes(paymentMethod) ||
      typeof paymentConfirmed !== "boolean"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid manual booking details",
      });
    }

    if (
      paymentConfirmed &&
      paymentMethod !== "Cash" &&
      !String(paymentReference || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment reference is required",
      });
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const slot = await TripSlot.findById(slotId).session(session);
      if (!slot || slot.isClosed) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Trip slot is unavailable",
        });
      }

      const trip = await Trip.findById(slot.trip).session(session);
      if (!trip) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      const price = Number(trip.price);

      if (!Number.isFinite(price) || price <= 0) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invalid trip price",
        });
      }

      if (paymentConfirmed) {
        const reserved = await TripSlot.findOneAndUpdate(
          {
            _id: slot._id,
            isClosed: false,
            $expr: {
              $gte: [
                { $subtract: ["$totalSlots", "$bookedSlots"] },
                count,
              ],
            },
          },
          { $inc: { bookedSlots: count } },
          { returnDocument: "after", session }
        );

        if (!reserved) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            message: "Not enough seats available",
          });
        }
      }

      const booking = new Booking({
        name: name.trim(),
        email: String(email || "").trim(),
        phone: phone.trim(),
        trip: {
          title: trip.title,
          location: trip.location,
          duration: trip.duration,
          price: trip.price,
          image: trip.image,
          description: trip.description,
        },
        slotId: slot._id,
        date: slot.date,
        travellers: count,
        requests: String(requests || ""),
        total: price * count,
        bookingSource: "Admin",
        paymentMethod,
        paymentReference: String(paymentReference || "").trim(),
        paymentReferenceKey:
  paymentConfirmed && paymentMethod !== "Cash"
    ? `${paymentMethod}:${String(paymentReference).trim().toUpperCase()}`
    : undefined,
        paymentStatus: paymentConfirmed ? "Paid" : "Pending",
        status: paymentConfirmed ? "Confirmed" : "Pending",
      });

      await booking.save({ session });
      await session.commitTransaction();

      return res.status(201).json({
        success: true,
        message: "Manual booking created successfully",
        booking,
      });
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error("Manual booking failed:", err);

      if (err.code === 11000) {
  return res.status(409).json({
    success: false,
    message: "This payment reference has already been used",
  });
}

      return res.status(500).json({
        success: false,
        message: "Failed to create manual booking",
      });
    } finally {
      await session.endSession();
    }
  }
);

// Admin: record an offline payment and confirm a pending booking
app.put(
  "/admin/bookings/:id/record-payment",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const { paymentReference } = req.body;
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const booking = await Booking.findById(req.params.id).session(session);

      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (
        booking.bookingSource !== "Admin" ||
        booking.status !== "Pending" ||
        booking.paymentStatus !== "Pending"
      ) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Only unpaid, pending manual bookings can be confirmed",
        });
      }

      if (!["UPI", "Bank Transfer", "Cash"].includes(booking.paymentMethod)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invalid manual payment method",
        });
      }

      const reference = String(paymentReference || "").trim();

      if (booking.paymentMethod !== "Cash" && !reference) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Payment reference is required",
        });
      }

      const count = Number(booking.travellers);

      if (!Number.isSafeInteger(count) || count < 1) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invalid traveller count",
        });
      }

      const reservedSlot = await TripSlot.findOneAndUpdate(
        {
          _id: booking.slotId,
          isClosed: false,
          $expr: {
            $gte: [
              { $subtract: ["$totalSlots", "$bookedSlots"] },
              count,
            ],
          },
        },
        { $inc: { bookedSlots: count } },
        { returnDocument: "after", session }
      );

      if (!reservedSlot) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: "Not enough seats available",
        });
      }

      booking.paymentReference = reference;

      if (booking.paymentMethod !== "Cash") {
        booking.paymentReferenceKey =
          `${booking.paymentMethod}:${reference.toUpperCase()}`;
      }

      booking.paymentStatus = "Paid";
      booking.status = "Confirmed";

      await booking.save({ session });
      await session.commitTransaction();

      return res.json({
        success: true,
        message: "Payment recorded and booking confirmed",
        booking,
      });
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error("Record payment failed:", err);

      if (err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This payment reference has already been used",
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to record payment",
      });
    } finally {
      await session.endSession();
    }
  }
);

app.put(
  "/bookings/:id/status",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    const { status } = req.body;

    if (!["Pending", "Confirmed", "Cancelled"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking status",
      });
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const booking = await Booking.findById(req.params.id).session(session);

      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (status === "Confirmed" && booking.paymentStatus !== "Paid") {
  await session.abortTransaction();
  return res.status(400).json({
    success: false,
    message: "Cannot confirm a booking without successful payment",
  });
}

      const oldStatus = booking.status;

      if (oldStatus === "Cancelled" && status === "Pending") {
  await session.abortTransaction();

  return res.status(400).json({
    success: false,
    message: "Cannot change a cancelled booking to Pending",
  });
}

      if (oldStatus === "Pending" && status === "Confirmed") {
  await session.abortTransaction();
  return res.status(400).json({
    success: false,
    message: "Use Record Payment to confirm a pending booking",
  });
}

if (oldStatus === "Pending" && status === "Cancelled") {
  booking.status = "Cancelled";
  await booking.save({ session });
  await session.commitTransaction();

  return res.json({
    success: true,
    message: "Pending booking cancelled",
    booking,
  });
}

      if (oldStatus === status) {
        await session.abortTransaction();
        return res.json({
          success: true,
          message: "Booking status is already up to date",
          booking,
        });
      }

      const travellerCount = Number(booking.travellers);

      if (!Number.isSafeInteger(travellerCount) || travellerCount < 1) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Invalid traveller count",
        });
      }

      // Cancel a booking and release its seats.
      if (
  oldStatus === "Confirmed" &&
  status === "Cancelled" &&
  booking.paymentStatus === "Paid"
) {
        const slot = await TripSlot.findOneAndUpdate(
          {
            _id: booking.slotId,
            bookedSlots: { $gte: travellerCount },
          },
          {
            $inc: { bookedSlots: -travellerCount },
          },
          { new: true, session }
        );

        if (!slot) {
          throw new Error("Unable to release booking seats");
        }
      }

      // Restore a cancelled booking only if seats are available.
      if (
  oldStatus === "Cancelled" &&
  status === "Confirmed" &&
  booking.paymentStatus === "Paid"
) {
        const slot = await TripSlot.findOneAndUpdate(
          {
            _id: booking.slotId,
            isClosed: false,
            $expr: {
              $gte: [
                { $subtract: ["$totalSlots", "$bookedSlots"] },
                travellerCount,
              ],
            },
          },
          {
            $inc: { bookedSlots: travellerCount },
          },
          { new: true, session }
        );

        if (!slot) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            message: "Not enough seats available to restore this booking",
          });
        }
      }

      booking.status = status;
      await booking.save({ session });

      await session.commitTransaction();

      return res.json({
        success: true,
        message: "Booking status updated successfully",
        booking,
      });
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }

      console.error("Booking status update failed:", err);

      return res.status(500).json({
        success: false,
        message: "Failed to update booking status",
      });
    } finally {
      await session.endSession();
    }
  }
);

app.post(
  "/upload",
  authMiddleware,
  adminMiddleware,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }

      next();
    });
  },
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    res.json({
      success: true,
      filename: req.file.filename,
    });
  }
);

app.post("/trips", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const price = Number(req.body.price);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Trip price must be greater than ₹0",
      });
    }

    const trip = new Trip({
      ...req.body,
      price,
    });
    await trip.save();

    res.json({
      success: true,
      message: "Trip added successfully",
      trip,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to add trip",
    });
  }
});


app.get("/trips", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 });

    res.json(trips);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
    });
  }
});


app.get("/trips/:id", async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.json(trip);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trip",
    });
  }
});


app.delete("/trips/:id", async (req, res) => {
  try {
    await Trip.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to delete trip",
    });
  }
});


app.put("/trips/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (req.body.price !== undefined) {
      const price = Number(req.body.price);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Trip price must be greater than ₹0",
        });
      }

      req.body.price = price;
    }

    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json({
      success: true,
      message: "Trip updated successfully",
      trip,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to update trip",
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
  return res.status(401).json({
    success: false,
    message: "Invalid Email or Password",
  });
}

const isMatch = await bcrypt.compare(password, user.password);

if (!isMatch) {
  return res.status(401).json({
    success: false,
    message: "Invalid Email or Password",
  });
}

const token = jwt.sign(
  {
    id: user._id,
    email: user.email,
    role: user.role,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "7d",
  }
);

res.json({
  success: true,
  message: "Login Successful",
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  },
});
  }
  catch (err) {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Server Error",
  });
}
});

app.post("/customer/firebase-login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    // Firebase token verification will be added next.
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);

if (!decodedToken.phone_number) {
  return res.status(403).json({
    success: false,
    message: "Phone authentication is required",
  });
}

console.log("Verified customer phone:", decodedToken.phone_number);

let customer = await User.findOne({
  firebaseUid: decodedToken.uid,
});

if (!customer) {
  customer = await User.create({
    name: "Customer",
    phone: decodedToken.phone_number,
    firebaseUid: decodedToken.uid,
    role: "customer",
  });
}

console.log("Customer MongoDB ID:", customer._id);

const customerToken = jwt.sign(
  {
    id: customer._id.toString(),
    role: "customer",
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

return res.status(200).json({
  success: true,
  message: "Customer login successful",
  token: customerToken,
  customer: {
    id: customer._id,
    name: customer.name,
    phone: customer.phone,
    role: customer.role,
  },
});
  } catch (err) {
    console.error("Customer login error:", err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

app.get("/trips/:tripId/slots", async (req, res) => {
  try {
    const slots = await TripSlot.find({
      trip: req.params.tripId,
    }).sort({ date: 1 });

    const publicSlots = slots.map((slot) => {
      const available = slot.totalSlots - slot.bookedSlots;

      let status = "Available";

      if (slot.isClosed || available <= 0) {
        status = "Sold Out";
      } else if (available <= 3) {
        status = "Filling Fast";
      }

      return {
        _id: slot._id,
        date: slot.date,
        status,
      };
    });

    res.json(publicSlots);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trip slots",
    });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// ===============================
// CREATE TRIP SLOT
// ===============================

app.post("/trip-slots", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { trip, date, totalSlots } = req.body;

    if (!trip || !date || !totalSlots) {
      return res.status(400).json({
        success: false,
        message: "Trip, date and total slots are required",
      });
    }

    const slot = new TripSlot({
      trip,
      date,
      totalSlots,
    });

    await slot.save();

    res.json({
      success: true,
      message: "Trip slot created successfully",
      slot,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to create trip slot",
    });
  }
});

// ===============================
// GET ALL TRIP SLOTS FOR ADMIN
// ===============================

app.get("/trip-slots", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slots = await TripSlot.find()
      .populate("trip", "title location price")
      .sort({ date: 1 });

    res.json(slots);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trip slots",
    });
  }
});

app.put("/trip-slots/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { date, totalSlots } = req.body;

    const slot = await TripSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Trip slot not found",
      });
    }

    if (Number(totalSlots) < slot.bookedSlots) {
      return res.status(400).json({
        success: false,
        message: "Total slots cannot be less than booked slots",
      });
    }

    slot.date = date;
    slot.totalSlots = Number(totalSlots);

    await slot.save();

    res.json({
      success: true,
      message: "Trip slot updated successfully",
      slot,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to update trip slot",
    });
  }
});

app.put("/trip-slots/:id/toggle", authMiddleware, async (req, res) => {
  try {
    const slot = await TripSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Trip slot not found",
      });
    }

    slot.isClosed = !slot.isClosed;

    await slot.save();

    res.json({
      success: true,
      message: slot.isClosed
        ? "Trip slot closed successfully"
        : "Trip slot reopened successfully",
      slot,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to update trip slot",
    });
  }
});