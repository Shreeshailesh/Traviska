const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const firebaseAdmin = require("../firebaseAdmin");
const Trip = require("../models/Trip");
const Captain = require("../models/Captain");
const CaptainOtp = require("../models/CaptainOtp");
const CaptainAssignment = require("../models/CaptainAssignment");
const TripSlot = require("../models/TripSlot");
const Booking = require("../models/Booking");
const Attendance = require("../models/Attendance");
const TripExpense = require("../models/TripExpense");
const CaptainPayout = require("../models/CaptainPayout");
const PickupLocation = require("../models/PickupLocation");
const UserCheck = require("../models/UserCheck");
const { parseAndValidatePhone, sendCaptainOtpWhatsApp } = require("../services/whatsappService");

function hashCaptainOtp(otpCode, e164Phone) {
  const secret = process.env.JWT_SECRET || "traviska_captain_otp_fallback";
  return crypto
    .createHmac("sha256", secret)
    .update(`${e164Phone}:${String(otpCode).trim()}`)
    .digest("hex");
}

function normalizeRole(role) {
  if (!role) return "Head Captain";
  const r = String(role).trim().toLowerCase();
  if (r.includes("head") || r.includes("lead")) return "Head Captain";
  if (r.includes("main") || r.includes("assistant")) return "Main Captain";
  if (r.includes("trainee")) return "Trainee Captain";
  return "Head Captain";
}

function extractLast10Digits(phone) {
  if (!phone) return "";
  return String(phone).replace(/[^\d]/g, "").slice(-10);
}

function buildPhoneRegex(phone) {
  const digits = extractLast10Digits(phone);
  if (!digits || digits.length < 10) return null;
  return new RegExp(digits.split("").join("[\\s-]*"));
}

async function findCaptainByPhone(phone) {
  const phonePattern = buildPhoneRegex(phone);
  if (!phonePattern) return null;
  return await Captain.findOne({ phone: { $regex: phonePattern } });
}

/**
 * Reusable server-side departure-slot assignment authorization helper.
 * Verifies that the specified captain is assigned to the slot in CaptainAssignment or TripSlot.
 */
async function verifyCaptainSlotAccess(captainId, slotId) {
  if (!captainId || !slotId) return false;
  if (!mongoose.Types.ObjectId.isValid(slotId)) return false;

  const capObjId = mongoose.Types.ObjectId.isValid(captainId)
    ? new mongoose.Types.ObjectId(captainId)
    : captainId;
  const slotObjId = new mongoose.Types.ObjectId(slotId);

  // 1. Check CaptainAssignment collection
  const assignment = await CaptainAssignment.findOne({
    $or: [
      { slotId: slotObjId, captainId: capObjId },
      { slotId: slotObjId, captain: capObjId },
      { slot: slotObjId, captainId: capObjId },
      { slot: slotObjId, captain: capObjId },
    ],
    status: { $ne: "Cancelled" },
  }).lean();

  if (assignment) return true;

  // 2. Check TripSlot collection (assignedCaptain or assignedCaptains list)
  const slot = await TripSlot.findOne({
    _id: slotObjId,
    $or: [
      { assignedCaptain: capObjId },
      { "assignedCaptains.captain": capObjId },
    ],
  }).lean();

  return Boolean(slot);
}

/**
 * Server-side Firebase ID token verification middleware.
 * Verifies token validity, extracts verified phone number, confirms matching Active Captain in MongoDB,
 * and attaches verified captain identity to req.captain.
 */
async function captainAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No authentication token provided." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication token missing." });
  }

  try {
    let verifiedPhone = "";
    let decodedClaims = null;

    // 1. Validate Firebase ID token first; if not a Firebase token, validate Captain WhatsApp OTP JWT
    try {
      decodedClaims = await firebaseAdmin.auth().verifyIdToken(token);
      verifiedPhone = decodedClaims.phone_number || "";
    } catch (_firebaseErr) {
      if (!process.env.JWT_SECRET) {
        throw new Error("Invalid captain token");
      }
      const jwtDecoded = jwt.verify(token, process.env.JWT_SECRET);
      if (jwtDecoded?.role !== "captain" || !jwtDecoded?.phone) {
        throw new Error("Invalid captain JWT claims");
      }
      decodedClaims = jwtDecoded;
      verifiedPhone = jwtDecoded.phone;
    }

    // 2. Extract verified phone number from token claims
    if (!verifiedPhone) {
      return res.status(403).json({
        success: false,
        message: "Authenticated account does not have a verified phone number.",
      });
    }

    // 3. Find matching captain in MongoDB
    const captain = await findCaptainByPhone(verifiedPhone);
    if (!captain) {
      return res.status(403).json({
        success: false,
        message: "No registered captain account found for this authenticated phone number.",
      });
    }

    // 4. Confirm Active status
    if (captain.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "Captain account is inactive or suspended. Access denied.",
      });
    }

    // 5. Attach verified captain identity & token context
    req.captain = captain;
    req.captain.id = String(captain._id);
    req.firebaseUser = decodedClaims;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired captain session.",
    });
  }
}

function captainPortalRoutes() {
  const router = express.Router();

  // Validate registered Active Captain before initiating Phone Auth (No demo OTP codes)
  router.post("/captain/send-otp", async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, message: "Phone number is required." });
      }

      const captain = await findCaptainByPhone(phone);
      if (!captain) {
        return res.status(404).json({
          success: false,
          message: "No captain account is registered with this phone number. Please contact Traviska operations.",
        });
      }

      if (captain.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Your captain account is not active. Please contact Traviska operations.",
        });
      }

      return res.json({
        success: true,
        message: "Captain account verified. Please complete verification using Firebase Phone Authentication.",
      });
    } catch (err) {
      console.error("Captain send-otp error:", err);
      return res.status(500).json({ success: false, message: "Failed to verify phone number." });
    }
  });

  // Verify Firebase ID Token and authenticate Captain
  router.post("/captain/login", async (req, res) => {
    try {
      const { idToken, token } = req.body;
      const firebaseToken = idToken || token;

      if (!firebaseToken || typeof firebaseToken !== "string") {
        return res.status(400).json({
          success: false,
          message: "Firebase ID token is required for captain authentication.",
        });
      }

      // 1. Verify token using Firebase Admin SDK
      let decodedToken;
      try {
        decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);
      } catch (authErr) {
        console.warn("Firebase ID token verification failed:", authErr.message);
        return res.status(401).json({
          success: false,
          message: "Invalid or expired Firebase verification token.",
        });
      }

      // 2. Extract verified phone number from decoded token
      const firebasePhone = decodedToken.phone_number;
      if (!firebasePhone) {
        return res.status(403).json({
          success: false,
          message: "Authenticated account does not have a verified phone number.",
        });
      }

      // 3. Find matching captain in MongoDB by verified phone number
      const captain = await findCaptainByPhone(firebasePhone);
      if (!captain) {
        return res.status(404).json({
          success: false,
          message: "No captain account is registered with this phone number. Please contact Traviska operations.",
        });
      }

      // 4. Verify Active status
      if (captain.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Your captain account is not active. Please contact Traviska operations.",
        });
      }

      return res.json({
        success: true,
        message: "Login successful",
        token: firebaseToken,
        captain,
      });
    } catch (err) {
      console.error("Captain login error:", err);
      return res.status(500).json({ success: false, message: "Captain login failed." });
    }
  });

  // Meta WhatsApp Cloud API OTP: Send 6-digit OTP to registered Active Captain
  router.post("/captain/whatsapp/send-otp", async (req, res) => {
    try {
      const { phone } = req.body || {};
      const parsedPhone = parseAndValidatePhone(phone);
      if (!parsedPhone.valid) {
        return res.status(400).json({
          success: false,
          message: parsedPhone.reason || "Please enter a valid 10-digit mobile number.",
        });
      }

      const captain = await findCaptainByPhone(parsedPhone.e164);
      if (!captain) {
        return res.status(404).json({
          success: false,
          message: "No captain account is registered with this phone number. Please contact Traviska operations.",
        });
      }

      if (captain.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Your captain account is not active. Please contact Traviska operations.",
        });
      }

      const existing = await CaptainOtp.findOne({ phone: parsedPhone.e164 });
      if (existing && existing.lastSentAt && Date.now() - existing.lastSentAt.getTime() < 45000) {
        const waitSec = Math.ceil((45000 - (Date.now() - existing.lastSentAt.getTime())) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSec}s before requesting another WhatsApp OTP.`,
        });
      }

      const otpCode = String(crypto.randomInt(100000, 999999));
      const otpHash = hashCaptainOtp(otpCode, parsedPhone.e164);
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await CaptainOtp.findOneAndUpdate(
        { phone: parsedPhone.e164 },
        {
          captainId: captain._id,
          phone: parsedPhone.e164,
          otpHash,
          attempts: 0,
          lastSentAt: new Date(),
          expiresAt,
        },
        { upsert: true, new: true }
      );

      const waRes = await sendCaptainOtpWhatsApp({ phone: parsedPhone.e164, otpCode });
      if (waRes.status !== "API Accepted") {
        return res.status(waRes.status === "Template Pending Approval" ? 503 : 502).json({
          success: false,
          status: waRes.status,
          message: waRes.error || "Unable to deliver WhatsApp OTP right now.",
        });
      }

      return res.json({
        success: true,
        message: "6-digit OTP sent to your registered WhatsApp number.",
        recipient: parsedPhone.e164,
        messageId: waRes.messageId,
      });
    } catch (err) {
      console.error("Captain WhatsApp send-otp error:", err);
      return res.status(500).json({ success: false, message: "Failed to send WhatsApp OTP." });
    }
  });

  // Meta WhatsApp Cloud API OTP: Verify 6-digit OTP & issue signed Captain JWT
  router.post("/captain/whatsapp/verify-otp", async (req, res) => {
    try {
      const { phone, otp } = req.body || {};
      const parsedPhone = parseAndValidatePhone(phone);
      const cleanOtp = String(otp || "").trim();

      if (!parsedPhone.valid || !/^\d{6}$/.test(cleanOtp)) {
        return res.status(400).json({
          success: false,
          message: "Valid phone number and 6-digit OTP code are required.",
        });
      }

      const record = await CaptainOtp.findOne({ phone: parsedPhone.e164 });
      if (!record || record.expiresAt.getTime() < Date.now()) {
        return res.status(401).json({
          success: false,
          message: "OTP expired or not requested. Please request a new OTP.",
        });
      }

      if (record.attempts >= 5) {
        return res.status(429).json({
          success: false,
          message: "Too many invalid attempts. Please request a new OTP.",
        });
      }

      const expectedHash = hashCaptainOtp(cleanOtp, parsedPhone.e164);
      const valid = crypto.timingSafeEqual(
        Buffer.from(record.otpHash, "utf8"),
        Buffer.from(expectedHash, "utf8")
      );

      if (!valid) {
        record.attempts += 1;
        await record.save();
        return res.status(401).json({
          success: false,
          message: "Invalid OTP code. Please check WhatsApp and try again.",
        });
      }

      const captain = await findCaptainByPhone(parsedPhone.e164);
      if (!captain || captain.status !== "Active") {
        return res.status(403).json({
          success: false,
          message: "Captain account is not active.",
        });
      }

      await CaptainOtp.deleteOne({ _id: record._id });

      const token = jwt.sign(
        {
          id: String(captain._id),
          role: "captain",
          phone: parsedPhone.e164,
          authMethod: "whatsapp_otp",
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Login successful",
        token,
        captain,
      });
    } catch (err) {
      console.error("Captain WhatsApp verify-otp error:", err);
      return res.status(500).json({ success: false, message: "OTP verification failed." });
    }
  });

  // Captain Profile & Stats
  router.get("/captain/me", captainAuth, async (req, res) => {
    try {
      const captain = req.captain;

      // Get upcoming and completed count
      const assignments = await CaptainAssignment.find({
        $or: [{ captainId: captain._id }, { captain: captain._id }],
      })
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location image price duration" },
        })
        .populate({
          path: "slot",
          populate: { path: "trip", select: "title location image price duration" },
        });

      const upcomingCount = assignments.filter((a) => a.status === "Assigned" || a.status === "On Trip").length;
      const completedCount = assignments.filter((a) => a.status === "Completed").length;

      // Calculate wallet balance
      const payouts = await CaptainPayout.find({ captain: captain._id });
      const pendingPayout = payouts
        .filter((p) => p.status === "Pending")
        .reduce((sum, p) => sum + (p.balance || p.amountPaid || 0), 0);
      const totalEarned = payouts
        .filter((p) => p.status === "Paid")
        .reduce((sum, p) => sum + (p.amountPaid || 0), 0);

      const activeAssignment = assignments.find((a) => a.status === "Assigned" || a.status === "On Trip");
      const effectiveRole = normalizeRole(activeAssignment?.role || captain.role);

      const permissions = {
        role: effectiveRole,
        isHead: effectiveRole === "Head Captain",
        isMain: effectiveRole === "Main Captain",
        isTrainee: effectiveRole === "Trainee Captain",
        canFinalizeAttendance: effectiveRole === "Head Captain",
        canMarkAttendance: ["Head Captain", "Main Captain"].includes(effectiveRole),
        canApproveExpenses: effectiveRole === "Head Captain",
        canSubmitExpenses: ["Head Captain", "Main Captain"].includes(effectiveRole),
        canCompleteTrip: effectiveRole === "Head Captain",
      };

      res.json({
        success: true,
        captain: {
          ...captain.toObject(),
          role: effectiveRole,
          permissions,
          upcomingTrips: upcomingCount,
          completedTrips: completedCount,
          wallet: {
            pendingBalance: pendingPayout,
            totalEarned: totalEarned,
          },
        },
      });
    } catch (err) {
      console.error("Captain profile fetch error:", err);
      res.status(500).json({ success: false, message: "Failed to load captain profile" });
    }
  });

  // Captain Assigned Trips
  router.get("/captain/my-trips", captainAuth, async (req, res) => {
    try {
      let captain = await Captain.findById(req.captain.id);
      if (!captain) return res.status(404).json({ success: false, message: "Captain profile not found" });
      let query = { $or: [{ captainId: captain._id }, { captain: captain._id }] };

      let assignments = await CaptainAssignment.find(query)
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location image duration price highlights" },
        })
        .populate({
          path: "slot",
          populate: { path: "trip", select: "title location image duration price highlights" },
        })
        .sort({ assignedAt: -1 });

      res.json({ success: true, trips: assignments });
    } catch (err) {
      console.error("My trips error:", err);
      res.status(500).json({ success: false, message: "Failed to load trips" });
    }
  });

  // ---------------------------------------------------------------
  // Captain Portal v2: normalized assigned departures for the logged-in captain
  // ---------------------------------------------------------------
  const ROLE_RANK = { "Head Captain": 1, "Main Captain": 2, "Trainee Captain": 3 };
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const parseDays = (duration) => {
    const m = String(duration || "").match(/(\d+)/);
    const n = m ? parseInt(m[1], 10) : 1;
    return n > 0 && n < 60 ? n : 1;
  };

  async function loadCaptainDepartures(captainId) {
    const [assignments, slotsWithCaptain] = await Promise.all([
      CaptainAssignment.find({ $or: [{ captainId }, { captain: captainId }], status: { $ne: "Cancelled" } })
        .populate({ path: "slotId", populate: { path: "trip", select: "title location image duration" } })
        .lean(),
      TripSlot.find({ $or: [{ assignedCaptain: captainId }, { "assignedCaptains.captain": captainId }] })
        .populate("trip", "title location image duration")
        .lean(),
    ]);

    const map = new Map();
    assignments.forEach((a) => {
      const slot = a.slotId;
      if (!slot || !slot._id) return;
      map.set(String(slot._id), { slot, role: normalizeRole(a.role), assignmentStatus: a.status, captainFee: a.captainFee || 0 });
    });
    slotsWithCaptain.forEach((slot) => {
      const key = String(slot._id);
      if (map.has(key)) return;
      const entry = (slot.assignedCaptains || []).find((c) => String(c.captain) === String(captainId));
      map.set(key, { slot, role: normalizeRole(entry?.role || "Head Captain"), assignmentStatus: "Assigned", captainFee: 0 });
    });

    const entries = Array.from(map.values()).filter((e) => e.slot.trip && e.slot.status !== "Cancelled");
    const slotIds = entries.map((e) => e.slot._id);

    const paxAgg = slotIds.length
      ? await Booking.aggregate([
          { $match: { slotId: { $in: slotIds }, status: { $ne: "Cancelled" } } },
          { $group: { _id: "$slotId", pax: { $sum: { $ifNull: ["$travellers", 1] } }, bookings: { $sum: 1 } } },
        ])
      : [];
    const paxMap = new Map(paxAgg.map((p) => [String(p._id), p]));

    const today = startOfDay(new Date());
    return entries
      .map(({ slot, role, assignmentStatus, captainFee }) => {
        const trip = slot.trip;
        const start = startOfDay(slot.date);
        const days = parseDays(trip.duration);
        const end = new Date(start);
        end.setDate(end.getDate() + days - 1);

        let bucket = "upcoming";
        if (assignmentStatus === "Completed" || slot.status === "Completed") {
          bucket = "completed";
        } else if (slot.status === "In Progress" || (start <= today && today <= end)) {
          bucket = "ongoing";
        } else if (slot.status === "Scheduled" || slot.status === "Confirmed" || end >= today) {
          bucket = "upcoming";
        } else {
          bucket = "completed";
        }

        const startDay = new Date(start).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const endDay = new Date(end).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
        const dateRangeLabel = `${startDay} – ${endDay}`;

        const pax = paxMap.get(String(slot._id));
        const passengerCount = (pax && pax.pax > 0) ? pax.pax : (slot.bookedSeats || 0);

        let tripImage = trip.image;
        if (!tripImage || (trip.title && trip.title.includes("Coorg"))) {
          tripImage = "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1000&auto=format&fit=crop&q=80";
        } else if (trip.title && trip.title.includes("Coastal")) {
          tripImage = "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80";
        }

        return {
          slotId: slot._id,
          tripId: trip._id,
          tripTitle: trip.title,
          location: trip.location || "Coorg, Karnataka",
          image: tripImage,
          duration: trip.duration || "2 Days / 1 Night",
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          dateRangeLabel,
          passengers: passengerCount,
          bookings: pax ? pax.bookings : 0,
          role,
          roleRank: ROLE_RANK[role] || 9,
          slotStatus: slot.status || "Scheduled",
          photoDriveLink: slot.photoDriveLink || "",
          billDriveLink: slot.billDriveLink || "",
          whatsappGroupLink: slot.whatsappGroupLink || "",
          bucket,
        };
      })
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  }

  router.get("/captain/portal/trips", captainAuth, async (req, res) => {
    try {
      const captain = await Captain.findById(req.captain.id).lean();
      if (!captain) return res.status(404).json({ success: false, message: "Captain profile not found" });
      const trips = await loadCaptainDepartures(captain._id);
      const counts = { upcoming: 0, ongoing: 0, completed: 0 };
      trips.forEach((t) => counts[t.bucket]++);
      res.json({ success: true, trips, counts });
    } catch (err) {
      console.error("Captain portal trips error:", err);
      res.status(500).json({ success: false, message: "Failed to load assigned trips" });
    }
  });

  router.get("/captain/portal/home", captainAuth, async (req, res) => {
    try {
      const captain = await Captain.findById(req.captain.id).select("name phone role status avatar").lean();
      if (!captain) return res.status(404).json({ success: false, message: "Captain profile not found" });

      const capObjId = mongoose.Types.ObjectId.isValid(captain._id) ? new mongoose.Types.ObjectId(captain._id) : captain._id;

      // Real departures
      const trips = await loadCaptainDepartures(captain._id);
      const upcomingTrips = trips.filter((t) => t.bucket === "upcoming").length;
      const completedTrips = trips.filter((t) => t.bucket === "completed").length;
      const ongoingTrips = trips.filter((t) => t.bucket === "ongoing").length;

      // Real expenses: pending claims count and amount
      const pendingExpenses = await TripExpense.find({
        $or: [{ captainId: captain._id }, { captainId: capObjId }, { captain: captain._id }],
        status: "Pending",
      }).lean();
      const pendingExpenseAmount = pendingExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      // Real available payout from CaptainPayout
      const payouts = await CaptainPayout.find({
        $or: [{ captainId: captain._id }, { captainId: capObjId }, { captain: captain._id }],
      }).lean();
      const availablePayout = payouts
        .filter((p) => p.status !== "Settled")
        .reduce((s, p) => s + (Number(p.balance) || 0), 0);

      const nextTrip = trips.find((t) => t.bucket === "ongoing") || trips.find((t) => t.bucket === "upcoming") || trips[0] || null;

      // Real recent activity (latest 5 events)
      const recentExpenses = await TripExpense.find({
        $or: [{ captainId: captain._id }, { captainId: capObjId }, { captain: captain._id }],
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();

      const recentActivity = [];
      recentExpenses.forEach((exp) => {
        recentActivity.push({
          id: exp._id,
          type: "expense",
          title: `Logged expense: ${exp.title || exp.category} (₹${Number(exp.amount).toLocaleString("en-IN")})`,
          timestamp: exp.createdAt,
          status: exp.status,
          paymentMode: exp.paymentMode,
        });
      });
      if (nextTrip) {
        recentActivity.push({
          id: nextTrip.slotId,
          type: "trip",
          title: `Assigned to ${nextTrip.tripTitle} (${nextTrip.dateRangeLabel})`,
          timestamp: nextTrip.startDate,
          status: nextTrip.slotStatus,
          paymentMode: nextTrip.role,
        });
      }

      res.json({
        success: true,
        captain: {
          _id: captain._id,
          name: captain.name,
          phone: captain.phone,
          role: normalizeRole(nextTrip?.role || captain.role),
          status: captain.status,
          avatar: captain.avatar,
        },
        stats: {
          upcomingTrips,
          completedTrips,
          ongoingTrips,
          pendingExpenseCount: pendingExpenses.length,
          pendingExpenseAmount,
          availablePayout,
        },
        nextTrip,
        recentActivity,
      });
    } catch (err) {
      console.error("Captain portal home error:", err);
      res.status(500).json({ success: false, message: "Failed to load dashboard" });
    }
  });

  // Single Trip Details for Captain (Traveller list, pickups, stats)
  router.get("/captain/trips/:slotId", captainAuth, async (req, res) => {
    try {
      const { slotId } = req.params;
      if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
        return res.status(400).json({ success: false, message: "Invalid expedition departure ID" });
      }

      // Authorize that requesting captain is assigned to this departure
      const isAssigned = await verifyCaptainSlotAccess(req.captain._id, slotId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not assigned to this expedition departure.",
        });
      }

      const slot = await TripSlot.findById(slotId)
        .populate("trip")
        .populate("assignedCaptain", "name phone role avatar")
        .populate("assignedCaptains.captain", "name phone role avatar");
      if (!slot) {
        return res.status(404).json({ success: false, message: "Trip slot not found" });
      }

      // Fetch bookings for this slot
      let bookings = [];
      try {
        bookings = await Booking.find({
          $or: [{ slotId: slot._id }, { date: slot.startDate }],
          status: { $ne: "cancelled" },
        });
      } catch (e) {
        console.warn("Could not load bookings for slot:", e.message);
      }

      // Get pickup points
      let pickups = [];
      try {
        pickups = await PickupLocation.find({
          $or: [{ trip: slot.trip?._id }, { isActive: true }],
        });
      } catch (e) {
        console.warn("Could not load pickups for slot:", e.message);
      }

      // Fetch attendance
      let attendanceRecords = [];
      try {
        attendanceRecords = await Attendance.find({
          $or: [{ slot: slot._id }, { slotId: slot._id }],
        });
      } catch (e) {
        console.warn("Could not load attendance for slot:", e.message);
      }

      // Fetch expenses (only expenses logged by the logged-in captain)
      let expenses = [];
      try {
        const capObjId = mongoose.Types.ObjectId.isValid(req.captain?.id)
          ? new mongoose.Types.ObjectId(req.captain.id)
          : req.captain?.id;

        expenses = await TripExpense.find({
          $and: [
            { $or: [{ slot: slot._id }, { slotId: slot._id }] },
            { $or: [{ captainId: req.captain?.id }, { captainId: capObjId }, { captain: req.captain?.id }, { captain: capObjId }] },
          ],
        }).populate("captainId", "name role");
      } catch (e) {
        console.warn("Could not load expenses for slot:", e.message);
      }

      // Fetch User Check & Attendance stats
      let userCheckDoc = null;
      try {
        userCheckDoc = await UserCheck.findOne({ slotId });
      } catch (e) {
        console.warn("Could not load user check for slot:", e.message);
      }

      const totalTravellers = bookings.reduce((s, b) => s + (b.travellers || 1), 0);
      const checkedCount = userCheckDoc?.checkedTravellers?.length || 0;
      const boardedCount = attendanceRecords.filter((a) => a.status === "Present" || a.status === "Boarded").length;
      const myExpenseTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      res.json({
        success: true,
        slot,
        bookings,
        pickups,
        attendanceRecords,
        expenses,
        stats: {
          attendance: { boarded: boardedCount, total: totalTravellers },
          userCheck: { checked: checkedCount, total: totalTravellers },
          expenses: { count: expenses.length, total: myExpenseTotal },
        },
      });
    } catch (err) {
      console.error("Captain trip details error:", err);
      res.status(500).json({ success: false, message: err?.message || "Failed to load trip details" });
    }
  });

  // Update Traveller Attendance (Synchronized with Admin Panel & Attendance Schema)
  router.post("/captain/attendance", captainAuth, async (req, res) => {
    try {
      const {
        slotId,
        bookingId,
        travellerIndex = 0,
        travellerName,
        pickupLocation,
        status,
        remarks,
      } = req.body;

      if (!slotId || !bookingId) {
        return res.status(400).json({ success: false, message: "Slot and Booking IDs are required" });
      }

      if (!mongoose.Types.ObjectId.isValid(slotId) || !mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ success: false, message: "Invalid slot or booking identifier." });
      }

      // Authorize that requesting captain is assigned to this departure
      const isAssigned = await verifyCaptainSlotAccess(req.captain._id, slotId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not assigned to this expedition departure.",
        });
      }

      // Verify that booking belongs to this slot
      const booking = await Booking.findOne({
        _id: new mongoose.Types.ObjectId(bookingId),
        $or: [
          { slotId: new mongoose.Types.ObjectId(slotId) },
          { slot: new mongoose.Types.ObjectId(slotId) },
        ],
      });
      if (!booking) {
        return res.status(400).json({ success: false, message: "Booking does not belong to this departure slot." });
      }

      const tIndex = Number(travellerIndex) || 0;
      const finalStatus = (status === "Boarded" || status === "Present") ? "Present" : "Pending";

      const updated = await Attendance.findOneAndUpdate(
        { slotId, bookingId, travellerIndex: tIndex },
        {
          $set: {
            slotId,
            bookingId,
            travellerIndex: tIndex,
            travellerName: travellerName || "Traveller",
            pickupLocation: pickupLocation || "Main Pickup",
            status: finalStatus,
            markedBy: req.captain.name || "Captain",
            markedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );

      res.json({ success: true, message: "Attendance saved", record: updated });
    } catch (err) {
      console.error("Captain attendance error:", err);
      res.status(500).json({ success: false, message: "Failed to mark attendance" });
    }
  });

  // Get all expenses for logged-in captain with MongoDB summary counters and filters (Task 1 & 5)
  router.get("/captain/expenses", captainAuth, async (req, res) => {
    try {
      const captainId = req.captain.id;
      const { slotId, status, paymentMode } = req.query;

      const capObjId = mongoose.Types.ObjectId.isValid(captainId)
        ? new mongoose.Types.ObjectId(captainId)
        : captainId;

      const filter = {
        $or: [{ captainId: captainId }, { captainId: capObjId }, { captain: captainId }],
      };

      if (slotId && slotId !== "All") {
        if (mongoose.Types.ObjectId.isValid(slotId)) {
          filter.slotId = { $in: [slotId, new mongoose.Types.ObjectId(slotId)] };
        } else {
          filter.slotId = slotId;
        }
      }

      if (status && status !== "All") {
        if (status === "Approved") {
          filter.status = { $in: ["Approved", "Auto Approved"] };
        } else {
          filter.status = status;
        }
      }

      if (paymentMode && paymentMode !== "All") {
        if (paymentMode === "Self") {
          filter.paymentMode = { $in: ["Self", "Self (Any Mode)"] };
        } else {
          filter.paymentMode = paymentMode;
        }
      }

      // 1. Fetch filtered expenses populated with slot & trip
      const expenses = await TripExpense.find(filter)
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location duration image" },
        })
        .populate("captainId", "name phone role avatar")
        .sort({ createdAt: -1 });

      // 2. Compute summary metrics across ALL expenses submitted by this captain
      const allCaptainExpenses = await TripExpense.find({
        $or: [{ captainId: captainId }, { captainId: capObjId }, { captain: captainId }],
      });

      const totalSubmitted = allCaptainExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const submittedCount = allCaptainExpenses.length;

      const approvedExpenses = allCaptainExpenses.filter((e) =>
        ["Approved", "Auto Approved"].includes(e.status)
      );
      const approvedAmount = approvedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const approvedCount = approvedExpenses.length;

      const pendingExpenses = allCaptainExpenses.filter((e) => e.status === "Pending");
      const pendingAmount = pendingExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const pendingCount = pendingExpenses.length;

      const rejectedExpenses = allCaptainExpenses.filter((e) => e.status === "Rejected");
      const rejectedAmount = rejectedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const rejectedCount = rejectedExpenses.length;

      const settledExpenses = allCaptainExpenses.filter((e) => e.status === "Settled");
      const settledAmount = settledExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const traviskaCardAmount = allCaptainExpenses
        .filter((e) => e.paymentMode === "Traviska Card")
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const traviskaUpiAmount = allCaptainExpenses
        .filter((e) => e.paymentMode === "Traviska UPI")
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const selfPaidAmount = allCaptainExpenses
        .filter((e) => ["Self", "Self (Any Mode)"].includes(e.paymentMode))
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      res.json({
        success: true,
        expenses,
        summary: {
          totalSubmitted,
          submittedCount,
          approvedAmount,
          approvedCount,
          pendingAmount,
          pendingCount,
          rejectedAmount,
          rejectedCount,
          settledAmount,
          traviskaCardAmount,
          traviskaUpiAmount,
          selfPaidAmount,
        },
      });
    } catch (err) {
      console.error("Captain GET expenses error:", err);
      res.status(500).json({ success: false, message: "Failed to load expenses" });
    }
  });

  // Submit Trip Expense (Task 1 & Task 5)
  router.post("/captain/expenses", captainAuth, async (req, res) => {
    try {
      const {
        slotId,
        paymentMode = "Self",
        category,
        expenseType,
        amount,
        title,
        notes,
        description,
        receiptUrl,
        billReceipt,
      } = req.body;

      if (!slotId) {
        return res.status(400).json({ success: false, message: "Departure slot is required" });
      }
      if (!mongoose.Types.ObjectId.isValid(slotId)) {
        return res.status(400).json({ success: false, message: "Invalid departure slot identifier." });
      }
      const expType = expenseType || category;
      if (!expType) {
        return res.status(400).json({ success: false, message: "Expense category is required" });
      }
      const numAmount = Number(amount);
      if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, message: "Please enter a valid expense amount greater than ₹0" });
      }
      const expTitle = (title || description || `${expType} expense`).trim();
      if (!expTitle) {
        return res.status(400).json({ success: false, message: "Expense title is required" });
      }

      const slotExists = await TripSlot.findById(slotId).populate("trip");
      if (!slotExists) {
        return res.status(404).json({ success: false, message: "Trip departure not found" });
      }

      // Verify captain authorization to this departure slot (Strictly Enforced)
      const isAssigned = await verifyCaptainSlotAccess(req.captain._id, slotId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not assigned to this departure slot and cannot submit expenses.",
        });
      }

      // Prevent duplicate submissions within 30 seconds
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const duplicate = await TripExpense.findOne({
        captainId: req.captain._id,
        slotId,
        amount: numAmount,
        title: expTitle,
        createdAt: { $gte: thirtySecondsAgo },
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "A matching expense was just submitted. Duplicate submission prevented.",
        });
      }

      // Server-side approval status logic
      let cleanPaymentMode = paymentMode;
      if (cleanPaymentMode === "Self (Any Mode)") cleanPaymentMode = "Self";

      const isCompanyPaid = cleanPaymentMode === "Traviska Card" || cleanPaymentMode === "Traviska UPI";
      const status = isCompanyPaid ? "Auto Approved" : "Pending";

      const expense = new TripExpense({
        slotId,
        captainId: req.captain._id, // Enforce authenticated identity
        title: expTitle,
        category: expType,
        amount: numAmount,
        paymentMode: cleanPaymentMode,
        notes: notes || description || "",
        receiptUrl: receiptUrl || billReceipt || "",
        status,
        isCompanyPaid,
        isAutoApproved: isCompanyPaid,
        verificationStatus: isCompanyPaid ? "Unverified" : undefined,
        approvedBy: isCompanyPaid ? "System (Auto Approved)" : undefined,
        approvedAt: isCompanyPaid ? new Date() : undefined,
      });

      await expense.save();

      // Populate expense for immediate frontend consumption
      await expense.populate([
        {
          path: "slotId",
          populate: { path: "trip", select: "title location duration image" },
        },
        {
          path: "captainId",
          select: "name phone role avatar",
        },
      ]);

      // Update CaptainPayout tracking if company paid
      if (isCompanyPaid) {
        const cardExpenses = await TripExpense.find({
          slotId,
          captainId: req.captain._id,
          paymentMode: "Traviska Card",
        });
        const upiExpenses = await TripExpense.find({
          slotId,
          captainId: req.captain._id,
          paymentMode: "Traviska UPI",
        });

        const cardSum = cardExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const upiSum = upiExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

        let payout = await CaptainPayout.findOne({
          slotId,
          captainId: req.captain._id,
        });
        if (payout) {
          payout.traviskaCardExpenses = cardSum;
          payout.traviskaUpiExpenses = upiSum;
          await payout.save();
        }
      }

      res.json({
        success: true,
        message: isCompanyPaid
          ? "Expense recorded and Auto Approved as Company Paid (Unverified)."
          : "Self expense submitted and is Pending Admin Approval.",
        expense,
      });
    } catch (err) {
      console.error("Captain expense submission error:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to submit expense" });
    }
  });

  // Captain Wallet & Payout Logs (Task 6 - 100% Real MongoDB Data)
  router.get("/captain/wallet", captainAuth, async (req, res) => {
    try {
      const captainId = req.captain.id;
      const capObjId = mongoose.Types.ObjectId.isValid(captainId)
        ? new mongoose.Types.ObjectId(captainId)
        : captainId;

      // 1. Fetch real payouts for this captain
      const payouts = await CaptainPayout.find({
        $or: [{ captainId: captainId }, { captainId: capObjId }, { captain: captainId }],
      })
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location duration image" },
        })
        .sort({ createdAt: -1 })
        .lean();

      // 2. Fetch real expenses for this captain
      const expenses = await TripExpense.find({
        $or: [{ captainId: captainId }, { captainId: capObjId }, { captain: captainId }],
      }).lean();

      // Trip Earnings = sum of base fees across assigned payouts
      const tripEarnings = payouts.reduce((sum, p) => sum + (Number(p.tripFee) || 0), 0);

      // Advances Received = sum of company advances across payouts
      const advancesReceived = payouts.reduce((sum, p) => sum + (Number(p.companyAdvance) || 0), 0);

      // Approved Reimbursements = Approved/Settled Self-paid expenses
      const approvedReimbursements = expenses
        .filter(
          (e) =>
            ["Approved", "Settled"].includes(e.status) &&
            !e.isCompanyPaid &&
            (e.paymentMode === "Self" || e.paymentMode === "Self (Any Mode)")
        )
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Pending Reimbursements = Pending Self-paid expenses
      const pendingReimbursements = expenses
        .filter(
          (e) =>
            e.status === "Pending" &&
            !e.isCompanyPaid &&
            (e.paymentMode === "Self" || e.paymentMode === "Self (Any Mode)")
        )
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      // Total Paid Out = sum of amountPaid across payouts
      const totalPaidOut = payouts.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

      // Final Payable Balance = sum of balance across pending payouts
      const pendingPayouts = payouts.filter((p) => p.status !== "Settled");
      const payableBalance = pendingPayouts.reduce((sum, p) => sum + (Number(p.balance) || 0), 0);

      // Extract transaction history from all payouts
      const transactions = [];
      payouts.forEach((p) => {
        if (Array.isArray(p.transactions) && p.transactions.length > 0) {
          p.transactions.forEach((tx) => {
            transactions.push({
              _id: tx._id,
              payoutId: p._id,
              tripTitle: p.slotId?.trip?.title || "Assigned Trip",
              departureDate: p.slotId?.date
                ? new Date(p.slotId.date).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "",
              amount: tx.amount,
              paymentMethod: tx.paymentMethod || "UPI",
              paymentReference: tx.paymentReference,
              settledAt: tx.settledAt,
              settledBy: tx.settledBy,
              notes: tx.notes,
            });
          });
        } else if (p.amountPaid > 0) {
          transactions.push({
            _id: `tx-${p._id}`,
            payoutId: p._id,
            tripTitle: p.slotId?.trip?.title || "Assigned Trip",
            departureDate: p.slotId?.date
              ? new Date(p.slotId.date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              : "",
            amount: p.amountPaid,
            paymentMethod: "UPI / Bank Transfer",
            paymentReference: p.referenceNumber || `TXN-${p._id.toString().slice(-6).toUpperCase()}`,
            settledAt: p.updatedAt || p.createdAt,
            settledBy: "Traviska Finance",
            notes: "Trip Honorarium Settlement",
          });
        }
      });

      // Format trip-wise breakdown
      const tripBreakdown = payouts.map((p) => {
        const slot = p.slotId;
        const trip = slot?.trip;
        const depDate = slot?.date
          ? new Date(slot.date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "Scheduled Date";
        return {
          _id: p._id,
          slotId: slot?._id,
          tripTitle: trip?.title || "Assigned Trip",
          location: trip?.location || "India",
          departureDate: depDate,
          tripFee: p.tripFee || 0,
          approvedExpenses: p.approvedExpenses || p.approvedSelfExpenses || 0,
          companyAdvance: p.companyAdvance || 0,
          totalPayout: p.totalPayout || 0,
          amountPaid: p.amountPaid || 0,
          balance: p.balance || 0,
          status: p.status || "Pending",
          traviskaCardExpenses: p.traviskaCardExpenses || 0,
          traviskaUpiExpenses: p.traviskaUpiExpenses || 0,
        };
      });

      res.json({
        success: true,
        wallet: {
          tripEarnings,
          advancesReceived,
          approvedReimbursements,
          pendingReimbursements,
          payableBalance,
          totalPaidOut,
          tripBreakdown,
          history: transactions,
        },
      });
    } catch (err) {
      console.error("Captain wallet error:", err);
      res.status(500).json({ success: false, message: "Failed to load wallet" });
    }
  });

  // -------------------------------------------------------------
  // USER CHECK: Reusable Traveller Sightseeing Checklist (Spec 3.2)
  // -------------------------------------------------------------
  router.get("/captain/trips/:slotId/user-check", captainAuth, async (req, res) => {
    try {
      const { slotId } = req.params;
      if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
        return res.status(400).json({ success: false, message: "Invalid departure slot identifier." });
      }

      // Authorize that requesting captain is assigned to this departure
      const isAssigned = await verifyCaptainSlotAccess(req.captain._id, slotId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not assigned to this expedition departure.",
        });
      }

      const slot = await TripSlot.findById(slotId).populate("trip");
      if (!slot) return res.status(404).json({ success: false, message: "Departure slot not found" });

      const bookings = await Booking.find({
        $or: [{ slotId: slot._id }, { date: slot.startDate }],
        status: { $ne: "cancelled" },
      });

      // Expand all travellers from confirmed bookings (flat list)
      const travellers = [];
      bookings.forEach((b) => {
        const count = b.travellers || 1;
        for (let i = 0; i < count; i++) {
          const key = `${b._id}_${i}`;
          const displayName = i === 0
            ? (b.customerName || "Traveller")
            : `${b.customerName || "Traveller"} (Guest ${i + 1})`;
          travellers.push({
            key,
            bookingId: b._id,
            index: i,
            name: displayName,
            phone: b.customerPhone || "N/A",
            pickupLocation: b.pickupLocation || "Main Pickup",
          });
        }
      });

      let checkDoc = await UserCheck.findOne({ slotId });
      if (!checkDoc) {
        checkDoc = await UserCheck.create({
          slotId,
          checkedTravellers: [],
          lastUpdatedBy: req.captain.name || "Captain",
        });
      }

      res.json({
        success: true,
        slotId,
        tripTitle: slot.trip?.title || "Trip Departure",
        travellers,
        checkedTravellers: checkDoc.checkedTravellers || [],
        lastUpdatedBy: checkDoc.lastUpdatedBy,
        lastUpdatedAt: checkDoc.lastUpdatedAt,
        resetAuditTrail: checkDoc.resetAuditTrail || [],
      });
    } catch (err) {
      console.error("User check error:", err);
      res.status(500).json({ success: false, message: "Failed to load user check" });
    }
  });

  router.post("/captain/trips/:slotId/user-check/toggle", captainAuth, async (req, res) => {
    try {
      const { slotId } = req.params;
      if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
        return res.status(400).json({ success: false, message: "Invalid departure slot identifier." });
      }

      // Authorize that requesting captain is assigned to this departure
      const isAssigned = await verifyCaptainSlotAccess(req.captain._id, slotId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not assigned to this expedition departure.",
        });
      }

      const travellerKey = req.body.travellerKey || req.body.travellerId;
      if (!travellerKey) return res.status(400).json({ success: false, message: "Traveller key required" });

      let checkDoc = await UserCheck.findOne({ slotId });
      if (!checkDoc) {
        checkDoc = new UserCheck({ slotId, checkedTravellers: [] });
      }

      const isChecked = checkDoc.checkedTravellers.includes(travellerKey);
      if (isChecked) {
        checkDoc.checkedTravellers = checkDoc.checkedTravellers.filter((k) => k !== travellerKey);
      } else {
        checkDoc.checkedTravellers.push(travellerKey);
      }
      checkDoc.lastUpdatedBy = req.captain.name || "Captain";
      checkDoc.lastUpdatedAt = new Date();
      await checkDoc.save();

      res.json({
        success: true,
        checkedTravellers: checkDoc.checkedTravellers,
        lastUpdatedBy: checkDoc.lastUpdatedBy,
        lastUpdatedAt: checkDoc.lastUpdatedAt,
      });
    } catch (err) {
      console.error("User check toggle error:", err);
      res.status(500).json({ success: false, message: "Failed to update checklist" });
    }
  });

  router.post("/captain/trips/:slotId/user-check/reset", captainAuth, async (req, res) => {
    try {
      const { slotId } = req.params;
      if (!slotId || !mongoose.Types.ObjectId.isValid(slotId)) {
        return res.status(400).json({ success: false, message: "Invalid departure slot identifier." });
      }

      // Authorize that requesting captain is assigned to this departure
      const isAssigned = await verifyCaptainSlotAccess(req.captain._id, slotId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You are not assigned to this expedition departure.",
        });
      }

      let checkDoc = await UserCheck.findOne({ slotId });
      if (!checkDoc) {
        checkDoc = new UserCheck({ slotId, checkedTravellers: [] });
      }

      const countBefore = checkDoc.checkedTravellers.length;
      checkDoc.resetAuditTrail.push({
        resetBy: req.captain.name || "Captain",
        resetAt: new Date(),
        totalCheckedBeforeReset: countBefore,
      });
      checkDoc.checkedTravellers = [];
      checkDoc.lastUpdatedBy = req.captain.name || "Captain";
      checkDoc.lastUpdatedAt = new Date();
      await checkDoc.save();

      res.json({
        success: true,
        message: "Checklist reset successfully for next sightseeing stop",
        checkedTravellers: [],
        resetAuditTrail: checkDoc.resetAuditTrail,
      });
    } catch (err) {
      console.error("User check reset error:", err);
      res.status(500).json({ success: false, message: "Failed to reset checklist" });
    }
  });

  // -------------------------------------------------------------
  // BANK DETAILS & UPI: Captain Bank Account Sync (Spec 7)
  // -------------------------------------------------------------
  router.get("/captain/bank-details", captainAuth, async (req, res) => {
    try {
      const captain = await Captain.findById(req.captain.id).select("name phone email bankDetails").lean();
      if (!captain) return res.status(404).json({ success: false, message: "Captain not found" });

      res.json({
        success: true,
        bankDetails: captain.bankDetails || {
          accountHolderName: "",
          bankName: "",
          accountNumber: "",
          ifsc: "",
          upiId: "",
        },
      });
    } catch (err) {
      console.error("Get bank details error:", err);
      res.status(500).json({ success: false, message: "Failed to load bank details" });
    }
  });

  router.put("/captain/bank-details", captainAuth, async (req, res) => {
    try {
      const { accountHolderName, bankName, accountNumber, ifsc, upiId } = req.body;
      const updated = await Captain.findByIdAndUpdate(
        req.captain.id,
        {
          bankDetails: {
            accountHolderName: (accountHolderName || "").trim(),
            bankName: (bankName || "").trim(),
            accountNumber: (accountNumber || "").trim(),
            ifsc: (ifsc || "").trim().toUpperCase(),
            upiId: (upiId || "").trim(),
          },
        },
        { new: true }
      ).select("name phone bankDetails");

      res.json({
        success: true,
        message: "Bank details saved securely and synced with Admin Panel",
        bankDetails: updated.bankDetails,
      });
    } catch (err) {
      console.error("Update bank details error:", err);
      res.status(500).json({ success: false, message: "Failed to update bank details" });
    }
  });

  // -------------------------------------------------------------
  // PAYOUT HISTORY: Detailed Fee & Reimbursement Ledger (Spec 6)
  // -------------------------------------------------------------
  router.get("/captain/payout-history", captainAuth, async (req, res) => {
    try {
      const capId = req.captain.id;
      const capObjId = mongoose.Types.ObjectId.isValid(capId) ? new mongoose.Types.ObjectId(capId) : capId;

      // 1. Fetch CaptainPayout records
      const payouts = await CaptainPayout.find({
        $or: [{ captainId: capId }, { captainId: capObjId }, { captain: capId }],
      })
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location duration image" },
        })
        .sort({ createdAt: -1 })
        .lean();

      // 2. Fetch all Self-Paid expenses submitted by this captain
      const selfExpenses = await TripExpense.find({
        $or: [{ captainId: capId }, { captainId: capObjId }, { captain: capId }],
        paymentMode: { $in: ["Self", "Self (Any Mode)"] },
      })
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location" },
        })
        .sort({ createdAt: -1 })
        .lean();

      // Calculate totals
      let totalTripFees = 0;
      let totalApprovedReimbursements = 0;
      let totalPaid = 0;
      let pendingReimbursements = 0;

      payouts.forEach((p) => {
        totalTripFees += Number(p.tripFee) || 0;
        totalPaid += Number(p.amountPaid) || 0;
      });

      selfExpenses.forEach((exp) => {
        const amt = Number(exp.amount) || 0;
        if (exp.status === "Approved" || exp.status === "Auto Approved" || exp.status === "Settled") {
          totalApprovedReimbursements += amt;
        } else if (exp.status === "Pending") {
          pendingReimbursements += amt;
        }
      });

      // Outstanding Balance = Approved Unpaid Trip Fees + Approved Unpaid Reimbursements - Payments Applied
      const totalEarnedAndReimbursable = totalTripFees + totalApprovedReimbursements;
      const outstandingBalance = Math.max(0, totalEarnedAndReimbursable - totalPaid);

      // Build unified ledger entries
      const ledger = [];

      // Add Trip Fees from payouts
      payouts.forEach((p) => {
        if (p.tripFee && p.tripFee > 0) {
          const slot = p.slotId;
          const trip = slot?.trip;
          ledger.push({
            id: `fee_${p._id}`,
            tripName: trip?.title || "Assigned Expedition",
            departureDate: slot?.date ? new Date(slot.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
            paymentType: "Trip Fee",
            amount: p.tripFee,
            status: p.status === "Settled" ? "Paid" : p.status === "Approved" ? "Payable" : "Pending Approval",
            createdAt: p.createdAt,
            paymentDate: p.status === "Settled" ? p.updatedAt : null,
            referenceNumber: p.referenceNumber || "",
          });
        }
      });

      // Add Self-Paid Expense Reimbursements
      selfExpenses.forEach((exp) => {
        const slot = exp.slotId;
        const trip = slot?.trip;
        ledger.push({
          id: `exp_${exp._id}`,
          tripName: trip?.title || exp.title || "Trip Expense",
          departureDate: slot?.date ? new Date(slot.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "",
          paymentType: "Expense Reimbursement",
          amount: exp.amount,
          status: exp.status === "Settled" ? "Paid" : (exp.status === "Approved" || exp.status === "Auto Approved") ? "Payable" : exp.status === "Rejected" ? "Rejected" : "Pending Approval",
          createdAt: exp.createdAt,
          paymentDate: exp.status === "Settled" ? exp.updatedAt : null,
          referenceNumber: exp.receiptUrl ? "Receipt Attached" : "",
          rejectionReason: exp.rejectionReason,
        });
      });

      // Sort by date descending
      ledger.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      res.json({
        success: true,
        summary: {
          outstandingBalance,
          totalTripFees,
          totalApprovedReimbursements,
          pendingReimbursements,
          totalPaid,
        },
        ledger,
      });
    } catch (err) {
      console.error("Payout history error:", err);
      res.status(500).json({ success: false, message: "Failed to load payout history" });
    }
  });

  return router;
}

captainPortalRoutes.verifyCaptainSlotAccess = verifyCaptainSlotAccess;
captainPortalRoutes.findCaptainByPhone = findCaptainByPhone;
captainPortalRoutes.captainAuth = captainAuth;
module.exports = captainPortalRoutes;

