/**
 * Traviska Controlled Single-Recipient WhatsApp Template Test Runner
 *
 * SAFETY GUARANTEES:
 * - Zero MongoDB connection (pure in-memory TEST-TVK sample invoice; never touches production DB)
 * - Defaults to --dry-run (mocked Meta API fetch; sends ZERO real messages)
 * - Live send requires ALL THREE explicit flags: --send --to <E.164/10-digit> --confirm-opt-in
 * - Single recipient only (no bulk messaging)
 * - Clearly marked SAMPLE / TEST invoice (no real payment implied)
 *
 * Usage:
 *   Dry-run all 3 approved templates (mocked, no network):
 *     node server/scripts/test-whatsapp-controlled.js --to +91XXXXXXXXXX
 *
 *   Live single-recipient test (to YOUR OWN opted-in WhatsApp number):
 *     node server/scripts/test-whatsapp-controlled.js --send --confirm-opt-in --to +91XXXXXXXXXX --template invoice
 *     (--template supports: invoice | refund_initiated | refund_completed)
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { getCompanyProfile } = require("../config/companyProfile");
const { rupeesToPaise, calculateInvoicePricing } = require("../services/invoiceService");
const { generateInvoicePdfBuffer } = require("../services/pdfService");
const {
  parseAndValidatePhone,
  isWhatsAppConfigured,
  prepareWhatsAppPreview,
  sendOrPrepareWhatsAppRefund,
} = require("../services/whatsappService");

function parseArgs(argv) {
  const args = {
    send: false,
    confirmOptIn: false,
    to: "",
    template: "all",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--send") args.send = true;
    else if (a === "--confirm-opt-in") args.confirmOptIn = true;
    else if (a === "--to" && argv[i + 1]) {
      args.to = argv[i + 1];
      i += 1;
    } else if (a === "--template" && argv[i + 1]) {
      args.template = argv[i + 1].trim().toLowerCase();
      i += 1;
    }
  }
  if (args.send && args.template === "all") {
    args.template = "invoice";
  }
  return args;
}

function buildSampleInvoice({ recipientPhone, stage = "invoice" }) {
  const isRefund = stage === "refund_initiated" || stage === "refund_completed";
  const calc = calculateInvoicePricing({
    travellers: 2,
    packagePricePaise: rupeesToPaise(6999),
    discountPaise: rupeesToPaise(1000),
    amountPaidPaise: rupeesToPaise(12998),
    refundedAmountPaise: isRefund ? rupeesToPaise(12998) : 0,
  });

  return {
    _id: "sample_controlled_wa_test_001",
    invoiceNumber: "TEST-TVK/26-27/0001",
    environment: "test",
    isSample: true,
    documentType: "SAMPLE_INVOICE",
    financialYear: "26-27",
    bookingCode: "TEST-BK-0001",
    customerSnapshot: {
      name: "Shailesh (Sample Test)",
      email: "admin@traviska.com",
      phone: recipientPhone,
      billingAddress: "Bengaluru, Karnataka",
    },
    tripSnapshot: {
      title: "Coorg Group Trip (Sample Preview)",
      location: "Coorg, Karnataka",
      duration: "3 Days / 2 Nights",
      travelDate: "15 Dec 2026 - 17 Dec 2026",
      travellers: 2,
      packagePricePaise: rupeesToPaise(6999),
    },
    lineItems: [
      {
        slNo: 1,
        description: "Coorg Group Trip (Sample Preview) – 3 Days / 2 Nights",
        subtext: "2 Travellers × ₹6,999.00",
        quantity: 2,
        unitPricePaise: rupeesToPaise(6999),
        amountPaise: rupeesToPaise(13998),
      },
    ],
    pricing: calc.pricing,
    paymentStatus: calc.paymentStatus,
    paymentSummary: {
      mode: "Sample Preview (No Payment Collected)",
      reference: "TEST_REF_0001",
      paidAt: new Date(),
      paymentType: "Full",
    },
    refundSettlement:
      stage === "refund_initiated"
        ? { status: "Initiated", refundReference: "TEST_REFUND_0001", initiatedAt: new Date() }
        : stage === "refund_completed"
        ? {
            status: "Credited",
            refundReference: "TEST_REFUND_0001",
            initiatedAt: new Date(),
            creditedAt: new Date(),
          }
        : { status: "Not Applicable" },
    companySnapshot: getCompanyProfile(),
    whatsappDelivery: {
      status: "Queued",
      optIn: true,
      dispatchedEventKeys: [],
      attempts: [],
    },
    issuedAt: new Date(),
    async save() {
      return this;
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rawPhone = args.to || "9876543210";

  if (rawPhone.includes(",") || rawPhone.includes(";")) {
    console.error("❌ Bulk messaging is strictly forbidden. Provide a single test number only.");
    process.exit(1);
  }

  const parsedPhone = parseAndValidatePhone(rawPhone);
  if (!parsedPhone.valid) {
    console.error(`❌ Invalid recipient phone "${rawPhone}": ${parsedPhone.reason}`);
    process.exit(1);
  }

  if (args.send) {
    if (!args.to) {
      console.error("❌ Live --send requires an explicit --to <YOUR_OWN_WHATSAPP_NUMBER>.");
      process.exit(1);
    }
    if (!args.confirmOptIn) {
      console.error("❌ Live --send requires --confirm-opt-in confirming this is your own opted-in test number.");
      process.exit(1);
    }
    if (!isWhatsAppConfigured()) {
      console.error("❌ WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing in server/.env.");
      process.exit(1);
    }
  }

  const templatesToRun =
    args.template === "all"
      ? ["invoice", "refund_initiated", "refund_completed"]
      : [args.template];

  const validChoices = ["invoice", "refund_initiated", "refund_completed"];
  for (const t of templatesToRun) {
    if (!validChoices.includes(t)) {
      console.error(`❌ Unknown --template "${t}". Use: invoice | refund_initiated | refund_completed`);
      process.exit(1);
    }
  }

  const originalFetch = global.fetch;
  const capturedPayloads = [];

  if (!args.send) {
    // Dry-run mode: mock Meta API calls (zero live messages sent)
    if (!process.env.WHATSAPP_API_TOKEN) process.env.WHATSAPP_API_TOKEN = "dry_run_mock_token";
    if (!process.env.WHATSAPP_PHONE_NUMBER_ID) process.env.WHATSAPP_PHONE_NUMBER_ID = "1448850551644650";

    global.fetch = async (url, opts) => {
      if (String(url).includes("/media")) {
        return {
          ok: true,
          json: async () => ({ id: "dry_run_media_pdf_id" }),
        };
      }
      const parsedBody = JSON.parse(opts.body);
      capturedPayloads.push({ url: String(url), body: parsedBody });
      return {
        ok: true,
        json: async () => ({ messages: [{ id: `wamid.DRYRUN_${capturedPayloads.length}` }] }),
      };
    };
  }

  try {
    console.log(
      args.send
        ? "🚀 LIVE CONTROLLED WHATSAPP TEST (Single Opted-In Recipient, Zero DB Writes)"
        : "🧪 DRY-RUN MOCKED WHATSAPP TEMPLATE VALIDATION (Zero Network / Zero DB Writes)"
    );
    console.log(`   Sender Phone Number ID : ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
    console.log(`   Recipient (E.164)      : ${parsedPhone.e164}`);
    console.log(`   Template Language      : ${process.env.WHATSAPP_TEMPLATE_LANG || "en"}\n`);

    for (const tpl of templatesToRun) {
      const invoice = buildSampleInvoice({ recipientPhone: parsedPhone.e164, stage: tpl });
      const pdfBuffer = await generateInvoicePdfBuffer(invoice);
      const pdfFileName = "TEST-TVK-26-27-0001.pdf";

      if (!pdfBuffer.toString("latin1").startsWith("%PDF-")) {
        throw new Error(`Generated PDF invalid for ${tpl}`);
      }

      let result;
      if (tpl === "invoice") {
        result = await prepareWhatsAppPreview({
          invoice,
          baseUrl: "https://traviska.com",
          pdfBuffer,
          pdfFileName,
          optInConfirmed: true,
        });
      } else if (tpl === "refund_initiated") {
        result = await sendOrPrepareWhatsAppRefund({
          invoice,
          stage: "initiated",
          refundAmountPaise: rupeesToPaise(12998),
          refundReference: "TEST_REFUND_0001",
          baseUrl: "https://traviska.com",
          optInConfirmed: true,
        });
      } else {
        result = await sendOrPrepareWhatsAppRefund({
          invoice,
          stage: "completed",
          refundAmountPaise: rupeesToPaise(12998),
          refundReference: "TEST_REFUND_0001",
          baseUrl: "https://traviska.com",
          pdfBuffer,
          pdfFileName,
          optInConfirmed: true,
        });
      }

      console.log(`=== TEMPLATE TEST: ${tpl} ===`);
      console.log(`   Template Name : ${invoice.whatsappDelivery.templateName}`);
      console.log(`   Status        : ${result.status}`);
      console.log(`   Message ID    : ${result.messageId || "—"}`);
      console.log(`   PDF Bytes     : ${tpl === "refund_initiated" ? "None (by design)" : `${pdfBuffer.length} bytes`}`);
      if (result.error) {
        console.log(`   Error         : [${result.errorCode || ""}] ${result.error}`);
      }
      if (!args.send && capturedPayloads.length > 0) {
        const last = capturedPayloads[capturedPayloads.length - 1];
        console.log("   Mock Payload  :", JSON.stringify(last.body, null, 2));
      }
      console.log("");
    }
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((err) => {
  console.error("❌ Controlled WhatsApp test failed:", err.message);
  process.exit(1);
});
