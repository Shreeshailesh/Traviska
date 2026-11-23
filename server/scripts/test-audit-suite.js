/**
 * Traviska Invoice, Email, WhatsApp & Refund Audit Test Suite (Offline / Mocked)
 * Runs without MongoDB Atlas network access and without sending real WhatsApp/SMTP messages.
 */
const assert = require("assert");
const crypto = require("crypto");

const {
  parseAndValidatePhone,
  sanitizeTemplateParam,
  prepareWhatsAppPreview,
  sendOrPrepareWhatsAppRefund,
  sendCaptainOtpWhatsApp,
  sendDepartureGroupLinkWhatsApp,
  processWhatsAppWebhookPayload,
} = require("../services/whatsappService");
const {
  getSmtpConfigSummary,
  getFromAddress,
  buildInvoiceEmailContent,
  buildRefundEmailContent,
} = require("../services/emailService");
const { generateInvoicePdfBuffer } = require("../services/pdfService");
const {
  calculateInvoicePricing,
} = require("../services/invoiceService");

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`✅ ${name}`);
  passed += 1;
}

function makeMockInvoice(overrides = {}) {
  const doc = {
    _id: "65f000000000000000000001",
    invoiceNumber: "TVK/26-27/0001",
    isSample: false,
    paymentStatus: "Paid",
    refundStatus: "None",
    customerSnapshot: {
      name: "Aarav Sharma",
      email: "aarav@example.com",
      phone: "7795332864",
    },
    tripSnapshot: {
      title: "Spiti Valley Expedition",
      destination: "Spiti Valley",
      travelDate: new Date("2026-06-15T00:00:00Z"),
      travellerCount: 2,
      pricePerPersonPaise: 1500000,
    },
    pricing: {
      subtotalPaise: 3000000,
      discountPaise: 0,
      taxableAmountPaise: 3000000,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      totalAmountPaise: 3000000,
      paidAmountPaise: 3000000,
      balanceDuePaise: 0,
      refundedAmountPaise: 0,
      currency: "INR",
    },
    whatsappDelivery: {
      status: "Queued",
      normalizedPhone: "",
      templateName: "",
      lastMessageId: "",
      previewMessage: "",
      secureLink: "",
      optIn: true,
      errorCode: "",
      lastError: "",
      dispatchedEventKeys: [],
      attempts: [],
    },
    emailDelivery: {
      status: "Queued",
      attempts: [],
    },
    async save() {
      return this;
    },
    ...overrides,
  };
  return doc;
}

async function runAuditSuite() {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  try {
    // 1. E.164 Phone Validation & Normalization
    await test("1. E.164 Indian & international phone normalization + invalid rejection", async () => {
      assert.strictEqual(parseAndValidatePhone("7795332864").e164, "+917795332864");
      assert.strictEqual(parseAndValidatePhone("+917795332864").e164, "+917795332864");
      assert.strictEqual(parseAndValidatePhone("07795332864").e164, "+917795332864");
      assert.strictEqual(parseAndValidatePhone("91 77953-32864").e164, "+917795332864");
      assert.strictEqual(parseAndValidatePhone("+14155552671").e164, "+14155552671");
      assert.strictEqual(parseAndValidatePhone("12345").valid, false);
      assert.strictEqual(parseAndValidatePhone("").valid, false);
    });

    // 2. Sanitize Meta Template Parameters
    await test("2. sanitizeTemplateParam strips newlines/tabs and handles empty values", async () => {
      assert.strictEqual(sanitizeTemplateParam("Spiti\nValley\tTrip"), "Spiti Valley Trip");
      assert.strictEqual(sanitizeTemplateParam("   "), "—");
      assert.strictEqual(sanitizeTemplateParam(null), "—");
    });

    // 3. WhatsApp Invoice Template Payload + API Accepted + Duplicate Prevention
    await test("3. WhatsApp invoice template payload -> API Accepted & duplicate prevention", async () => {
      process.env.NODE_ENV = "production";
      process.env.WHATSAPP_API_TOKEN = "mock_token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "1448850551644650";
      process.env.WHATSAPP_TEMPLATE_NAME = "traviska_invoice_v1";
      process.env.WHATSAPP_TEMPLATE_LANG = "en";

      const capturedPayloads = [];
      global.fetch = async (url, opts) => {
        if (String(url).includes("/media")) {
          return {
            ok: true,
            json: async () => ({ id: "media_123" }),
          };
        }
        const body = JSON.parse(opts.body);
        capturedPayloads.push(body);
        return {
          ok: true,
          json: async () => ({ messages: [{ id: "wamid.INV001" }] }),
        };
      };

      const invoice = makeMockInvoice();
      const res1 = await prepareWhatsAppPreview({
        invoice,
        pdfBuffer: Buffer.from("%PDF-1.4 mock"),
        pdfFileName: "TVK-26-27-0001.pdf",
      });

      assert.strictEqual(res1.status, "API Accepted");
      assert.strictEqual(res1.messageId, "wamid.INV001");
      assert.strictEqual(invoice.whatsappDelivery.normalizedPhone, "+917795332864");
      assert.strictEqual(capturedPayloads.length, 1);
      assert.strictEqual(capturedPayloads[0].type, "template");
      assert.strictEqual(capturedPayloads[0].template.name, "traviska_invoice_v1");
      assert.strictEqual(capturedPayloads[0].to, "917795332864");
      assert.strictEqual(capturedPayloads[0].template.components[0].type, "header");
      assert.strictEqual(capturedPayloads[0].template.components[1].parameters.length, 6);

      // Duplicate call without allowRetry must be prevented
      const resDup = await prepareWhatsAppPreview({
        invoice,
        pdfBuffer: Buffer.from("%PDF-1.4 mock"),
        pdfFileName: "TVK-26-27-0001.pdf",
      });
      assert.strictEqual(resDup.duplicatePrevented, true);
      assert.strictEqual(capturedPayloads.length, 1);

      // Explicit retry with allowRetry: true sends again
      const resRetry = await prepareWhatsAppPreview({
        invoice,
        pdfBuffer: Buffer.from("%PDF-1.4 mock"),
        pdfFileName: "TVK-26-27-0001.pdf",
        allowRetry: true,
      });
      assert.strictEqual(resRetry.status, "API Accepted");
      assert.strictEqual(capturedPayloads.length, 2);
    });

    // 4. Meta #132001 Pending Template Handling in Production
    await test("4. Meta #132001 pending template -> Template Pending Approval (no free-form spam)", async () => {
      process.env.NODE_ENV = "production";
      process.env.WHATSAPP_TEMPLATE_NAME = "traviska_invoice_v1";

      let fetchCalls = 0;
      global.fetch = async (url) => {
        fetchCalls += 1;
        if (String(url).includes("/media")) {
          return { ok: true, json: async () => ({ id: "media_123" }) };
        }
        return {
          ok: false,
          status: 404,
          json: async () => ({
            error: {
              code: 132001,
              message: "(#132001) Template name does not exist in the translation",
            },
          }),
        };
      };

      const invoice = makeMockInvoice();
      const res = await prepareWhatsAppPreview({
        invoice,
        pdfBuffer: Buffer.from("%PDF-1.4 mock"),
      });

      assert.strictEqual(res.status, "Template Pending Approval");
      assert.strictEqual(invoice.whatsappDelivery.status, "Template Pending Approval");
      assert.strictEqual(invoice.whatsappDelivery.errorCode, "132001");
      // 1 media upload + 1 template attempt; zero free-form fallback calls
      assert.strictEqual(fetchCalls, 2);
    });

    // 5. WhatsApp Refund Templates (Initiated without PDF vs Completed with PDF)
    await test("5. WhatsApp refund initiated (no PDF) & completed (with PDF) + duplicate guard", async () => {
      process.env.NODE_ENV = "production";
      process.env.WHATSAPP_REFUND_INITIATED_TEMPLATE_NAME = "traviska_refund_initiated";
      process.env.WHATSAPP_REFUND_TEMPLATE_NAME = "traviska_refund_completed";

      const captured = [];
      global.fetch = async (url, opts) => {
        if (String(url).includes("/media")) {
          return { ok: true, json: async () => ({ id: "media_ref_1" }) };
        }
        captured.push(JSON.parse(opts.body));
        return { ok: true, json: async () => ({ messages: [{ id: `wamid.REF${captured.length}` }] }) };
      };

      const invoice = makeMockInvoice({ refundStatus: "Refund Initiated" });
      const resInit = await sendOrPrepareWhatsAppRefund({
        invoice,
        stage: "initiated",
        refundAmountPaise: 500000,
        refundReference: "REF_101",
        pdfBuffer: Buffer.from("%PDF-1.4 should-not-attach"),
      });
      assert.strictEqual(resInit.status, "API Accepted");
      assert.strictEqual(captured[0].template.name, "traviska_refund_initiated");
      // Initiated has NO header PDF component
      assert.strictEqual(captured[0].template.components.length, 1);
      assert.strictEqual(captured[0].template.components[0].parameters[5].text, "Refund Initiated");

      // Duplicate initiated refund prevented
      const resInitDup = await sendOrPrepareWhatsAppRefund({
        invoice,
        stage: "initiated",
        refundAmountPaise: 500000,
        refundReference: "REF_101",
      });
      assert.strictEqual(resInitDup.duplicatePrevented, true);

      // Completed refund DOES attach PDF header
      const resDone = await sendOrPrepareWhatsAppRefund({
        invoice,
        stage: "completed",
        refundAmountPaise: 500000,
        refundReference: "REF_101",
        pdfBuffer: Buffer.from("%PDF-1.4 refund-receipt"),
      });
      assert.strictEqual(resDone.status, "API Accepted");
      assert.strictEqual(captured[1].template.name, "traviska_refund_completed");
      assert.strictEqual(captured[1].template.components[0].type, "header");
      assert.strictEqual(captured[1].template.components[1].parameters[5].text, "Refunded (Credited)");
    });

    // 6. WhatsApp Webhook Status Updates & Non-Downgrade Idempotency
    await test("6. WhatsApp webhook updates sent -> delivered -> read & handles failed/idempotency", async () => {
      const mockInvoice = makeMockInvoice({
        whatsappDelivery: {
          status: "API Accepted",
          lastMessageId: "wamid.HOOK1",
          attempts: [{ messageId: "wamid.HOOK1", status: "API Accepted" }],
        },
      });
      const MockModel = {
        async findOne(query) {
          const id = query.$or[0]["whatsappDelivery.lastMessageId"];
          return id === "wamid.HOOK1" ? mockInvoice : null;
        },
      };

      await processWhatsAppWebhookPayload(
        { entry: [{ changes: [{ value: { statuses: [{ id: "wamid.HOOK1", status: "sent", timestamp: "1760000001" }] } }] }] },
        MockModel
      );
      assert.strictEqual(mockInvoice.whatsappDelivery.status, "Sent");

      await processWhatsAppWebhookPayload(
        { entry: [{ changes: [{ value: { statuses: [{ id: "wamid.HOOK1", status: "delivered", timestamp: "1760000010" }] } }] }] },
        MockModel
      );
      assert.strictEqual(mockInvoice.whatsappDelivery.status, "Delivered");
      assert.ok(mockInvoice.whatsappDelivery.deliveredAt instanceof Date);

      await processWhatsAppWebhookPayload(
        { entry: [{ changes: [{ value: { statuses: [{ id: "wamid.HOOK1", status: "read", timestamp: "1760000020" }] } }] }] },
        MockModel
      );
      assert.strictEqual(mockInvoice.whatsappDelivery.status, "Read");
      assert.ok(mockInvoice.whatsappDelivery.readAt instanceof Date);

      // Out-of-order / duplicate "delivered" must NOT downgrade "Read"
      await processWhatsAppWebhookPayload(
        { entry: [{ changes: [{ value: { statuses: [{ id: "wamid.HOOK1", status: "delivered", timestamp: "1760000010" }] } }] }] },
        MockModel
      );
      assert.strictEqual(mockInvoice.whatsappDelivery.status, "Read");

      // Failed status on a separate message records errorCode & lastError
      const failedInvoice = makeMockInvoice({
        whatsappDelivery: {
          status: "API Accepted",
          lastMessageId: "wamid.FAIL1",
          attempts: [{ messageId: "wamid.FAIL1", status: "API Accepted" }],
        },
      });
      await processWhatsAppWebhookPayload(
        {
          entry: [{
            changes: [{
              value: {
                statuses: [{
                  id: "wamid.FAIL1",
                  status: "failed",
                  timestamp: "1760000030",
                  errors: [{ code: 131026, title: "Message undeliverable" }],
                }],
              },
            }],
          }],
        },
        { async findOne() { return failedInvoice; } }
      );
      assert.strictEqual(failedInvoice.whatsappDelivery.status, "Failed");
      assert.strictEqual(failedInvoice.whatsappDelivery.errorCode, "131026");
      assert.strictEqual(failedInvoice.whatsappDelivery.lastError, "Message undeliverable");
    });

    // 7. Webhook HMAC-SHA256 Signature Verification Logic
    await test("7. Meta webhook HMAC-SHA256 signature verification matches rawBody", async () => {
      const secret = "test_meta_app_secret";
      const rawBody = Buffer.from(JSON.stringify({ object: "whatsapp_business_account" }), "utf8");
      const validSig = "sha256=" + crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      const badSig = "sha256=" + "0".repeat(64);

      assert.strictEqual(
        crypto.timingSafeEqual(Buffer.from(validSig), Buffer.from(validSig)),
        true
      );
      assert.strictEqual(
        crypto.timingSafeEqual(Buffer.from(validSig), Buffer.from(badSig)),
        false
      );
    });

    // 8. Live vs Sample Email Content & Refund Attachment Separation
    await test("8. Live email omits [TEST] warning; refund initiated vs completed subjects", async () => {
      const liveInvoice = makeMockInvoice({ isSample: false });
      const liveEmail = buildInvoiceEmailContent(liveInvoice);
      assert.strictEqual(liveEmail.subject, "Traviska — Booking Confirmation & Invoice");
      assert.strictEqual(liveEmail.text.includes("No money was collected"), false);

      const refInit = buildRefundEmailContent({
        invoice: liveInvoice,
        stage: "initiated",
        refundAmountPaise: 500000,
        refundReference: "REF_LIVE_1",
      });
      assert.strictEqual(refInit.subject, "Traviska — Refund Initiated (TVK/26-27/0001)");

      const refDone = buildRefundEmailContent({
        invoice: liveInvoice,
        stage: "completed",
        refundAmountPaise: 500000,
        refundReference: "REF_LIVE_1",
      });
      assert.strictEqual(refDone.subject, "Traviska — Refund Credited & Completed (TVK/26-27/0001)");
    });

    // 9. PDF Generation for Full Payment, Advance Payment & Refunded Invoice
    await test("9. PDF generation succeeds for Full, Advance (Partially Paid), and Refunded invoices", async () => {
      const advPricing = calculateInvoicePricing({
        packagePricePaise: 1000000,
        travellers: 2,
        amountPaidPaise: 500000,
      });
      assert.strictEqual(advPricing.pricing.balanceDuePaise, 1500000);
      assert.strictEqual(advPricing.paymentStatus, "Partially Paid");

      const advInvoice = makeMockInvoice({
        paymentStatus: advPricing.paymentStatus,
        pricing: advPricing.pricing,
      });
      const buf = await generateInvoicePdfBuffer(advInvoice);
      assert.ok(buf.toString("latin1").startsWith("%PDF-"));
      assert.ok(buf.length > 5000);
    });

    // 10. Express Route Security Tests: WhatsApp Webhook GET/POST & Production Simulator/Refund Guards
    const invoiceRoutes = require("../routes/invoices");
    const { getGatewayAdapter } = require("../services/paymentGatewayAdapter");
    const noopAuth = (_req, _res, next) => next();
    const router = invoiceRoutes({ authMiddleware: noopAuth, adminMiddleware: noopAuth });

    function findRouteHandler(method, routePath) {
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

    await test("10. GET /api/whatsapp/webhook verifies hub.verify_token & rejects invalid tokens", async () => {
      process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "traviska_verify_secret_123";
      const handler = findRouteHandler("get", "/api/whatsapp/webhook");

      const okRes = createMockRes();
      handler(
        {
          query: {
            "hub.mode": "subscribe",
            "hub.verify_token": "traviska_verify_secret_123",
            "hub.challenge": "challenge_999",
          },
        },
        okRes
      );
      assert.strictEqual(okRes.statusCode, 200);
      assert.strictEqual(okRes.body, "challenge_999");

      const badRes = createMockRes();
      handler(
        {
          query: {
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "challenge_999",
          },
        },
        badRes
      );
      assert.strictEqual(badRes.statusCode, 403);
    });

    await test("11. POST /api/whatsapp/webhook enforces META_APP_SECRET & X-Hub-Signature-256", async () => {
      const handler = findRouteHandler("post", "/api/whatsapp/webhook");
      const payload = { object: "whatsapp_business_account", entry: [] };
      const rawBody = Buffer.from(JSON.stringify(payload), "utf8");

      // Missing META_APP_SECRET in production -> 403
      process.env.NODE_ENV = "production";
      delete process.env.META_APP_SECRET;
      const noSecretRes = createMockRes();
      await handler({ headers: {}, body: payload, rawBody }, noSecretRes);
      assert.strictEqual(noSecretRes.statusCode, 403);

      // Invalid signature -> 401
      process.env.META_APP_SECRET = "my_meta_app_secret";
      const badSigRes = createMockRes();
      await handler(
        { headers: { "x-hub-signature-256": "sha256=" + "0".repeat(64) }, body: payload, rawBody },
        badSigRes
      );
      assert.strictEqual(badSigRes.statusCode, 401);

      // Valid signature -> 200
      const goodSig =
        "sha256=" +
        crypto.createHmac("sha256", "my_meta_app_secret").update(rawBody).digest("hex");
      const okRes = createMockRes();
      await handler(
        { headers: { "x-hub-signature-256": goodSig }, body: payload, rawBody },
        okRes
      );
      assert.strictEqual(okRes.statusCode, 200);
      assert.strictEqual(okRes.body.success, true);
    });

    await test("12. Payment simulator strictly blocked in production & admin simulator route removed", async () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOW_PAYMENT_SIMULATOR = "true";

      assert.throws(() => getGatewayAdapter("simulator"), /strictly disabled in production/i);

      const simLayer = router.stack.find(
        (l) => l.route && l.route.path === "/api/admin/invoices/simulate"
      );
      assert.strictEqual(simLayer, undefined);
    });

    await test("13. Production refund initiation (without live gateway) blocked & manual refund-completed route removed", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.PAYMENT_GATEWAY_PROVIDER;

      const refundHandler = findRouteHandler("post", "/api/admin/invoices/:id/refund");
      const refundRes = createMockRes();
      await refundHandler({ params: { id: "65f000000000000000000001" }, body: { refundAmount: 100 } }, refundRes);
      assert.strictEqual(refundRes.statusCode, 403);
      assert.ok(refundRes.body.message.includes("Live payment gateway is not connected"));

      const completedLayer = router.stack.find(
        (l) => l.route && l.route.path === "/api/admin/invoices/:id/refund-completed"
      );
      assert.strictEqual(completedLayer, undefined);
    });

    await test("14. Approved Meta template payloads match exact 6-param schemas & partial refund credited status", async () => {
      process.env.NODE_ENV = "production";
      process.env.WHATSAPP_API_TOKEN = "mock_token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "1448850551644650";
      process.env.WHATSAPP_TEMPLATE_LANG = "en";
      process.env.WHATSAPP_REFUND_TEMPLATE_NAME = "traviska_refund_completed";

      const captured = [];
      global.fetch = async (url, opts) => {
        if (String(url).includes("/media")) {
          return { ok: true, json: async () => ({ id: "media_partial_ref" }) };
        }
        captured.push(JSON.parse(opts.body));
        return { ok: true, json: async () => ({ messages: [{ id: "wamid.PREF1" }] }) };
      };

      const partialRefundInvoice = makeMockInvoice({
        paymentStatus: "Partially Refunded",
        refundSettlement: { status: "Credited", refundReference: "REF_PART_99" },
      });
      const res = await sendOrPrepareWhatsAppRefund({
        invoice: partialRefundInvoice,
        stage: "completed",
        refundAmountPaise: 300000,
        refundReference: "REF_PART_99",
        pdfBuffer: Buffer.from("%PDF-1.4 partial-refund-receipt"),
        pdfFileName: "TVK-26-27-0001.pdf",
      });
      assert.strictEqual(res.status, "API Accepted");
      assert.strictEqual(captured.length, 1);
      assert.strictEqual(captured[0].template.name, "traviska_refund_completed");
      assert.strictEqual(captured[0].template.language.code, "en");
      assert.strictEqual(captured[0].template.components[0].type, "header");
      assert.strictEqual(captured[0].template.components[0].parameters[0].document.id, "media_partial_ref");
      const bodyParams = captured[0].template.components[1].parameters.map((p) => p.text);
      assert.deepStrictEqual(bodyParams, [
        "Aarav Sharma",
        "TVK/26-27/0001",
        "Spiti Valley Expedition",
        "₹3,000.00",
        "REF_PART_99",
        "Partially Refunded (Credited)",
      ]);
    });

    await test("15. Non-132001 Meta refund template error fails cleanly without free-form fallback in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.WHATSAPP_API_TOKEN = "mock_token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "1448850551644650";
      process.env.WHATSAPP_REFUND_INITIATED_TEMPLATE_NAME = "traviska_refund_initiated";

      let fetchCalls = 0;
      global.fetch = async () => {
        fetchCalls += 1;
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: {
              code: 132000,
              message: "(#132000) Number of parameters does not match the expected number of params",
            },
          }),
        };
      };

      const invoice = makeMockInvoice();
      const res = await sendOrPrepareWhatsAppRefund({
        invoice,
        stage: "initiated",
        refundAmountPaise: 500000,
        refundReference: "REF_ERR_1",
      });
      assert.strictEqual(res.status, "Failed");
      assert.strictEqual(res.errorCode, "132000");
      assert.strictEqual(invoice.whatsappDelivery.status, "Failed");
      assert.strictEqual(fetchCalls, 1);
    });

    await test("16. Customer WhatsApp opt-in enforcement blocks unopted invoice & refund dispatches", async () => {
      process.env.NODE_ENV = "production";
      process.env.WHATSAPP_API_TOKEN = "mock_token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "1448850551644650";
      process.env.WHATSAPP_TEMPLATE_NAME = "traviska_invoice_v1";
      process.env.WHATSAPP_REFUND_INITIATED_TEMPLATE_NAME = "traviska_refund_initiated";

      let fetchCalls = 0;
      global.fetch = async () => {
        fetchCalls += 1;
        return { ok: true, json: async () => ({ messages: [{ id: "should_not_send" }] }) };
      };

      const unoptedInvoice = makeMockInvoice({
        whatsappDelivery: {
          status: "Queued",
          optIn: false,
          dispatchedEventKeys: [],
          attempts: [],
        },
      });

      const invRes = await prepareWhatsAppPreview({
        invoice: unoptedInvoice,
        pdfBuffer: Buffer.from("%PDF-1.4 mock"),
      });
      assert.strictEqual(invRes.status, "Opt-In Required");
      assert.strictEqual(invRes.optInRequired, true);
      assert.strictEqual(invRes.errorCode, "OPT_IN_REQUIRED");
      assert.strictEqual(fetchCalls, 0);

      const refRes = await sendOrPrepareWhatsAppRefund({
        invoice: unoptedInvoice,
        stage: "initiated",
        refundAmountPaise: 500000,
        refundReference: "REF_NO_OPTIN",
      });
      assert.strictEqual(refRes.status, "Opt-In Required");
      assert.strictEqual(refRes.optInRequired, true);
      assert.strictEqual(refRes.errorCode, "OPT_IN_REQUIRED");
      assert.strictEqual(fetchCalls, 0);
    });

    await test("17. SMTP From address quote normalization & port 587/465 secure guard", async () => {
      process.env.SMTP_HOST = "smtp.hostinger.com";
      process.env.SMTP_USER = "admin@traviska.com";
      process.env.SMTP_PASS = "test_pass";
      process.env.SMTP_PORT = "587";
      process.env.SMTP_SECURE = "true";
      process.env.SMTP_FROM = '\\"Traviska Team\\" <noreply@traviska.com>';

      const summary = getSmtpConfigSummary();
      assert.strictEqual(summary.secure, false);
      assert.strictEqual(getFromAddress(), '"Traviska Team" <noreply@traviska.com>');

      process.env.SMTP_PORT = "465";
      assert.strictEqual(getSmtpConfigSummary().secure, true);
    });

    await test("18. POST /api/admin/invoices/:id/whatsapp-consent rejects unconfirmed consent", async () => {
      const consentHandler = findRouteHandler("post", "/api/admin/invoices/:id/whatsapp-consent");
      const badRes = createMockRes();
      await consentHandler({ params: { id: "65f000000000000000000001" }, body: { confirmed: false } }, badRes);
      assert.strictEqual(badRes.statusCode, 400);
    });

    await test("19. Captain OTP (body + url button) & Departure Group Link (5-param) Meta template payloads", async () => {
      process.env.WHATSAPP_API_TOKEN = "mock_token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "1448850551644650";

      const captured = [];
      global.fetch = async (_url, opts) => {
        captured.push(JSON.parse(opts.body));
        return { ok: true, json: async () => ({ messages: [{ id: `wamid.NEW_${captured.length}` }] }) };
      };

      const otpRes = await sendCaptainOtpWhatsApp({ phone: "9876543210", otpCode: "223454" });
      assert.strictEqual(otpRes.status, "API Accepted");
      assert.strictEqual(captured[0].template.name, "traviska_captain_otp");
      assert.strictEqual(captured[0].template.components[0].parameters[0].text, "223454");
      assert.strictEqual(captured[0].template.components[1].type, "button");
      assert.strictEqual(captured[0].template.components[1].sub_type, "url");
      assert.strictEqual(captured[0].template.components[1].parameters[0].text, "223454");

      const grpRes = await sendDepartureGroupLinkWhatsApp({
        phone: "9876543210",
        customerName: "Aarav",
        tripTitle: "Coorg Weekend Trip",
        departureDate: "20 Nov 2026",
        groupLink: "https://chat.whatsapp.com/AbCdEf123",
        bookingCode: "TVK9542",
      });
      assert.strictEqual(grpRes.status, "API Accepted");
      assert.strictEqual(captured[1].template.name, "traviska_departure_group_v1");
      assert.strictEqual(captured[1].template.components[0].parameters.length, 5);
    });

    console.log(`\n🎉 AUDIT TEST SUITE PASSED (${passed}/${passed} tests).`);
  } finally {
    global.fetch = originalFetch;
    process.env = originalEnv;
  }
}

runAuditSuite().catch((err) => {
  console.error("❌ AUDIT TEST FAILED:", err);
  process.exit(1);
});
