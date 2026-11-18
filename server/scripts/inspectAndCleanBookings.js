const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const Booking = require("../models/Booking");
const TripSlot = require("../models/TripSlot");

async function run() {
  const isDeleteMode = process.argv.includes("--delete");

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected successfully.\n");

  const allBookings = await Booking.find({}).sort({ createdAt: -1 }).lean();
  console.log(`Total bookings found in DB: ${allBookings.length}`);

  const cancelledBookings = [];
  const rescheduledBookings = [];
  const testBookings = [];
  const validBookings = [];

  for (const b of allBookings) {
    const isCancelled = b.status === "Cancelled";
    const isRescheduled = Boolean(b.isRescheduled);
    const isTest =
      (b.total !== undefined && b.total < 100) ||
      (b.name && /test|dgsddgz|7777/i.test(b.name)) ||
      (b.email && /test|example/i.test(b.email)) ||
      (b.phone && (/^67890|^99999|^3526346642/.test(b.phone) || b.phone.length < 10));

    if (isCancelled) {
      cancelledBookings.push(b);
    } else if (isRescheduled) {
      rescheduledBookings.push(b);
    } else if (isTest) {
      testBookings.push(b);
    } else {
      validBookings.push(b);
    }
  }

  console.log("\n=================== BOOKINGS SUMMARY ===================");
  console.log(`• Cancelled Bookings: ${cancelledBookings.length}`);
  console.log(`• Rescheduled Bookings: ${rescheduledBookings.length}`);
  console.log(`• Test Bookings: ${testBookings.length}`);
  console.log(`• Other Active Bookings: ${validBookings.length}`);
  console.log("========================================================\n");

  console.log("--- CANCELLED BOOKINGS ---");
  cancelledBookings.forEach((b) => {
    console.log(`  [${b.bookingCode || b._id}] ${b.name} (${b.phone}) | ₹${b.total} | Slot: ${b.slotId} | Status: ${b.status}`);
  });

  console.log("\n--- RESCHEDULED BOOKINGS ---");
  rescheduledBookings.forEach((b) => {
    console.log(`  [${b.bookingCode || b._id}] ${b.name} (${b.phone}) | ₹${b.total} | Rescheduled: ${b.rescheduledFrom} -> ${b.date}`);
  });

  console.log("\n--- TEST BOOKINGS ---");
  testBookings.forEach((b) => {
    console.log(`  [${b.bookingCode || b._id}] ${b.name} (${b.phone}) | ₹${b.total} | Status: ${b.status}`);
  });

  console.log("\n--- REMAINING ACTIVE BOOKINGS ---");
  validBookings.forEach((b) => {
    console.log(`  [${b.bookingCode || b._id}] ${b.name} (${b.phone}) | ₹${b.total} | Date: ${b.date}`);
  });

  const toDelete = [...cancelledBookings, ...rescheduledBookings, ...testBookings];
  const toDeleteIds = toDelete.map((b) => b._id);

  if (isDeleteMode) {
    console.log(`\nDeleting ${toDeleteIds.length} target bookings...`);

    // For active/test bookings being deleted, release TripSlot bookedSlots count if needed
    for (const b of toDelete) {
      if (b.status === "Confirmed" && b.slotId && b.travellers) {
        try {
          await TripSlot.findByIdAndUpdate(b.slotId, {
            $inc: { bookedSlots: -Math.abs(b.travellers) },
          });
          // Ensure bookedSlots doesn't drop below 0
          await TripSlot.updateOne(
            { _id: b.slotId, bookedSlots: { $lt: 0 } },
            { $set: { bookedSlots: 0 } }
          );
        } catch (slotErr) {
          console.warn(`Could not adjust slot ${b.slotId}:`, slotErr.message);
        }
      }
    }

    const deleteResult = await Booking.deleteMany({ _id: { $in: toDeleteIds } });
    console.log(`✅ Successfully deleted ${deleteResult.deletedCount} bookings.`);
  } else {
    console.log(`\n[DRY RUN] Run with '--delete' to delete these ${toDeleteIds.length} bookings.`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

