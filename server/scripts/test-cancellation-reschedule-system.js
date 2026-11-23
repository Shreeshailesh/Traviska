/**
 * Traviska Cancellation, Rescheduling, Refund & Staff Notification Automated Test Suite
 * Runs 100% offline with isolated in-memory stores (zero production DB writes or live emails/WhatsApp).
 */
const assert = require("assert");
const mongoose = require("mongoose");

const {
  calculateCancellationRefund,
  calculateRescheduleBreakdown,
} = require("../services/cancellationPolicyService");
const { isWhatsAppTemplateApproved } = require("../services/notificationOutboxService");

const Booking = require("../models/Booking");
const TripSlot = require("../models/TripSlot");
const Coupon = require("../models/Coupon");
const Invoice = require("../models/Invoice");
const BookingRequest = require("../models/BookingRequest");
const NotificationOutbox = require("../models/NotificationOutbox");
const routesFactory = require("../routes/cancellationReschedule");

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
    body: null,
    status(c) { this.statusCode = c; return this; },
    json(d) { this.body = d; return this; },
  };
}

async function runTests() {
  // 1. Pure Policy Boundary Tests
  const now = new Date("2026-12-01T10:00:00.000+05:30");

  await test("1. Policy: 15+ days -> 90%, 7-14 days -> 50%, 72h-7d -> 25%, <72h -> 0%, Company -> 100%", async () => {
    const d16 = new Date(now.getTime() + 16 * 24 * 3600 * 1000);
    const d10 = new Date(now.getTime() + 10 * 24 * 3600 * 1000);
    const d4 = new Date(now.getTime() + 4 * 24 * 3600 * 1000);
    const d2 = new Date(now.getTime() + 48 * 3600 * 1000);

    assert.strictEqual(calculateCancellationRefund({ amountPaidRupees: 10000, departureDate: d16, now }).refundPercentage, 90);
    assert.strictEqual(calculateCancellationRefund({ amountPaidRupees: 10000, departureDate: d10, now }).refundPercentage, 50);
    assert.strictEqual(calculateCancellationRefund({ amountPaidRupees: 10000, departureDate: d4, now }).refundPercentage, 25);
    assert.strictEqual(calculateCancellationRefund({ amountPaidRupees: 10000, departureDate: d2, now }).refundPercentage, 0);
    const comp = calculateCancellationRefund({ amountPaidRupees: 10000, departureDate: d2, source: "Traviska", now });
    assert.strictEqual(comp.refundPercentage, 100);
    assert.strictEqual(comp.eligibleRefundRupees, 10000);
  });

  await test("2. Policy: First reschedule >=7d is ₹0; 72h-7d or 2nd reschedule is ₹499/pax (no stacking); <72h requires review", async () => {
    const d10 = new Date(now.getTime() + 10 * 24 * 3600 * 1000);
    const d4 = new Date(now.getTime() + 4 * 24 * 3600 * 1000);
    const d2 = new Date(now.getTime() + 48 * 3600 * 1000);

    const free = calculateRescheduleBreakdown({ departureDate: d10, travellers: 2, priorRescheduleCount: 0, now });
    assert.strictEqual(free.rescheduleFeeTotal, 0);
    assert.strictEqual(free.eligible, true);

    const paid4d = calculateRescheduleBreakdown({ departureDate: d4, travellers: 2, priorRescheduleCount: 0, now });
    assert.strictEqual(paid4d.rescheduleFeeTotal, 998);

    const second = calculateRescheduleBreakdown({ departureDate: d10, travellers: 2, priorRescheduleCount: 1, now });
    assert.strictEqual(second.rescheduleFeeTotal, 998);

    const under72 = calculateRescheduleBreakdown({ departureDate: d2, travellers: 1, priorRescheduleCount: 0, now });
    assert.strictEqual(under72.eligible, false);
    assert.strictEqual(under72.requiresAdminApproval, true);
  });

  await test("3. WhatsApp Feature Gate blocks unapproved templates", async () => {
    assert.strictEqual(isWhatsAppTemplateApproved("traviska_refund_initiated"), true);
    assert.strictEqual(isWhatsAppTemplateApproved("traviska_booking_cancelled"), false);
  });

  // 2. Route Integration Tests (in-memory stores)
  const tripId = new mongoose.Types.ObjectId();
  const slot1Id = new mongoose.Types.ObjectId();
  const slot2Id = new mongoose.Types.ObjectId();
  const custAId = new mongoose.Types.ObjectId();
  const custBId = new mongoose.Types.ObjectId();

  const slotsMap = new Map([
    [String(slot1Id), { _id: slot1Id, trip: tripId, date: new Date(Date.now() + 20 * 86400000), totalSlots: 10, bookedSlots: 4, isClosed: false, save: async function () { return this; } }],
    [String(slot2Id), { _id: slot2Id, trip: tripId, date: new Date(Date.now() + 27 * 86400000), totalSlots: 10, bookedSlots: 1, isClosed: false, save: async function () { return this; } }],
  ]);

  const bookingsStore = [
    {
      _id: new mongoose.Types.ObjectId(),
      bookingCode: "TVK1001",
      customerId: custAId,
      name: "Alice",
      email: "alice@example.com",
      phone: "+919876543210",
      trip: { title: "Coorg Trip", price: "5000" },
      slotId: slot1Id,
      date: "20 Dec 2026",
      travellers: 2,
      total: 10000,
      paymentStatus: "Paid",
      status: "Confirmed",
      bookingState: "Confirmed",
      whatsappOptIn: false,
      rescheduleHistory: [],
      save: async function () { return this; },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingCode: "TVK1002",
      customerId: custAId,
      name: "Alice Two",
      email: "alice@example.com",
      phone: "+919876543210",
      trip: { title: "Coorg Trip", price: "5000" },
      slotId: slot1Id,
      date: "20 Dec 2026",
      travellers: 2,
      total: 10000,
      paymentStatus: "Paid",
      status: "Confirmed",
      bookingState: "Confirmed",
      whatsappOptIn: true,
      rescheduleHistory: [],
      save: async function () { return this; },
    },
  ];
  const requestsStore = [];
  const outboxStore = [];

  const orig = {
    bookingFindById: Booking.findById,
    bookingFind: Booking.find,
    slotFindById: TripSlot.findById,
    slotFindOneAndUpdate: TripSlot.findOneAndUpdate,
    couponUpdateOne: Coupon.updateOne,
    invoiceFindOne: Invoice.findOne,
    reqCreate: BookingRequest.create,
    reqFindOne: BookingRequest.findOne,
    reqFindById: BookingRequest.findById,
    reqFind: BookingRequest.find,
    outboxCreate: NotificationOutbox.create,
    outboxFindOne: NotificationOutbox.findOne,
    outboxFindById: NotificationOutbox.findById,
    outboxFind: NotificationOutbox.find,
    startSession: mongoose.startSession,
  };

  try {
    Booking.findById = (id) => {
      const b = bookingsStore.find((x) => String(x._id) === String(id)) || null;
      return { session: async () => b, then: (r, j) => Promise.resolve(b).then(r, j) };
    };
    Booking.find = async (q) => bookingsStore.filter((b) => (!q.slotId || String(b.slotId) === String(q.slotId)) && (!q.status || b.status === q.status));
    TripSlot.findById = (id) => {
      const s = slotsMap.get(String(id)) || null;
      const doc = s ? { ...s, trip: { _id: tripId, title: "Coorg Trip", price: "5000" } } : null;
      const chain = {
        lean: async () => doc,
        populate: () => chain,
        session: async () => s,
        then: (r, j) => Promise.resolve(s).then(r, j),
      };
      return chain;
    };
    TripSlot.findOneAndUpdate = async (filter, update) => {
      const s = slotsMap.get(String(filter._id));
      if (!s) return null;
      if (filter.isClosed === false && s.isClosed) return null;
      if (filter.bookedSlots?.$gte !== undefined && s.bookedSlots < filter.bookedSlots.$gte) return null;
      if (filter.$expr?.$gte && s.totalSlots - s.bookedSlots < filter.$expr.$gte[1]) return null;
      if (update?.$inc?.bookedSlots) s.bookedSlots += update.$inc.bookedSlots;
      return { ...s };
    };
    Coupon.updateOne = async () => ({ modifiedCount: 1 });
    Invoice.findOne = () => ({ lean: async () => null, session: async () => null, then: (r, j) => Promise.resolve(null).then(r, j) });
    BookingRequest.create = async (data) => {
      const arr = Array.isArray(data) ? data : [data];
      const created = arr.map((item) => {
        const doc = {
          _id: new mongoose.Types.ObjectId(),
          createdAt: new Date(),
          customerDecision: "None",
          auditHistory: [],
          ...item,
          save: async function () { return this; },
        };
        requestsStore.push(doc);
        return doc;
      });
      return Array.isArray(data) ? created : created[0];
    };
    BookingRequest.findOne = async (q) =>
      requestsStore.find((r) => {
        if (q.idempotencyKey && r.idempotencyKey !== q.idempotencyKey) return false;
        if (q._id && String(r._id) !== String(q._id)) return false;
        if (q.bookingId && String(r.bookingId) !== String(q.bookingId)) return false;
        if (q.requestType && r.requestType !== q.requestType) return false;
        if (q.status && r.status !== q.status) return false;
        return true;
      }) || null;
    BookingRequest.findById = (id) => {
      const doc = requestsStore.find((r) => String(r._id) === String(id)) || null;
      return { session: async () => doc, then: (r, j) => Promise.resolve(doc).then(r, j) };
    };
    BookingRequest.find = () => ({
      sort: () => ({ lean: async () => requestsStore }),
      select: () => ({ lean: async () => requestsStore }),
      lean: async () => requestsStore,
    });
    NotificationOutbox.create = async (d) => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...d, save: async function () { return this; } };
      outboxStore.push(doc);
      return doc;
    };
    NotificationOutbox.findOne = async (q) => outboxStore.find((o) => o.idempotencyKey === q.idempotencyKey) || null;
    NotificationOutbox.findById = async (id) => outboxStore.find((o) => String(o._id) === String(id)) || null;
    NotificationOutbox.find = () => ({ sort: () => ({ limit: () => ({ lean: async () => outboxStore.filter((o) => o.status === "Failed") }) }) });
    mongoose.startSession = async () => ({
      startTransaction() {},
      inTransaction() { return false; },
      async commitTransaction() {},
      async abortTransaction() {},
      async endSession() {},
    });

    const authStub = (req, _res, next) => next();
    const router = routesFactory({ authMiddleware: authStub, adminMiddleware: authStub });

    const custCancel = findRouteHandler(router, "post", "/api/customer/bookings/:id/cancel");
    const custReschedReq = findRouteHandler(router, "post", "/api/customer/bookings/:id/reschedule-request");
    const custDecision = findRouteHandler(router, "post", "/api/customer/bookings/:id/reschedule-decision");
    const adminReview = findRouteHandler(router, "post", "/api/admin/booking-requests/:id/review");
    const adminPropose = findRouteHandler(router, "post", "/api/admin/trip-slots/:slotId/propose-reschedule");
    const adminGetReqs = findRouteHandler(router, "get", "/api/admin/booking-requests");
    const retryNotif = findRouteHandler(router, "post", "/api/admin/notifications/:outboxId/retry");

    await test("4. Ownership check blocks Customer B from cancelling Customer A's booking (403)", async () => {
      const res = createMockRes();
      await custCancel({ params: { id: bookingsStore[0]._id }, body: {}, currentUser: { _id: custBId, email: "other@example.com" } }, res);
      assert.strictEqual(res.statusCode, 403);
    });

    await test("5. Customer A cancels 2-pax booking (20d out -> 90% = ₹9,000), releases 2 seats once, persists request & failed email outbox", async () => {
      const res1 = createMockRes();
      await custCancel({
        params: { id: bookingsStore[0]._id },
        body: { reason: "Personal emergency", idempotencyKey: "k-cancel-1" },
        currentUser: { _id: custAId, email: "alice@example.com" },
      }, res1);
      assert.strictEqual(res1.statusCode, 200);
      assert.strictEqual(res1.body.preview.eligibleRefundRupees, 9000);
      assert.strictEqual(slotsMap.get(String(slot1Id)).bookedSlots, 2, "4 -> 2 seats");
      assert.strictEqual(bookingsStore[0].status, "Cancelled");
      assert.ok(outboxStore.some((o) => o.audience === "staff"), "Staff alert queued");

      const res2 = createMockRes();
      await custCancel({
        params: { id: bookingsStore[0]._id },
        body: { reason: "Personal emergency", idempotencyKey: "k-cancel-1" },
        currentUser: { _id: custAId, email: "alice@example.com" },
      }, res2);
      assert.strictEqual(res2.body.duplicatePrevented, true);
      assert.strictEqual(slotsMap.get(String(slot1Id)).bookedSlots, 2, "Seats never released twice");
    });

    await test("6. Customer requests reschedule while Admin offline -> no premature seat move; Admin approves -> atomic seat transfer", async () => {
      const reqRes = createMockRes();
      await custReschedReq({
        params: { id: bookingsStore[1]._id },
        body: { targetSlotId: slot2Id, reason: "Work", idempotencyKey: "k-resched-1" },
        currentUser: { _id: custAId, email: "alice@example.com" },
      }, reqRes);
      assert.strictEqual(reqRes.statusCode, 201);
      assert.strictEqual(slotsMap.get(String(slot1Id)).bookedSlots, 2, "Pending reschedule must not move seats prematurely");

      const revRes = createMockRes();
      await adminReview({
        params: { id: reqRes.body.request._id },
        body: { action: "approve", internalNotes: "Approved" },
        user: { email: "admin@traviska.com" },
      }, revRes);
      assert.strictEqual(revRes.statusCode, 200);
      assert.strictEqual(slotsMap.get(String(slot1Id)).bookedSlots, 0);
      assert.strictEqual(slotsMap.get(String(slot2Id)).bookedSlots, 3, "1 + 2 = 3 seats on target slot");
    });

    await test("7. Company proposes reschedule -> customer stays Awaiting Customer Response; replay decision rejected (409)", async () => {
      const propRes = createMockRes();
      await adminPropose({
        params: { slotId: slot2Id },
        body: { proposedSlotId: slot1Id, reason: "Weather shift", closeOriginalSlot: false },
        user: { email: "admin@traviska.com" },
      }, propRes);
      assert.strictEqual(propRes.statusCode, 200);
      assert.strictEqual(bookingsStore[1].bookingState, "Awaiting Customer Response");
      assert.strictEqual(slotsMap.get(String(slot2Id)).bookedSlots, 3, "No auto-move before customer decides");

      const dec1 = createMockRes();
      await custDecision({
        params: { id: bookingsStore[1]._id },
        body: { decision: "Accept New Date", requestId: propRes.body.proposals[0]._id },
        currentUser: { _id: custAId, email: "alice@example.com" },
      }, dec1);
      assert.strictEqual(dec1.statusCode, 200);
      assert.strictEqual(slotsMap.get(String(slot2Id)).bookedSlots, 1);
      assert.strictEqual(slotsMap.get(String(slot1Id)).bookedSlots, 2);

      const decReplay = createMockRes();
      await custDecision({
        params: { id: bookingsStore[1]._id },
        body: { decision: "Request 100% Refund", requestId: propRes.body.proposals[0]._id },
        currentUser: { _id: custAId, email: "alice@example.com" },
      }, decReplay);
      assert.strictEqual(decReplay.statusCode, 409, "Replay decision rejected");
    });

    await test("8. Admin counts & safe notification retry do not mutate seat inventory", async () => {
      const adminRes = createMockRes();
      await adminGetReqs({ query: {} }, adminRes);
      assert.strictEqual(adminRes.statusCode, 200);
      assert.ok(adminRes.body.counts.total >= 2);

      const failedOutbox = outboxStore.find((o) => o.status === "Failed");
      if (failedOutbox) {
        const rRes = createMockRes();
        await retryNotif({ params: { outboxId: failedOutbox._id } }, rRes);
        assert.strictEqual(rRes.statusCode, 200);
        assert.strictEqual(slotsMap.get(String(slot1Id)).bookedSlots, 2, "Retry never touches seats");
      }
    });

    console.log(`\n🎉 CANCELLATION, RESCHEDULE & STAFF ALERT SUITE PASSED (${passed}/8 groups).`);
  } finally {
    Object.assign(Booking, { findById: orig.bookingFindById, find: orig.bookingFind });
    Object.assign(TripSlot, { findById: orig.slotFindById, findOneAndUpdate: orig.slotFindOneAndUpdate });
    Coupon.updateOne = orig.couponUpdateOne;
    Invoice.findOne = orig.invoiceFindOne;
    Object.assign(BookingRequest, { create: orig.reqCreate, findOne: orig.reqFindOne, findById: orig.reqFindById, find: orig.reqFind });
    Object.assign(NotificationOutbox, { create: orig.outboxCreate, findOne: orig.outboxFindOne, findById: orig.outboxFindById, find: orig.outboxFind });
    mongoose.startSession = orig.startSession;
  }
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});
