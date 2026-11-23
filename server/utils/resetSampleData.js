const Booking = require("../models/Booking");
const BookingRequest = require("../models/BookingRequest");
const NotificationOutbox = require("../models/NotificationOutbox");
const TripExpense = require("../models/TripExpense");
const CaptainPayout = require("../models/CaptainPayout");
const CaptainAssignment = require("../models/CaptainAssignment");
const Captain = require("../models/Captain");
const Attendance = require("../models/Attendance");
const PaymentIssue = require("../models/PaymentIssue");
const TripSlot = require("../models/TripSlot");
const Trip = require("../models/Trip");

async function resetAllSampleData() {
  const results = {};

  // 1. Delete all sample / test bookings, booking requests, and notification outbox entries
  const bookingsRes = await Booking.deleteMany({});
  results.bookingsDeleted = bookingsRes.deletedCount;

  const requestsRes = await BookingRequest.deleteMany({});
  results.bookingRequestsDeleted = requestsRes.deletedCount;

  const outboxRes = await NotificationOutbox.deleteMany({});
  results.notificationOutboxDeleted = outboxRes.deletedCount;

  // 2. Delete all sample trip expenses
  const expensesRes = await TripExpense.deleteMany({});
  results.expensesDeleted = expensesRes.deletedCount;

  // 3. Delete all sample captain payouts
  const payoutsRes = await CaptainPayout.deleteMany({});
  results.payoutsDeleted = payoutsRes.deletedCount;

  // 4. Delete all sample captain assignments
  const assignmentsRes = await CaptainAssignment.deleteMany({});
  results.assignmentsDeleted = assignmentsRes.deletedCount;

  // 5. Delete all attendances
  const attendanceRes = await Attendance.deleteMany({});
  results.attendanceDeleted = attendanceRes.deletedCount;

  // 6. Delete all payment issues
  const paymentIssuesRes = await PaymentIssue.deleteMany({});
  results.paymentIssuesDeleted = paymentIssuesRes.deletedCount;

  // 7. Delete all sample captains
  const captainsRes = await Captain.deleteMany({});
  results.captainsDeleted = captainsRes.deletedCount;

  // 8. Clean up TripSlots:
  // - Find existing real trips
  const existingTrips = await Trip.find({}, "_id").lean();
  const validTripIds = existingTrips.map((t) => t._id);

  // - Delete orphaned departure slots (where trip is null, missing, or points to non-existent trip)
  const orphanSlotsRes = await TripSlot.deleteMany({
    $or: [
      { trip: { $nin: validTripIds } },
      { trip: null },
      { trip: { $exists: false } },
    ],
  });
  results.orphanSlotsDeleted = orphanSlotsRes.deletedCount;

  // - Reset booked seats and captains on any remaining real trip departures
  const remainingSlotsRes = await TripSlot.updateMany(
    {},
    {
      $set: {
        bookedSlots: 0,
        assignedCaptain: null,
        assignedCaptains: [],
        captainAssigned: false,
        photoDriveLink: "",
        billDriveLink: "",
        whatsappGroupLink: "",
        status: "Scheduled",
      },
    }
  );
  results.slotsReset = remainingSlotsRes.modifiedCount;

  return results;
}

module.exports = { resetAllSampleData };

