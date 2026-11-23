const express = require("express");
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");
const Coupon = require("../models/Coupon");

// Helper to format dates in Indian Standard Time (Asia/Kolkata)
function formatISTDate(rawDate) {
  if (!rawDate) return "Upcoming";
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return String(rawDate);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

// Format booking code consistently: TVK + 4 chars from ID or custom code
function formatBookingCode(booking) {
  if (booking.bookingCode && booking.bookingCode.trim()) {
    return booking.bookingCode.trim().toUpperCase();
  }
  const idStr = String(booking._id || "");
  return `TVK${idStr.slice(-4).toUpperCase()}`;
}

module.exports = function adminBookingRoutes({ authMiddleware, adminMiddleware }) {
  const router = express.Router();

  /**
   * GET /admin/bookings/overview
   * Returns all trips, their departure slots, and booking capacities
   */
  router.get("/admin/bookings/overview", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const [trips, slots, bookings] = await Promise.all([
        Trip.find().sort({ createdAt: -1 }).lean(),
        TripSlot.find()
          .populate("assignedCaptain", "name phone rating role photo")
          .populate("assignedCaptains.captain", "name phone rating role photo")
          .sort({ date: 1 })
          .lean(),
        Booking.find().select("slotId trip travellers status isRescheduled createdAt").lean(),
      ]);

      // Map slots by tripId
      const slotsByTrip = new Map();
      slots.forEach((s) => {
        const tripId = String(s.trip?._id || s.trip || "");
        if (!slotsByTrip.has(tripId)) {
          slotsByTrip.set(tripId, []);
        }
        slotsByTrip.get(tripId).push(s);
      });

      // Count bookings by slotId and track latest booking per trip
      const slotBookingCounts = new Map();
      const tripBookingCounts = new Map();
      const tripLatestBookingAt = new Map();

      bookings.forEach((b) => {
        if (b.status === "Cancelled") return;
        const count = Number(b.travellers) || 1;
        const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        if (b.slotId) {
          const sid = String(b.slotId?._id || b.slotId);
          slotBookingCounts.set(sid, (slotBookingCounts.get(sid) || 0) + count);
        }

        // Track by trip title
        const bTripTitle = (b.trip?.title || "").trim().toLowerCase();
        if (bTripTitle) {
          tripBookingCounts.set(bTripTitle, (tripBookingCounts.get(bTripTitle) || 0) + count);
          if (bCreatedAt > (tripLatestBookingAt.get(bTripTitle) || 0)) {
            tripLatestBookingAt.set(bTripTitle, bCreatedAt);
          }
        }
      });

      // Deduplicate trips by title: merge duplicate trip packages so all departure slots are combined under one package
      const tripMapByTitle = new Map();
      trips.forEach((t) => {
        const normTitle = (t.title || "").trim().toLowerCase();
        if (!normTitle) return;
        if (!tripMapByTitle.has(normTitle)) {
          tripMapByTitle.set(normTitle, { ...t, duplicateIds: [String(t._id)] });
        } else {
          tripMapByTitle.get(normTitle).duplicateIds.push(String(t._id));
        }
      });

      const uniqueTrips = Array.from(tripMapByTitle.values());

      // Build rich trip list
      const tripList = uniqueTrips.map((t) => {
        // Collect all slots belonging to this trip or any of its duplicate IDs
        let tripSlots = [];
        t.duplicateIds.forEach((tid) => {
          const sList = slotsByTrip.get(tid) || [];
          tripSlots = tripSlots.concat(sList);
        });

        // Deduplicate slots by _id
        const uniqueSlotMap = new Map();
        tripSlots.forEach((s) => uniqueSlotMap.set(String(s._id), s));
        const deduplicatedSlots = Array.from(uniqueSlotMap.values());

        // Sort slots by date (upcoming first)
        deduplicatedSlots.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let totalCapacity = 0;
        let totalBooked = 0;

        const departures = deduplicatedSlots.map((s) => {
          const sid = String(s._id);
          // Prioritize actual confirmed bookings in the Booking collection
          const actualBooked = slotBookingCounts.get(sid) || 0;
          const capacity = Number(s.totalSlots) || 24;

          totalCapacity += capacity;
          totalBooked += actualBooked;

          // Asynchronously sync TripSlot.bookedSlots in the DB if it is out of sync
          if (Number(s.bookedSlots) !== actualBooked) {
            TripSlot.updateOne({ _id: s._id }, { bookedSlots: actualBooked }).exec().catch(() => {});
          }

          return {
            _id: s._id,
            date: s.date,
            formattedDate: formatISTDate(s.date),
            totalSlots: capacity,
            bookedSlots: actualBooked,
            availableSlots: Math.max(0, capacity - actualBooked),
            isClosed: Boolean(s.isClosed),
            assignedCaptain: s.assignedCaptain || null,
            assignedCaptains: s.assignedCaptains || [],
            whatsappGroupLink: s.whatsappGroupLink || "",
            photoDriveLink: s.photoDriveLink || "",
            billDriveLink: s.billDriveLink || "",
          };
        });

        // Primary departure: prioritize one that has real bookings, then upcoming, then first
        const primarySlot =
          departures.find((d) => d.bookedSlots > 0) ||
          departures.find((d) => new Date(d.date) >= new Date()) ||
          departures[0];

        // Clean default images
        const tripImage =
          t.image && t.image.trim()
            ? t.image
            : Array.isArray(t.photos) && t.photos.length > 0
            ? t.photos[0]
            : "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500";

        const normTitle = (t.title || "").trim().toLowerCase();
        const latestBookingTime = tripLatestBookingAt.get(normTitle) || 0;

        return {
          _id: t._id,
          title: t.title?.trim() || "Trip Package",
          location: t.location?.trim() || "India",
          duration: t.duration?.trim() || "2 Days / 1 Night",
          price: Number(t.price) || 0,
          image: tripImage,
          departuresCount: departures.length,
          totalCapacity: totalCapacity > 0 ? totalCapacity : 24,
          totalBooked: totalBooked,
          departures,
          primaryDeparture: primarySlot || null,
          latestBookingAt: latestBookingTime,
        };
      });

      // Sort trips: trips with most recent bookings first, then totalBooked, then alphabetically
      tripList.sort((a, b) => {
        if (b.latestBookingAt !== a.latestBookingAt) {
          return b.latestBookingAt - a.latestBookingAt;
        }
        if (b.totalBooked !== a.totalBooked) {
          return b.totalBooked - a.totalBooked;
        }
        return (a.title || "").localeCompare(b.title || "");
      });

      return res.json({
        success: true,
        trips: tripList,
        totalTrips: tripList.length,
      });
    } catch (err) {
      console.error("Failed to load bookings overview:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to load bookings overview",
      });
    }
  });

  /**
   * GET /admin/bookings/list
   * Returns list of bookings filtered by tripId, slotId, status tab, pickup, search query
   */
  router.get("/admin/bookings/list", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { tripId, slotId, tab = "booked", search = "", pickup = "", status = "" } = req.query;

      let filtered = [];

      if (slotId && slotId !== "all" && mongoose.isValidObjectId(slotId)) {
        // Query specific departure slot
        const targetSlot = await TripSlot.findById(slotId).populate("trip", "title").lean();
        const targetSlotIdStr = String(slotId);
        let slotDateStr = "";
        try {
          if (targetSlot?.date) {
            slotDateStr = new Date(targetSlot.date).toISOString().split("T")[0];
          }
        } catch {}

        const queryOr = [
          { slotId: new mongoose.Types.ObjectId(slotId) },
          { slotId: targetSlotIdStr },
        ];

        filtered = await Booking.find({ $or: queryOr })
          .populate({
            path: "slotId",
            populate: { path: "trip", select: "title location duration price image" },
          })
          .sort({ createdAt: -1 })
          .lean();

        // If no bookings matched direct slotId, check fallback by slot date & trip title
        if (filtered.length === 0 && targetSlot?.trip?.title && slotDateStr) {
          const tripTitle = targetSlot.trip.title.trim();
          const fallbackBookings = await Booking.find({
            "trip.title": new RegExp(`^${tripTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
          })
            .populate({
              path: "slotId",
              populate: { path: "trip", select: "title location duration price image" },
            })
            .sort({ createdAt: -1 })
            .lean();

          filtered = fallbackBookings.filter((b) => {
            if (!b.date) return false;
            try {
              const bDateStr = new Date(b.date).toISOString().split("T")[0];
              return bDateStr === slotDateStr;
            } catch {
              return String(b.date).includes(slotDateStr);
            }
          });
        }
      } else if (tripId && mongoose.isValidObjectId(tripId)) {
        // Find all bookings for this trip (across all departure slots)
        const targetTrip = await Trip.findById(tripId).select("title").lean();
        const targetTitle = targetTrip?.title?.trim();

        const matchingTrips = targetTitle
          ? await Trip.find({
              title: new RegExp(`^${targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
            })
              .select("_id")
              .lean()
          : [];
        const allTripIds = [tripId, ...matchingTrips.map((t) => String(t._id))];

        const tripSlots = await TripSlot.find({ trip: { $in: allTripIds } }).select("_id").lean();
        const slotIds = tripSlots.map((s) => s._id);

        const query = {
          $or: [
            { slotId: { $in: slotIds } },
            ...(targetTitle
              ? [{ "trip.title": new RegExp(`^${targetTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }]
              : []),
          ],
        };

        filtered = await Booking.find(query)
          .populate({
            path: "slotId",
            populate: { path: "trip", select: "title location duration price image" },
          })
          .sort({ createdAt: -1 })
          .lean();
      } else {
        // "all" view - return all bookings
        filtered = await Booking.find()
          .populate({
            path: "slotId",
            populate: { path: "trip", select: "title location duration price image" },
          })
          .sort({ createdAt: -1 })
          .lean();
      }

      // Collect available pickups
      const pickupSet = new Set();
      filtered.forEach((b) => {
        if (b.pickupDetails?.name && b.pickupDetails.name.trim()) {
          pickupSet.add(b.pickupDetails.name.trim());
        } else if (b.pickupLocation && b.pickupLocation.trim()) {
          pickupSet.add(b.pickupLocation.trim());
        }
      });

      // Calculate tab counts for current view
      let bookedCount = 0;
      let rescheduledCount = 0;
      let cancelledCount = 0;

      filtered.forEach((b) => {
        if (b.status === "Cancelled") {
          cancelledCount += 1;
        } else {
          bookedCount += 1;
        }

        if (b.isRescheduled || (Array.isArray(b.rescheduleHistory) && b.rescheduleHistory.length > 0)) {
          rescheduledCount += 1;
        }
      });

      // Filter by tab
      if (tab === "booked") {
        filtered = filtered.filter((b) => b.status !== "Cancelled");
      } else if (tab === "rescheduled") {
        filtered = filtered.filter(
          (b) => b.isRescheduled || (Array.isArray(b.rescheduleHistory) && b.rescheduleHistory.length > 0)
        );
      } else if (tab === "cancelled") {
        filtered = filtered.filter((b) => b.status === "Cancelled");
      }

      // Filter by pickup
      if (pickup && pickup !== "all") {
        filtered = filtered.filter((b) => b.pickupLocation?.trim() === pickup.trim());
      }

      // Filter by status (Paid, Pending, Failed)
      if (status && status !== "all") {
        filtered = filtered.filter((b) => b.paymentStatus === status || b.status === status);
      }

      // Filter by search query
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((b) => {
          const code = formatBookingCode(b).toLowerCase();
          const name = String(b.name || "").toLowerCase();
          const phone = String(b.phone || "").toLowerCase();
          const email = String(b.email || "").toLowerCase();
          const pickupLoc = String(b.pickupLocation || "").toLowerCase();
          return (
            code.includes(q) ||
            name.includes(q) ||
            phone.includes(q) ||
            email.includes(q) ||
            pickupLoc.includes(q)
          );
        });
      }

      // Pre-load all trip slots to ensure departure WhatsApp group link is always resolved
      const allTripSlots = await TripSlot.find().lean();
      const slotMap = new Map();
      allTripSlots.forEach((s) => {
        slotMap.set(String(s._id), s);
        if (s.date) {
          try {
            const dStr = new Date(s.date).toISOString().split("T")[0];
            slotMap.set(`${s.trip}_${dStr}`, s);
            if (!slotMap.has(dStr)) slotMap.set(dStr, s);
          } catch {}
        }
      });

      // Format response records cleanly
      const formattedBookings = filtered.map((b) => {
        // Resolve trip information
        const tripTitle =
          b.slotId?.trip?.title?.trim() ||
          b.trip?.title?.trim() ||
          "Custom Trip";
        const tripLocation =
          b.slotId?.trip?.location?.trim() ||
          b.trip?.location?.trim() ||
          "India";
        const tripDuration =
          b.slotId?.trip?.duration?.trim() ||
          b.trip?.duration?.trim() ||
          "2 Days / 1 Night";

        // Resolve departure date & slot
        const departureDate = b.slotId?.date || b.date;
        const formattedDate = formatISTDate(departureDate);

        let dateKey = "";
        try {
          if (b.date) dateKey = new Date(b.date).toISOString().split("T")[0];
        } catch {}

        const matchedSlot =
          b.slotId && typeof b.slotId === "object" && b.slotId.whatsappGroupLink !== undefined
            ? b.slotId
            : slotMap.get(String(b.slotId?._id || b.slotId)) || (dateKey ? slotMap.get(dateKey) : null);

        const slotWhatsappGroupLink = (matchedSlot?.whatsappGroupLink || "").trim();
        const resolvedSlotId = matchedSlot?._id ? String(matchedSlot._id) : (b.slotId?._id || b.slotId || null);

        return {
          _id: b._id,
          bookingCode: formatBookingCode(b),
          name: b.name?.trim() || "Traveller",
          phone: b.phone?.trim() || "-",
          email: b.email?.trim() || "",
          travellers: Number(b.travellers) || 1,
          travellerDetails: Array.isArray(b.travellerDetails) ? b.travellerDetails : [],
          pickupLocation:
            b.pickupDetails?.name
              ? `${b.pickupDetails.name}${b.pickupDetails.pickupTime ? ` (${b.pickupDetails.pickupTime})` : ""}`
              : b.pickupLocation?.trim() || "Standard Pickup",
          pickupDetails: b.pickupDetails || {
            name: b.pickupLocation?.trim() || "",
            address: "",
            landmark: "",
            pickupTime: "",
            googleMapsUrl: "",
          },
          pickupLocationId: b.pickupLocationId || null,
          amount: Number(b.total) || 0,
          originalTotal: b.originalTotal != null ? Number(b.originalTotal) : Number(b.total) || 0,
          couponCode: b.couponCode || null,
          discountAmount: Number(b.discountAmount) || 0,
          paymentStatus: b.paymentStatus || "Pending",
          paymentMethod: b.paymentMethod || "Online",
          paymentReference: b.paymentReference || b.paymentId || "-",
          status: b.status || "Confirmed",
          isRescheduled: Boolean(b.isRescheduled),
          rescheduledAt: b.rescheduledAt || null,
          rescheduleHistory: b.rescheduleHistory || [],
          cancelledAt: b.cancelledAt || null,
          cancellationReason: b.cancellationReason || "",
          cancellationNotes: b.cancellationNotes || "",
          requests: b.requests || "",
          date: formattedDate,
          rawDate: departureDate,
          trip: {
            title: tripTitle,
            location: tripLocation,
            duration: tripDuration,
            image: b.slotId?.trip?.image || b.trip?.image || "",
          },
          slotId: resolvedSlotId,
          slotWhatsappGroupLink,
          createdAt: b.createdAt,
        };
      });

      return res.json({
        success: true,
        bookings: formattedBookings,
        counts: {
          booked: bookedCount,
          rescheduled: rescheduledCount,
          cancelled: cancelledCount,
          total: bookedCount + cancelledCount,
        },
        availablePickups: Array.from(pickupSet),
      });
    } catch (err) {
      console.error("Failed to load bookings list:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to load bookings list",
      });
    }
  });

  /**
   * POST /admin/bookings/:id/reschedule
   * Reschedules a booking to a new valid departure slot and updates seat capacities
   */
  router.post("/admin/bookings/:id/reschedule", authMiddleware, adminMiddleware, async (req, res) => {
    const { newSlotId, reason } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    if (!newSlotId || !mongoose.isValidObjectId(newSlotId)) {
      return res.status(400).json({ success: false, message: "Please select a valid departure slot" });
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      if (booking.status === "Cancelled") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Cancelled bookings cannot be rescheduled. Please create a new booking.",
        });
      }

      const currentSlotId = booking.slotId ? String(booking.slotId) : null;
      if (currentSlotId === String(newSlotId)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Booking is already scheduled for this departure date",
        });
      }

      const newSlot = await TripSlot.findById(newSlotId).populate("trip").session(session);
      if (!newSlot) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Selected departure slot not found" });
      }

      if (newSlot.isClosed) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "The selected departure slot is closed for new bookings",
        });
      }

      const travellersCount = Number(booking.travellers) || 1;
      const availableSeats = (newSlot.totalSlots || 24) - (newSlot.bookedSlots || 0);

      if (availableSeats < travellersCount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient seats available in selected departure (Only ${availableSeats} seats left, needed ${travellersCount})`,
        });
      }

      // Step 1: Release seats from old slot (if exists)
      let oldDateStr = booking.date || "Previous Date";
      if (currentSlotId) {
        const oldSlot = await TripSlot.findById(currentSlotId).session(session);
        if (oldSlot) {
          oldSlot.bookedSlots = Math.max(0, (oldSlot.bookedSlots || 0) - travellersCount);
          await oldSlot.save({ session });
          oldDateStr = formatISTDate(oldSlot.date);
        }
      }

      // Step 2: Reserve seats in new slot
      newSlot.bookedSlots = (newSlot.bookedSlots || 0) + travellersCount;
      await newSlot.save({ session });

      // Step 3: Record reschedule history
      const rescheduleEntry = {
        previousSlotId: currentSlotId ? new mongoose.Types.ObjectId(currentSlotId) : null,
        previousDate: oldDateStr,
        newSlotId: newSlot._id,
        newDate: formatISTDate(newSlot.date),
        reason: reason?.trim() || "Rescheduled by Admin",
        rescheduledAt: new Date(),
        rescheduledBy: req.user?.name || "Admin",
      };

      booking.slotId = newSlot._id;
      booking.date = formatISTDate(newSlot.date);
      booking.isRescheduled = true;
      booking.rescheduledAt = new Date();
      booking.rescheduledFrom = oldDateStr;
      booking.rescheduleReason = reason?.trim() || "Rescheduled by Admin";

      if (!Array.isArray(booking.rescheduleHistory)) {
        booking.rescheduleHistory = [];
      }
      booking.rescheduleHistory.push(rescheduleEntry);

      // If target trip package updated
      if (newSlot.trip) {
        booking.trip = {
          title: newSlot.trip.title,
          location: newSlot.trip.location,
          duration: newSlot.trip.duration,
          price: String(newSlot.trip.price),
          image: newSlot.trip.image,
          description: newSlot.trip.description,
        };
      }

      await booking.save({ session });
      await session.commitTransaction();

      return res.json({
        success: true,
        message: `Booking successfully rescheduled to ${formatISTDate(newSlot.date)}`,
        booking,
        targetTripId: newSlot.trip?._id ? String(newSlot.trip._id) : (newSlot.trip ? String(newSlot.trip) : null),
        targetSlotId: String(newSlot._id),
      });
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      console.error("Reschedule failed:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to reschedule booking",
      });
    } finally {
      await session.endSession();
    }
  });

  /**
   * POST /admin/bookings/:id/cancel
   * Cancels a booking, releases its reserved seats, and updates booking status
   */
  router.post("/admin/bookings/:id/cancel", authMiddleware, adminMiddleware, async (req, res) => {
    const { reason = "Cancelled by admin", notes = "" } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid booking ID" });
    }

    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const booking = await Booking.findById(req.params.id).session(session);
      if (!booking) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: "Booking not found" });
      }

      if (booking.status === "Cancelled") {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "This booking is already cancelled",
        });
      }

      const travellersCount = Number(booking.travellers) || 1;

      // Release seats from the trip slot if assigned
      if (booking.slotId) {
        const slot = await TripSlot.findById(booking.slotId).session(session);
        if (slot) {
          slot.bookedSlots = Math.max(0, (slot.bookedSlots || 0) - travellersCount);
          await slot.save({ session });
        }
      }

      // Release coupon usage limit reservation if a coupon was used
      if (booking.couponCode) {
        await Coupon.updateOne(
          { code: booking.couponCode },
          { $inc: { usageCount: -1 } },
          { session }
        );
      }

      booking.status = "Cancelled";
      booking.cancelledAt = new Date();
      booking.cancellationReason = reason.trim();
      booking.cancellationNotes = notes.trim();

      await booking.save({ session });
      await session.commitTransaction();

      return res.json({
        success: true,
        message: `Booking ${formatBookingCode(booking)} cancelled successfully. ${travellersCount} seat(s) released.`,
        booking,
      });
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      console.error("Cancellation failed:", err);
      return res.status(500).json({
        success: false,
        message: err.message || "Failed to cancel booking",
      });
    } finally {
      await session.endSession();
    }
  });

  /**
   * DELETE /admin/bookings/:id
   * Permanently deletes a single booking and releases slot capacity if confirmed
   */
  router.delete("/admin/bookings/:id", authMiddleware, adminMiddleware, async (_req, res) => {
    return res.status(403).json({
      success: false,
      message: "Booking history cannot be deleted. Cancel or reschedule bookings instead.",
    });
  });

  /**
   * POST /admin/bookings/bulk-delete
   * Disabled to protect booking history and financial records.
   */
  router.post("/admin/bookings/bulk-delete", authMiddleware, adminMiddleware, async (_req, res) => {
    return res.status(403).json({
      success: false,
      message: "Booking history cannot be deleted. Cancel or reschedule bookings instead.",
    });
  });

  /**
   * POST /admin/bookings/purge-test
   * Destructive booking purge is disabled to protect financial audit and customer record integrity.
   * Super Admin authorization is strictly required. Unsafe heuristic deletion based on cancellation,
   * rescheduling, amounts, names, emails, or phone patterns has been permanently removed.
   */
  router.post("/admin/bookings/purge-test", authMiddleware, adminMiddleware, async (req, res) => {
    // Strictly require Super Admin authorization for any cleanup requests
    if (req.user?.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Super Admin authorization required for database cleanup operations.",
      });
    }

    // Endpoint is disabled to guarantee financial records and genuine customer bookings are never deleted
    return res.status(403).json({
      success: false,
      message: "Destructive booking purge is disabled. Legitimate customer records, cancelled bookings, and rescheduled bookings are protected under financial retention policies.",
    });
  });

  return router;
};

