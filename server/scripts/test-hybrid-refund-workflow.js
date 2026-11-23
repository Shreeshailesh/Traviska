/**
 * Traviska Hybrid Refund Workflow & Meta WhatsApp Gate Test Suite
 * Runs 100% offline against in-memory stores (zero production DB writes or live messages).
 */
const assert = require("assert");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const TripSlot = require("../models/TripSlot");
const Coupon = require("../models/Coupon");
const Invoice = require("../models/Invoice");
const BookingRequest = require("../models/BookingRequest");
const NotificationOutbox = require("../models/NotificationOutbox");
const routesFactory = require("../routes/cancellationReschedule");
const { isWhatsAppTemplateApproved } = require("../services/notificationOutboxService");

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

async function runSuite() {
  const originalProvider = process.env.PAYMENT_GATEWAY_PROVIDER;
  delete process.env.PAYMENT_GATEWAY_PROVIDER;

  const tripId = new mongoose.Types.ObjectId();
  const slotId = new mongoose.Types.ObjectId();
  const custId = new mongoose.Types.ObjectId();

  const slotsMap = new Map([
    [String(slotId), { _id: slotId, trip: tripId, date: new Date(Date.now() + 20 * 86400000), totalSlots: 10, bookedSlots: 6, isClosed: false }],
  ]);

  const bookingsStore = [
    {
      _id: new mongoose.Types.ObjectId(),
      bookingCode: "TVK2001",
      customerId: custId,
      name: "Riya",
      email: "riya@example.com",
      phone: "+919876543210",
      trip: { title: "Coorg Trip", price: "5000" },
      slotId,
      date: "20 Dec 2026",
      travellers: 2,
      total: 10000,
      paymentStatus: "Paid",
      paymentMethod: "Razorpay",
      paymentId: "pay_123",
      status: "Confirmed",
      bookingState: "Confirmed",
      whatsappOptIn: false,
      rescheduleHistory: [],
      save: async function () { return this; },
    },
    {
      _id: new mongoose.Types.ObjectId(),
      bookingCode: "TVK2002",
      customerId: custId,
      name: "Kiran",
      email: "kiran@example.com",
      phone: "+919876543211",
      trip: { title: "Coorg Trip", price: "5000" },
      slotId: new mongoose.Types.ObjectId(),
      date: "Tomorrow",
      travellers: 1,
      total: 5000,
      paymentStatus: "Paid",
      status: "Confirmed",
      bookingState: "Confirmed",
      whatsappOptIn: false,
      rescheduleHistory: [],
      save: async function () { return this; },
    },
  ];
  slotsMap.set(String(bookingsStore[1].slotId), {
    _id: bookingsStore[1].slotId,
    trip: tripId,
    date: new Date(Date.now() + 12 * 3600000), // <72h -> 0% refund
    totalSlots: 10,
    bookedSlots: 1,
    isClosed: false,
  });

  const requestsStore = [];
  const outboxStore = [];

  const orig = {
    bookingFindById: Booking.findById,
    slotFindById: TripSlot.findById,
    slotFindOneAndUpdate: TripSlot.findOneAndUpdate,
    couponUpdateOne: Coupon.updateOne,
    invoiceFindOne: Invoice.findOne,
    reqCreate: BookingRequest.create,
    reqFindById: BookingRequest.findById,
    reqFindOneAndUpdate: BookingRequest.findOneAndUpdate,
    reqUpdateMany: BookingRequest.updateMany,
    outboxCreate: NotificationOutbox.create,
    outboxFindOne: NotificationOutbox.findOne,
    startSession: mongoose.startSession,
  };

  try {
    Booking.findById = (id) => {
      const b = bookingsStore.find((x) => String(x._id) === String(id)) || null;
      return { session: async () => b, then: (r, j) => Promise.resolve(b).then(r, j) };
    };
    TripSlot.findById = (id) => {
      const s = slotsMap.get(String(id)) || null;
      const chain = { lean: async () => s, session: async () => s, then: (r, j) => Promise.resolve(s).then(r, j) };
      return chain;
    };
    TripSlot.findOneAndUpdate = async (filter, update) => {
      const s = slotsMap.get(String(filter._id));
      if (!s) return null;
      if (filter.bookedSlots?.$gte !== undefined && s.bookedSlots < filter.bookedSlots.$gte) return null;
      if (update?.$inc?.bookedSlots) s.bookedSlots += update.$inc.bookedSlots;
      return { ...s };
    };
    Coupon.updateOne = async () => ({ modifiedCount: 1 });
    Invoice.findOne = () => ({ lean: async () => null, session: async () => null, then: (r, j) => Promise.resolve(null).then(r, j) });
    BookingRequest.create = async (data) => {
      const arr = Array.isArray(data) ? data : [data];
      const created = arr.map((item) => {
        const doc = { _id: new mongoose.Types.ObjectId(), createdAt: new Date(), customerDecision: "None", auditHistory: [], ...item, save: async function () { return this; } };
        requestsStore.push(doc);
        return doc;
      });
      return Array.isArray(data) ? created : created[0];
    };
    BookingRequest.findById = (id) => {
      const doc = requestsStore.find((r) => String(r._id) === String(id)) || null;
      return { session: async () => doc, then: (r, j) => Promise.resolve(doc).then(r, j) };
    };
    BookingRequest.findOneAndUpdate = async (filter, update) => {
      const doc = requestsStore.find((r) => String(r._id) === String(filter._id) && (!filter.refundState || r.refundState === filter.refundState));
      if (!doc) return null;
      if (update.$set) Object.assign(doc, update.$set);
      if (update.$push?.auditHistory) doc.auditHistory.push(update.$push.auditHistory);
      return doc;
    };
    BookingRequest.updateMany = async (filter, update) => {
      let modifiedCount = 0;
      for (const r of requestsStore) {
        if (
          String(r.bookingId) === String(filter.bookingId) &&
          (!filter.refundState?.$ne || r.refundState !== filter.refundState.$ne)
        ) {
          if (update.$set) Object.assign(r, update.$set);
          if (update.$push?.auditHistory) r.auditHistory.push(update.$push.auditHistory);
          modifiedCount += 1;
        }
      }
      return { modifiedCount };
    };
    NotificationOutbox.create = async (d) => {
      const doc = { _id: new mongoose.Types.ObjectId(), ...d, save: async function () { return this; } };
      outboxStore.push(doc);
      return doc;
    };
    NotificationOutbox.findOne = async (q) => outboxStore.find((o) => o.idempotencyKey === q.idempotencyKey) || null;
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
    const approveRefund = findRouteHandler(router, "post", "/api/admin/booking-requests/:id/approve-refund");
    const flagInvestigation = findRouteHandler(router, "post", "/api/admin/booking-requests/:id/flag-investigation");
    const manualComplete = findRouteHandler(router, "post", "/api/admin/bookings/:id/manual-refund-complete");

    let refundReqId = null;

    await test("1 & 6. Customer eligible cancel -> Pending Admin Approval, NO gateway refund before approval", async () => {
      const r = createMockRes();
      await custCancel({
        params: { id: bookingsStore[0]._id },
        body: { reason: "Personal emergency" },
        currentUser: { _id: custId, email: "riya@example.com" },
      }, r);
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(bookingsStore[0].refundState, "Pending Admin Approval");
      assert.strictEqual(r.body.request.requestType, "ManualRefundAction");
      assert.strictEqual(r.body.request.eligibleRefundAmount, 9000);
      refundReqId = r.body.request._id;
    });

    await test("2. ₹0 refund (<72h) creates NO refund approval task (Not Applicable)", async () => {
      const r = createMockRes();
      await custCancel({
        params: { id: bookingsStore[1]._id },
        body: { reason: "Unable to attend" },
        currentUser: { _id: custId, email: "kiran@example.com" },
      }, r);
      assert.strictEqual(r.statusCode, 200);
      assert.strictEqual(bookingsStore[1].refundState, "Not Applicable");
      assert.strictEqual(r.body.request.requestType, "CustomerCancel");
    });

    await test("7, 8 & 10. Two Admins click Approve simultaneously -> only ONE succeeds (200), second gets 409; missing gateway -> Approved — Pending Initiation", async () => {
      const r1 = createMockRes();
      const r2 = createMockRes();
      await Promise.all([
        approveRefund({ params: { id: refundReqId }, user: { email: "admin1@traviska.com" } }, r1),
        approveRefund({ params: { id: refundReqId }, user: { email: "admin2@traviska.com" } }, r2),
      ]);
      assert.deepStrictEqual([r1.statusCode, r2.statusCode].sort(), [200, 409]);
      assert.strictEqual(bookingsStore[0].refundState, "Approved — Pending Initiation");
    });

    await test("11. Flag & Manual payout verification -> Completed", async () => {
      const f = createMockRes();
      await flagInvestigation({ params: { id: refundReqId }, body: { note: "Double check UTR" }, user: { email: "admin1@traviska.com" } }, f);
      assert.strictEqual(f.statusCode, 200);
      assert.strictEqual(f.body.request.flaggedForInvestigation, true);

      const m = createMockRes();
      await manualComplete({ params: { id: bookingsStore[0]._id }, body: { refundReference: "UTR99887766", refundAmount: 9000 }, user: { email: "admin1@traviska.com" } }, m);
      assert.strictEqual(m.statusCode, 200);
      assert.strictEqual(bookingsStore[0].refundState, "Completed");
      assert.strictEqual(bookingsStore[0].refundReference, "UTR99887766");
      const updatedReq = requestsStore.find((r) => String(r._id) === String(refundReqId));
      assert.strictEqual(updatedReq.status, "Completed");
      assert.strictEqual(updatedReq.refundState, "Completed");

      const mDup = createMockRes();
      await manualComplete({ params: { id: bookingsStore[0]._id }, body: { refundReference: "UTR99887766", refundAmount: 9000 }, user: { email: "admin1@traviska.com" } }, mDup);
      assert.strictEqual(mDup.statusCode, 409, "Repeat manual refund completion must be rejected");
    });

    await test("16 & 18. Unapproved WhatsApp template blocked; missing whatsappOptIn blocks WhatsApp", async () => {
      assert.strictEqual(isWhatsAppTemplateApproved("traviska_company_trip_cancelled"), false);
      assert.strictEqual(outboxStore.filter((o) => o.channel === "whatsapp").length, 0);
    });

    console.log(`\n🎉 HYBRID REFUND & META WHATSAPP WORKFLOW SUITE PASSED (${passed}/5 groups).`);
  } finally {
    Object.assign(Booking, { findById: orig.bookingFindById });
    Object.assign(TripSlot, { findById: orig.slotFindById, findOneAndUpdate: orig.slotFindOneAndUpdate });
    Coupon.updateOne = orig.couponUpdateOne;
    Invoice.findOne = orig.invoiceFindOne;
    Object.assign(BookingRequest, { create: orig.reqCreate, findById: orig.reqFindById, findOneAndUpdate: orig.reqFindOneAndUpdate, updateMany: orig.reqUpdateMany });
    Object.assign(NotificationOutbox, { create: orig.outboxCreate, findOne: orig.outboxFindOne });
    mongoose.startSession = orig.startSession;
    if (originalProvider !== undefined) process.env.PAYMENT_GATEWAY_PROVIDER = originalProvider;
  }
}

runSuite().catch((err) => {
  console.error("❌ Hybrid refund suite failed:", err);
  process.exit(1);
});
