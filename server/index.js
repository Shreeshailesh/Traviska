const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config();

const dns = require("dns");
// Prefer IPv4 resolution for robust MongoDB Atlas SRV lookup
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const express = require("express");
const zlib = require("zlib");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("./models/Booking");
const PaymentIssue = require("./models/PaymentIssue");
const Trip = require("./models/Trip");
const GlobalTripSections = require("./models/GlobalTripSections");
const TripSlot = require("./models/TripSlot");
const User = require("./models/User");
const Coupon = require("./models/Coupon");
const { validateCouponForBooking } = require("./routes/coupons");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const firebaseAdmin = require("./firebaseAdmin");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  secure: true,
});
const FileType = require("file-type");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/jpg",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.mimetype.toLowerCase())) {
      return cb(new Error("Only JPG, PNG, WebP, and GIF images are allowed"));
    }

    cb(null, true);
  },
});



const app = express();

// -----------------------------------------------------------------------------
// Production CORS Configuration
// -----------------------------------------------------------------------------
const allowedOrigins = [
  "https://traviska.com",
  "https://www.traviska.com",
  "https://traviska.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL,
]
  .filter(Boolean)
  .map((url) => url.trim().replace(/\/+$/, ""));

const corsOptions = {
  origin: (origin, callback) => {
    // Permit requests with no origin (e.g. server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.trim().replace(/\/+$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS for origin: ${origin}`), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Mount CORS before all routes & middleware to intercept all requests & preflights
app.use(cors(corsOptions));
app.options(/(.*)/, cors(corsOptions));

app.use(
  express.json({
    limit: "8mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use("/uploads", express.static("uploads"));

// Lightweight asynchronous gzip compression for JSON API responses > 1 KB
app.use((req, res, next) => {
  const acceptEncoding = req.headers["accept-encoding"] || "";
  if (!acceptEncoding.includes("gzip")) {
    return next();
  }
  const origJson = res.json.bind(res);
  res.json = (body) => {
    if (res.headersSent || res.getHeader("Content-Encoding")) {
      return origJson(body);
    }
    let jsonStr;
    try {
      jsonStr = JSON.stringify(body);
    } catch {
      return origJson(body);
    }
    if (!jsonStr || jsonStr.length < 1024) {
      return origJson(body);
    }
    zlib.gzip(jsonStr, (err, compressed) => {
      if (err || res.headersSent) {
        if (!res.headersSent) origJson(body);
        return;
      }
      res.setHeader("Content-Encoding", "gzip");
      res.setHeader("Vary", "Accept-Encoding");
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.removeHeader("Content-Length");
      res.send(compressed);
    });
    return res;
  };
  next();
});

const authMiddleware = async (req, res, next) => {
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

    // Validate account status against MongoDB to immediately reject suspended or revoked accounts
    const user = await User.findById(decoded.id).select("role isActive isSuspended sessionsRevokedAt");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists.",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Account has been suspended. Please contact the administrator.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive. Please contact the administrator.",
      });
    }

    // Check if token was issued prior to sessionsRevokedAt
    if (user.sessionsRevokedAt && decoded.iat) {
      const tokenIatDate = new Date(decoded.iat * 1000);
      if (tokenIatDate < user.sessionsRevokedAt) {
        return res.status(401).json({
          success: false,
          message: "Session has been revoked. Please log in again.",
        });
      }
    }

    // Ensure role matches actual current database record
    req.user.role = user.role;
    req.currentUser = user;

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== "admin" && req.user?.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  next();
};

const superAdminMiddleware = async (req, res, next) => {
  if (req.user?.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super Admin (CEO) access required",
    });
  }

  try {
    const user = req.currentUser || (await User.findById(req.user.id));
    if (!user || user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized Super Admin access",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Account suspended",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Check if token was issued prior to sessionsRevokedAt
    if (user.sessionsRevokedAt && req.user.iat) {
      const tokenIatDate = new Date(req.user.iat * 1000);
      if (tokenIatDate < user.sessionsRevokedAt) {
        return res.status(401).json({
          success: false,
          message: "Session revoked. Please log in again.",
        });
      }
    }

    req.currentUser = user;
    next();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Authentication validation error" });
  }
};

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Modular admin, captain, & sales routes (redesign). Existing endpoints below are unchanged.
app.use(require("./routes/adminDashboard")({ authMiddleware, adminMiddleware }));
app.use(require("./routes/adminCustomers")({ authMiddleware, adminMiddleware }));
app.use(require("./routes/adminBookings")({ authMiddleware, adminMiddleware }));
app.use(require("./routes/adminOperations")({ authMiddleware, adminMiddleware }));
app.use(require("./routes/captainPortal")());
app.use(require("./routes/salesPortal")({ authMiddleware }));
app.use(require("./routes/coupons")({ authMiddleware, adminMiddleware }));
app.use(require("./routes/gallery")({ authMiddleware, adminMiddleware }));
app.use("/api/super-admin", require("./routes/superAdmin")({ authMiddleware, superAdminMiddleware }));
app.use("/api/staff-invitation", require("./routes/staffInvitation")());
app.use("/api/staff-auth", require("./routes/staffPasswordReset")());
app.use(require("./routes/invoices")({ authMiddleware, adminMiddleware }));
app.use(require("./routes/customerCheckout")({ authMiddleware }));
const { issueInvoiceAndNotifyForBooking } = require("./services/bookingInvoiceHook");
const PaymentEvent = require("./models/PaymentEvent");

const razorpay =
  process.env.NODE_ENV === "production"
    ? null
    : new Razorpay({
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
      couponCode,
    } = req.body;

    if (!slotId) {
      return res.status(400).json({
        success: false,
        message: "Please select a trip date",
      });
    }

    const travellerCount = Number(travellers) || 1;

    let appliedCoupon = null;
    let discAmount = 0;
    let payable = Number(total) || 0;
    let orig = payable;

    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const v = await validateCouponForBooking({
        code: couponCode,
        tripTitle: trip?.title || "",
        bookingAmount: orig,
        customerPhone: phone,
        customerEmail: email,
      });
      if (v.isValid) {
        appliedCoupon = v.cleanCode;
        discAmount = v.discountAmount;
        payable = v.finalPayable;
      }
    }

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
      originalTotal: orig,
      couponCode: appliedCoupon,
      discountAmount: discAmount,
      total: payable,
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

    if (process.env.NODE_ENV === "production") {
    return res.status(503).json({
      success: false,
      message: "Online payments are not available yet. Please contact Traviska for booking assistance.",
    });
  }
  try {
    const { tripId, slotId, travellers, pickupLocationId, couponCode, phone, email } = req.body;

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

    const activePickups = Array.isArray(trip.pickupLocations)
      ? trip.pickupLocations.filter((p) => p.isActive !== false)
      : [];
    if (activePickups.length > 0) {
      if (!pickupLocationId) {
        return res.status(400).json({
          success: false,
          message: "Please select a pickup location",
        });
      }
      const matchedPickup = activePickups.find(
        (p) => String(p._id) === String(pickupLocationId)
      );
      if (!matchedPickup) {
        return res.status(400).json({
          success: false,
          message: "Selected pickup location is invalid for this trip",
        });
      }
    }

    if (slot.totalSlots - slot.bookedSlots < travellerCount) {
      return res.status(400).json({
        success: false,
        message: "Not enough seats available",
      });
    }

    const originalTotal = Math.round(Number(trip.price) * travellerCount);
    if (!Number.isSafeInteger(originalTotal) || originalTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip price",
      });
    }

    let discountAmount = 0;
    let finalPayable = originalTotal;
    let appliedCouponCode = "";

    // Server-side coupon validation
    if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
      const couponValidation = await validateCouponForBooking({
        code: couponCode,
        tripId: trip._id,
        tripTitle: trip.title,
        bookingAmount: originalTotal,
        customerPhone: phone,
        customerEmail: email,
      });

      if (!couponValidation.isValid) {
        return res.status(400).json({
          success: false,
          message: couponValidation.message,
        });
      }

      discountAmount = couponValidation.discountAmount;
      finalPayable = couponValidation.finalPayable;
      appliedCouponCode = couponValidation.cleanCode;
    }

    finalPayable = Math.max(0, finalPayable);

    // Razorpay minimum order amount is 100 paise (₹1) if online gateway is charged
    const amount = finalPayable === 0 ? 100 : Math.round(finalPayable * 100);

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `trip_${Date.now()}`,
      notes: {
        tripId: String(tripId),
        slotId: String(slotId),
        travellers: String(travellerCount),
        priceAtOrder: String(trip.price),
        pickupLocationId: String(pickupLocationId || ""),
        originalTotal: String(originalTotal),
        couponCode: String(appliedCouponCode),
        discountAmount: String(discountAmount),
        finalPayable: String(finalPayable),
      },
    });

    res.json({
      success: true,
      order,
      pricing: {
        originalTotal,
        discountAmount,
        finalPayable,
        couponCode: appliedCouponCode || null,
      },
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
    if (process.env.NODE_ENV === "production") {
    return res.status(503).json({
      success: false,
      message: "Online payments are not available yet. Please contact Traviska for booking assistance.",
    });
  }
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
const orderOriginalTotal = Number(orderNotes.originalTotal) || (priceAtOrder * orderedTravellers);
const orderDiscount = Number(orderNotes.discountAmount) || 0;
const expectedPayable = Math.max(0, orderOriginalTotal - orderDiscount);
const expectedPayablePaise = expectedPayable === 0 ? 100 : Math.round(expectedPayable * 100);

if (
  !Number.isFinite(priceAtOrder) ||
  priceAtOrder <= 0 ||
  !Number.isSafeInteger(orderedTravellers) ||
  orderedTravellers < 1 ||
  expectedPayablePaise !== razorpayOrder.amount
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

// Validate and resolve pickup details
const activePickups = Array.isArray(bookedTrip.pickupLocations)
  ? bookedTrip.pickupLocations.filter((p) => p.isActive !== false)
  : [];
const selectedPickupId =
  bookingDetails?.pickupLocationId || orderNotes.pickupLocationId;
let matchedPickup = null;

if (activePickups.length > 0) {
  if (!selectedPickupId) {
    return res.status(400).json({
      success: false,
      message: "Pickup location is required for this trip",
    });
  }
  matchedPickup = activePickups.find(
    (p) => String(p._id) === String(selectedPickupId)
  );
  if (!matchedPickup) {
    return res.status(400).json({
      success: false,
      message: "Selected pickup location is not available for this trip",
    });
  }
} else if (selectedPickupId && Array.isArray(bookedTrip.pickupLocations)) {
  matchedPickup = bookedTrip.pickupLocations.find(
    (p) => String(p._id) === String(selectedPickupId)
  );
}

// Determine effective pickup time with date overrides
let effectivePickupTime = matchedPickup ? matchedPickup.pickupTime || "" : "";
if (matchedPickup && Array.isArray(matchedPickup.dateOverrides)) {
  const override = matchedPickup.dateOverrides.find(
    (o) =>
      (bookingSlot._id && o.slotId && String(o.slotId) === String(bookingSlot._id)) ||
      (bookingSlot.date && o.date && o.date.trim() === String(bookingSlot.date).trim())
  );
  if (override && override.pickupTime) {
    effectivePickupTime = override.pickupTime;
  }
}

const pickupSnapshot = matchedPickup
  ? {
      name: matchedPickup.name || "",
      address: matchedPickup.address || "",
      landmark: matchedPickup.landmark || "",
      pickupTime: effectivePickupTime,
      googleMapsUrl: matchedPickup.googleMapsUrl || "",
    }
  : {
      name: String(bookingDetails?.pickupLocation || "").trim(),
      address: "",
      landmark: "",
      pickupTime: "",
      googleMapsUrl: "",
    };

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
  pickupLocation: pickupSnapshot.name
    ? `${pickupSnapshot.name}${pickupSnapshot.pickupTime ? ` (${pickupSnapshot.pickupTime})` : ""}`
    : String(bookingDetails?.pickupLocation || "").trim(),
  pickupLocationId: matchedPickup ? matchedPickup._id : null,
  pickupDetails: pickupSnapshot,
  bookingCode: `TVK${Math.floor(1000 + Math.random() * 9000)}`,
  travellers: travellerCount,
  travellerDetails: Array.isArray(bookingDetails.travellerDetails)
    ? bookingDetails.travellerDetails
    : [],
  requests: String(bookingDetails.requests || ""),
  originalTotal: Number(orderNotes.originalTotal) || (priceAtOrder * travellerCount),
  couponCode: orderNotes.couponCode ? String(orderNotes.couponCode).trim().toUpperCase() : null,
  discountAmount: Number(orderNotes.discountAmount) || 0,
  total: expectedPayable,
  paymentId: razorpay_payment_id,
  orderId: razorpay_order_id,
  paymentStatus: "Paid",
  status: "Confirmed",
  whatsappOptIn: Boolean(bookingDetails.whatsappOptIn),
  whatsappOptInAt: bookingDetails.whatsappOptIn ? new Date() : null,
});

if (orderNotes.couponCode && orderNotes.couponCode.trim()) {
  const cleanCouponCode = String(orderNotes.couponCode).trim().toUpperCase();
  await Coupon.updateOne(
    { code: cleanCouponCode },
    { $inc: { usageCount: 1 } },
    { session }
  );
}

await confirmedBooking.save({ session });

await session.commitTransaction();

let invoiceHook = null;
try {
  const isProdEnv = process.env.NODE_ENV === "production";
  const evtId = `RZP_PAY_${razorpay_payment_id}`;
  let paymentEvent = await PaymentEvent.findOne({ eventId: evtId });
  if (!paymentEvent) {
    paymentEvent = await PaymentEvent.create({
      eventId: evtId,
      environment: isProdEnv ? "live" : "test",
      isSimulated: !isProdEnv,
      bookingId: confirmedBooking._id,
      bookingCode: confirmedBooking.bookingCode || "",
      provider: "razorpay",
      providerOrderId: razorpay_order_id,
      providerPaymentId: razorpay_payment_id,
      paymentType: "Full",
      paymentMethod: razorpayPayment.method || "Razorpay",
      amountPaise: razorpayPayment.amount,
      currency: "INR",
      status: "succeeded",
      verified: true,
      notes: "Customer online payment verified via Razorpay",
      occurredAt: new Date(),
      createdBy: authenticatedCustomerId || null,
    });
  }

  invoiceHook = await issueInvoiceAndNotifyForBooking({
    booking: confirmedBooking,
    currentUser: authenticatedCustomerId ? { _id: authenticatedCustomerId, email: customerEmail, role: "customer" } : null,
    origin: req.headers.origin || "",
    paymentEvent,
  });
} catch (hookErr) {
  console.error("Customer verify-payment invoice/notification hook error:", hookErr.message);
}

return res.json({
  success: true,
  paymentVerified: true,
  bookingConfirmed: true,
  message: "Payment successful! Your booking is confirmed.",
  booking: confirmedBooking,
  invoice: invoiceHook?.invoice || null,
  emailResult: invoiceHook?.emailResult || null,
  whatsappPreview: invoiceHook?.whatsappPreview || null,
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
        email: customer.email || "",
        phone: customer.phone || "",
        role: customer.role,
        isEmailVerified: customer.isEmailVerified,
        authProvider: customer.authProvider,
        photoUrl: customer.photoUrl || "",
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
    }).select("name email phone photoUrl");

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
        photoUrl: customer.photoUrl || "",
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

    const { name, email, phone, photoUrl } = req.body;

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

    if (phone !== undefined) {
      customer.phone = phone.trim() || undefined;
    }

    if (photoUrl !== undefined) {
      customer.photoUrl = typeof photoUrl === "string" ? photoUrl.trim() : "";
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
        photoUrl: customer.photoUrl || "",
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
      paymentConfirmed, travellerDetails, pickupLocation,
      pickupLocationId,
    } = req.body;

    const count = Number(travellers);

    if (
      !name?.trim() ||
      !email?.trim() ||
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

      let matchedPickup = null;
      let effectivePickupTime = "";
      if (pickupLocationId && Array.isArray(trip.pickupLocations)) {
        matchedPickup = trip.pickupLocations.find(
          (p) => String(p._id) === String(pickupLocationId)
        );
        if (matchedPickup) {
          effectivePickupTime = matchedPickup.pickupTime || "";
          if (Array.isArray(matchedPickup.dateOverrides)) {
            const override = matchedPickup.dateOverrides.find(
              (o) =>
                (slot._id && o.slotId && String(o.slotId) === String(slot._id)) ||
                (slot.date && o.date && o.date.trim() === String(slot.date).trim())
            );
            if (override && override.pickupTime) {
              effectivePickupTime = override.pickupTime;
            }
          }
        }
      }

      const pickupSnapshot = matchedPickup
        ? {
            name: matchedPickup.name || "",
            address: matchedPickup.address || "",
            landmark: matchedPickup.landmark || "",
            pickupTime: effectivePickupTime,
            googleMapsUrl: matchedPickup.googleMapsUrl || "",
          }
        : {
            name: String(pickupLocation || "").trim(),
            address: "",
            landmark: "",
            pickupTime: "",
            googleMapsUrl: "",
          };

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
        pickupLocation: pickupSnapshot.name
          ? `${pickupSnapshot.name}${pickupSnapshot.pickupTime ? ` (${pickupSnapshot.pickupTime})` : ""}`
          : String(pickupLocation || "").trim(),
        pickupLocationId: matchedPickup ? matchedPickup._id : null,
        pickupDetails: pickupSnapshot,
        bookingCode: `TVK${Math.floor(1000 + Math.random() * 9000)}`,
        travellers: count,
        travellerDetails: Array.isArray(travellerDetails) ? travellerDetails : [],
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
        whatsappOptIn: Boolean(req.body.whatsappOptIn),
        whatsappOptInAt: req.body.whatsappOptIn ? new Date() : null,
        whatsappOptInSource: req.body.whatsappOptIn ? "admin_manual_booking" : "",
      });

      await booking.save({ session });
      await session.commitTransaction();

      const invoiceHook = paymentConfirmed
        ? await issueInvoiceAndNotifyForBooking({
            booking,
            currentUser: req.currentUser,
            origin: req.headers.origin,
          })
        : null;

      return res.status(201).json({
        success: true,
        message: "Manual booking created successfully",
        booking,
        invoice: invoiceHook?.invoice || null,
        emailResult: invoiceHook?.emailResult || null,
        whatsappPreview: invoiceHook?.whatsappPreview || null,
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

      const invoiceHook = await issueInvoiceAndNotifyForBooking({
        booking,
        currentUser: req.currentUser,
        origin: req.headers.origin,
      });

      return res.json({
        success: true,
        message: "Payment recorded and booking confirmed",
        booking,
        invoice: invoiceHook?.invoice || null,
        emailResult: invoiceHook?.emailResult || null,
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
  booking.cancelledAt = new Date();
  booking.cancelledBy = req.user?.email || req.user?.name || "Admin";
  if (req.body?.reason) booking.cancellationReason = String(req.body.reason).trim();
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

      // Cancel a confirmed booking and release its seats.
      if (oldStatus === "Confirmed" && status === "Cancelled") {
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
        booking.cancelledAt = new Date();
        booking.cancelledBy = req.user?.email || req.user?.name || "Admin";
        if (req.body?.reason) booking.cancellationReason = String(req.body.reason).trim();
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
    async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    try {
      const detected = await FileType.fromBuffer(req.file.buffer);

      if (!detected || !["image/jpeg", "image/png", "image/webp"].includes(detected.mime)) {
        return res.status(400).json({
          success: false,
          message: "Invalid image file",
        });
      }

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "traviska/trips",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      res.json({
        success: true,
        url: result.secure_url,
      });
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      res.status(500).json({
        success: false,
        message: "Image upload failed",
      });
    }
  }
);

app.post(
  "/upload-multiple",
  authMiddleware,
  adminMiddleware,
  (req, res, next) => {
    upload.array("images", 15)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No images uploaded",
      });
    }

    try {
      const uploadPromises = req.files.map((file) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder: "traviska/trips",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          stream.end(file.buffer);
        });
      });

      const urls = await Promise.all(uploadPromises);
      res.json({
        success: true,
        urls,
      });
    } catch (err) {
      console.error("Cloudinary multi-upload failed:", err);
      res.status(500).json({
        success: false,
        message: "Multiple image upload failed",
      });
    }
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


app.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = "https://traviska.com";
    const trips = await Trip.find({
      title: { $exists: true, $type: "string", $ne: "" },
      price: { $exists: true, $type: "number", $gt: 0 },
    })
      .select("_id createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    const staticRoutes = [
      { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
      { loc: `${baseUrl}/trips`, priority: "0.9", changefreq: "daily" },
      { loc: `${baseUrl}/about`, priority: "0.7", changefreq: "monthly" },
      { loc: `${baseUrl}/contact`, priority: "0.7", changefreq: "monthly" },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    for (const route of staticRoutes) {
      xml += `  <url>\n`;
      xml += `    <loc>${route.loc}</loc>\n`;
      xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
      xml += `    <priority>${route.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    for (const trip of trips) {
      if (!trip._id) continue;
      const dateVal = trip.updatedAt || trip.createdAt || new Date();
      const lastmod = new Date(dateVal).toISOString().split("T")[0];
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/trip/${trip._id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400");
    res.status(200).send(xml);
  } catch (err) {
    console.error("Failed to generate dynamic sitemap.xml:", err);
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Retry-After", "120");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.status(503).send("Service Unavailable: Sitemap generation temporarily unavailable. Please retry shortly.");
  }
});


app.get("/trips", async (req, res) => {
  try {
    const trips = await Trip.find().sort({ createdAt: -1 }).lean();

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
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
    const trip = await Trip.findById(req.params.id).lean();

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json(trip);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trip",
    });
  }
});


app.delete("/trips/:id", authMiddleware, adminMiddleware, async (req, res) => {
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
    const updateData = { ...req.body };
    delete updateData._id;
    delete updateData.__v;

    if (updateData.price !== undefined) {
      const price = Number(updateData.price);

      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({
          success: false,
          message: "Trip price must be greater than ₹0",
        });
      }

      updateData.price = price;
    }

    const trip = await Trip.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

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

// GET trip pickup locations (public / customer / admin)
app.get("/trips/:id/pickups", async (req, res) => {
  try {
    const { slotId, date } = req.query;
    const trip = await Trip.findById(req.params.id).select("pickupLocations").lean();
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    const pickups = (trip.pickupLocations || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const resolved = pickups.map((p) => {
      let effectiveTime = p.pickupTime || "";
      if (Array.isArray(p.dateOverrides) && p.dateOverrides.length > 0) {
        const override = p.dateOverrides.find(
          (o) =>
            (slotId && o.slotId && String(o.slotId) === String(slotId)) ||
            (date && o.date && o.date.trim() === String(date).trim())
        );
        if (override && override.pickupTime) {
          effectiveTime = override.pickupTime;
        }
      }

      return {
        _id: p._id,
        name: p.name,
        address: p.address,
        landmark: p.landmark,
        pickupTime: p.pickupTime,
        effectivePickupTime: effectiveTime,
        googleMapsUrl: p.googleMapsUrl,
        isActive: p.isActive !== false,
        order: p.order || 0,
        dateOverrides: p.dateOverrides || [],
      };
    });

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
      success: true,
      pickupLocations: resolved,
    });
  } catch (err) {
    console.error("Failed to fetch trip pickups:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pickup locations",
    });
  }
});

// PUT trip pickup locations (Admin only)
app.put(
  "/trips/:id/pickups",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { pickupLocations } = req.body;
      if (!Array.isArray(pickupLocations)) {
        return res.status(400).json({
          success: false,
          message: "pickupLocations must be an array",
        });
      }

      const trip = await Trip.findById(req.params.id);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: "Trip not found",
        });
      }

      trip.pickupLocations = pickupLocations;
      await trip.save();

      res.json({
        success: true,
        message: "Pickup locations saved successfully",
        pickupLocations: trip.pickupLocations,
      });
    } catch (err) {
      console.error("Failed to save trip pickups:", err);
      res.status(500).json({
        success: false,
        message: "Failed to save pickup locations",
      });
    }
  }
);

app.get("/global-trip-sections", async (req, res) => {
  try {
    let sections = await GlobalTripSections.findOne().lean();
    if (!sections) {
      sections = await GlobalTripSections.create({});
    }
    res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    res.json(sections);
  } catch (err) {
    console.error("Failed to fetch global trip sections:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trip sections",
    });
  }
});

app.put(
  "/global-trip-sections",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const payload = {
        safetyInformation: req.body.safetyInformation,
        whyChooseUs: req.body.whyChooseUs,
        cancellationPolicy: req.body.cancellationPolicy,
        termsAndConditions: req.body.termsAndConditions,
        importantNotes: req.body.importantNotes,
        updatedAt: new Date(),
      };

      let sections = await GlobalTripSections.findOne();
      if (!sections) {
        sections = await GlobalTripSections.create(payload);
      } else {
        sections = await GlobalTripSections.findByIdAndUpdate(
          sections._id,
          payload,
          { new: true, runValidators: true }
        );
      }

      res.json({
        success: true,
        message: "Detailed trip sections updated successfully",
        sections,
      });
    } catch (err) {
      console.error("Failed to update global trip sections:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update trip sections",
      });
    }
  }
);

app.post("/login", async (req, res) => {
  try {
    const { email, password, portal } = req.body;
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const safeEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${safeEmail}$`, "i") },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Strict portal separation:
    // Super Admin must log in ONLY via the dedicated /super-admin/login portal
    if (portal === "admin" && user.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Super Admin (CEO) credentials cannot be used on the staff portal. Please use the dedicated Super Admin Portal at /super-admin/login.",
      });
    }

    // Super Admin portal must accept ONLY super_admin
    if (portal === "super_admin" && user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. This login portal is strictly reserved for the Super Admin (CEO). Please visit /admin/login.",
      });
    }

    const staffRoles = ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"];
    if (!staffRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access restricted to authorized Traviska team members.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your staff account has been suspended. Please contact the CEO.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your staff account is currently inactive. Please contact the CEO.",
      });
    }

    user.lastLogin = new Date();
    await user.save();

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
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
});

app.post("/customer/firebase-login", async (req, res) => {
  try {
    const { idToken, name: clientProvidedName } = req.body;

    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Firebase ID token is required",
      });
    }

    // Fail-fast guard if MongoDB is not connected
    if (mongoose.connection.readyState !== 1) {
      console.warn("⚠️ Firebase login attempted while database readyState is:", mongoose.connection.readyState);
      return res.status(503).json({
        success: false,
        message: "Database connection is not ready. Please try again in a few moments.",
      });
    }

    // 1. Server-side token verification using Firebase Admin SDK
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = (decodedToken.email || "").trim().toLowerCase();
    const isEmailVerified = Boolean(decodedToken.email_verified);
    const phone = (decodedToken.phone_number || "").trim();
    const firebaseName = (decodedToken.name || "").trim();
    const picture = decodedToken.picture || "";
    const providerId = decodedToken.firebase?.sign_in_provider || "firebase";

    // 2. Safeguard: Prevent staff/admin email collisions & never mutate staff roles
    if (email) {
      const staffUser = await User.findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        role: { $in: ["admin", "sales", "sales_lead"] },
      });
      if (staffUser) {
        return res.status(403).json({
          success: false,
          message: "This email is registered to a staff account. Please sign in via the appropriate staff portal.",
        });
      }
    }

    // Helper: Safely resolve customer across UID, normalized email, or phone
    const findCustomer = async () => {
      // Primary: Lookup by verified Firebase UID
      let doc = await User.findOne({ firebaseUid: uid });
      if (doc) return doc;

      // Secondary: Lookup by normalized email (case-insensitive)
      if (email) {
        doc = await User.findOne({
          email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        });
        if (doc) return doc;
      }

      // Tertiary: Lookup by phone ONLY for verified phone OTP sign-in
      if (phone && providerId === "phone") {
        doc = await User.findOne({ phone, role: "customer" });
        if (doc) return doc;
      }

      return null;
    };

    let customer = await findCustomer();

    if (customer) {
      // Security check: ensure account is a customer account
      if (customer.role !== "customer") {
        return res.status(403).json({
          success: false,
          message: "Unauthorized account role access.",
        });
      }

      // Conflict detection: account already linked to another distinct Firebase UID
      if (customer.firebaseUid && customer.firebaseUid !== uid) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists under a different sign-in method. Please sign in with your original method.",
        });
      }

      // Linking guard: Never automatically merge accounts based on unverified identities
      if (!customer.firebaseUid) {
        if (providerId === "phone") {
          if (!phone || customer.phone !== phone) {
            return res.status(403).json({
              success: false,
              message: "Phone number verification mismatch.",
            });
          }
        } else if (email && !isEmailVerified) {
          return res.status(403).json({
            success: false,
            message: "Please verify your email address to access your existing account.",
            needsEmailVerification: true,
          });
        }
      }

      // Atomic update & link verified account details
      const updateFields = {
        firebaseUid: uid,
        isEmailVerified: isEmailVerified || customer.isEmailVerified,
      };

      if (email && (!customer.email || customer.email !== email)) {
        updateFields.email = email;
      }
      if (phone && !customer.phone) {
        updateFields.phone = phone;
      }
      if (picture && !customer.photoUrl) {
        updateFields.photoUrl = picture;
      }
      if (providerId === "google.com") {
        updateFields.authProvider = "google";
      }

      customer = await User.findByIdAndUpdate(
        customer._id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );
    } else {
      // 3. No existing record matched: Create a brand-new Customer
      const displayName = (clientProvidedName || firebaseName || (email ? email.split("@")[0] : "") || "Customer").trim();

      try {
        customer = await User.create({
          name: displayName || "Customer",
          email: email || undefined,
          phone: phone || undefined,
          firebaseUid: uid,
          role: "customer",
          isEmailVerified,
          authProvider: providerId === "google.com" ? "google" : (providerId === "password" ? "password" : (providerId === "phone" ? "phone" : "firebase")),
          photoUrl: picture || "",
        });
      } catch (createErr) {
        // Concurrency guard: If a simultaneous request created the user concurrently,
        // MongoDB E11000 triggers. Safely resolve without exposing error or failing.
        if (createErr.code === 11000) {
          console.log("ℹ️ Concurrent customer registration detected, resolving existing account...");
          customer = await findCustomer();
          if (customer) {
            if (!customer.firebaseUid) {
              customer = await User.findByIdAndUpdate(
                customer._id,
                { $set: { firebaseUid: uid, isEmailVerified: isEmailVerified || customer.isEmailVerified } },
                { new: true }
              );
            }
          } else {
            return res.status(409).json({
              success: false,
              message: "An account with these details is already registered. Please sign in.",
            });
          }
        } else {
          throw createErr;
        }
      }
    }

    // 4. Sign server-side session JWT
    const customerToken = jwt.sign(
      {
        id: customer._id.toString(),
        role: "customer",
        firebaseUid: customer.firebaseUid,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Customer authentication successful",
      token: customerToken,
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        role: "customer",
        isEmailVerified: customer.isEmailVerified,
        authProvider: customer.authProvider,
        photoUrl: customer.photoUrl || "",
      },
    });
  } catch (err) {
    console.error("Customer Firebase login error:", err.message);

    // Concurrency / Duplicate key safety: Never expose MongoDB collection or index names
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email address already exists. Please sign in with your credentials.",
      });
    }

    if (err?.name === "MongooseError" && err?.message?.includes("buffering timed out")) {
      return res.status(503).json({
        success: false,
        message: "Database operation timed out. Please retry in a few moments.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication service encountered an issue. Please try again.",
    });
  }
});

app.get("/trips/:tripId/slots", async (req, res) => {
  try {
    const { includeClosed } = req.query;

    const query = {
      trip: req.params.tripId,
    };

    // For public website / customer view: closed slots must disappear completely
    if (includeClosed !== "true") {
      query.isClosed = { $ne: true };
    }

    const slots = await TripSlot.find(query).sort({ date: 1 }).lean();

    const publicSlots = slots
      .filter((slot) => includeClosed === "true" || !slot.isClosed)
      .map((slot) => {
        const available = slot.totalSlots - slot.bookedSlots;

        let status = "Available";

        if (slot.isClosed) {
          status = "Closed";
        } else if (available <= 0) {
          status = "Sold Out";
        } else if (available <= 3) {
          status = "Filling Fast";
        }

        return {
          _id: slot._id,
          date: slot.date,
          status,
          isClosed: Boolean(slot.isClosed),
          totalSlots: slot.totalSlots,
          bookedSlots: slot.bookedSlots,
          availableSlots: available,
        };
      });

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json(publicSlots);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Failed to fetch trip slots",
    });
  }
});

// ===============================
// CREATE TRIP SLOT
// ===============================

app.post("/trip-slots", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { trip, tripId, date, totalSlots, photoDriveLink, billDriveLink, whatsappGroupLink } = req.body;
    const targetTripId = trip || tripId;

    if (!targetTripId || !date || !totalSlots) {
      return res.status(400).json({
        success: false,
        message: "Trip, date and total slots are required",
      });
    }

    // Parse date safely whether it is ISO "2026-12-24", DD/MM/YYYY "24/12/2026", DD-MM-YYYY, etc.
    let parsedDate;
    if (typeof date === "string") {
      const trimmed = date.trim();
      const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (ddmmyyyyMatch) {
        const day = parseInt(ddmmyyyyMatch[1], 10);
        const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
        const year = parseInt(ddmmyyyyMatch[3], 10);
        parsedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      } else {
        parsedDate = new Date(trimmed);
      }
    } else {
      parsedDate = new Date(date);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid departure date format. Please use YYYY-MM-DD or DD/MM/YYYY.",
      });
    }

    const slot = new TripSlot({
      trip: targetTripId,
      date: parsedDate,
      totalSlots: Number(totalSlots) || 24,
      photoDriveLink: (photoDriveLink || "").trim(),
      billDriveLink: (billDriveLink || "").trim(),
      whatsappGroupLink: (whatsappGroupLink || "").trim(),
    });

    await slot.save();
    await slot.populate("trip", "title location price image duration");

    res.json({
      success: true,
      message: "Departure slot created successfully",
      slot,
    });
  } catch (err) {
    console.error("Error creating trip slot:", err);

    res.status(500).json({
      success: false,
      message: err.message || "Failed to create trip slot",
    });
  }
});

// ===============================
// GET ALL TRIP SLOTS FOR ADMIN
// ===============================

app.get("/trip-slots", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const CaptainAssignment = require("./models/CaptainAssignment");
    const [slots, assignments] = await Promise.all([
      TripSlot.find()
        .populate("trip", "title location price image duration")
        .populate("assignedCaptain", "name avatar phone status rating defaultTripFee")
        .sort({ date: 1 })
        .lean(),
      CaptainAssignment.find({ status: { $ne: "Cancelled" } })
        .populate("captainId", "name avatar phone status rating defaultTripFee")
        .lean()
        .catch(() => []),
    ]);

    function normalizeRole(role) {
      if (!role) return "Head Captain";
      const r = String(role).trim().toLowerCase();
      if (r.includes("head") || r.includes("lead")) return "Head Captain";
      if (r.includes("main") || r.includes("assistant")) return "Main Captain";
      if (r.includes("trainee")) return "Trainee Captain";
      return "Head Captain";
    }

    function getRoleRank(role) {
      const norm = normalizeRole(role);
      if (norm === "Head Captain") return 1;
      if (norm === "Main Captain") return 2;
      return 3;
    }

    const slotCaptainsMap = new Map();
    assignments.forEach((a) => {
      const sId = String(a.slotId?._id || a.slotId || a.slot?._id || a.slot);
      const cap = a.captainId || a.captain;
      if (sId && cap) {
        if (!slotCaptainsMap.has(sId)) slotCaptainsMap.set(sId, []);
        const normRole = normalizeRole(a.role);
        slotCaptainsMap.get(sId).push({
          ...(typeof cap === "object" ? cap : { _id: cap }),
          role: normRole,
          roleRank: getRoleRank(normRole),
          captainFee: a.captainFee,
          assignmentId: a._id,
        });
      }
    });

    const enrichedSlots = slots.map((s) => {
      const sId = String(s._id);
      const team = (slotCaptainsMap.get(sId) || []).sort((a, b) => a.roleRank - b.roleRank);
      const headCap = team.find((c) => c.role === "Head Captain") || team[0] || s.assignedCaptain || null;

      return {
        ...s,
        assignedCaptain: headCap,
        assignedCaptains: team,
      };
    });

    res.json(enrichedSlots);
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
    const { trip, tripId, date, totalSlots, photoDriveLink, billDriveLink, whatsappGroupLink, isClosed } = req.body;

    const slot = await TripSlot.findById(req.params.id);

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Trip slot not found",
      });
    }

    if (totalSlots !== undefined && Number(totalSlots) < slot.bookedSlots) {
      return res.status(400).json({
        success: false,
        message: `Total capacity cannot be less than current confirmed bookings (${slot.bookedSlots})`,
      });
    }

    if (tripId || trip) slot.trip = tripId || trip;
    if (date) slot.date = date;
    if (totalSlots !== undefined) slot.totalSlots = Number(totalSlots);
    if (photoDriveLink !== undefined) slot.photoDriveLink = (photoDriveLink || "").trim();
    if (billDriveLink !== undefined) slot.billDriveLink = (billDriveLink || "").trim();
    if (whatsappGroupLink !== undefined) slot.whatsappGroupLink = (whatsappGroupLink || "").trim();
    if (isClosed !== undefined) slot.isClosed = Boolean(isClosed);

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

app.delete("/trip-slots/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const slot = await TripSlot.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: "Trip slot not found",
      });
    }

    if (slot.bookedSlots > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete departure slot with ${slot.bookedSlots} confirmed booking(s). Please cancel or reassign bookings first.`,
      });
    }

    await TripSlot.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Departure slot deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Failed to delete departure slot",
    });
  }
});

app.put("/trip-slots/:id/toggle", authMiddleware, adminMiddleware, async (req, res) => {
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

// =========================================================================
// SERVER STARTUP WITH ASYNCHRONOUS MONGODB CONNECTION
// Ensures server only accepts traffic after database is connected.
// =========================================================================

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error("❌ CRITICAL: MONGODB_URI environment variable is missing in server/.env");
      process.exit(1);
    }

    console.log("⏳ Connecting to MongoDB Atlas...");

    // Mongoose connection lifecycle listeners
    mongoose.connection.on("connected", () => {
      console.log("✅ MongoDB Connection Established (readyState: 1)");
    });

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB Connection Error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️ MongoDB Connection Lost. Reconnecting...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("🔄 MongoDB Connection Restored.");
    });

    // Connect with production-grade timeout & pool options
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });

    app.listen(PORT, () => {
      console.log(`🚀 Traviska Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Fatal MongoDB Connection Failure during startup:", error.message);
    console.error("Server startup aborted to prevent unhandled database query buffering.");
    process.exit(1);
  }
}

// Clean shutdown handler
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("MongoDB connection closed cleanly on process termination.");
    process.exit(0);
  } catch (e) {
    process.exit(1);
  }
});

startServer();