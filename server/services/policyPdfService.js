const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { OFFICIAL_CANCELLATION_POLICY, POLICY_VERSION } = require("./cancellationPolicyService");

const pdfCache = new Map();

function findLogoPath() {
  const candidates = [
    path.join(__dirname, "../../src/assets/logo.jpg"),
    path.join(__dirname, "../../public/logo.jpg"),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * Generates a branded A4 Cancellation, Refund & Rescheduling Policy PDF buffer.
 * Marks DRAFT clearly while legalApprovalStatus === "PENDING_LEGAL_REVIEW".
 */
function generatePolicyPdfBuffer({ policyVersion = POLICY_VERSION } = {}) {
  const isPendingLegal = OFFICIAL_CANCELLATION_POLICY.legalApprovalStatus === "PENDING_LEGAL_REVIEW";
  const cacheKey = `${policyVersion}:${isPendingLegal ? "draft" : "final"}`;
  if (pdfCache.has(cacheKey)) {
    return Promise.resolve(pdfCache.get(cacheKey));
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 46 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => {
      const buf = Buffer.concat(chunks);
      pdfCache.set(cacheKey, buf);
      resolve(buf);
    });
    doc.on("error", reject);

    // Header band
    doc.rect(0, 0, 595.28, 86).fill("#114224");
    const logoPath = findLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, 46, 20, { width: 44, height: 44 });
      } catch {
        // Ignore image failure
      }
    }
    doc
      .fillColor("#ffffff")
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("TRAVISKA", 102, 24)
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#bbf7d0")
      .text("TRAVEL • EXPLORE • EXPERIENCE", 102, 46);

    if (isPendingLegal) {
      doc
        .rect(46, 98, 503, 26)
        .fill("#fef2f2")
        .stroke("#dc2626");
      doc
        .fillColor("#991b1b")
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text("DRAFT — NOT FOR CUSTOMER DISTRIBUTION (PENDING LEGAL REVIEW)", 56, 107);
    }

    let y = isPendingLegal ? 138 : 104;
    doc
      .fillColor("#114224")
      .font("Helvetica-Bold")
      .fontSize(15)
      .text("Cancellation, Refund & Rescheduling Policy", 46, y);

    y += 22;
    doc
      .fillColor("#475569")
      .font("Helvetica")
      .fontSize(9.5)
      .text(`Policy Version: ${policyVersion}   |   Effective Date: November 2026   |   Support: admin@traviska.com`, 46, y);

    y += 22;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("1. Customer-Initiated Cancellation (IST Departure Time)", 46, y);
    y += 16;

    for (const tier of OFFICIAL_CANCELLATION_POLICY.customerCancellationTiers) {
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#334155")
        .text(`• ${tier.window}: ${tier.refundPercent}% refund (${tier.feePercent}% cancellation fee)`, 54, y);
      y += 15;
    }

    y += 10;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("2. Company-Initiated Trip Cancellation", 46, y);
    y += 15;
    doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(OFFICIAL_CANCELLATION_POLICY.companyCancellationRule, 46, y, { width: 503 });
    y += 42;

    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("3. Customer-Requested Rescheduling", 46, y);
    y += 16;
    for (const rule of OFFICIAL_CANCELLATION_POLICY.customerRescheduleRules) {
      doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(`• ${rule}`, 54, y, { width: 495 });
      y += 16;
    }

    y += 10;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("4. Company-Initiated Rescheduling Options", 46, y);
    y += 16;
    for (const rule of OFFICIAL_CANCELLATION_POLICY.companyRescheduleRules) {
      doc.font("Helvetica").fontSize(9.5).fillColor("#334155").text(`• ${rule}`, 54, y, { width: 495 });
      y += 16;
    }

    y += 10;
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(11).text("5. Refund Approval & Processing", 46, y);
    y += 15;
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .fillColor("#334155")
      .text(
        "Eligible refunds are calculated against the actual amount paid to Traviska and reviewed for Admin payout approval before initiation via the original payment method or verified bank transfer.",
        46,
        y,
        { width: 503 }
      );

    // Footer
    doc
      .fontSize(8.5)
      .fillColor("#64748b")
      .text("Traviska | Travel • Explore • Experience | https://traviska.com | admin@traviska.com | Copyright © 2026 Traviska", 46, 780, {
        align: "center",
        width: 503,
      });

    doc.end();
  });
}

function getPolicyAttachmentFilename(policyVersion = POLICY_VERSION) {
  const isDraft = OFFICIAL_CANCELLATION_POLICY.legalApprovalStatus === "PENDING_LEGAL_REVIEW";
  return isDraft
    ? `Traviska-Policy-${policyVersion}-DRAFT.pdf`
    : `Traviska-Cancellation-Refund-Policy-${policyVersion}.pdf`;
}

module.exports = {
  generatePolicyPdfBuffer,
  getPolicyAttachmentFilename,
};
