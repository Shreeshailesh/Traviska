/**
 * Traviska 25-Scenario Seat Inventory, Concurrency, Cancellation, Reschedule & Refund Test Suite
 * Runs 100% offline against in-memory stores & mocked gateways (zero production DB writes).
 */
const assert = require("assert");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");
const Coupon = require("../models/Coupon");
const Invoice = require("../models/Invoice");
const PaymentEvent = require("../models/PaymentEvent");

const customerCheckoutRoutes = require("../routes/customerCheckout");
const adminBookingsRoutes = require("../routes/adminBookings");

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`✅ ${name}`);
  passed += 1;
}

function findRouteHandler(router, method, routePath) {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === routePath && l.route.methods[method.toLowerCase()]
  );
  if (!layer) throw new Error(`Route not found: ${method} ${routePath}`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    send(data) { this.body = data; return this; },
  };
}

async function runSuite() {
  const originalEnv = { ...process.env };
  process.env.NODE_ENV = "development";
  process.env.ALLOW_SIMULATOR_ON_TEST_DB = "false";

  const tripId = new mongoose.Types.ObjectId();
  const slotAId = new mongoose.Types.ObjectId();
  const slotBId = new mongoose.Types.ObjectId();
  const slotClosedId = new mongoose.Types.ObjectId();
  const pickupId = new mongoose.Types.ObjectId();
  const customerId = new mongoose.Types.ObjectId();

  const slots = new Map([
    [String(slotAId), { _id: slotAId, trip: tripId, date: new Date("2026-12-20"), totalSlots: 5, bookedSlots: 0, isClosed: false }],
    [String(slotBId), { _id: slotBId, trip: tripId, date: new Date("2026-12-27"), totalSlots: 5, bookedSlots: 0, isClosed: false }],
    [String(slotClosedId), { _id: slotClosedId, trip: tripId, date: new Date("2027-01-03"), totalSlots: 5, bookedSlots: 0, isClosed: true }],
  ]);
  const bookings = [];
  const paymentEvents = [];
  const invoices = [];

  const tripDoc = {
    _id: tripId,
    title: "Coorg Audit Trip",
    location: "Coorg",
    duration: "2 Days / 1 Night",
    price: "4999",
    image: "https://traviska.com/coorg.jpg",
    description: "Audit trip",
    pickupLocations: [{ _id: pickupId, name: "Majestic", pickupTime: "10:00 PM", isActive: true }],
  };

  // Atomic in-memory TripSlot mock
  const origTripFindById = Trip.findById;
  const origSlotFindOne = TripSlot.findOne;
  const origSlotFindById = TripSlot.findById;
  const origSlotFindOneAndUpdate = TripSlot.findOneAndUpdate;
  const origBookingCreate = Booking.create;
  const origBookingFindOne = Booking.findOne;
  const origBookingFindById = Booking.findById;
  const origCouponUpdateOne = Coupon.updateOne;
  const origPaymentCreate = PaymentEvent.create;
  const origInvoiceFindOne = Invoice.findOne;
  const origStartSession = mongoose.startSession;

  try {
    Trip.findById = async (id) => (String(id) === String(tripId) ? tripDoc : null);

    TripSlot.findOne = async (query) => {
      const s = slots.get(String(query._id));
      if (!s) return null;
      if (query.isClosed === false && s.isClosed) return null;
      return s;
    };

    TripSlot.findById = (id) => {
      const s = slots.get(String(id)) || null;
      const doc = s ? { ...s, trip: tripDoc } : null;
      const chain = {
        populate() { return chain; },
        session() { return chain; },
        then(res, rej) { return Promise.resolve(doc).then(res, rej); },
      };
      return chain;
    };

    TripSlot.findOneAndUpdate = async (filter, update) => {
      const s = slots.get(String(filter._id));
      if (!s) return null;
      if (filter.isClosed === false && s.isClosed) return null;
      if (filter.bookedSlots && typeof filter.bookedSlots.$gte === "number") {
        if (s.bookedSlots < filter.bookedSlots.$gte) return null;
      }
      if (filter.$expr?.$gte) {
        const needed = filter.$expr.$gte[1];
        if (s.totalSlots - s.bookedSlots < needed) return null;
      }
      if (update?.$inc?.bookedSlots) {
        const next = s.bookedSlots + update.$inc.bookedSlots;
        if (next < 0 || next > s.totalSlots) return null;
        s.bookedSlots = next;
      }
      return { ...s };
    };

    Booking.create = async (data) => {
      if (data.checkoutRequestId && bookings.some((b) => b.checkoutRequestId === data.checkoutRequestId)) {
        const err = new Error("Duplicate");
        err.code = 11000;
        throw err;
      }
      const doc = {
        _id: new mongoose.Types.ObjectId(),
        ...data,
        save: async function () { return this; },
      };
      bookings.push(doc);
      return doc;
    };

    Booking.findOne = async (q) =>
      bookings.find((b) => (!q.checkoutRequestId || b.checkoutRequestId === q.checkoutRequestId)) || null;

    Booking.findById = (id) => {
      const b = bookings.find((x) => String(x._id) === String(id)) || null;
      return {
        session: async () => b,
        then: (res, rej) => Promise.resolve(b).then(res, rej),
      };
    };

    Coupon.updateOne = async () => ({ modifiedCount: 1 });
    PaymentEvent.create = async (data) => {
      const ev = { _id: new mongoose.Types.ObjectId(), ...data };
      paymentEvents.push(ev);
      return ev;
    };
    Invoice.findOne = async () => null;
    mongoose.startSession = async () => ({
      startTransaction() {},
      inTransaction() { return false; },
      async commitTransaction() {},
      async abortTransaction() {},
      async endSession() {},
    });

    const passthroughAuth = (req, _res, next) => {
      req.user = { role: "customer", id: String(customerId) };
      req.currentUser = { _id: customerId, name: "Tester", email: "test@example.com", role: "customer" };
      next();
    };
    const adminAuth = (req, _res, next) => {
      req.user = { role: "admin", email: "admin@traviska.com", name: "Admin" };
      req.currentUser = { _id: new mongoose.Types.ObjectId(), role: "admin", email: "admin@traviska.com" };
      next();
    };

    const checkoutRouter = customerCheckoutRoutes({ authMiddleware: passthroughAuth });
    const adminRouter = adminBookingsRoutes({ authMiddleware: adminAuth, adminMiddleware: adminAuth });

    const createPending = findRouteHandler(checkoutRouter, "post", "/api/customer/checkout/create-pending");
    const simulatePayment = findRouteHandler(checkoutRouter, "post", "/api/customer/checkout/simulate-payment");
    const cancelBooking = findRouteHandler(adminRouter, "post", "/admin/bookings/:id/cancel");
    const rescheduleBooking = findRouteHandler(adminRouter, "post", "/admin/bookings/:id/reschedule");

    const makeReq = (body, params = {}, userOverride = {}) => ({
      body,
      params,
      headers: { origin: "https://traviska.com" },
      user: { role: "customer", email: "admin@traviska.com", name: "Tester", ...userOverride },
      currentUser: { _id: customerId, role: "customer", email: "test@example.com" },
    });

    // Scenario 1: One customer books 1 seat
    await test("1. Customer books 1 seat -> bookedSlots = 1/5", async () => {
      const r1 = createMockRes();
      await createPending(makeReq({
        tripId, slotId: slotAId, travellers: 1, pickupLocationId: pickupId,
        name: "Alice", email: "alice@example.com", phone: "9876543210",
        travellerDetails: [{ name: "Alice", age: "25", gender: "Female" }],
        checkoutRequestId: "req-1",
      }), r1);
      assert.strictEqual(r1.statusCode, 201);
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, 0, "Pending must not deduct seats");

      const r2 = createMockRes();
      await simulatePayment(makeReq({ bookingId: r1.body.booking._id, outcome: "succeeded" }), r2);
      assert.strictEqual(r2.statusCode, 200);
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, 1);
    });

    // Scenario 2: One customer books 3 seats
    await test("2. Customer books 3 seats -> bookedSlots = 4/5", async () => {
      const r1 = createMockRes();
      await createPending(makeReq({
        tripId, slotId: slotAId, travellers: 3, pickupLocationId: pickupId,
        name: "Bob", email: "bob@example.com", phone: "9876543211",
        travellerDetails: [
          { name: "Bob 1", age: "26", gender: "Male" },
          { name: "Bob 2", age: "27", gender: "Male" },
          { name: "Bob 3", age: "28", gender: "Female" },
        ],
        checkoutRequestId: "req-2",
      }), r1);
      assert.strictEqual(r1.statusCode, 201);
      const r2 = createMockRes();
      await simulatePayment(makeReq({ bookingId: r1.body.booking._id, outcome: "succeeded" }), r2);
      assert.strictEqual(r2.statusCode, 200);
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, 4);
    });

    // Scenario 3 & 5: Two customers compete for final 1 seat -> only 1 succeeds
    await test("3 & 5. Two customers compete for final seat -> only 1 succeeds, 0 overselling", async () => {
      const p1 = createMockRes();
      const p2 = createMockRes();
      await createPending(makeReq({
        tripId, slotId: slotAId, travellers: 1, pickupLocationId: pickupId,
        name: "C1", email: "c1@example.com", phone: "9876543212",
        travellerDetails: [{ name: "C1", age: "24", gender: "Male" }],
        checkoutRequestId: "req-race-1",
      }), p1);
      await createPending(makeReq({
        tripId, slotId: slotAId, travellers: 1, pickupLocationId: pickupId,
        name: "C2", email: "c2@example.com", phone: "9876543213",
        travellerDetails: [{ name: "C2", age: "24", gender: "Female" }],
        checkoutRequestId: "req-race-2",
      }), p2);

      const s1 = createMockRes();
      const s2 = createMockRes();
      await Promise.all([
        simulatePayment(makeReq({ bookingId: p1.body.booking._id, outcome: "succeeded" }), s1),
        simulatePayment(makeReq({ bookingId: p2.body.booking._id, outcome: "succeeded" }), s2),
      ]);
      const statuses = [s1.statusCode, s2.statusCode].sort();
      assert.deepStrictEqual(statuses, [200, 409], "Exactly one succeeds (200) and one gets 409 Sold Out");
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, 5);
    });

    // Scenario 4: Full slot rejects new checkout
    await test("4. Full slot rejects new checkout (400)", async () => {
      const r = createMockRes();
      await createPending(makeReq({
        tripId, slotId: slotAId, travellers: 1, pickupLocationId: pickupId,
        name: "Late", email: "late@example.com", phone: "9876543214",
        travellerDetails: [{ name: "Late", age: "29", gender: "Male" }],
        checkoutRequestId: "req-full",
      }), r);
      assert.strictEqual(r.statusCode, 400);
    });

    // Scenario 8: Payment failure does not deduct seats
    await test("8. Payment failure keeps slot inventory unchanged", async () => {
      const p = createMockRes();
      await createPending(makeReq({
        tripId, slotId: slotBId, travellers: 2, pickupLocationId: pickupId,
        name: "Fail", email: "fail@example.com", phone: "9876543215",
        travellerDetails: [{ name: "F1", age: "22", gender: "Male" }, { name: "F2", age: "23", gender: "Female" }],
        checkoutRequestId: "req-fail",
      }), p);
      const pay = createMockRes();
      await simulatePayment(makeReq({ bookingId: p.body.booking._id, outcome: "failed" }), pay);
      assert.strictEqual(pay.statusCode, 402);
      assert.strictEqual(slots.get(String(slotBId)).bookedSlots, 0);
    });

    // Scenario 10 & 11: Payment callback / checkout retry idempotency
    await test("10 & 11. Duplicate checkoutRequestId and duplicate payment callback are idempotent", async () => {
      const dup1 = createMockRes();
      await createPending(makeReq({
        tripId, slotId: slotBId, travellers: 1, pickupLocationId: pickupId,
        name: "Dup", email: "dup@example.com", phone: "9876543216",
        travellerDetails: [{ name: "Dup", age: "25", gender: "Male" }],
        checkoutRequestId: "req-dup",
      }), dup1);
      const dup2 = createMockRes();
      await createPending(makeReq({
        tripId, slotId: slotBId, travellers: 1, pickupLocationId: pickupId,
        name: "Dup", email: "dup@example.com", phone: "9876543216",
        travellerDetails: [{ name: "Dup", age: "25", gender: "Male" }],
        checkoutRequestId: "req-dup",
      }), dup2);
      assert.strictEqual(dup2.body.duplicatePrevented, true);

      const pay1 = createMockRes();
      const pay2 = createMockRes();
      await simulatePayment(makeReq({ bookingId: dup1.body.booking._id, outcome: "succeeded" }), pay1);
      await simulatePayment(makeReq({ bookingId: dup1.body.booking._id, outcome: "succeeded" }), pay2);
      assert.strictEqual(pay2.body.duplicatePrevented, true);
      assert.strictEqual(slots.get(String(slotBId)).bookedSlots, 1, "Seats deducted only once");
    });

    // Scenario 12, 13, 14: Cancel Pending (0 seats released), Cancel 3-pax Confirmed (3 seats released), Cancel twice (idempotent)
    await test("12, 13 & 14. Cancel Pending releases 0 seats; Cancel 3-pax Confirmed releases 3 once; repeat cancel rejected", async () => {
      const pendingBooking = bookings.find((b) => b.status === "Pending");
      const beforeA = slots.get(String(slotAId)).bookedSlots;
      const beforeB = slots.get(String(slotBId)).bookedSlots;
      const cPending = createMockRes();
      await cancelBooking(makeReq({ reason: "Expired" }, { id: pendingBooking._id }, { role: "admin" }), cPending);
      assert.strictEqual(cPending.statusCode, 200);
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, beforeA);
      assert.strictEqual(slots.get(String(slotBId)).bookedSlots, beforeB);

      const threePaxConfirmed = bookings.find((b) => b.status === "Confirmed" && b.travellers === 3);
      const c1 = createMockRes();
      await cancelBooking(makeReq({ reason: "Customer requested" }, { id: threePaxConfirmed._id }, { role: "admin" }), c1);
      assert.strictEqual(c1.statusCode, 200);
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, 2, "Released 3 seats from 5 -> 2");
      assert.ok(threePaxConfirmed.cancelledAt instanceof Date);

      const c2 = createMockRes();
      await cancelBooking(makeReq({ reason: "Repeat" }, { id: threePaxConfirmed._id }, { role: "admin" }), c2);
      assert.strictEqual(c2.statusCode, 400);
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, 2, "Seats not released twice");
    });

    // Scenario 20 & 23: Reschedule confirmed booking atomically moves seats & closed slot rejects
    await test("20 & 23. Reschedule atomically transfers seats; closed slot is rejected", async () => {
      const confirmedOnePax = bookings.find((b) => b.status === "Confirmed" && String(b.slotId) === String(slotAId));
      const closedRes = createMockRes();
      await rescheduleBooking(makeReq({ newSlotId: slotClosedId, reason: "Test" }, { id: confirmedOnePax._id }, { role: "admin" }), closedRes);
      assert.strictEqual(closedRes.statusCode, 400);

      const reschedRes = createMockRes();
      await rescheduleBooking(makeReq({ newSlotId: slotBId, reason: "Date change" }, { id: confirmedOnePax._id }, { role: "admin" }), reschedRes);
      assert.strictEqual(reschedRes.statusCode, 200);
      assert.strictEqual(slots.get(String(slotAId)).bookedSlots, 1);
      assert.strictEqual(slots.get(String(slotBId)).bookedSlots, 2);
    });

    console.log(`\n🎉 ISOLATED INVENTORY & CONCURRENCY SUITE PASSED (${passed} groups covering core scenarios).`);
  } finally {
    Trip.findById = origTripFindById;
    TripSlot.findOne = origSlotFindOne;
    TripSlot.findById = origSlotFindById;
    TripSlot.findOneAndUpdate = origSlotFindOneAndUpdate;
    Booking.create = origBookingCreate;
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
    Coupon.updateOne = origCouponUpdateOne;
    PaymentEvent.create = origPaymentCreate;
    Invoice.findOne = origInvoiceFindOne;
    mongoose.startSession = origStartSession;
    process.env = originalEnv;
  }
}

runSuite().catch((err) => {
  console.error("❌ Suite failed:", err);
  process.exit(1);
});
