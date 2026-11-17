const express = require("express");
const Captain = require("../models/Captain");
const CaptainAssignment = require("../models/CaptainAssignment");
const PickupLocation = require("../models/PickupLocation");
const Attendance = require("../models/Attendance");
const TripExpense = require("../models/TripExpense");
const CaptainPayout = require("../models/CaptainPayout");
const TripSlot = require("../models/TripSlot");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");

const ROLE_HIERARCHY = {
  "Head Captain": 1,
  "Main Captain": 2,
  "Trainee Captain": 3,
};

function normalizeRole(role) {
  if (!role) return "Head Captain";
  const r = String(role).trim().toLowerCase();
  if (r.includes("head") || r.includes("lead")) return "Head Captain";
  if (r.includes("main") || r.includes("assistant") || r.includes("second")) return "Main Captain";
  if (r.includes("trainee") || r.includes("support")) return "Trainee Captain";
  return "Head Captain";
}

function getRoleRank(role) {
  const norm = normalizeRole(role);
  return ROLE_HIERARCHY[norm] || 99;
}

function normalizeIndianPhone(phone) {
  if (!phone) return "";
  const cleaned = String(phone).replace(/[^\d+]/g, "");
  const digits = cleaned.replace(/^\+91/, "").replace(/^0/, "");
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone.trim();
}

function isValidIndianPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/[^\d]/g, "").replace(/^91/, "").replace(/^0/, "");
  return digits.length === 10 && /^[6-9]\d{9}$/.test(digits);
}

module.exports = function adminOperationsRoutes({ authMiddleware, adminMiddleware }) {
  const router = express.Router();

  // Overview KPIs & Operational Command Center (Requirements 1, 2, 3, 5)
  router.get("/admin/operations/overview", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const in7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [
        totalCaptains,
        activeCaptains,
        slots,
        assignments,
        pendingExpenses,
        pendingPayouts,
        captains,
        bookings,
        allAssignments,
      ] = await Promise.all([
        Captain.countDocuments(),
        Captain.countDocuments({ status: "Active" }),
        TripSlot.find({ isClosed: false })
          .populate("trip", "title location duration price image")
          .sort({ date: 1 }),
        CaptainAssignment.find({ status: { $ne: "Cancelled" } })
          .populate("captainId", "name phone avatar rating role")
          .populate("captain", "name phone avatar rating role"),
        TripExpense.find({ status: "Pending" }),
        CaptainPayout.find({ status: "Pending" }),
        Captain.find(),
        Booking.find({ status: { $ne: "Cancelled" } }).select("slotId travellers"),
        CaptainAssignment.find(),
      ]);

      // Calculate upcoming departures & departures in next 7 days
      let upcomingDeparturesCount = 0;
      let next7DaysCount = 0;
      let inProgressCount = 0;

      slots.forEach((slot) => {
        if (!slot.date) return;
        const slotDate = new Date(slot.date);

        // Trips in progress check: explicit status or date matching today
        if (slot.status === "In Progress") {
          inProgressCount++;
        } else if (slotDate >= startOfToday) {
          upcomingDeparturesCount++;
          if (slotDate <= in7Days) {
            next7DaysCount++;
          }
        } else {
          upcomingDeparturesCount++;
        }
      });

      // Also count assignments with status 'On Trip' for active trips in progress
      const onTripCaptains = assignments.filter((a) => a.status === "On Trip");
      if (onTripCaptains.length > inProgressCount) {
        inProgressCount = onTripCaptains.length;
      }

      // Financials: Unsettled expenses & Pending payouts (distinct collections, no double counting)
      const expenseSum = pendingExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
      const payoutSum = pendingPayouts.reduce((acc, p) => acc + (p.balance !== undefined ? Number(p.balance) : Math.max(0, (p.totalPayout || p.tripFee || 0) - (p.amountPaid || 0))), 0);

      // Bookings count per slot
      const bookingsPerSlot = {};
      bookings.forEach((b) => {
        if (!b.slotId) return;
        const sId = String(b.slotId);
        bookingsPerSlot[sId] = (bookingsPerSlot[sId] || 0) + (Number(b.travellers) || 1);
      });

      // Group assignments by slotId
      const assignmentsBySlot = {};
      assignments.forEach((a) => {
        const sId = String(a.slotId?._id || a.slotId || a.slot?._id || a.slot);
        if (!sId) return;
        if (!assignmentsBySlot[sId]) assignmentsBySlot[sId] = [];
        const cap = a.captainId || a.captain;
        if (cap) {
          assignmentsBySlot[sId].push({
            _id: cap._id,
            captainId: cap._id,
            assignmentId: a._id,
            name: cap.name,
            phone: cap.phone,
            avatar: cap.avatar,
            role: normalizeRole(a.role || cap.role),
            roleRank: getRoleRank(a.role || cap.role),
            status: a.status,
          });
        }
      });

      // Build departure roster items with hierarchy-ordered assigned captains
      const departureRoster = slots.map((slot) => {
        const sId = String(slot._id);
        const assignedCrew = (assignmentsBySlot[sId] || []).sort((a, b) => a.roleRank - b.roleRank);
        const bookedCount = bookingsPerSlot[sId] || slot.bookedSlots || 0;

        return {
          slotId: slot._id,
          tripId: slot.trip?._id || null,
          tripTitle: slot.trip?.title || "Custom Expedition",
          location: slot.trip?.location || "",
          duration: slot.trip?.duration || "",
          departureDate: slot.date,
          totalSlots: slot.totalSlots,
          bookedSlots: bookedCount,
          status: slot.status || (slot.isClosed ? "Closed" : "Scheduled"),
          assignedCaptains: assignedCrew,
          isAssigned: assignedCrew.length > 0,
        };
      });

      // Aggregate captain stats for Captain Overview table
      const captainStatsMap = {};
      allAssignments.forEach((a) => {
        const cId = String(a.captainId || a.captain);
        if (!cId) return;
        if (!captainStatsMap[cId]) {
          captainStatsMap[cId] = { assignedTrips: 0, completedTrips: 0, totalTrips: 0 };
        }
        if (a.status === "Completed") {
          captainStatsMap[cId].completedTrips++;
          captainStatsMap[cId].totalTrips++;
        } else if (["Assigned", "Confirmed", "On Trip"].includes(a.status)) {
          captainStatsMap[cId].assignedTrips++;
          captainStatsMap[cId].totalTrips++;
        }
      });

      // Sort captains by hierarchy: Head Captain (1) -> Main Captain (2) -> Trainee Captain (3)
      const captainOverview = captains.map((c) => {
        const cId = String(c._id);
        const st = captainStatsMap[cId] || { assignedTrips: 0, completedTrips: 0, totalTrips: 0 };
        const normRole = normalizeRole(c.role);

        let ageVal = c.age || null;
        if (!ageVal && c.dateOfBirth) {
          const diff = Date.now() - new Date(c.dateOfBirth).getTime();
          ageVal = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
        }

        return {
          _id: c._id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          role: normRole,
          roleRank: getRoleRank(normRole),
          age: ageVal,
          rating: c.rating || 0,
          status: c.status || "Active",
          avatar: c.avatar,
          assignedTrips: st.assignedTrips,
          completedTrips: st.completedTrips,
          totalTrips: st.totalTrips,
        };
      }).sort((a, b) => {
        const rankDiff = a.roleRank - b.roleRank;
        if (rankDiff !== 0) return rankDiff;
        return (b.rating || 0) - (a.rating || 0);
      });

      res.json({
        success: true,
        stats: {
          activeCaptains,
          totalCaptains,
          upcomingDepartures: upcomingDeparturesCount,
          next7DaysDepartures: next7DaysCount,
          tripsInProgress: inProgressCount,
          unsettledExpenses: {
            count: pendingExpenses.length,
            totalAmount: expenseSum,
          },
          pendingPayouts: {
            count: pendingPayouts.length,
            totalAmount: payoutSum,
          },
        },
        departureRoster,
        captainOverview,
      });
    } catch (err) {
      console.error("Operations overview failed:", err);
      res.status(500).json({ success: false, message: "Failed to load operations overview" });
    }
  });

  // Captains CRUD
  router.get("/admin/operations/captains", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      let captains = await Captain.find();
      // If empty, seed initial sample captains
      if (captains.length === 0) {
        captains = await Captain.insertMany([
          { name: "Naveen R.", phone: "+91 98765 43210", email: "naveen.r@traviska.com", status: "Active", role: "Head Captain", rating: 4.9, defaultTripFee: 5000, specialities: ["Trekking", "Wildlife", "First Aid"] },
          { name: "Arjun K.", phone: "+91 99016 54321", email: "arjun.k@traviska.com", status: "Active", role: "Main Captain", rating: 4.8, defaultTripFee: 4000, specialities: ["High Altitude", "Photography"] },
          { name: "Divya S.", phone: "+91 87654 32109", email: "divya.s@traviska.com", status: "Active", role: "Main Captain", rating: 4.9, defaultTripFee: 4000, specialities: ["Cultural", "Camping", "Storytelling"] },
          { name: "Shailesh N.", phone: "+91 90123 45678", email: "shailesh.n@traviska.com", status: "Active", role: "Trainee Captain", rating: 4.7, defaultTripFee: 2500, specialities: ["Offroading", "Water Sports"] },
        ]);
      }

      // Aggregate real trip stats for each captain from CaptainAssignment
      const statsAggregation = await CaptainAssignment.aggregate([
        {
          $group: {
            _id: { captainId: "$captainId", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ]);

      const captainStatsMap = {};
      statsAggregation.forEach((item) => {
        const capId = String(item._id.captainId);
        if (!captainStatsMap[capId]) {
          captainStatsMap[capId] = { totalTrips: 0, completedTrips: 0, upcomingTrips: 0, cancelledTrips: 0 };
        }
        if (item._id.status === "Completed") {
          captainStatsMap[capId].completedTrips += item.count;
          captainStatsMap[capId].totalTrips += item.count;
        } else if (["Assigned", "Confirmed", "On Trip"].includes(item._id.status)) {
          captainStatsMap[capId].upcomingTrips += item.count;
          captainStatsMap[capId].totalTrips += item.count;
        } else if (item._id.status === "Cancelled") {
          captainStatsMap[capId].cancelledTrips += item.count;
        }
      });

      // Always sort captains by hierarchy: Head Captain (1) -> Main Captain (2) -> Trainee Captain (3)
      const sortedCaptains = captains.map((c) => {
        const obj = c.toObject ? c.toObject() : { ...c };
        const capId = String(obj._id);
        const st = captainStatsMap[capId] || { totalTrips: 0, completedTrips: 0, upcomingTrips: 0, cancelledTrips: 0 };
        obj.role = normalizeRole(obj.role);
        obj.totalTrips = st.totalTrips;
        obj.completedTrips = st.completedTrips;
        obj.upcomingTrips = st.upcomingTrips;
        obj.cancelledTrips = st.cancelledTrips;
        obj.specialities = obj.specialities || obj.specialties || ["Trekking", "Camping"];
        return obj;
      }).sort((a, b) => {
        const rankDiff = getRoleRank(a.role) - getRoleRank(b.role);
        if (rankDiff !== 0) return rankDiff;
        return (b.rating || 0) - (a.rating || 0);
      });

      res.json({ success: true, captains: sortedCaptains });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch captains" });
    }
  });

  // Single Captain Profile & Complete Trip History (Requirement 1 & 2)
  router.get("/admin/operations/captains/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const captain = await Captain.findById(req.params.id);
      if (!captain) {
        return res.status(404).json({ success: false, message: "Captain not found" });
      }

      // Fetch all assignments for this captain
      const assignments = await CaptainAssignment.find({
        $or: [{ captainId: req.params.id }, { captain: req.params.id }],
      })
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location duration price image" },
        })
        .populate("tripId", "title location duration price image")
        .populate("trip", "title location duration price image")
        .populate("slot")
        .sort({ createdAt: -1 });

      // Gather slot IDs to query real booked customers from Booking collection
      const slotIds = assignments
        .map((a) => (a.slotId?._id || a.slotId || a.slot?._id || a.slot))
        .filter(Boolean);

      const bookings = await Booking.find({
        slotId: { $in: slotIds },
        status: { $ne: "Cancelled" },
      }).select("slotId travellers");

      const travellersPerSlot = {};
      bookings.forEach((b) => {
        const sId = String(b.slotId);
        travellersPerSlot[sId] = (travellersPerSlot[sId] || 0) + (Number(b.travellers) || 1);
      });

      // Split into categories
      const completedAssignments = assignments.filter((a) => a.status === "Completed");
      const upcomingAssignments = assignments.filter((a) =>
        ["Assigned", "Confirmed", "On Trip"].includes(a.status)
      );
      const cancelledAssignments = assignments.filter((a) => a.status === "Cancelled");

      // Map complete trip history
      const history = assignments.map((a) => {
        const slot = a.slotId || a.slot;
        const trip = a.tripId || a.trip || (slot && slot.trip);
        const depDate = slot && slot.date ? new Date(slot.date) : (a.assignedAt ? new Date(a.assignedAt) : null);
        const sId = slot?._id ? String(slot._id) : (a.slotId ? String(a.slotId) : null);

        let returnDate = null;
        if (depDate && trip?.duration) {
          const daysMatch = String(trip.duration).match(/(\d+)\s*(?:Day|day)/);
          const days = daysMatch ? parseInt(daysMatch[1], 10) : 2;
          const ret = new Date(depDate);
          ret.setDate(ret.getDate() + Math.max(1, days - 1));
          returnDate = ret;
        }

        return {
          id: a._id,
          assignmentId: a._id,
          tripTitle: trip?.title || "Custom Expedition",
          destination: trip?.location || "South India",
          duration: trip?.duration || "2 Days / 1 Night",
          departureDate: depDate ? depDate.toISOString() : null,
          returnDate: returnDate ? returnDate.toISOString() : null,
          role: normalizeRole(a.role),
          roleRank: getRoleRank(a.role),
          status: a.status,
          slotId: sId,
          tripId: trip?._id || a.tripId,
          bookedCustomers: sId ? (travellersPerSlot[sId] || 0) : 0,
          captainFee: a.captainFee || 0,
          advancePaid: a.advancePaid || 0,
          customerRating: a.status === "Completed" ? (captain.rating || null) : null,
        };
      });

      // Sort: upcoming first (by date ascending), then completed (date descending), then cancelled
      history.sort((a, b) => {
        const dA = a.departureDate ? new Date(a.departureDate).getTime() : 0;
        const dB = b.departureDate ? new Date(b.departureDate).getTime() : 0;
        return dB - dA;
      });

      const specialities = captain.specialities || captain.specialties || ["Trekking", "Camping", "First Aid"];

      res.json({
        success: true,
        captain: {
          _id: captain._id,
          id: captain._id,
          name: captain.name,
          phone: captain.phone,
          email: captain.email,
          status: captain.status,
          role: normalizeRole(captain.role),
          rating: captain.rating || 0,
          avatar: captain.avatar,
          bio: captain.bio,
          specialities,
          specialties: specialities,
          joinedDate: captain.createdAt,
          createdAt: captain.createdAt,
        },
        stats: {
          totalAssigned: assignments.length,
          totalTrips: assignments.length,
          completedTrips: completedAssignments.length,
          upcomingTrips: upcomingAssignments.length,
          cancelledTrips: cancelledAssignments.length,
          averageRating: captain.rating || 0,
        },
        history,
      });
    } catch (err) {
      console.error("Captain profile fetch error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch captain profile" });
    }
  });

  router.post("/admin/operations/captains", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, phone, email, bio, status, role, defaultTripFee, rating, specialities, specialties } = req.body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Captain name is required" });
      }

      if (!phone || !phone.trim()) {
        return res.status(400).json({ success: false, message: "Phone number is required" });
      }

      if (!isValidIndianPhone(phone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).",
        });
      }

      const normalizedPhone = normalizeIndianPhone(phone);
      const digits = String(phone).replace(/[^\d]/g, "").slice(-10);
      const phonePattern = digits.split("").join("[\\s-]*");

      // Check for duplicate phone
      const existing = await Captain.findOne({
        phone: { $regex: new RegExp(phonePattern) },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `A captain with this phone number already exists (${existing.name} - ${existing.phone}).`,
        });
      }

      const specsList = Array.isArray(specialities || specialties)
        ? (specialities || specialties)
        : String(specialities || specialties || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

      const captain = new Captain({
        name: name.trim(),
        phone: normalizedPhone,
        email: (email || "").trim(),
        bio: bio || "Certified Traviska Trip Captain",
        status: status || "Active",
        role: normalizeRole(role || "Main Captain"),
        rating: Number(rating) >= 0 ? Number(rating) : 0,
        specialties: specsList.length > 0 ? specsList : ["Trekking", "Camping", "First Aid"],
        specialities: specsList.length > 0 ? specsList : ["Trekking", "Camping", "First Aid"],
        defaultTripFee: Number(defaultTripFee) || 3500,
      });

      await captain.save();
      res.json({ success: true, captain, message: "Captain registered successfully" });
    } catch (err) {
      console.error(err);
      if (err.code === 11000) {
        return res.status(400).json({ success: false, message: "A captain with this phone number already exists." });
      }
      res.status(500).json({ success: false, message: err.message || "Failed to create captain" });
    }
  });

  router.put("/admin/operations/captains/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { name, phone, email, bio, status, role, defaultTripFee, rating, specialities, specialties } = req.body;
      const captainId = req.params.id;

      const captain = await Captain.findById(captainId);
      if (!captain) {
        return res.status(404).json({ success: false, message: "Captain not found" });
      }

      if (phone && phone.trim()) {
        if (!isValidIndianPhone(phone)) {
          return res.status(400).json({
            success: false,
            message: "Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).",
          });
        }

        const digits = String(phone).replace(/[^\d]/g, "").slice(-10);
        const phonePattern = digits.split("").join("[\\s-]*");
        // Check for duplicate phone excluding self
        const duplicate = await Captain.findOne({
          _id: { $ne: captainId },
          phone: { $regex: new RegExp(phonePattern) },
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            message: `Another captain with this phone number already exists (${duplicate.name} - ${duplicate.phone}).`,
          });
        }
        captain.phone = normalizeIndianPhone(phone);
      }

      if (name) captain.name = name.trim();
      if (email !== undefined) captain.email = email.trim();
      if (bio !== undefined) captain.bio = bio;
      if (status) captain.status = status;
      if (role) captain.role = normalizeRole(role);
      if (rating !== undefined && rating !== "") captain.rating = Number(rating);
      if (defaultTripFee !== undefined) captain.defaultTripFee = Number(defaultTripFee);

      if (specialities !== undefined || specialties !== undefined) {
        const specsList = Array.isArray(specialities || specialties)
          ? (specialities || specialties)
          : String(specialities || specialties || "")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
        captain.specialties = specsList;
        captain.specialities = specsList;
      }

      await captain.save();
      res.json({ success: true, captain, message: "Captain updated successfully" });
    } catch (err) {
      console.error(err);
      if (err.code === 11000) {
        return res.status(400).json({ success: false, message: "A captain with this phone number already exists." });
      }
      res.status(500).json({ success: false, message: err.message || "Failed to update captain" });
    }
  });

  router.delete("/admin/operations/captains/:id", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const activeAssignments = await CaptainAssignment.countDocuments({
        $or: [{ captainId: id }, { captain: id }],
        status: { $in: ["Assigned", "Confirmed", "On Trip"] },
      });
      if (activeAssignments > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete captain. Captain has ${activeAssignments} active trip assignment(s). Please reassign or cancel those trips first, or mark captain as Inactive.`,
        });
      }
      await Captain.findByIdAndDelete(id);
      res.json({ success: true, message: "Captain removed successfully" });
    } catch (err) {
      console.error("Delete captain error:", err);
      res.status(500).json({ success: false, message: "Failed to delete captain" });
    }
  });

  // Slot Details Modal endpoint (Requirement 2: View Trip Details)
  router.get("/admin/operations/slots/:slotId/details", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { slotId } = req.params;
      const slot = await TripSlot.findById(slotId).populate("trip");
      if (!slot) {
        return res.status(404).json({ success: false, message: "Departure slot not found" });
      }

      const [assignments, bookings, attendance, expenses, payouts] = await Promise.all([
        CaptainAssignment.find({
          $or: [{ slotId }, { slot: slotId }],
        })
          .populate("captainId", "name phone avatar rating role")
          .populate("captain", "name phone avatar rating role"),
        Booking.find({ slotId }),
        Attendance.find({ slotId }),
        TripExpense.find({ slotId }).populate("captainId", "name"),
        CaptainPayout.find({ slotId }).populate("captainId", "name"),
      ]);

      const sortedCaptains = assignments.map((a) => {
        const cap = a.captainId || a.captain || {};
        return {
          _id: a._id,
          captainId: cap._id,
          name: cap.name || "Assigned Captain",
          phone: cap.phone || "",
          avatar: cap.avatar,
          role: normalizeRole(a.role),
          roleRank: getRoleRank(a.role),
          status: a.status,
          captainFee: a.captainFee || 0,
          advancePaid: a.advancePaid || 0,
        };
      }).sort((a, b) => a.roleRank - b.roleRank);

      const activeBookings = bookings.filter((b) => b.status !== "Cancelled");
      const totalTravellers = activeBookings.reduce((sum, b) => sum + (Number(b.travellers) || 1), 0);

      res.json({
        success: true,
        slot: {
          _id: slot._id,
          date: slot.date,
          totalSlots: slot.totalSlots,
          bookedSlots: slot.bookedSlots,
          status: slot.isClosed ? "Closed" : "Open",
        },
        trip: slot.trip ? {
          _id: slot.trip._id,
          title: slot.trip.title,
          location: slot.trip.location,
          duration: slot.trip.duration,
          price: slot.trip.price,
          image: slot.trip.image,
        } : null,
        assignedCaptains: sortedCaptains,
        bookings: bookings.map((b) => ({
          _id: b._id,
          bookingCode: b.bookingCode || "TKV" + String(b._id).slice(-4).toUpperCase(),
          name: b.name || "Customer",
          phone: b.phone || "—",
          email: b.email || "",
          travellers: b.travellers || 1,
          total: b.total || 0,
          paymentStatus: b.paymentStatus || (b.paymentId ? "Paid" : "Pending"),
          pickupLocation: b.pickupDetails?.name || b.pickupLocation || "Majestic",
          status: b.status || "Confirmed",
        })),
        attendanceSummary: {
          totalTravellers,
          markedPresent: attendance.filter((att) => att.status === "Present").length,
          markedAbsent: attendance.filter((att) => att.status === "Absent").length,
          totalRecords: attendance.length,
        },
        expenses: expenses.map((e) => ({
          _id: e._id,
          title: e.title,
          amount: e.amount,
          category: e.category,
          captainName: e.captainId?.name || "Captain",
          status: e.status,
        })),
        payouts: payouts.map((p) => ({
          _id: p._id,
          amountPaid: p.amountPaid,
          status: p.status,
          paymentReference: p.paymentReference || "UPI",
        })),
      });
    } catch (err) {
      console.error("Slot details error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch departure slot details" });
    }
  });

  // Captain Experience & Completed Trip History (Backward-compatible)
  router.get("/admin/operations/captains/:id/history", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const captain = await Captain.findById(req.params.id);
      if (!captain) {
        return res.status(404).json({ success: false, message: "Captain not found" });
      }

      // Query all assignments for this captain with slot and trip details
      const assignments = await CaptainAssignment.find({
        $or: [{ captainId: req.params.id }, { captain: req.params.id }],
      })
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location duration price image" },
        })
        .populate("tripId", "title location duration price image")
        .populate("trip", "title location duration price image")
        .populate("slot")
        .sort({ createdAt: -1 });

      // Separate completed vs upcoming/active
      // Real database completed trips: status === "Completed"
      const completedAssignments = assignments.filter((a) => a.status === "Completed");
      const upcomingAssignments = assignments.filter((a) =>
        ["Assigned", "Confirmed", "On Trip"].includes(a.status)
      );

      // Map completed trip history with formatted dates
      const history = completedAssignments.map((a) => {
        const slot = a.slotId || a.slot;
        const trip = a.tripId || a.trip || (slot && slot.trip);
        const depDate = slot && slot.date ? new Date(slot.date) : (a.assignedAt ? new Date(a.assignedAt) : null);

        let returnDate = null;
        if (depDate && trip?.duration) {
          const daysMatch = String(trip.duration).match(/(\d+)\s*(?:Day|day)/);
          const days = daysMatch ? parseInt(daysMatch[1], 10) : 2;
          const ret = new Date(depDate);
          ret.setDate(ret.getDate() + Math.max(1, days - 1));
          returnDate = ret;
        }

        return {
          id: a._id,
          tripTitle: trip?.title || "Custom Expedition",
          destination: trip?.location || "South India",
          duration: trip?.duration || "2 Days / 1 Night",
          departureDate: depDate ? depDate.toISOString() : null,
          returnDate: returnDate ? returnDate.toISOString() : null,
          role: normalizeRole(a.role),
          roleRank: getRoleRank(a.role),
          status: a.status,
          slotId: slot?._id || a.slotId,
        };
      });

      // Sort history: departure date descending, then role hierarchy rank
      history.sort((a, b) => {
        const dA = a.departureDate ? new Date(a.departureDate).getTime() : 0;
        const dB = b.departureDate ? new Date(b.departureDate).getTime() : 0;
        if (dB !== dA) return dB - dA;
        return a.roleRank - b.roleRank;
      });

      res.json({
        success: true,
        captain: {
          id: captain._id,
          name: captain.name,
          phone: captain.phone,
          status: captain.status,
          role: normalizeRole(captain.role),
          rating: captain.rating,
          avatar: captain.avatar,
        },
        stats: {
          totalCompletedTrips: completedAssignments.length,
          totalUpcomingAssignments: upcomingAssignments.length,
        },
        history,
      });
    } catch (err) {
      console.error("Captain history error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch captain history" });
    }
  });

  // Controlled admin completion workflow
  router.put("/admin/operations/assignments/:id/complete", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const assignment = await CaptainAssignment.findByIdAndUpdate(
        req.params.id,
        { status: "Completed" },
        { new: true }
      ).populate("captainId").populate("tripId");
      if (!assignment) return res.status(404).json({ success: false, message: "Assignment not found" });
      res.json({ success: true, message: "Assignment marked as completed", assignment });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update assignment status" });
    }
  });

  // Assignments
  router.get("/admin/operations/assignments", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [assignments, slots, captains] = await Promise.all([
        CaptainAssignment.find({ status: { $ne: "Cancelled" } })
          .populate("slotId")
          .populate("tripId")
          .populate("captainId"),
        TripSlot.find({ isClosed: false })
          .populate("trip", "title location image")
          .populate("assignedCaptain", "name phone avatar rating role")
          .populate("assignedCaptains.captain", "name phone avatar rating role"),
        Captain.find({ status: "Active" }),
      ]);

      // Normalize roles and sort by slot date descending, then role hierarchy rank (Head -> Main -> Trainee)
      const mappedAssignments = assignments.map((a) => {
        const obj = a.toObject ? a.toObject() : { ...a };
        obj.role = normalizeRole(obj.role);
        obj.roleRank = getRoleRank(obj.role);
        return obj;
      }).sort((a, b) => {
        const dA = a.slotId?.date ? new Date(a.slotId.date).getTime() : 0;
        const dB = b.slotId?.date ? new Date(b.slotId.date).getTime() : 0;
        if (dB !== dA) return dB - dA;
        return a.roleRank - b.roleRank;
      });

      // Sort captains: Head Captains first, Main Captains second, Trainee Captains third
      const sortedCaptains = captains.map((c) => {
        const obj = c.toObject ? c.toObject() : { ...c };
        obj.role = normalizeRole(obj.role);
        obj.roleRank = getRoleRank(obj.role);
        return obj;
      }).sort((a, b) => {
        const rankDiff = a.roleRank - b.roleRank;
        if (rankDiff !== 0) return rankDiff;
        return (b.rating || 0) - (a.rating || 0);
      });

      res.json({ success: true, assignments: mappedAssignments, slots, captains: sortedCaptains });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch assignments" });
    }
  });

  router.post("/admin/operations/assignments", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { slotId, captainId, role, notes, captainFee, advancePaid, confirmReassign } = req.body;
      if (!slotId || !captainId) {
        return res.status(400).json({ success: false, message: "Slot ID and Captain ID are required" });
      }

      const targetRole = normalizeRole(role || "Head Captain");

      const [slot, captain] = await Promise.all([
        TripSlot.findById(slotId).populate("trip", "title location price"),
        Captain.findById(captainId),
      ]);

      if (!slot) return res.status(404).json({ success: false, message: "Departure slot not found" });
      if (!captain) return res.status(404).json({ success: false, message: "Captain not found" });

      // 1. Fetch all existing active assignments for this departure slot
      const existingSlotAssignments = await CaptainAssignment.find({
        $or: [{ slotId }, { slot: slotId }],
        status: { $ne: "Cancelled" },
      }).populate("captainId", "name phone avatar rating role");

      // Check if this captain is already assigned to this slot
      const alreadyAssignedToThisSlot = existingSlotAssignments.find((a) => {
        const cId = String(a.captainId?._id || a.captainId || a.captain);
        return cId === String(captainId);
      });

      if (alreadyAssignedToThisSlot && normalizeRole(alreadyAssignedToThisSlot.role) === targetRole) {
        return res.status(400).json({
          success: false,
          message: `${captain.name} is already assigned as ${targetRole} for this departure.`,
        });
      }

      // 2. Validate Departure Role Hierarchy Constraints:
      // - Head Captain: allow max 1 per departure
      // - Main Captain: allow max 1 per departure
      // - Trainee Captain: multiple allowed
      if (targetRole === "Head Captain") {
        const existingHead = existingSlotAssignments.find((a) => normalizeRole(a.role) === "Head Captain");
        if (existingHead && String(existingHead.captainId?._id || existingHead.captainId) !== String(captainId)) {
          if (!confirmReassign) {
            const headName = existingHead.captainId?.name || "Another Captain";
            return res.status(409).json({
              success: false,
              requiresConfirmation: true,
              currentCaptain: {
                id: existingHead.captainId?._id,
                name: headName,
                role: "Head Captain",
              },
              message: `This departure already has a Head Captain: ${headName}. Do you want to replace them with ${captain.name}?`,
            });
          } else {
            // Cancel previous Head Captain assignment
            await CaptainAssignment.findByIdAndUpdate(existingHead._id, { status: "Cancelled" });
          }
        }
      } else if (targetRole === "Main Captain") {
        const existingMain = existingSlotAssignments.find((a) => normalizeRole(a.role) === "Main Captain");
        if (existingMain && String(existingMain.captainId?._id || existingMain.captainId) !== String(captainId)) {
          if (!confirmReassign) {
            const mainName = existingMain.captainId?.name || "Another Captain";
            return res.status(409).json({
              success: false,
              requiresConfirmation: true,
              currentCaptain: {
                id: existingMain.captainId?._id,
                name: mainName,
                role: "Main Captain",
              },
              message: `This departure already has a Main Captain: ${mainName}. Do you want to replace them with ${captain.name}?`,
            });
          } else {
            // Cancel previous Main Captain assignment
            await CaptainAssignment.findByIdAndUpdate(existingMain._id, { status: "Cancelled" });
          }
        }
      }
      // Trainee Captain: Multiple Trainee Captains are freely allowed on the same departure!

      // 3. Validate captain availability for overlapping dates
      if (slot.date) {
        const slotDate = new Date(slot.date);
        const startOfDay = new Date(slotDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(slotDate);
        endOfDay.setHours(23, 59, 59, 999);

        const otherAssignments = await CaptainAssignment.find({
          $or: [{ captainId }, { captain: captainId }],
          slotId: { $ne: slotId },
          status: { $in: ["Assigned", "Confirmed", "On Trip"] },
        }).populate("slotId", "date");

        const overlapping = otherAssignments.find((oa) => {
          const oaSlot = oa.slotId;
          if (!oaSlot || !oaSlot.date) return false;
          const od = new Date(oaSlot.date);
          return od >= startOfDay && od <= endOfDay;
        });

        if (overlapping && !confirmReassign) {
          const formattedDate = new Date(overlapping.slotId.date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
          return res.status(400).json({
            success: false,
            message: `Captain availability conflict: ${captain.name} is already assigned to another departure on ${formattedDate}.`,
          });
        }
      }

      // 4. Save assignment for this captain & departure slot
      const fee = Number(captainFee) > 0 ? Number(captainFee) : (captain.defaultTripFee || 5000);
      const adv = Number(advancePaid) >= 0 ? Number(advancePaid) : 0;

      const assignment = await CaptainAssignment.findOneAndUpdate(
        {
          slotId,
          $or: [{ captainId }, { captain: captainId }],
        },
        {
          slotId,
          slot: slotId,
          tripId: slot.trip?._id || slot.trip,
          trip: slot.trip?._id || slot.trip,
          captainId,
          captain: captainId,
          captainFee: fee,
          advancePaid: adv,
          role: targetRole,
          notes: notes || "",
          status: "Assigned",
          assignedAt: new Date(),
          assignedBy: "Admin",
        },
        { upsert: true, new: true }
      ).populate("captainId", "name phone avatar rating role").populate("tripId", "title location");

      // 5. Update TripSlot: keep assignedCaptain referencing the Head Captain, and update assignedCaptains array
      const activeAssignmentsNow = await CaptainAssignment.find({
        $or: [{ slotId }, { slot: slotId }],
        status: { $ne: "Cancelled" },
      }).populate("captainId", "name phone avatar rating role");

      const headAssignment = activeAssignmentsNow.find((a) => normalizeRole(a.role) === "Head Captain");
      const mainAssignment = activeAssignmentsNow.find((a) => normalizeRole(a.role) === "Main Captain");
      const primaryCaptainId = headAssignment ? headAssignment.captainId?._id : (mainAssignment ? mainAssignment.captainId?._id : captainId);

      const sortedCaptainsList = activeAssignmentsNow
        .sort((a, b) => getRoleRank(a.role) - getRoleRank(b.role))
        .map((a) => ({
          captain: a.captainId?._id || a.captainId,
          role: normalizeRole(a.role),
          assignedAt: a.assignedAt || new Date(),
        }));

      await TripSlot.findByIdAndUpdate(slotId, {
        assignedCaptain: primaryCaptainId,
        assignedCaptains: sortedCaptainsList,
      });

      res.json({
        success: true,
        message: `Captain ${captain.name} assigned as ${targetRole} successfully`,
        assignment,
        role: targetRole,
        captain: {
          _id: captain._id,
          name: captain.name,
          phone: captain.phone,
          avatar: captain.avatar,
          rating: captain.rating,
          role: targetRole,
        },
      });
    } catch (err) {
      console.error("Assign captain error:", err);
      res.status(500).json({ success: false, message: "Failed to assign captain" });
    }
  });

  // Remove / Unassign Captain from Departure Slot
  const handleUnassignCaptain = async (req, res) => {
    try {
      const slotId = req.params.slotId || req.body.slotId;
      const captainId = req.params.captainId || req.body.captainId;

      if (!slotId || !captainId) {
        return res.status(400).json({ success: false, message: "Slot ID and Captain ID are required" });
      }

      const [slot, captain] = await Promise.all([
        TripSlot.findById(slotId),
        Captain.findById(captainId),
      ]);

      if (!slot) {
        return res.status(404).json({ success: false, message: "Departure slot not found" });
      }

      // 1. Cancel active CaptainAssignment(s) for this captain on this slot
      await CaptainAssignment.updateMany(
        {
          $or: [{ slotId }, { slot: slotId }],
          $or: [{ captainId }, { captain: captainId }],
          status: { $ne: "Cancelled" },
        },
        {
          $set: {
            status: "Cancelled",
            cancelledAt: new Date(),
          },
        }
      );

      // 2. Query remaining active assignments for this slot
      const remainingAssignments = await CaptainAssignment.find({
        $or: [{ slotId }, { slot: slotId }],
        status: { $ne: "Cancelled" },
      }).populate("captainId", "name phone avatar rating role");

      const headAssignment = remainingAssignments.find((a) => normalizeRole(a.role) === "Head Captain");
      const mainAssignment = remainingAssignments.find((a) => normalizeRole(a.role) === "Main Captain");
      const nextPrimaryId = headAssignment
        ? (headAssignment.captainId?._id || headAssignment.captainId)
        : (mainAssignment
            ? (mainAssignment.captainId?._id || mainAssignment.captainId)
            : (remainingAssignments[0]?.captainId?._id || remainingAssignments[0]?.captainId || null));

      const sortedCaptainsList = remainingAssignments
        .sort((a, b) => getRoleRank(a.role) - getRoleRank(b.role))
        .map((a) => ({
          captain: a.captainId?._id || a.captainId,
          role: normalizeRole(a.role),
          assignedAt: a.assignedAt || new Date(),
        }));

      // Update TripSlot
      const updatedSlot = await TripSlot.findByIdAndUpdate(
        slotId,
        {
          assignedCaptain: nextPrimaryId,
          assignedCaptains: sortedCaptainsList,
        },
        { new: true }
      )
        .populate("assignedCaptain", "name phone avatar rating role")
        .populate("assignedCaptains.captain", "name phone avatar rating role");

      // 3. Clean up any unpaid zero-balance pending payout for this unassigned captain on this slot
      try {
        await CaptainPayout.deleteMany({
          slotId,
          captainId,
          status: "Pending",
          amountPaid: { $lte: 0 },
          approvedReimbursements: { $lte: 0 },
        });
      } catch (payoutErr) {
        console.warn("Clean payout warning on unassign:", payoutErr.message);
      }

      const captainName = captain?.name || "Captain";

      res.json({
        success: true,
        message: `${captainName} removed from departure slot successfully`,
        slotId,
        captainId,
        slot: updatedSlot,
        remainingAssignmentsCount: remainingAssignments.length,
      });
    } catch (err) {
      console.error("Remove captain from slot error:", err);
      res.status(500).json({ success: false, message: "Failed to remove captain from departure slot" });
    }
  };

  router.delete("/admin/operations/assignments/:slotId/:captainId", authMiddleware, adminMiddleware, handleUnassignCaptain);
  router.post("/admin/operations/assignments/unassign", authMiddleware, adminMiddleware, handleUnassignCaptain);

  // Update Departure Slot Links (Photo Drive Link, Bill Drive Link, WhatsApp Group)
  router.put("/admin/operations/slots/:slotId/links", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { slotId } = req.params;
      const { photoDriveLink, billDriveLink, whatsappGroupLink } = req.body;

      const updatedSlot = await TripSlot.findByIdAndUpdate(
        slotId,
        {
          photoDriveLink: (photoDriveLink || "").trim(),
          billDriveLink: (billDriveLink || "").trim(),
          whatsappGroupLink: (whatsappGroupLink || "").trim(),
        },
        { new: true }
      ).populate("trip");

      if (!updatedSlot) {
        return res.status(404).json({ success: false, message: "Departure slot not found" });
      }

      res.json({
        success: true,
        message: "Departure links updated successfully",
        slot: updatedSlot,
      });
    } catch (err) {
      console.error("Update slot links error:", err);
      res.status(500).json({ success: false, message: "Failed to update departure links" });
    }
  });

  // Pickups
  router.get("/admin/operations/pickups", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      let pickups = await PickupLocation.find().sort({ routeOrder: 1 });
      if (pickups.length === 0) {
        pickups = await PickupLocation.insertMany([
          { name: "Silk Board (Near Bus Stop)", reportingTime: "09:30 PM", routeOrder: 1, landmark: "Silk Board Junction", mapLink: "https://maps.google.com" },
          { name: "Majestic (Shantala Silk House)", reportingTime: "10:00 PM", routeOrder: 2, landmark: "Opposite Metro Station", mapLink: "https://maps.google.com" },
          { name: "Yeshwanthpur (Govardhan Theatre)", reportingTime: "10:30 PM", routeOrder: 3, landmark: "Govardhan Bus Stand", mapLink: "https://maps.google.com" },
        ]);
      }
      res.json({ success: true, pickups });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to fetch pickup locations" });
    }
  });

  router.post("/admin/operations/pickups", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const pickup = new PickupLocation(req.body);
      await pickup.save();
      res.json({ success: true, pickup });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to create pickup location" });
    }
  });

  // Attendance
  router.get("/admin/operations/attendance/:slotId", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { slotId } = req.params;
      const [bookings, attendanceRecords] = await Promise.all([
        Booking.find({ slotId }),
        Attendance.find({ slotId }),
      ]);
      res.json({ success: true, bookings, attendance: attendanceRecords });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to load attendance" });
    }
  });

  router.put("/admin/operations/attendance", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { slotId, records, markedBy } = req.body;
      const bulkOps = records.map((r) => ({
        updateOne: {
          filter: { slotId, bookingId: r.bookingId, travellerIndex: r.travellerIndex },
          update: {
            $set: {
              slotId,
              bookingId: r.bookingId,
              travellerName: r.travellerName,
              travellerIndex: r.travellerIndex,
              pickupLocation: r.pickupLocation || "Majestic",
              status: r.status,
              markedBy: markedBy || "Admin",
              markedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      await Attendance.bulkWrite(bulkOps);
      res.json({ success: true, message: "Attendance synchronized successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update attendance" });
    }
  });

  // Normalize Expense Category helper
  function normalizeExpenseCategory(cat) {
    if (!cat) return "Others";
    const c = String(cat).trim().toLowerCase();
    if (c === "breakfast") return "Breakfast";
    if (c === "parking") return "Parking";
    if (c === "tickets" || c === "ticket") return "Tickets";
    if (c === "tolls" || c === "toll") return "Tolls";
    if (c === "transport") return "Transport";
    if (c === "hotel" || c === "stay" || c === "room" || c === "resort") return "Hotel";
    if (c.includes("coordinator")) return "Coordinator Food";
    if (c.includes("fuel") || c.includes("diesel") || c.includes("petrol")) return "Fuel";
    if (c.includes("food") || c.includes("snack") || c.includes("lunch") || c.includes("dinner") || c.includes("meal")) return "Food";
    if (c.includes("activity") || c.includes("activities") || c.includes("entry") || c.includes("permit")) return "Tickets";
    if (c.includes("driver") || c.includes("batta") || c.includes("allowance")) return "Driver Allowance";
    return "Others";
  }

  function normalizePaymentMode(mode) {
    if (!mode) return "Self";
    const m = String(mode).trim().toLowerCase();
    if (m.includes("card") && (m.includes("traviska") || m.includes("company"))) return "Traviska Card";
    if (m.includes("upi") && (m.includes("traviska") || m.includes("company"))) return "Traviska UPI";
    if (m.includes("fastag")) return "Traviska Card";
    if (m.includes("self") || m.includes("captain") || m.includes("cash") || m === "upi" || m === "card") return "Self";
    return "Self";
  }

  // Helper to sync / ensure CaptainPayout records match CaptainAssignments and approved expenses
  async function syncCaptainPayouts() {
    try {
      const assignments = await CaptainAssignment.find({ status: { $ne: "Cancelled" } })
        .populate("captainId")
        .populate("slotId");

      for (const a of assignments) {
        const slot = a.slotId || a.slot;
        const captain = a.captainId || a.captain;
        if (!slot || !captain) continue;

        const slotId = slot._id || slot;
        const captainId = captain._id || captain;

        // Find all expenses for this captain and slot
        const allSlotExpenses = await TripExpense.find({
          slotId,
          captainId,
        });

        // 1. Approved / Settled Self expenses (Reimbursements owed to captain)
        const approvedSelfExpenses = allSlotExpenses.filter(
          (e) => ["Approved", "Settled"].includes(e.status) && !e.isCompanyPaid && normalizePaymentMode(e.paymentMode) === "Self"
        );
        const approvedSelfSum = approvedSelfExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        // 2. Company-paid expenses (Traviska Card / UPI) - Tracked separately, NEVER added to captain payout
        const cardExpenses = allSlotExpenses.filter(
          (e) => e.isCompanyPaid || normalizePaymentMode(e.paymentMode) === "Traviska Card"
        );
        const cardSum = cardExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const upiExpenses = allSlotExpenses.filter(
          (e) => normalizePaymentMode(e.paymentMode) === "Traviska UPI"
        );
        const upiSum = upiExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const baseFee = Number(a.captainFee) || Number(captain.defaultTripFee) || 4000;
        const advPaid = Number(a.advancePaid) || 0;
        // Remaining Payout = Base Captain Fee + Approved Self Expenses − Advances Paid − Previous Settlements
        const totalPayable = Math.max(0, baseFee + approvedSelfSum - advPaid);

        let payout = await CaptainPayout.findOne({ slotId, captainId });
        if (!payout) {
          payout = new CaptainPayout({
            captainId,
            slotId,
            tripId: slot.trip?._id || slot.trip,
            assignmentId: a._id,
            tripFee: baseFee,
            companyAdvance: advPaid,
            approvedExpenses: approvedSelfSum,
            approvedSelfExpenses: approvedSelfSum,
            traviskaCardExpenses: cardSum,
            traviskaUpiExpenses: upiSum,
            totalPayout: totalPayable,
            amountPaid: 0,
            balance: totalPayable,
            status: "Pending",
          });
          await payout.save();
        } else {
          // Update values
          payout.tripFee = baseFee;
          payout.companyAdvance = advPaid;
          payout.approvedExpenses = approvedSelfSum;
          payout.approvedSelfExpenses = approvedSelfSum;
          payout.traviskaCardExpenses = cardSum;
          payout.traviskaUpiExpenses = upiSum;
          payout.totalPayout = totalPayable;
          payout.balance = Math.max(0, totalPayable - (payout.amountPaid || 0));
          if (payout.balance <= 0 && payout.amountPaid > 0) {
            payout.status = "Settled";
          }
          await payout.save();
        }
      }
    } catch (err) {
      console.error("syncCaptainPayouts error:", err);
    }
  }

  // ==========================================
  // PAGE 2: TRIP EXPENSES API (Redesigned per Reference Image)
  // ==========================================

  // Get all expenses with financial summary cards, captain grouping & working filters
  router.get("/admin/operations/expenses", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      await syncCaptainPayouts();

      const { tripId, captainId, paymentMode, category, expenseType, status, search, tripDate } = req.query;

      // 1. Fetch all expenses with captain and slot populated
      const allExpenses = await TripExpense.find()
        .populate("captainId", "name phone avatar role status")
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location duration price image highlights" },
        })
        .sort({ createdAt: -1 });

      // 2. Real-time mutually exclusive 5 summary cards (Reference Image)
      // Card 1: Total Expenses
      // Card 2: Traviska Card (Company Paid) - Auto Approved
      // Card 3: Traviska UPI (Company Paid) - Auto Approved
      // Card 4: Self Expenses
      // Card 5: Pending Approval
      let totalAmount = 0;
      let totalCount = allExpenses.length;

      let cardAmount = 0;
      let cardCount = 0;

      let upiAmount = 0;
      let upiCount = 0;

      let selfAmount = 0;
      let selfCount = 0;

      let pendingAmount = 0;
      let pendingCount = 0;

      allExpenses.forEach((exp) => {
        const amt = Number(exp.amount) || 0;
        totalAmount += amt;

        const mode = normalizePaymentMode(exp.paymentMode);
        if (mode === "Traviska Card") {
          cardAmount += amt;
          cardCount++;
        } else if (mode === "Traviska UPI") {
          upiAmount += amt;
          upiCount++;
        } else {
          // Self expenses
          selfAmount += amt;
          selfCount++;

          if (exp.status === "Pending") {
            pendingAmount += amt;
            pendingCount++;
          }
        }
      });

      // 3. Filter options: list unique trips, captains, trip dates from records
      const tripMap = {};
      const captainMap = {};
      const tripDatesSet = new Set();

      allExpenses.forEach((exp) => {
        const slot = exp.slotId;
        const trip = slot?.trip;
        if (trip && trip._id) {
          tripMap[String(trip._id)] = trip.title;
        }
        if (slot?.date) {
          const dStr = new Date(slot.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          tripDatesSet.add(dStr);
        }
        const cap = exp.captainId;
        if (cap && cap._id) {
          captainMap[String(cap._id)] = cap.name;
        }
      });

      const availableTrips = Object.entries(tripMap).map(([id, title]) => ({ _id: id, title }));
      const availableCaptains = Object.entries(captainMap).map(([id, name]) => ({ _id: id, name }));
      const availableTripDates = Array.from(tripDatesSet);

      // 4. Apply filters to all expenses
      let filtered = allExpenses;

      if (tripId && tripId !== "all") {
        filtered = filtered.filter((exp) => String(exp.slotId?.trip?._id || exp.slotId?.trip) === String(tripId));
      }

      if (captainId && captainId !== "all") {
        filtered = filtered.filter((exp) => String(exp.captainId?._id || exp.captainId) === String(captainId));
      }

      if (paymentMode && paymentMode !== "all") {
        filtered = filtered.filter((exp) => normalizePaymentMode(exp.paymentMode).toLowerCase() === paymentMode.toLowerCase());
      }

      const requestedType = expenseType || category;
      if (requestedType && requestedType !== "all") {
        filtered = filtered.filter((exp) => normalizeExpenseCategory(exp.category).toLowerCase() === requestedType.toLowerCase());
      }

      if (status && status !== "all") {
        const st = status.toLowerCase();
        filtered = filtered.filter((exp) => {
          const expStatus = String(exp.status || "").toLowerCase();
          const isComp = exp.isCompanyPaid || normalizePaymentMode(exp.paymentMode) !== "Self";
          if (st === "auto approved" || st === "auto approved (company paid)") {
            return isComp && (expStatus === "auto approved" || expStatus === "approved");
          }
          if (st === "pending" || st === "pending approval") {
            return !isComp && expStatus === "pending";
          }
          if (st === "approved") {
            return !isComp && expStatus === "approved";
          }
          return expStatus === st;
        });
      }

      if (tripDate && tripDate !== "all") {
        filtered = filtered.filter((exp) => {
          if (!exp.slotId?.date) return false;
          const dStr = new Date(exp.slotId.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
          return dStr.toLowerCase().includes(tripDate.toLowerCase());
        });
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((exp) => {
          const tripTitle = exp.slotId?.trip?.title?.toLowerCase() || "";
          const location = exp.slotId?.trip?.location?.toLowerCase() || "";
          const capName = exp.captainId?.name?.toLowerCase() || "";
          const title = exp.title?.toLowerCase() || "";
          const desc = exp.notes?.toLowerCase() || "";
          const cat = exp.category?.toLowerCase() || "";
          return (
            tripTitle.includes(q) ||
            location.includes(q) ||
            capName.includes(q) ||
            title.includes(q) ||
            desc.includes(q) ||
            cat.includes(q)
          );
        });
      }

      // 5. Query all CaptainPayouts to populate Payout for each Captain
      const payouts = await CaptainPayout.find()
        .populate("captainId", "name phone avatar role")
        .populate({ path: "slotId", populate: { path: "trip", select: "title location duration price" } });

      const captainPayoutMap = {};
      payouts.forEach((p) => {
        const capId = String(p.captainId?._id || p.captainId);
        if (!captainPayoutMap[capId]) {
          captainPayoutMap[capId] = {
            baseFee: 0,
            approvedSelfExpenses: 0,
            traviskaCardExpenses: 0,
            traviskaUpiExpenses: 0,
            advancesPaid: 0,
            amountPaid: 0,
            balance: 0,
            status: "Pending",
            payoutsList: [],
          };
        }
        captainPayoutMap[capId].baseFee += p.tripFee || 0;
        captainPayoutMap[capId].approvedSelfExpenses += p.approvedSelfExpenses || p.approvedExpenses || 0;
        captainPayoutMap[capId].traviskaCardExpenses += p.traviskaCardExpenses || 0;
        captainPayoutMap[capId].traviskaUpiExpenses += p.traviskaUpiExpenses || 0;
        captainPayoutMap[capId].advancesPaid += p.companyAdvance || 0;
        captainPayoutMap[capId].amountPaid += p.amountPaid || 0;
        captainPayoutMap[capId].balance += p.balance !== undefined ? p.balance : (p.totalPayout - p.amountPaid);
        if (p.status === "Approved") captainPayoutMap[capId].status = "Approved";
        if (p.status === "Settled" && captainPayoutMap[capId].status !== "Approved") captainPayoutMap[capId].status = "Settled";

        captainPayoutMap[capId].payoutsList.push({
          payoutId: p._id,
          tripTitle: p.slotId?.trip?.title || "Custom Expedition",
          departureDate: p.slotId?.date,
          baseFee: p.tripFee || 0,
          approvedSelfExpenses: p.approvedSelfExpenses || p.approvedExpenses || 0,
          traviskaCardExpenses: p.traviskaCardExpenses || 0,
          traviskaUpiExpenses: p.traviskaUpiExpenses || 0,
          advancePaid: p.companyAdvance || 0,
          amountPaid: p.amountPaid || 0,
          balance: p.balance !== undefined ? p.balance : Math.max(0, p.totalPayout - p.amountPaid),
          status: p.status,
        });
      });

      // 6. Group Filtered Expenses by Captain (Reference Image Requirement)
      const captainGroupsMap = {};

      filtered.forEach((exp) => {
        const cap = exp.captainId;
        const capId = cap?._id ? String(cap._id) : "unassigned";
        const capName = cap?.name || "Assigned Captain";

        if (!captainGroupsMap[capId]) {
          const payoutInfo = captainPayoutMap[capId] || {
            baseFee: 0,
            approvedSelfExpenses: 0,
            traviskaCardExpenses: 0,
            traviskaUpiExpenses: 0,
            advancesPaid: 0,
            amountPaid: 0,
            balance: 0,
            status: "Pending",
            payoutsList: [],
          };

          captainGroupsMap[capId] = {
            captainId: cap?._id || null,
            captainName: capName,
            captainStatus: cap?.status || "Active",
            captainRole: normalizeRole(cap?.role),
            captainAvatar: cap?.avatar || "",
            captainPhone: cap?.phone || "",
            totalExpensesCount: 0,
            totalExpensesAmount: 0,
            companyPaidAmount: 0,
            selfPaidAmount: 0,
            pendingAmount: 0,
            approvedSelfReimbursement: 0,
            pendingSelfClaims: 0,
            payoutInfo: {
              ...payoutInfo,
              // Self expenses reimbursement balance for the pill
              selfReimbursementBalance: payoutInfo.approvedSelfExpenses,
            },
            expenses: [],
          };
        }

        const normMode = normalizePaymentMode(exp.paymentMode);
        const normCat = normalizeExpenseCategory(exp.category);
        const isComp = exp.isCompanyPaid || normMode !== "Self";
        const amt = Number(exp.amount) || 0;

        captainGroupsMap[capId].totalExpensesCount++;
        captainGroupsMap[capId].totalExpensesAmount += amt;

        if (isComp) {
          captainGroupsMap[capId].companyPaidAmount += amt;
        } else {
          captainGroupsMap[capId].selfPaidAmount += amt;
          if (exp.status === "Approved" || exp.status === "Settled") {
            captainGroupsMap[capId].approvedSelfReimbursement += amt;
          } else if (exp.status === "Pending") {
            captainGroupsMap[capId].pendingAmount += amt;
            captainGroupsMap[capId].pendingSelfClaims += amt;
          }
        }

        const slot = exp.slotId;
        const trip = slot?.trip;

        // Display status
        let displayStatus = "Pending Approval";
        if (isComp) {
          displayStatus = "Auto Approved (Company Paid)";
        } else if (exp.status === "Approved") {
          displayStatus = "Approved";
        } else if (exp.status === "Settled") {
          displayStatus = "Settled";
        } else if (exp.status === "Rejected") {
          displayStatus = "Rejected";
        }

        captainGroupsMap[capId].expenses.push({
          _id: exp._id,
          slotId: slot?._id || exp.slotId,
          tripId: trip?._id || null,
          tripName: trip?.title || "Unknown trip",
          tripSublocation: trip?.location || "",
          tripImage: trip?.image || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&q=80",
          captainName: capName,
          captainPhone: cap?.phone || "",
          captainAvatar: cap?.avatar || "",
          tripDate: slot?.date ? new Date(slot.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "Upcoming",
          departureDateFull: slot?.date ? `${new Date(slot.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} – ${slot.endDate ? new Date(slot.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : new Date(new Date(slot.date).getTime() + 2*86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : "Upcoming Departure",
          createdAt: exp.createdAt,
          tripDateRaw: slot?.date || null,
          expenseDate: new Date(exp.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
          expenseTime: new Date(exp.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          paymentMode: normMode,
          expenseType: normCat,
          title: exp.title || `${normCat} expense`,
          notes: exp.notes || "",
          amount: amt,
          status: displayStatus,
          rawStatus: exp.status,
          isCompanyPaid: isComp,
          receiptUrl: exp.receiptUrl || "",
          approvedBy: exp.approvedBy,
          approvedAt: exp.approvedAt,
          rejectionReason: exp.rejectionReason,
          rejectedAt: exp.rejectedAt,
          isSettled: exp.status === "Settled" || exp.isSettled,
          canApprove: !isComp && exp.status === "Pending",
          canReject: !isComp && exp.status === "Pending",
        });
      });

      const captainGroups = Object.values(captainGroupsMap);
      captainGroups.forEach((g) => {
        g.payoutInfo.selfReimbursementBalance =
          g.approvedSelfReimbursement > 0
            ? g.approvedSelfReimbursement
            : (g.pendingSelfClaims > 0 ? g.pendingSelfClaims : g.payoutInfo.approvedSelfExpenses || 0);
      });

      captainGroups.sort((a, b) => b.totalExpensesAmount - a.totalExpensesAmount);

      // Map flat expenses for backwards-compatibility or export
      const flatExpenses = filtered.map((exp) => {
        const slot = exp.slotId;
        const trip = slot?.trip;
        const cap = exp.captainId;
        const normMode = normalizePaymentMode(exp.paymentMode);
        const normCat = normalizeExpenseCategory(exp.category);
        const isComp = exp.isCompanyPaid || normMode !== "Self";

        let displayStatus = "Pending Approval";
        if (isComp) {
          displayStatus = "Auto Approved (Company Paid)";
        } else if (exp.status === "Approved") {
          displayStatus = "Approved";
        } else if (exp.status === "Settled") {
          displayStatus = "Settled";
        } else if (exp.status === "Rejected") {
          displayStatus = "Rejected";
        }

        return {
          _id: exp._id,
          tripTitle: trip?.title || "Trip",
          tripLocation: trip?.location || "Destination",
          tripDate: slot?.date,
          captainId: cap?._id,
          captainName: cap?.name || "Captain",
          paymentMode: normMode,
          expenseType: normCat,
          title: exp.title,
          notes: exp.notes,
          amount: exp.amount,
          status: displayStatus,
          rawStatus: exp.status,
          isCompanyPaid: isComp,
          receiptUrl: exp.receiptUrl || "",
          createdAt: exp.createdAt,
        };
      });

      res.json({
        success: true,
        summary: {
          totalExpenses: { amount: totalAmount, count: totalCount },
          traviskaCard: { amount: cardAmount, count: cardCount, badge: "Auto Approved" },
          traviskaUpi: { amount: upiAmount, count: upiCount, badge: "Auto Approved" },
          selfExpenses: { amount: selfAmount, count: selfCount },
          pendingApproval: { amount: pendingAmount, count: pendingCount },
        },
        captainGroups,
        expenses: flatExpenses,
        totalRecords: filtered.length,
        filterOptions: {
          trips: availableTrips,
          captains: availableCaptains,
          tripDates: availableTripDates,
          paymentModes: ["Traviska Card", "Traviska UPI", "Self"],
          expenseTypes: [
            "Fuel",
            "Tolls",
            "Food",
            "Tickets",
            "Parking",
            "Breakfast",
            "Transport",
            "Hotel",
            "Coordinator Food",
            "Others",
          ],
          statuses: ["Auto Approved", "Pending Approval", "Approved", "Rejected", "Settled"],
        },
      });
    } catch (err) {
      console.error("Get expenses error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch expenses" });
    }
  });

  // Get Trip, Departure, and Captain options for Log Manual Expense form
  router.get("/admin/operations/expenses/trip-options", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [trips, slots, assignments, allCaptains] = await Promise.all([
        Trip.find({}).select("title location image duration").lean(),
        TripSlot.find({ isClosed: false })
          .populate("assignedCaptain", "name phone avatar rating role status")
          .populate("assignedCaptains.captain", "name phone avatar rating role status")
          .lean(),
        CaptainAssignment.find({ status: { $ne: "Cancelled" } })
          .populate("captainId", "name phone avatar rating role status")
          .lean(),
        Captain.find({ status: "Active" }).select("name phone avatar role status").lean(),
      ]);

      const tripMap = {};
      trips.forEach((t) => {
        tripMap[t._id.toString()] = {
          _id: t._id,
          title: t.title,
          location: t.location,
          image: t.image,
          slots: [],
        };
      });

      slots.forEach((s) => {
        const tId = s.trip?._id ? s.trip._id.toString() : (s.trip ? s.trip.toString() : null);
        if (tId && tripMap[tId]) {
          const capMap = {};
          if (s.assignedCaptain && s.assignedCaptain._id) {
            capMap[s.assignedCaptain._id.toString()] = s.assignedCaptain;
          }
          if (Array.isArray(s.assignedCaptains)) {
            s.assignedCaptains.forEach((ac) => {
              if (ac.captain && ac.captain._id) {
                capMap[ac.captain._id.toString()] = ac.captain;
              }
            });
          }
          assignments.forEach((asg) => {
            if (asg.slotId && asg.slotId.toString() === s._id.toString() && asg.captainId && asg.captainId._id) {
              capMap[asg.captainId._id.toString()] = asg.captainId;
            }
          });

          const startDate = s.date ? new Date(s.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";
          const endDate = s.endDate ? new Date(s.endDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : (s.date ? new Date(new Date(s.date).getTime() + 2*86400000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "");
          const dateLabel = startDate && endDate ? `${startDate} – ${endDate}` : (startDate || "Upcoming Departure");

          tripMap[tId].slots.push({
            _id: s._id,
            date: s.date,
            endDate: s.endDate,
            dateLabel,
            assignedCaptains: Object.values(capMap),
          });
        }
      });

      res.json({
        success: true,
        trips: Object.values(tripMap).filter((t) => t.slots.length > 0),
        allCaptains,
      });
    } catch (err) {
      console.error("trip-options error:", err);
      res.status(500).json({ success: false, message: "Failed to load trip options" });
    }
  });

  // Log Manual Expense (Requirement: Admin Log Manual Expense modal)
  router.post("/admin/operations/expenses", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const {
        slotId,
        captainId,
        amount,
        category,
        expenseType,
        description,
        title,
        receiptUrl,
        notes,
        paymentMode = "Self",
      } = req.body;

      if (!slotId) {
        return res.status(400).json({ success: false, message: "Departure slot is required" });
      }
      if (!captainId) {
        return res.status(400).json({ success: false, message: "Captain is required" });
      }
      const numAmount = Number(amount);
      if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({ success: false, message: "Please enter a valid expense amount" });
      }

      const cleanMode = normalizePaymentMode(paymentMode);
      const cleanCat = normalizeExpenseCategory(expenseType || category);
      const isCompanyPaid = cleanMode === "Traviska Card" || cleanMode === "Traviska UPI";
      const status = isCompanyPaid ? "Auto Approved" : "Pending";

      const expense = new TripExpense({
        slotId,
        captainId,
        amount: numAmount,
        category: cleanCat,
        title: title || description || `${cleanCat} expense`,
        notes: notes || description || "",
        receiptUrl: receiptUrl || "",
        paymentMode: cleanMode,
        status,
        isCompanyPaid,
        isAutoApproved: isCompanyPaid,
        verificationStatus: isCompanyPaid ? "Unverified" : undefined,
        approvedBy: isCompanyPaid ? "System (Auto Approved)" : undefined,
        approvedAt: isCompanyPaid ? new Date() : undefined,
      });

      await expense.save();

      // Trigger sync for payouts
      await syncCaptainPayouts();

      await expense.populate("captainId", "name phone avatar role status");
      await expense.populate({
        path: "slotId",
        populate: { path: "trip", select: "title location duration price image" },
      });

      res.json({
        success: true,
        message: isCompanyPaid
          ? "Company-paid expense logged and auto-approved."
          : "Self expense logged successfully and pending review.",
        expense,
      });
    } catch (err) {
      console.error("Log manual expense error:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to log expense" });
    }
  });

  // Expense Approval / Rejection (Requirement 5: Manual Approval for Self Expenses)
  router.put("/admin/operations/expenses/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { status, rejectionReason, notes } = req.body;

      if (!["Approved", "Rejected", "Pending"].includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid expense status" });
      }

      if (status === "Rejected" && (!rejectionReason || !rejectionReason.trim())) {
        return res.status(400).json({
          success: false,
          message: "A rejection reason is mandatory to reject an expense claim.",
        });
      }

      const expense = await TripExpense.findById(req.params.id);
      if (!expense) {
        return res.status(404).json({ success: false, message: "Expense record not found" });
      }

      if (expense.status === "Settled") {
        return res.status(400).json({
          success: false,
          message: "This expense has already been settled in a payout and cannot be modified.",
        });
      }

      if (expense.isCompanyPaid && (expense.paymentMode === "Traviska Card" || expense.paymentMode === "Traviska UPI")) {
        return res.status(400).json({
          success: false,
          message: "Company-paid card and UPI expenses are auto-approved and cannot be rejected as captain claims.",
        });
      }

      expense.status = status;
      if (notes) expense.notes = notes;

      const adminName = req.user?.name || "Super Admin";

      if (status === "Approved") {
        expense.approvedBy = adminName;
        expense.approvedAt = new Date();
        expense.rejectionReason = undefined;
      } else if (status === "Rejected") {
        expense.rejectionReason = rejectionReason.trim();
        expense.rejectedAt = new Date();
        expense.approvedBy = adminName;
      }

      await expense.save();

      // Recalculate CaptainPayout for this slot & captain
      await syncCaptainPayouts();

      res.json({
        success: true,
        message: `Expense claim has been ${status.toLowerCase()} successfully`,
        expense,
      });
    } catch (err) {
      console.error("Update expense status error:", err);
      res.status(500).json({ success: false, message: "Failed to update expense status" });
    }
  });

  // ==========================================
  // PAGE 3: PAYOUTS & SETTLEMENTS API
  // ==========================================

  // Get all payouts, summary cards, and settlement history
  router.get("/admin/operations/payouts", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      // Sync payouts with active assignments & approved expenses first
      await syncCaptainPayouts();

      const { captainId, tripId, status, search, page = 1, limit = 20 } = req.query;

      // 1. Fetch all payouts populated with captain, slot, trip
      const allPayouts = await CaptainPayout.find()
        .populate("captainId", "name phone avatar role bankDetails")
        .populate({
          path: "slotId",
          populate: { path: "trip", select: "title location duration price image" },
        })
        .sort({ updatedAt: -1 });

      // 2. Real-time Summary Cards
      let pendingCount = 0;
      let pendingAmount = 0;
      let approvedCount = 0;
      let approvedAmount = 0;
      let settledCount = 0;
      let settledAmount = 0;
      let totalPayoutValue = 0;

      // Also gather all transactions for Settlement History audit trail
      const settlementHistory = [];

      allPayouts.forEach((pay) => {
        const bal = Number(pay.balance) || 0;
        const total = Number(pay.totalPayout) || 0;
        const paid = Number(pay.amountPaid) || 0;

        totalPayoutValue += total;

        if (pay.status === "Pending") {
          pendingCount++;
          pendingAmount += bal > 0 ? bal : total;
        } else if (pay.status === "Approved") {
          approvedCount++;
          approvedAmount += bal > 0 ? bal : total;
        } else if (pay.status === "Settled") {
          settledCount++;
          settledAmount += paid > 0 ? paid : total;
        }

        // Collect individual transactions
        if (Array.isArray(pay.transactions) && pay.transactions.length > 0) {
          pay.transactions.forEach((tx) => {
            settlementHistory.push({
              _id: tx._id,
              payoutId: pay._id,
              captainName: pay.captainId?.name || "Captain",
              captainPhone: pay.captainId?.phone || "",
              tripTitle: pay.slotId?.trip?.title || "Expedition",
              departureDate: pay.slotId?.date,
              amount: tx.amount,
              paymentMethod: tx.paymentMethod || "UPI",
              paymentReference: tx.paymentReference,
              settledAt: tx.settledAt,
              settledBy: tx.settledBy || "Admin",
              notes: tx.notes,
            });
          });
        } else if (pay.status === "Settled" && pay.amountPaid > 0) {
          settlementHistory.push({
            _id: pay._id,
            payoutId: pay._id,
            captainName: pay.captainId?.name || "Captain",
            captainPhone: pay.captainId?.phone || "",
            tripTitle: pay.slotId?.trip?.title || "Expedition",
            departureDate: pay.slotId?.date,
            amount: pay.amountPaid,
            paymentMethod: pay.paymentMethod || "UPI",
            paymentReference: pay.paymentReference || "UPI-SETTLED",
            settledAt: pay.settledAt || pay.updatedAt,
            settledBy: pay.settledBy || "Admin",
          });
        }
      });

      // Sort settlement history newest first
      settlementHistory.sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime());

      // 3. Filter options
      const captainMap = {};
      const tripMap = {};

      allPayouts.forEach((pay) => {
        const cap = pay.captainId;
        if (cap && cap._id) captainMap[String(cap._id)] = cap.name;
        const trip = pay.slotId?.trip;
        if (trip && trip._id) tripMap[String(trip._id)] = trip.title;
      });

      const availableCaptains = Object.entries(captainMap).map(([id, name]) => ({ _id: id, name }));
      const availableTrips = Object.entries(tripMap).map(([id, title]) => ({ _id: id, title }));

      // 4. Apply Filters to Payout Table
      let filtered = allPayouts;

      if (captainId && captainId !== "all") {
        filtered = filtered.filter((p) => String(p.captainId?._id) === String(captainId));
      }

      if (tripId && tripId !== "all") {
        filtered = filtered.filter((p) => String(p.slotId?.trip?._id) === String(tripId));
      }

      if (status && status !== "all") {
        filtered = filtered.filter((p) => p.status?.toLowerCase() === status.toLowerCase());
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((p) => {
          const capName = p.captainId?.name?.toLowerCase() || "";
          const tripTitle = p.slotId?.trip?.title?.toLowerCase() || "";
          const ref = p.paymentReference?.toLowerCase() || "";
          return capName.includes(q) || tripTitle.includes(q) || ref.includes(q);
        });
      }

      // 5. Pagination
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const totalRecords = filtered.length;
      const totalPages = Math.ceil(totalRecords / limitNum) || 1;
      const paginated = filtered.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      const mappedPayouts = paginated.map((p) => {
        const cap = p.captainId;
        const slot = p.slotId;
        const trip = slot?.trip;

        return {
          _id: p._id,
          captainId: cap?._id,
          captainName: cap?.name || "Captain",
          captainAvatar: cap?.avatar,
          captainPhone: cap?.phone || "",
          captainRole: normalizeRole(cap?.role),
          bankDetails: cap?.bankDetails,
          slotId: slot?._id,
          tripId: trip?._id,
          tripTitle: trip?.title || "Custom Expedition",
          destination: trip?.location || "South India",
          departureDate: slot?.date,
          payoutPeriod: p.payoutPeriod || "Trip Completion",
          basePayout: p.tripFee || 0,
          advancePaid: p.companyAdvance || 0,
          approvedExpenses: p.approvedExpenses || 0,
          totalPayout: p.totalPayout || (p.tripFee + p.approvedExpenses - p.companyAdvance),
          amountPaid: p.amountPaid || 0,
          remainingBalance: p.balance !== undefined ? p.balance : Math.max(0, p.totalPayout - p.amountPaid),
          status: p.status || "Pending",
          paymentMethod: p.paymentMethod || "UPI",
          paymentReference: p.paymentReference || "",
          settledAt: p.settledAt,
          settledBy: p.settledBy,
          transactions: p.transactions || [],
        };
      });

      res.json({
        success: true,
        summary: {
          pendingPayouts: { count: pendingCount, amount: pendingAmount },
          approvedPayouts: { count: approvedCount, amount: approvedAmount },
          settledPayouts: { count: settledCount, amount: settledAmount },
          totalPayoutValue,
        },
        payouts: mappedPayouts,
        settlementHistory,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalRecords,
          totalPages,
        },
        filterOptions: {
          captains: availableCaptains,
          trips: availableTrips,
        },
      });
    } catch (err) {
      console.error("Get payouts error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch payouts" });
    }
  });

  // Authorize / Approve a Payout
  router.put("/admin/operations/payouts/:id/approve", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const payout = await CaptainPayout.findById(req.params.id);
      if (!payout) {
        return res.status(404).json({ success: false, message: "Payout record not found" });
      }

      payout.status = "Approved";
      await payout.save();

      res.json({ success: true, message: "Payout approved and authorized for settlement", payout });
    } catch (err) {
      console.error("Approve payout error:", err);
      res.status(500).json({ success: false, message: "Failed to approve payout" });
    }
  });

  // Settle Payout Functionality (Requirement: Settle Payout modal with confirmation & audit trail)
  router.post("/admin/operations/payouts/settle", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { payoutId, captainId, slotId, amount, paymentMethod, paymentReference, notes } = req.body;

      if (!paymentReference || !paymentReference.trim()) {
        return res.status(400).json({
          success: false,
          message: "Transaction Reference / UTR number is mandatory for audit compliance.",
        });
      }

      const settleAmount = Number(amount);
      if (!settleAmount || settleAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid payment amount greater than ₹0.",
        });
      }

      let payout;
      if (payoutId) {
        payout = await CaptainPayout.findById(payoutId);
      } else if (captainId && slotId) {
        payout = await CaptainPayout.findOne({ captainId, slotId });
      }

      if (!payout) {
        return res.status(404).json({ success: false, message: "Payout record not found" });
      }

      // Check remaining balance
      const currentBalance = payout.balance !== undefined ? payout.balance : (payout.totalPayout - (payout.amountPaid || 0));
      if (settleAmount > currentBalance + 50) { // allowance of ₹50 for minor rounding if any
        return res.status(400).json({
          success: false,
          message: `Settlement amount (₹${settleAmount}) exceeds remaining balance due (₹${currentBalance}).`,
        });
      }

      const adminName = req.user?.name || "Super Admin";
      const tx = {
        amount: settleAmount,
        paymentMethod: paymentMethod || "UPI",
        paymentReference: paymentReference.trim(),
        settledBy: adminName,
        settledAt: new Date(),
        notes: notes || "",
      };

      payout.transactions.push(tx);
      payout.amountPaid = (payout.amountPaid || 0) + settleAmount;
      payout.balance = Math.max(0, payout.totalPayout - payout.amountPaid);
      payout.paymentMethod = paymentMethod || "UPI";
      payout.paymentReference = paymentReference.trim();

      if (payout.balance <= 0) {
        payout.status = "Settled";
        payout.settledAt = new Date();
        payout.settledBy = adminName;

        // Also mark all approved Self expenses for this captain and slot as Settled!
        await TripExpense.updateMany(
          {
            slotId: payout.slotId,
            captainId: payout.captainId,
            status: "Approved",
            isCompanyPaid: { $ne: true },
          },
          {
            $set: {
              status: "Settled",
              isSettled: true,
              settlementId: payout._id,
            },
          }
        );
      }

      await payout.save();

      res.json({
        success: true,
        message: `Settlement of ₹${settleAmount.toLocaleString("en-IN")} recorded successfully`,
        payout,
        transaction: tx,
      });
    } catch (err) {
      console.error("Settle payout error:", err);
      res.status(500).json({ success: false, message: err.message || "Failed to settle payout" });
    }
  });

  return router;
};

