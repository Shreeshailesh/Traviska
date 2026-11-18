// Admin dashboard aggregates.
// All numbers are computed from real Booking / Trip / TripSlot / PaymentIssue / Captain / TripExpense / CaptainPayout data.

const express = require("express");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");
const PaymentIssue = require("../models/PaymentIssue");
const Captain = require("../models/Captain");
const TripExpense = require("../models/TripExpense");
const CaptainPayout = require("../models/CaptainPayout");
const CaptainAssignment = require("../models/CaptainAssignment");
const { resetAllSampleData } = require("../utils/resetSampleData");

const TZ = "Asia/Kolkata";

// Format date in IST YYYY-MM-DD
const toISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

// Start of day in Asia/Kolkata (00:00:00.000+05:30) converted to UTC Date
const startOfISTDay = (dateStr) => {
  return new Date(`${dateStr}T00:00:00.000+05:30`);
};

// End of day in Asia/Kolkata (23:59:59.999+05:30) converted to UTC Date
const endOfISTDay = (dateStr) => {
  return new Date(`${dateStr}T23:59:59.999+05:30`);
};

// Subtract N calendar days in IST
const subtractDaysIST = (dateStr, days) => {
  const d = new Date(`${dateStr}T12:00:00.000+05:30`);
  d.setDate(d.getDate() - days);
  return toISTDateString(d);
};

// Normalize captain roles to the correct 3-tier hierarchy
const normalizeRole = (role) => {
  const r = String(role || "Head Captain").toLowerCase();
  if (r.includes("head") || r.includes("lead")) return "Head Captain";
  if (r.includes("main") || r.includes("assistant")) return "Main Captain";
  return "Trainee Captain";
};

// Same person across bookings: last 10 digits of phone, else lower-cased email
const customerKey = (b) => {
  const digits = String(b.phone || "").replace(/\D/g, "");
  if (digits.length >= 10) return `p:${digits.slice(-10)}`;
  const email = String(b.email || "").trim().toLowerCase();
  return email ? `e:${email}` : null;
};

/**
 * Revenue rule:
 *   sum of booking.amountPaid (falls back to booking.total for legacy rows)
 *   where paymentStatus === "Paid" AND status !== "Cancelled"
 *   AND the Razorpay orderId is not recorded as Refunded in PaymentIssue.
 */
const revenueOf = (b) =>
  Number.isFinite(Number(b.amountPaid)) && b.amountPaid !== undefined && b.amountPaid !== null
    ? Number(b.amountPaid)
    : Number(b.total) || 0;

module.exports = function adminDashboardRoutes({ authMiddleware, adminMiddleware }) {
  const router = express.Router();

  router.get("/admin/dashboard", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const todayIST = toISTDateString(now);

      const period = String(req.query.period || req.query.filter || "").toLowerCase().trim();
      let from;
      let to;

      if (period === "today") {
        from = startOfISTDay(todayIST);
        to = endOfISTDay(todayIST);
      } else if (period === "7days" || period === "week" || period === "last7days") {
        from = startOfISTDay(subtractDaysIST(todayIST, 6)); // 7 days total including today
        to = endOfISTDay(todayIST);
      } else if (period === "custom" && req.query.from && req.query.to) {
        from = startOfISTDay(req.query.from);
        to = endOfISTDay(req.query.to);
      } else if (req.query.from && req.query.to) {
        from = startOfISTDay(req.query.from);
        to = endOfISTDay(req.query.to);
      } else {
        // Default: Last 30 Days
        from = startOfISTDay(subtractDaysIST(todayIST, 29)); // 30 days total including today
        to = endOfISTDay(todayIST);
      }

      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        return res.status(400).json({ success: false, message: "Invalid date range parameters" });
      }

      // Prior comparison window of exact equal duration
      const spanMs = to.getTime() - from.getTime() + 1;
      const prevTo = new Date(from.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - spanMs + 1);

      const projection =
        "name email phone trip.title trip.location trip.image date travellers total amountPaid paymentStatus status bookingSource orderId createdAt slotId";

      const [
        allBookings,
        refunded,
        tripCount,
        allSlots,
        captains,
        pendingExpenses,
        allExpenses,
        pendingPayouts,
        allAssignments
      ] = await Promise.all([
        Booking.find({}, projection).sort({ createdAt: -1 }).lean(),
        PaymentIssue.find({ status: "Refunded" }, "orderId").lean(),
        Trip.countDocuments(),
        TripSlot.find({ isClosed: false })
          .populate("trip", "title location image")
          .populate("assignedCaptain", "name phone role")
          .sort({ date: 1 })
          .lean(),
        Captain.find().lean().catch(() => []),
        TripExpense.find({ status: "Pending" })
          .populate("captainId", "name phone role")
          .populate({ path: "slotId", populate: { path: "trip", select: "title location" } })
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => []),
        TripExpense.find()
          .populate("captainId", "name phone role")
          .populate({ path: "slotId", populate: { path: "trip", select: "title location" } })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean()
          .catch(() => []),
        CaptainPayout.find({ status: "Pending" })
          .populate("captainId", "name phone role")
          .populate({ path: "slotId", populate: { path: "trip", select: "title location" } })
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => []),
        CaptainAssignment.find()
          .populate("captainId", "name phone role")
          .populate("tripId", "title location")
          .populate("slotId", "date")
          .sort({ createdAt: -1 })
          .limit(15)
          .lean()
          .catch(() => [])
      ]);

      const refundedOrders = new Set(refunded.map((r) => r.orderId));
      const countsAsRevenue = (b) =>
        b.paymentStatus === "Paid" &&
        b.status !== "Cancelled" &&
        !(b.orderId && refundedOrders.has(b.orderId));

      const inRange = (d, a, z) => {
        const t = new Date(d).getTime();
        return t >= a.getTime() && t <= z.getTime();
      };

      const currentBookings = allBookings.filter((b) => inRange(b.createdAt, from, to));
      const previousBookings = allBookings.filter((b) => inRange(b.createdAt, prevFrom, prevTo));

      const summarize = (list) => {
        let revenue = 0;
        let paid = 0;
        let pending = 0;
        let cancelled = 0;
        let travellers = 0;
        for (const b of list) {
          if (b.status === "Cancelled") cancelled += 1;
          else if (b.paymentStatus === "Paid") paid += 1;
          else pending += 1;
          if (countsAsRevenue(b)) revenue += revenueOf(b);
          if (b.status !== "Cancelled") travellers += Number(b.travellers) || 0;
        }
        return { total: list.length, revenue, paid, pending, cancelled, travellers };
      };

      const cur = summarize(currentBookings);
      const prev = summarize(previousBookings);
      const pct = (a, b) => {
        if (!b || b === 0) return a > 0 ? 100 : 0;
        return Math.round(((a - b) / b) * 100);
      };

      // Customers (all-time de-duplicated, and period-specific de-duplicated)
      const allTimeCustomerSet = new Set();
      for (const b of allBookings) {
        const k = customerKey(b);
        if (k) allTimeCustomerSet.add(k);
      }

      const periodCustomerSet = new Set();
      for (const b of currentBookings) {
        const k = customerKey(b);
        if (k) periodCustomerSet.add(k);
      }

      // Departures calculation:
      // Active departures occurring within the selected period
      const departuresInPeriod = allSlots.filter((s) => {
        const d = new Date(s.date);
        return inRange(d, from, to) && !s.isClosed;
      });

      // Upcoming departures within the next 30 days from now
      const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const upcomingNext30 = allSlots.filter((s) => {
        const d = new Date(s.date);
        return d >= now && d <= in30Days && !s.isClosed;
      });

      // Unique trip packages with upcoming departures
      const tripsWithUpcoming = new Set(
        allSlots.filter((s) => new Date(s.date) >= now).map((s) => String(s.trip?._id || s.trip))
      ).size;

      // Captains snapshot
      const activeCaptainsCount = (captains || []).filter((c) => c.status === "Active").length;
      const totalCaptainsCount = (captains || []).length;

      // Pending Expense Claims (All-time snapshot and period submitted)
      const pendingExpensesAll = pendingExpenses || [];
      const expensePendingTotalAllTime = pendingExpensesAll.reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0
      );
      const pendingExpensesInPeriod = pendingExpensesAll.filter((e) =>
        inRange(e.createdAt, from, to)
      );
      const expensePendingTotalInPeriod = pendingExpensesInPeriod.reduce(
        (sum, e) => sum + (Number(e.amount) || 0),
        0
      );

      // Pending Captain Payouts (All-time snapshot and period submitted)
      const pendingPayoutsAll = pendingPayouts || [];
      const payoutPendingTotalAllTime = pendingPayoutsAll.reduce(
        (sum, p) => sum + (Number(p.balance !== undefined ? p.balance : p.amountPaid) || 0),
        0
      );
      const pendingPayoutsInPeriod = pendingPayoutsAll.filter((p) =>
        inRange(p.createdAt, from, to)
      );
      const payoutPendingTotalInPeriod = pendingPayoutsInPeriod.reduce(
        (sum, p) => sum + (Number(p.balance !== undefined ? p.balance : p.amountPaid) || 0),
        0
      );

      // Daily Trend in India Time
      const trendMap = new Map();
      const cursor = new Date(from);
      let dayGuard = 0;
      while (cursor <= to && dayGuard < 400) {
        const dKey = toISTDateString(cursor);
        const dayLabel = new Date(cursor).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          timeZone: TZ,
        });
        trendMap.set(dKey, { date: dKey, label: dayLabel, bookings: 0, revenue: 0 });
        cursor.setDate(cursor.getDate() + 1);
        dayGuard += 1;
      }

      for (const b of currentBookings) {
        const bKey = toISTDateString(new Date(b.createdAt));
        const row = trendMap.get(bKey);
        if (!row) continue;
        if (b.status !== "Cancelled") row.bookings += 1;
        if (countsAsRevenue(b)) row.revenue += revenueOf(b);
      }

      // Destination Breakdown in Range
      const destMap = new Map();
      for (const b of currentBookings) {
        if (b.status === "Cancelled") continue;
        const name = (b.trip?.location || b.trip?.title || "Other").trim() || "Other";
        destMap.set(name, (destMap.get(name) || 0) + 1);
      }
      const totalDestCount = [...destMap.values()].reduce((sum, v) => sum + v, 0);
      const destinations = [...destMap.entries()]
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalDestCount > 0 ? Math.round((count / totalDestCount) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // Upcoming departures list for display
      const upcomingDepartures = allSlots
        .filter((s) => new Date(s.date) >= now && !s.isClosed)
        .slice(0, 6)
        .map((s) => ({
          slotId: s._id,
          tripId: s.trip?._id || "",
          title: s.trip?.title || "Trip Package",
          location: s.trip?.location || "India",
          image: s.trip?.image || "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=400",
          date: s.date
            ? new Date(s.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: TZ,
              })
            : "TBD",
          bookedSlots: s.bookedSlots || 0,
          totalSlots: s.totalSlots || 24,
          captain: s.assignedCaptain ? { name: s.assignedCaptain.name, role: normalizeRole(s.assignedCaptain.role) } : null,
        }));

      // Recent bookings in range (or latest overall if range has none)
      const recentSource = currentBookings.length > 0 ? currentBookings : allBookings;
      const recentBookings = recentSource.slice(0, 6).map((b) => ({
        id: b._id,
        bookingCode: b.bookingCode || `TVK${String(b._id).slice(-4).toUpperCase()}`,
        customerName: b.name || "Customer",
        tripTitle: b.trip?.title || "Trip Package",
        amount: revenueOf(b),
        paymentStatus: b.paymentStatus || "Pending",
        bookingStatus: b.status || "Pending",
        createdAt: new Date(b.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: TZ,
        }),
      }));

      // Unified Pending Approvals & Settlements List
      const pendingApprovalsAndSettlements = [
        ...pendingExpensesAll.map((e) => ({
          id: `exp-${e._id}`,
          targetId: e._id,
          targetType: "expense",
          captainName: e.captainId?.name || "Captain",
          captainRole: normalizeRole(e.captainId?.role),
          tripTitle: e.slotId?.trip?.title || e.title || "On-Trip Operations",
          departureDate: e.slotId?.date
            ? new Date(e.slotId.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: TZ,
              })
            : "On-trip",
          claimType: e.category || "Expense Claim",
          description: e.title || e.description || "",
          amount: Number(e.amount) || 0,
          status: "Pending",
          submittedDate: e.createdAt,
          formattedDate: new Date(e.createdAt || Date.now()).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: TZ,
          }),
        })),
        ...pendingPayoutsAll.map((p) => ({
          id: `pay-${p._id}`,
          targetId: p._id,
          targetType: "payout",
          captainName: p.captainId?.name || "Captain",
          captainRole: normalizeRole(p.captainId?.role),
          tripTitle: p.slotId?.trip?.title || "Completed Departure",
          departureDate: p.slotId?.date
            ? new Date(p.slotId.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                timeZone: TZ,
              })
            : "Departure",
          claimType: "Captain Honorarium & Advance Settlement",
          description: `Base fee: ₹${p.tripFee || 0} • Advance: -₹${p.companyAdvance || 0}`,
          amount: Number(p.balance !== undefined ? p.balance : p.amountPaid) || 0,
          status: "Pending",
          submittedDate: p.createdAt,
          formattedDate: new Date(p.createdAt || Date.now()).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            timeZone: TZ,
          }),
        })),
      ].sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime());

      // Captain Activity Events
      const captainActivity = [
        ...allAssignments.map((a) => {
          const roleNormalized = normalizeRole(a.role);
          const isCancelled = a.status === "Cancelled";
          const isCompleted = a.status === "Completed";
          return {
            id: `asg-${a._id}`,
            targetId: a._id,
            type: "assignment",
            status: a.status || "Assigned",
            statusColor: isCancelled ? "#ef4444" : isCompleted ? "#15803d" : "#2563eb",
            title: `${a.captainId?.name || "Captain"} assigned as ${roleNormalized}`,
            subtitle: `${a.tripId?.title || "Trip Package"} (${a.status || "Assigned"})`,
            time: new Date(a.createdAt || a.assignedAt || Date.now()).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
              timeZone: TZ,
            }),
            targetUrl: `/admin/operations/assignments`,
          };
        }),
        ...allExpenses.map((e) => ({
          id: `exp-${e._id}`,
          targetId: e._id,
          type: "expense",
          status: e.status || "Pending",
          statusColor: e.status === "Approved" ? "#15803d" : e.status === "Rejected" ? "#ef4444" : "#f59e0b",
          title: `Expense logged: ${e.title || e.category}`,
          subtitle: `₹${Number(e.amount).toLocaleString("en-IN")} • ${e.captainId?.name || "Captain"}`,
          time: new Date(e.createdAt || Date.now()).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: TZ,
          }),
          targetUrl: `/admin/operations/expenses`,
        })),
      ]
        .sort((a, b) => (a.id < b.id ? 1 : -1))
        .slice(0, 6);

      return res.json({
        success: true,
        range: {
          period: period || "30days",
          from: from.toISOString(),
          to: to.toISOString(),
          timeZone: TZ,
          lastUpdated: new Date().toISOString(),
        },
        kpis: {
          // Period-based KPIs
          totalBookings: cur.total,
          totalBookingsChange: pct(cur.total, prev.total),
          revenue: cur.revenue,
          revenueChange: pct(cur.revenue, prev.revenue),
          paidBookings: cur.paid,
          pendingBookings: cur.pending,
          cancelledBookings: cur.cancelled,
          travellers: cur.travellers,
          periodCustomers: periodCustomerSet.size,
          activeDeparturesInPeriod: departuresInPeriod.length,

          // All-time & Snapshot KPIs
          totalCustomers: allTimeCustomerSet.size,
          tripPackages: tripCount,
          activeTripPackages: tripsWithUpcoming,
          upcomingDeparturesCount: upcomingNext30.length,
          activeCaptains: activeCaptainsCount,
          totalCaptains: totalCaptainsCount,

          // Pending Approvals & Settlements (All-time snapshot)
          pendingExpenseClaims: {
            count: pendingExpensesAll.length,
            totalAmount: expensePendingTotalAllTime,
            periodCount: pendingExpensesInPeriod.length,
            periodAmount: expensePendingTotalInPeriod,
          },
          outstandingPayouts: {
            count: pendingPayoutsAll.length,
            totalAmount: payoutPendingTotalAllTime,
            periodCount: pendingPayoutsInPeriod.length,
            periodAmount: payoutPendingTotalInPeriod,
          },
        },
        trend: [...trendMap.values()],
        destinations,
        upcomingDepartures,
        recentBookings,
        pendingApprovalsAndSettlements: pendingApprovalsAndSettlements.slice(0, 6),
        captainActivity,
      });
    } catch (err) {
      console.error("Dashboard aggregate failed:", err);
      return res.status(500).json({ success: false, message: "Failed to load dashboard data" });
    }
  });

  router.post("/admin/system/reset-sample-data", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const results = await resetAllSampleData();
      res.json({
        success: true,
        message: "All sample data has been reset successfully. Dashboard is clean and ready for real data.",
        results,
      });
    } catch (err) {
      console.error("Reset sample data error:", err);
      res.status(500).json({ success: false, message: "Failed to reset sample data: " + err.message });
    }
  });

  return router;
};

