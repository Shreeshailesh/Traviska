/**
 * Traviska Customer Checkout, Invoice, Email & WhatsApp Integration Tests (Offline / Mocked)
 * Runs without modifying production MongoDB and without sending live SMTP/WhatsApp messages.
 */
const assert = require("assert");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");
const Coupon = require("../models/Coupon");
const PaymentEvent = require("../models/PaymentEvent");
const Invoice = require("../models/Invoice");
const InvoiceCounter = require("../models/InvoiceCounter");

const customerCheckoutRoutes = require("../routes/customerCheckout");
const invoiceRoutes = require("../routes/invoices");
const { issueInvoiceAndNotifyForBooking } = require("../services/bookingInvoiceHook");

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
    setHeader(k, v) {
      this.headers[k] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
  };
}

async function runTests() {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  // In-memory stores
  const tripId = new mongoose.Types.ObjectId();
  const slotId = new mongoose.Types.ObjectId();
  const pickupId = new mongoose.Types.ObjectId();
  const customerAId = new mongoose.Types.ObjectId();
  const customerBId = new mongoose.Types.ObjectId();

  const bookingsStore = [];
  const paymentEventsStore = [];
  const invoicesStore = [];
  const slotDoc = {
    _id: slotId,
    trip: tripId,
    date: "2026-12-20",
    totalSlots: 10,
    bookedSlots: 2,
    isClosed: false,
  };
  const tripDoc = {
    _id: tripId,
    title: "Spiti Winter Expedition",
    location: "Spiti Valley",
    duration: "5 Days / 4 Nights",
    price: "10000",
    image: "https://traviska.com/spiti.jpg",
    description: "Winter group trip",
    pickupLocations: [
      {
        _id: pickupId,
        name: "Majnu Ka Tilla",
        address: "New Delhi",
        landmark: "Metro Gate 2",
        pickupTime: "07:00 PM",
        isActive: true,
      },
    ],
  };

  // Stub Mongoose models & connection db name
  const origDb = mongoose.connection.db;
  Object.defineProperty(mongoose.connection, "db", {
    configurable: true,
    get: () => ({ databaseName: "traviska_dev_mock" }),
  });

  const origTripFindById = Trip.findById;
  const origSlotFindOne = TripSlot.findOne;
  const origSlotFindOneAndUpdate = TripSlot.findOneAndUpdate;
  const origCouponFindOne = Coupon.findOne;
  const origCouponUpdateOne = Coupon.updateOne;
  const origBookingFindOne = Booking.findOne;
  const origBookingFindById = Booking.findById;
  const origBookingCreate = Booking.create;
  const origBookingCountDocuments = Booking.countDocuments;
  const origPaymentEventFindOne = PaymentEvent.findOne;
  const origPaymentEventFind = PaymentEvent.find;
  const origPaymentEventCreate = PaymentEvent.create;
  const origInvoiceFindOne = Invoice.findOne;
  const origInvoiceFindById = Invoice.findById;
  const origInvoiceFind = Invoice.find;
  const origInvoiceCreate = Invoice.create;
  const origCounterFindOneAndUpdate = InvoiceCounter.findOneAndUpdate;

  Trip.findById = (id) => {
    const val = String(id) === String(tripId) ? tripDoc : null;
    const q = {
      select: () => q,
      lean: () => Promise.resolve(val),
      then: (resolve, reject) => Promise.resolve(val).then(resolve, reject),
    };
    return q;
  };
  TripSlot.findOne = async (q) => (String(q._id) === String(slotId) ? slotDoc : null);
  TripSlot.findOneAndUpdate = async (q, update) => {
    if (String(q._id) !== String(slotId)) return null;
    const needed = update?.$inc?.bookedSlots || 0;
    if (slotDoc.totalSlots - slotDoc.bookedSlots < needed) return null;
    slotDoc.bookedSlots += needed;
    return slotDoc;
  };
  let couponUsage = 0;
  Coupon.findOne = async (q) => {
    if (q?.code === "WINTER500") {
      return {
        _id: new mongoose.Types.ObjectId(),
        code: "WINTER500",
        isActive: true,
        discountType: "flat",
        value: 500,
        minBookingAmount: 5000,
        applicableTrips: "all",
        usageLimit: 100,
        usageCount: couponUsage,
        perUserLimit: 0,
      };
    }
    return null;
  };
  Coupon.updateOne = async () => {
    couponUsage += 1;
    return { modifiedCount: 1 };
  };

  function wrapDoc(obj) {
    obj.save = async function save() {
      return this;
    };
    return obj;
  }

  Booking.countDocuments = async () => 0;
  Booking.findOne = async (q) => {
    if (q.checkoutRequestId) {
      return bookingsStore.find(
        (b) =>
          b.checkoutRequestId === q.checkoutRequestId &&
          (!q.customerId || String(b.customerId) === String(q.customerId))
      ) || null;
    }
    return null;
  };
  Booking.findById = async (id) => bookingsStore.find((b) => String(b._id) === String(id)) || null;
  Booking.create = async (data) => {
    if (data.checkoutRequestId && bookingsStore.some((b) => b.checkoutRequestId === data.checkoutRequestId)) {
      const err = new Error("Duplicate key");
      err.code = 11000;
      throw err;
    }
    const doc = wrapDoc({
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      ...data,
    });
    bookingsStore.push(doc);
    return doc;
  };

  PaymentEvent.findOne = async (q) =>
    paymentEventsStore.find((e) => e.eventId === q.eventId) || null;
  PaymentEvent.find = (q) => ({
    sort: async () =>
      paymentEventsStore.filter((e) => String(e.bookingId) === String(q.bookingId)),
  });
  PaymentEvent.create = async (data) => {
    const doc = wrapDoc({ _id: new mongoose.Types.ObjectId(), ...data });
    paymentEventsStore.push(doc);
    return doc;
  };

  let seq = 0;
  InvoiceCounter.findOneAndUpdate = async () => {
    seq += 1;
    return { seq };
  };

  Invoice.findOne = async (q) =>
    invoicesStore.find(
      (i) => String(i.bookingId) === String(q.bookingId) && i.environment === q.environment
    ) || null;
  Invoice.findById = async (id) => invoicesStore.find((i) => String(i._id) === String(id)) || null;
  Invoice.find = (q) => ({
    sort: async () =>
      invoicesStore.filter((i) =>
        (q.$or || []).some(
          (cond) =>
            (cond.customerId && String(i.customerId) === String(cond.customerId)) ||
            (cond["customerSnapshot.email"] &&
              i.customerSnapshot?.email === cond["customerSnapshot.email"])
        )
      ),
  });
  Invoice.create = async (data) => {
    const doc = wrapDoc({
      _id: new mongoose.Types.ObjectId(),
      emailDelivery: {
        status: "Not Configured",
        attempts: [],
      },
      auditTrail: data.auditTrail || [],
      ...data,
      whatsappDelivery: {
        status: "Preview Only / Not Configured",
        dispatchedEventKeys: [],
        attempts: [],
        ...(data.whatsappDelivery || {}),
      },
    });
    invoicesStore.push(doc);
    return doc;
  };

  try {
    process.env.NODE_ENV = "development";
    delete process.env.SMTP_HOST; // Disable live SMTP during offline test
    process.env.WHATSAPP_API_TOKEN = "mock_token";
    process.env.WHATSAPP_PHONE_NUMBER_ID = "1448850551644650";
    process.env.WHATSAPP_TEMPLATE_NAME = "traviska_invoice_v1";
    process.env.WHATSAPP_TEMPLATE_LANG = "en";

    const waPayloads = [];
    global.fetch = async (url, opts) => {
      if (String(url).includes("/media")) {
        return { ok: true, json: async () => ({ id: "media_cust_1" }) };
      }
      waPayloads.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ messages: [{ id: `wamid.CUST_${waPayloads.length}` }] }) };
    };

    const noopAuth = (_req, _res, next) => next();
    const checkoutRouter = customerCheckoutRoutes({ authMiddleware: noopAuth });
    const invRouter = invoiceRoutes({ authMiddleware: noopAuth, adminMiddleware: noopAuth });

    const createPending = findRouteHandler(checkoutRouter, "post", "/api/customer/checkout/create-pending");
    const simulatePay = findRouteHandler(checkoutRouter, "post", "/api/customer/checkout/simulate-payment");
    const listCustInv = findRouteHandler(invRouter, "get", "/api/customer/invoices");
    const downloadCustPdf = findRouteHandler(invRouter, "get", "/api/customer/invoices/:id/pdf");

    const customerA = { _id: customerAId, email: "aarav@example.com", role: "customer" };
    const customerB = { _id: customerBId, email: "other@example.com", role: "customer" };

    // 1. Non-customer rejected
    await test("1. Non-customer user cannot call customer checkout", async () => {
      const res = createMockRes();
      await createPending({ user: { role: "admin" }, currentUser: { _id: customerAId }, body: {} }, res);
      assert.strictEqual(res.statusCode, 403);
    });

    // 2. Invalid coupon rejected
    await test("2. Invalid coupon code is rejected on pending booking creation", async () => {
      const res = createMockRes();
      await createPending(
        {
          user: { role: "customer" },
          currentUser: customerA,
          body: {
            tripId: String(tripId),
            slotId: String(slotId),
            travellers: 2,
            travellerDetails: [
              { name: "Aarav", gender: "Male", age: "28" },
              { name: "Riya", gender: "Female", age: "26" },
            ],
            pickupLocationId: String(pickupId),
            couponCode: "FAKE999",
            name: "Aarav",
            email: "aarav@example.com",
            phone: "7795332864",
            whatsappOptIn: true,
          },
        },
        res
      );
      assert.strictEqual(res.statusCode, 400);
    });

    // 3. Valid pending booking + duplicate click idempotency
    let createdBookingId = "";
    await test("3. Pending booking validates pickup, coupon, E.164 phone, opt-in & prevents duplicate clicks", async () => {
      const reqPayload = {
        user: { role: "customer" },
        currentUser: customerA,
        body: {
          tripId: String(tripId),
          slotId: String(slotId),
          travellers: 2,
          travellerDetails: [
            { name: "Aarav", gender: "Male", age: "28" },
            { name: "Riya", gender: "Female", age: "26" },
          ],
          pickupLocationId: String(pickupId),
          couponCode: "WINTER500",
          name: "Aarav",
          email: "aarav@example.com",
          phone: "7795332864",
          whatsappOptIn: true,
          checkoutRequestId: "req-unique-001",
        },
      };
      const res1 = createMockRes();
      await createPending(reqPayload, res1);
      assert.strictEqual(res1.statusCode, 201);
      assert.strictEqual(res1.body.booking.status, "Pending");
      assert.strictEqual(res1.body.booking.paymentStatus, "Pending");
      assert.strictEqual(res1.body.booking.originalTotal, 20000);
      assert.strictEqual(res1.body.booking.discountAmount, 500);
      assert.strictEqual(res1.body.booking.total, 19500);
      assert.strictEqual(res1.body.booking.phone, "+917795332864");
      assert.strictEqual(res1.body.booking.whatsappOptIn, true);
      assert.strictEqual(slotDoc.bookedSlots, 2); // No seat deduction yet!
      createdBookingId = String(res1.body.booking._id);

      const res2 = createMockRes();
      await createPending(reqPayload, res2);
      assert.strictEqual(res2.statusCode, 200);
      assert.strictEqual(res2.body.duplicatePrevented, true);
      assert.strictEqual(bookingsStore.length, 1);
    });

    // 4. Failed simulated payment
    await test("4. Failed simulated payment does not confirm booking or deduct seats", async () => {
      const res = createMockRes();
      await simulatePay(
        {
          user: { role: "customer" },
          currentUser: customerA,
          headers: {},
          body: { bookingId: createdBookingId, outcome: "failed" },
        },
        res
      );
      assert.strictEqual(res.statusCode, 402);
      assert.strictEqual(res.body.bookingConfirmed, false);
      assert.strictEqual(bookingsStore[0].status, "Pending");
      assert.strictEqual(bookingsStore[0].paymentStatus, "Failed");
      assert.strictEqual(slotDoc.bookedSlots, 2);
      assert.strictEqual(invoicesStore.length, 0);
    });

    // 5. Successful simulated payment triggers seat reservation, invoice PDF & WhatsApp template (even when SMTP not configured)
    let createdInvoiceId = "";
    await test("5. Successful simulated payment confirms booking, deducts seats once, generates invoice & sends WhatsApp", async () => {
      const res = createMockRes();
      await simulatePay(
        {
          user: { role: "customer" },
          currentUser: customerA,
          headers: { origin: "http://localhost:5173" },
          body: { bookingId: createdBookingId, outcome: "succeeded" },
        },
        res
      );
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.bookingConfirmed, true);
      assert.strictEqual(bookingsStore[0].status, "Confirmed");
      assert.strictEqual(bookingsStore[0].paymentStatus, "Paid");
      assert.strictEqual(slotDoc.bookedSlots, 4); // 2 -> 4
      assert.strictEqual(couponUsage, 1);
      assert.strictEqual(invoicesStore.length, 1);
      assert.strictEqual(res.body.invoice.pricing.totalPayablePaise, 1950000);
      assert.strictEqual(res.body.whatsappPreview.status, "API Accepted");
      assert.strictEqual(waPayloads.length, 1);
      assert.strictEqual(waPayloads[0].template.name, "traviska_invoice_v1");
      createdInvoiceId = String(res.body.invoice._id);

      // Repeated call does not double-deduct seats or duplicate invoice/WhatsApp
      const resDup = createMockRes();
      await simulatePay(
        {
          user: { role: "customer" },
          currentUser: customerA,
          headers: {},
          body: { bookingId: createdBookingId, outcome: "succeeded" },
        },
        resDup
      );
      assert.strictEqual(resDup.body.duplicatePrevented, true);
      assert.strictEqual(slotDoc.bookedSlots, 4);
      assert.strictEqual(invoicesStore.length, 1);
      assert.strictEqual(waPayloads.length, 1);
    });

    // 6. Customer My Trips invoice listing & ownership protection
    await test("6. Customer A downloads own invoice in My Trips; Customer B is rejected (403)", async () => {
      const listRes = createMockRes();
      await listCustInv({ currentUser: customerA }, listRes);
      assert.strictEqual(listRes.statusCode, 200);
      assert.strictEqual(listRes.body.invoices.length, 1);

      const okPdf = createMockRes();
      await downloadCustPdf({ currentUser: customerA, params: { id: createdInvoiceId } }, okPdf);
      assert.strictEqual(okPdf.statusCode, 200);
      assert.ok(Buffer.isBuffer(okPdf.body));
      assert.ok(okPdf.body.toString("latin1").startsWith("%PDF-"));

      const badPdf = createMockRes();
      await downloadCustPdf({ currentUser: customerB, params: { id: createdInvoiceId } }, badPdf);
      assert.strictEqual(badPdf.statusCode, 403);
    });

    // 7. Production simulator guard & shared "test" DB isolation guard
    await test("7. Customer simulator blocked in production & blocked on shared 'test' database", async () => {
      process.env.NODE_ENV = "production";
      const prodRes = createMockRes();
      await simulatePay({ user: { role: "customer" }, currentUser: customerA, body: {} }, prodRes);
      assert.strictEqual(prodRes.statusCode, 403);

      process.env.NODE_ENV = "development";
      Object.defineProperty(mongoose.connection, "db", {
        configurable: true,
        get: () => ({ databaseName: "test" }),
      });
      const dbRes = createMockRes();
      await simulatePay({ user: { role: "customer" }, currentUser: customerA, body: {} }, dbRes);
      assert.strictEqual(dbRes.statusCode, 403);
      assert.strictEqual(dbRes.body.code, "DB_NOT_ISOLATED");
    });

    // 8. Isolated stage failure: WhatsApp failure never blocks booking/invoice/email
    await test("8. Notification stage isolation: WhatsApp failure preserves invoice & booking", async () => {
      Object.defineProperty(mongoose.connection, "db", {
        configurable: true,
        get: () => ({ databaseName: "traviska_dev_mock" }),
      });
      global.fetch = async () => {
        throw new Error("Simulated Meta API outage");
      };
      const bk2 = await Booking.create({
        customerId: customerAId,
        name: "Aarav",
        email: "aarav@example.com",
        phone: "+917795332864",
        trip: tripDoc,
        slotId,
        date: "2026-12-20",
        bookingCode: "TVK9999",
        travellers: 1,
        originalTotal: 10000,
        discountAmount: 0,
        total: 10000,
        paymentStatus: "Paid",
        status: "Confirmed",
        whatsappOptIn: true,
      });
      const hook = await issueInvoiceAndNotifyForBooking({
        booking: bk2,
        currentUser: customerA,
      });
      assert.ok(hook.invoice);
      assert.strictEqual(hook.whatsappPreview.status, "Failed");
    });

    console.log(`\n🎉 CUSTOMER CHECKOUT INTEGRATION SUITE PASSED (${passed}/${passed} tests).`);
  } finally {
    Object.defineProperty(mongoose.connection, "db", {
      configurable: true,
      get: () => origDb,
    });
    Trip.findById = origTripFindById;
    TripSlot.findOne = origSlotFindOne;
    TripSlot.findOneAndUpdate = origSlotFindOneAndUpdate;
    Coupon.findOne = origCouponFindOne;
    Coupon.updateOne = origCouponUpdateOne;
    Booking.findOne = origBookingFindOne;
    Booking.findById = origBookingFindById;
    Booking.create = origBookingCreate;
    Booking.countDocuments = origBookingCountDocuments;
    PaymentEvent.findOne = origPaymentEventFindOne;
    PaymentEvent.find = origPaymentEventFind;
    PaymentEvent.create = origPaymentEventCreate;
    Invoice.findOne = origInvoiceFindOne;
    Invoice.findById = origInvoiceFindById;
    Invoice.find = origInvoiceFind;
    Invoice.create = origInvoiceCreate;
    InvoiceCounter.findOneAndUpdate = origCounterFindOneAndUpdate;
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
}

runTests().catch((err) => {
  console.error("❌ CUSTOMER CHECKOUT TEST FAILED:", err);
  process.exit(1);
});
