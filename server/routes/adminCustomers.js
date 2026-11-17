const express = require("express");
const Booking = require("../models/Booking");
const User = require("../models/User");

module.exports = function adminCustomerRoutes({ authMiddleware, adminMiddleware }) {
  const router = express.Router();

  router.get("/admin/customers", authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const bookings = await Booking.find()
        .sort({ createdAt: -1 })
        .lean();

      // Group bookings by normalized phone (last 10 digits) or lowercase email
      const customerMap = new Map();

      for (const b of bookings) {
        const phoneDigits = String(b.phone || "").replace(/\D/g, "");
        const key = phoneDigits.length >= 10
          ? `p:${phoneDigits.slice(-10)}`
          : b.email ? `e:${b.email.trim().toLowerCase()}` : `id:${b._id}`;

        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: `CUS-${Math.abs(hashCode(key)).toString().slice(0, 5)}`,
            name: b.name || "Traveller",
            phone: b.phone || "",
            email: b.email || "",
            location: "Bengaluru, Karnataka",
            firstBookingDate: b.createdAt,
            bookings: [],
            totalBookings: 0,
            totalTravellers: 0,
            destinations: new Set(),
            hasPending: false,
          });
        }

        const c = customerMap.get(key);
        c.bookings.push({
          id: b._id,
          bookingCode: b.bookingCode || `TVK${b._id.toString().slice(-4).toUpperCase()}`,
          tripTitle: b.trip?.title || "Custom Trip",
          tripLocation: b.trip?.location || "",
          tripImage: b.trip?.image || "https://images.unsplash.com/photo-1596401057633-54a8fe8ef647?w=400",
          date: b.date || "Upcoming",
          amount: b.total || 0,
          paymentStatus: b.paymentStatus || "Pending",
          status: b.status || "Pending",
          travellers: b.travellers || 1,
          travellerDetails: b.travellerDetails || [],
          createdAt: b.createdAt,
        });

        c.totalBookings += 1;
        c.totalTravellers += Number(b.travellers) || 1;
        if (b.trip?.title) c.destinations.add(b.trip.title);
        if (b.paymentStatus === "Pending") c.hasPending = true;
      }

      const customerList = Array.from(customerMap.values()).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        location: c.location,
        totalBookings: c.totalBookings,
        totalTravellers: c.totalTravellers,
        destinationsCount: c.destinations.size,
        lastTrip: c.bookings[0]?.tripTitle ? `${c.bookings[0].tripTitle} (${c.bookings[0].date})` : "N/A",
        paymentStatus: c.hasPending ? "Pending" : "Paid",
        bookings: c.bookings,
      }));

      const totalCustomers = customerList.length;
      const customersWithBookings = customerList.filter((c) => c.totalBookings > 0).length;
      const totalTravellers = customerList.reduce((acc, c) => acc + c.totalTravellers, 0);
      const repeatCustomers = customerList.filter((c) => c.totalBookings > 1).length;

      res.json({
        success: true,
        stats: {
          totalCustomers,
          customersWithBookings,
          totalTravellers,
          repeatCustomers,
          repeatPercentage: totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : 0,
        },
        customers: customerList,
      });
    } catch (err) {
      console.error("Failed to fetch admin customers:", err);
      res.status(500).json({ success: false, message: "Failed to fetch customers" });
    }
  });

  return router;
};

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

