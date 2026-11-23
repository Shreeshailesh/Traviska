/**
 * Read-Only MongoDB Seat Inventory & Booking Reconciliation Audit
 * Inspects TripSlot.bookedSlots vs Confirmed Booking.travellers without modifying any record.
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Booking = require("../models/Booking");
const TripSlot = require("../models/TripSlot");

async function runReadOnlyAudit() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGO_URI / MONGODB_URI is not configured.");
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

  const [slots, bookings] = await Promise.all([
    TripSlot.find({}).populate("trip", "title").lean(),
    Booking.find({}).lean(),
  ]);

  const confirmedBySlot = new Map();
  const orphanedBookings = [];
  const statusInconsistencies = [];

  const slotIdSet = new Set(slots.map((s) => String(s._id)));

  for (const b of bookings) {
    const sid = b.slotId ? String(b.slotId) : null;
    if (!sid || !slotIdSet.has(sid)) {
      orphanedBookings.push({
        bookingId: String(b._id),
        bookingCode: b.bookingCode || "",
        status: b.status,
        slotId: sid,
      });
    }
    if (b.status === "Confirmed") {
      const pax = Number(b.travellers) || 1;
      confirmedBySlot.set(sid, (confirmedBySlot.get(sid) || 0) + pax);
    }
    if (b.status === "Cancelled" && !b.cancelledAt) {
      statusInconsistencies.push({
        bookingId: String(b._id),
        issue: "Cancelled booking missing cancelledAt timestamp",
      });
    }
  }

  const slotDiscrepancies = [];
  for (const s of slots) {
    const sid = String(s._id);
    const expectedBooked = confirmedBySlot.get(sid) || 0;
    const actualBooked = Number(s.bookedSlots) || 0;
    const overCapacity = actualBooked > Number(s.totalSlots || 0);
    const negativeBooked = actualBooked < 0;

    if (expectedBooked !== actualBooked || overCapacity || negativeBooked) {
      slotDiscrepancies.push({
        slotId: sid,
        tripTitle: s.trip?.title || "Unknown Trip",
        date: s.date,
        totalSlots: s.totalSlots,
        recordedBookedSlots: actualBooked,
        expectedBookedFromConfirmedBookings: expectedBooked,
        delta: expectedBooked - actualBooked,
        overCapacity,
        negativeBooked,
      });
    }
  }

  const report = {
    auditedAt: new Date().toISOString(),
    totalSlotsChecked: slots.length,
    totalBookingsChecked: bookings.length,
    slotDiscrepancyCount: slotDiscrepancies.length,
    orphanedBookingCount: orphanedBookings.length,
    statusInconsistencyCount: statusInconsistencies.length,
    slotDiscrepancies,
    orphanedBookings,
    statusInconsistencies,
  };

  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
}

runReadOnlyAudit().catch((err) => {
  console.error("Read-only reconciliation audit failed:", err.message);
  process.exit(1);
});
