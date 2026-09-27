require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Booking = require("./models/Booking");
const Trip = require("./models/Trip");
const TripSlot = require("./models/TripSlot");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const upload = multer({ dest: "uploads/" });



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

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:");
    console.error(err);
  });

app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.get("/", (req, res) => {
  res.send("Traviska Backend is Running 🚀");
});

app.post("/booking", async (req, res) => {
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
    const { amount } = req.body;

    const options = {
      amount: amount * 100, // Razorpay expects paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to create order",
    });
  }
});
app.post("/verify-payment", (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    return res.json({
      success: true,
      message: "Payment Verified Successfully",
    });
  }

  return res.status(400).json({
    success: false,
    message: "Payment Verification Failed",
  });
});

const PORT = 5001;

app.get("/bookings", authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch bookings",
    });
  }
});

app.post("/upload", authMiddleware, upload.single("image"), (req, res) => {
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
});

app.post("/trips", async (req, res) => {
  try {
    const trip = new Trip(req.body);
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

app.post("/trips", async (req, res) => {
  try {
    const trip = new Trip(req.body);

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


app.put("/trips/:id", async (req, res) => {
  try {
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


// ===============================
// CREATE TRIP SLOT
// ===============================

app.post("/trip-slots", authMiddleware, async (req, res) => {
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

app.get("/trip-slots", authMiddleware, async (req, res) => {
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

