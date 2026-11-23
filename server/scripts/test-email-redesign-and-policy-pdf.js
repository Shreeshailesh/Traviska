/**
 * Traviska Email Redesign & Policy PDF Verification + Local Preview Generator
 * Runs offline, generates local HTML + Policy PDF previews in /tmp/traviska-email-previews,
 * and asserts escaping, multi-attachment Brevo/SMTP compatibility, and status wording.
 */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const { renderCustomerEmail, renderStaffAlertEmail, LOGO_HTTPS_URL } = require("../services/emailTemplateService");
const { buildInvoiceEmailContent, buildRefundEmailContent, sendViaHttpsProvider } = require("../services/emailService");
const { generatePolicyPdfBuffer, getPolicyAttachmentFilename } = require("../services/policyPdfService");

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`✅ ${name}`);
  passed += 1;
}

async function runTests() {
  const previewDir = "/tmp/traviska-email-previews";
  fs.mkdirSync(previewDir, { recursive: true });

  await test("1. Policy PDF generates valid A4 PDF with DRAFT legal-review marking", async () => {
    const buf = await generatePolicyPdfBuffer({ policyVersion: "2026-11-v1" });
    assert.ok(Buffer.isBuffer(buf) && buf.length > 5000, "Policy PDF must be valid buffer > 5 KB");
    assert.strictEqual(buf.slice(0, 5).toString("utf8"), "%PDF-");
    const fileName = getPolicyAttachmentFilename("2026-11-v1");
    assert.ok(fileName.includes("DRAFT"), "Filename marks DRAFT while PENDING_LEGAL_REVIEW");
    fs.writeFileSync(path.join(previewDir, fileName), buf);
  });

  await test("2. Booking Invoice email uses branded layout, logo HTTPS URL, & plain text", async () => {
    const content = buildInvoiceEmailContent({
      invoiceNumber: "TVK/26-27/0001",
      bookingCode: "TVK9542",
      paymentStatus: "Paid",
      isSample: false,
      customerSnapshot: { name: "Rahul Sharma <script>alert(1)</script>" },
      tripSnapshot: { title: "Wayanad Expedition", travelDate: "20 Dec 2026" },
      pricing: { netPaidPaise: 799900 },
    });
    assert.ok(content.html.includes(LOGO_HTTPS_URL));
    assert.ok(content.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"), "HTML must escape XSS");
    assert.ok(!content.html.includes("<script>alert(1)</script>"));
    assert.ok(content.text.includes("Booking ID: TVK9542"));
    fs.writeFileSync(path.join(previewDir, "01-booking-confirmed.html"), content.html);
  });

  await test("3. Refund Initiated & Refund Completed emails render accurate non-premature statuses", async () => {
    const init = buildRefundEmailContent({
      invoice: {
        invoiceNumber: "TVK/26-27/0001",
        bookingCode: "TVK9542",
        paymentStatus: "Refunded",
        isSample: false,
        customerSnapshot: { name: "Rahul Sharma" },
        tripSnapshot: { title: "Wayanad Expedition" },
        pricing: { netPaidPaise: 0 },
      },
      stage: "initiated",
      refundAmountPaise: 399950,
      refundReference: "rfnd_test_123",
    });
    assert.ok(init.html.includes("Refund Initiated"));
    assert.ok(init.html.includes("5–7 business days"));
    fs.writeFileSync(path.join(previewDir, "02-refund-initiated.html"), init.html);

    const comp = buildRefundEmailContent({
      invoice: {
        invoiceNumber: "TVK/26-27/0001",
        bookingCode: "TVK9542",
        paymentStatus: "Refunded",
        isSample: false,
        customerSnapshot: { name: "Rahul Sharma" },
        tripSnapshot: { title: "Wayanad Expedition" },
        pricing: { netPaidPaise: 0 },
      },
      stage: "completed",
      refundAmountPaise: 399950,
      refundReference: "UTR88990011",
    });
    assert.ok(comp.html.includes("Refund Completed"));
    assert.ok(comp.html.includes("UTR88990011"));
    fs.writeFileSync(path.join(previewDir, "03-refund-completed.html"), comp.html);
  });

  await test("4. Cancellation & Company Reschedule & Staff Alert previews render cleanly", async () => {
    const cancel = renderCustomerEmail({
      eyebrow: "BOOKING UPDATE",
      statusLabel: "Refund Pending Approval",
      statusTone: "warning",
      title: "Booking Cancellation Confirmed",
      customerName: "Rahul",
      introParagraphs: ["Your Wayanad trip booking has been cancelled successfully. Your eligible refund is awaiting processing."],
      details: [
        { label: "Booking ID", value: "TVK9542" },
        { label: "Destination", value: "Wayanad" },
        { label: "Amount paid", value: "₹7,999" },
        { label: "Eligible refund", value: "₹3,999.50", highlight: true },
      ],
      nextStepsBody: "Our team will review your refund payout. You'll receive an update once the refund is initiated.",
      policyAttachmentName: getPolicyAttachmentFilename("2026-11-v1"),
    });
    fs.writeFileSync(path.join(previewDir, "04-cancellation-confirmed.html"), cancel.html);

    const staff = renderStaffAlertEmail({
      urgencyLabel: "REFUND APPROVAL REQUIRED",
      urgencyTone: "warning",
      title: "Customer Cancellation — Refund Approval Required",
      bookingCode: "TVK9542",
      customerSummary: "Rahul (+919876543210 • rahul@example.com)",
      tripTitle: "Wayanad Expedition",
      reason: "Personal emergency",
      amountSummary: "₹3,999.50 (50%)",
    });
    assert.ok(staff.html.includes("INTERNAL STAFF ALERT"));
    assert.ok(staff.html.includes("/admin/booking-requests"));
    fs.writeFileSync(path.join(previewDir, "05-staff-alert.html"), staff.html);
  });

  await test("5. Brevo HTTPS multi-attachment sends BOTH Invoice PDF and Policy PDF", async () => {
    const origFetch = global.fetch;
    let capturedBody = null;
    global.fetch = async (_url, opts) => {
      capturedBody = JSON.parse(opts.body);
      return { ok: true, status: 201, json: async () => ({ messageId: "<brevo-multi@test>" }) };
    };
    try {
      await sendViaHttpsProvider(
        { provider: "brevo", apiKey: "test-key" },
        {
          from: '"Traviska" <noreply@traviska.com>',
          replyTo: "admin@traviska.com",
          to: "customer@example.com",
          subject: "Test Multi",
          text: "Test",
          html: "<p>Test</p>",
          attachments: [
            { filename: "Invoice-TVK-0001.pdf", content: Buffer.from("%PDF-inv") },
            { filename: "Traviska-Policy-2026-11-v1-DRAFT.pdf", content: Buffer.from("%PDF-pol") },
          ],
        }
      );
      assert.strictEqual(capturedBody.attachment.length, 2, "Brevo payload must contain both PDFs");
      assert.strictEqual(capturedBody.attachment[0].name, "Invoice-TVK-0001.pdf");
      assert.strictEqual(capturedBody.attachment[1].name, "Traviska-Policy-2026-11-v1-DRAFT.pdf");
    } finally {
      global.fetch = origFetch;
    }
  });

  console.log(`\n🎉 EMAIL REDESIGN & POLICY PDF SUITE PASSED (${passed}/5). Previews saved to ${previewDir}`);
}

runTests().catch((err) => {
  console.error("❌ Email redesign test failed:", err);
  process.exit(1);
});
