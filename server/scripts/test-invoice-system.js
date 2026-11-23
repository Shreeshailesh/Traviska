const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const {
  rupeesToPaise,
  formatINR,
  getFinancialYear,
  calculateInvoicePricing,
} = require("../services/invoiceService");
const {
  getCompanyProfile,
  validateLiveIssuanceProfile,
} = require("../config/companyProfile");
const {
  renderInvoiceHtml,
  generateInvoicePdfBuffer,
  getLogoPath,
} = require("../services/pdfService");
const {
  buildInvoiceEmailContent,
  buildRefundEmailContent,
  TEST_SAFE_RECIPIENT,
} = require("../services/emailService");
const {
  buildWhatsAppInvoiceMessage,
  isWhatsAppConfigured,
} = require("../services/whatsappService");
const {
  LocalTestSimulatorAdapter,
} = require("../services/paymentGatewayAdapter");

async function runTests() {
  console.log("=== TRAVISKA INVOICE SYSTEM AUTOMATED TEST SUITE ===\n");
  let passed = 0;
  const test = (name, fn) => {
    fn();
    passed++;
    console.log(`✅ PASS: ${name}`);
  };

  // 1. One traveller, no discount, full payment
  test("1. One traveller, no discount, full payment", () => {
    const res = calculateInvoicePricing({
      travellers: 1,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: 0,
      amountPaidPaise: rupeesToPaise(6999),
    });
    assert.strictEqual(res.pricing.subtotalPaise, 699900);
    assert.strictEqual(res.pricing.totalPayablePaise, 699900);
    assert.strictEqual(res.pricing.balanceDuePaise, 0);
    assert.strictEqual(res.paymentStatus, "Paid");
  });

  // 2. Multiple travellers + discount + full payment
  test("2. Multiple travellers (2 × ₹6,999 - ₹1,000 = ₹12,998)", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      amountPaidPaise: rupeesToPaise(12998),
    });
    assert.strictEqual(res.pricing.subtotalPaise, 1399800);
    assert.strictEqual(res.pricing.discountPaise, 100000);
    assert.strictEqual(res.pricing.totalPayablePaise, 1299800);
    assert.strictEqual(res.pricing.balanceDuePaise, 0);
    assert.strictEqual(res.paymentStatus, "Paid");
  });

  // 3. Advance payment + remaining balance
  test("3. Advance payment (₹5,000 paid, ₹7,998 remaining)", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      amountPaidPaise: rupeesToPaise(5000),
    });
    assert.strictEqual(res.pricing.netPaidPaise, 500000);
    assert.strictEqual(res.pricing.balanceDuePaise, 799800);
    assert.strictEqual(res.paymentStatus, "Partially Paid");
  });

  // 4. Multiple successful payments settling balance
  test("4. Multiple payments (₹5,000 + ₹7,998 = ₹12,998 Paid)", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      amountPaidPaise: rupeesToPaise(5000) + rupeesToPaise(7998),
    });
    assert.strictEqual(res.pricing.balanceDuePaise, 0);
    assert.strictEqual(res.paymentStatus, "Paid");
  });

  // 5. Failed payment never produces Paid invoice
  test("5. Failed payment status enforcement", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      amountPaidPaise: 0,
      latestPaymentFailed: true,
    });
    assert.strictEqual(res.paymentStatus, "Failed");
    assert.strictEqual(res.pricing.balanceDuePaise, 1299800);
  });

  // 6. Cancelled booking
  test("6. Cancelled booking status enforcement", () => {
    const res = calculateInvoicePricing({
      travellers: 1,
      packagePricePaise: rupeesToPaise(6999),
      amountPaidPaise: 0,
      isCancelled: true,
    });
    assert.strictEqual(res.paymentStatus, "Cancelled");
    assert.strictEqual(res.pricing.balanceDuePaise, 0);
  });

  // 7. Partial refund
  test("7. Partial refund calculation", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      amountPaidPaise: rupeesToPaise(12998),
      refundedAmountPaise: rupeesToPaise(3000),
    });
    assert.strictEqual(res.pricing.netPaidPaise, 999800);
    assert.strictEqual(res.paymentStatus, "Partially Refunded");
  });

  // 8. Full refund
  test("8. Full refund calculation", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      amountPaidPaise: rupeesToPaise(12998),
      refundedAmountPaise: rupeesToPaise(12998),
    });
    assert.strictEqual(res.pricing.netPaidPaise, 0);
    assert.strictEqual(res.paymentStatus, "Refunded");
  });

  // 9. Tax-exclusive calculation
  test("9. Tax-exclusive calculation (5% GST)", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      taxRatePercent: 5,
      taxMode: "exclusive",
      amountPaidPaise: 1364790,
    });
    assert.strictEqual(res.pricing.taxableAmountPaise, 1299800);
    assert.strictEqual(res.pricing.taxAmountPaise, 64990);
    assert.strictEqual(res.pricing.totalPayablePaise, 1364790);
    assert.strictEqual(res.paymentStatus, "Paid");
  });

  // 10. Tax-inclusive calculation
  test("10. Tax-inclusive calculation (5% GST)", () => {
    const res = calculateInvoicePricing({
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
      discountPaise: rupeesToPaise(1000),
      taxRatePercent: 5,
      taxMode: "inclusive",
      amountPaidPaise: 1299800,
    });
    assert.strictEqual(res.pricing.totalPayablePaise, 1299800);
    assert.strictEqual(
      res.pricing.taxableAmountPaise + res.pricing.taxAmountPaise,
      1299800
    );
    assert.strictEqual(res.paymentStatus, "Paid");
  });

  // 11. Invalid & negative input rejection
  test("11. Rejects negative prices, 0 travellers, discount > subtotal, refund > paid", () => {
    assert.throws(() =>
      calculateInvoicePricing({ travellers: 0, packagePricePaise: 1000 })
    );
    assert.throws(() =>
      calculateInvoicePricing({ travellers: 1, packagePricePaise: -500 })
    );
    assert.throws(() =>
      calculateInvoicePricing({
        travellers: 1,
        packagePricePaise: 10000,
        discountPaise: 20000,
      })
    );
    assert.throws(() =>
      calculateInvoicePricing({
        travellers: 1,
        packagePricePaise: 10000,
        amountPaidPaise: 5000,
        refundedAmountPaise: 6000,
      })
    );
  });

  // 12. Financial year numbering check
  test("12. Financial year formatting (India Apr-Mar)", () => {
    assert.strictEqual(getFinancialYear(new Date("2026-11-20")), "26-27");
    assert.strictEqual(getFinancialYear(new Date("2027-02-15")), "26-27");
    assert.strictEqual(getFinancialYear(new Date("2027-04-01")), "27-28");
  });

  // 13. Missing company tax configuration check
  test("13. Live issuance blocked when company legal/tax profile is incomplete", () => {
    const check = validateLiveIssuanceProfile(getCompanyProfile());
    assert.strictEqual(check.readyForLiveIssuance, false);
    assert.ok(check.missingFields.length > 0);
  });

  // 14. Production simulator guard
  test("14. LocalTestSimulatorAdapter blocked in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const adapter = new LocalTestSimulatorAdapter();
    assert.throws(() => adapter.assertTestEnvironment(), /disabled in production/i);
    process.env.NODE_ENV = prev;
  });

  // 15. Sample PDF + HTML rendering + XSS Escaping + Logo + A4 verification
  const samplePricing = calculateInvoicePricing({
    travellers: 2,
    packagePricePaise: rupeesToPaise(6999),
    discountPaise: rupeesToPaise(1000),
    amountPaidPaise: rupeesToPaise(5000),
  });

  const sampleInvoice = {
    _id: "sample_id_001",
    invoiceNumber: "TEST-TVK/26-27/0001",
    environment: "test",
    isSample: true,
    documentType: "SAMPLE_INVOICE",
    financialYear: "26-27",
    bookingCode: "SIM-BK-A1B2C3",
    customerSnapshot: {
      name: "Aarav Mehta",
      email: TEST_SAFE_RECIPIENT,
      phone: "+91 98765 00000",
      billingAddress: "Indiranagar, Bengaluru",
    },
    tripSnapshot: {
      title: "Coorg Group Trip",
      location: "Coorg, Karnataka",
      duration: "3 Days / 2 Nights",
      travelDate: "15 Dec 2026 - 17 Dec 2026",
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
    },
    lineItems: [
      {
        slNo: 1,
        description: "Coorg Group Trip – 3 Days / 2 Nights",
        subtext: "2 Travellers × ₹6,999.00",
        quantity: 2,
        unitPricePaise: rupeesToPaise(6999),
        amountPaise: rupeesToPaise(13998),
      },
    ],
    pricing: samplePricing.pricing,
    paymentStatus: samplePricing.paymentStatus,
    paymentSummary: {
      mode: "Online Payment (Test)",
      reference: "SIM_PAY_TEST001",
      paidAt: new Date(),
      paymentType: "Advance",
    },
    companySnapshot: getCompanyProfile(),
    issuedAt: new Date(),
  };

  test("15. HTML rendering escapes XSS and includes sample warning & dynamic data", () => {
    const xssInvoice = {
      ...sampleInvoice,
      customerSnapshot: {
        ...sampleInvoice.customerSnapshot,
        name: "Aarav Mehta <script>alert(1)</script>",
      },
    };
    const html = renderInvoiceHtml(xssInvoice);
    assert.ok(!html.includes("<script>alert(1)</script>"));
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(html.includes("SAMPLE / TEST — NO ACTUAL PAYMENT RECEIVED"));
    assert.ok(html.includes("TEST-TVK/26-27/0001"));
    assert.ok(html.includes("Partnership Firm"));
  });

  test("16. Original Traviska logo present for PDF embedding", () => {
    const logo = getLogoPath();
    assert.ok(logo && fs.existsSync(logo), "Original logo.jpg must exist");
  });

  const pdfBuffer = await generateInvoicePdfBuffer(sampleInvoice);
  test("17. A4 PDF generated with valid PDF header & A4 MediaBox", () => {
    const pdfStr = pdfBuffer.toString("latin1");
    assert.ok(pdfStr.startsWith("%PDF-"), "Must be valid PDF");
    assert.ok(pdfStr.includes("595.28 841.89"), "Must use A4 dimensions");
    assert.ok(pdfBuffer.length > 5000, "PDF must contain embedded logo & content");
  });

  // Save sample PDF to temp directory for inspection
  const artifactSamplePath = path.join(
    os.tmpdir(),
    "sample_traviska_invoice_TEST_TVK_26_27_0001.pdf"
  );
  fs.writeFileSync(artifactSamplePath, pdfBuffer);
  console.log(`📄 Sample A4 PDF saved to: ${artifactSamplePath} (${pdfBuffer.length} bytes)`);

  test("18. Email & WhatsApp templates include [TEST] warning and safe recipient", () => {
    const emailContent = buildInvoiceEmailContent(sampleInvoice);
    assert.strictEqual(
      emailContent.subject,
      "Traviska — Booking Confirmation & Invoice [TEST]"
    );
    assert.ok(emailContent.text.includes("No money was collected"));

    const refundInit = buildRefundEmailContent({
      invoice: sampleInvoice,
      stage: "initiated",
      refundAmountPaise: 500000,
      refundReference: "SIM_REF_001",
      reason: "Test refund",
    });
    assert.ok(refundInit.subject.includes("Refund Initiated"));
    assert.ok(refundInit.subject.includes("[TEST]"));
    assert.ok(refundInit.text.includes("5–7 business days"));

    const refundDone = buildRefundEmailContent({
      invoice: sampleInvoice,
      stage: "completed",
      refundAmountPaise: 500000,
      refundReference: "SIM_REF_001",
    });
    assert.ok(refundDone.subject.includes("Refund Credited & Completed"));
    assert.ok(refundDone.subject.includes("[TEST]"));
    assert.ok(refundDone.text.includes("credited to your original payment method"));

    const waMsg = buildWhatsAppInvoiceMessage(
      sampleInvoice,
      "http://localhost:5173/customer/dashboard#invoice-sample_id_001"
    );
    assert.ok(waMsg.includes("[TEST]"));
    assert.ok(waMsg.includes("No actual payment was collected"));
    assert.strictEqual(isWhatsAppConfigured(), false);
  });

  console.log(`\n🎉 ALL ${passed} AUTOMATED TESTS PASSED.`);
}

runTests().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
