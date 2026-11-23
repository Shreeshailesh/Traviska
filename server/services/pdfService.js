const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const { formatINR } = require("./invoiceService");

const TEMPLATE_PATH = path.join(__dirname, "../templates/invoice.html");
const SECURE_PDF_DIR = path.join(__dirname, "../storage/invoices");
const LOGO_PATH_SRC = path.join(__dirname, "../../src/assets/logo.jpg");
const LOGO_PATH_PUBLIC = path.join(__dirname, "../../public/logo.jpg");

function getLogoPath() {
  if (fs.existsSync(LOGO_PATH_SRC)) return LOGO_PATH_SRC;
  if (fs.existsSync(LOGO_PATH_PUBLIC)) return LOGO_PATH_PUBLIC;
  return null;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateDisplay(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTimeDisplay(date) {
  if (!date) return "—";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return String(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadgeStyle(paymentStatus) {
  switch (paymentStatus) {
    case "Paid":
      return { className: "status-paid", bg: "#dcfce7", text: "#166534" };
    case "Partially Paid":
    case "Partially Refunded":
      return { className: "status-partial", bg: "#fef3c7", text: "#92400e" };
    case "Failed":
    case "Cancelled":
    case "Refunded":
      return { className: "status-failed", bg: "#fee2e2", text: "#991b1b" };
    default:
      return { className: "status-pending", bg: "#e2e8f0", text: "#334155" };
  }
}

function getEffectiveDisplayStatus(invoice) {
  if (invoice?.refundSettlement?.status === "Initiated") {
    return "Refund Initiated";
  }
  if (invoice?.refundSettlement?.status === "Credited") {
    return invoice.paymentStatus === "Partially Refunded"
      ? "Partially Refunded (Credited)"
      : "Refunded (Credited)";
  }
  return invoice?.paymentStatus || "Pending Payment";
}

function getDocumentTitles(invoice) {
  if (invoice.isSample) {
    if (invoice.refundSettlement?.status === "Initiated") {
      return {
        title: "INVOICE (SAMPLE)",
        subtitle: "Test Simulation — Refund Initiated",
        bannerTitle: "SAMPLE / TEST — REFUND INITIATED",
        bannerText: `Refund of ${formatINR(
          invoice.pricing.refundedAmountPaise
        )} initiated (5–7 business days). No real money was collected or refunded.`,
      };
    }
    if (invoice.refundSettlement?.status === "Credited") {
      return {
        title: "INVOICE (SAMPLE)",
        subtitle: "Test Simulation — Refund Credited",
        bannerTitle: "SAMPLE / TEST — REFUND CREDITED",
        bannerText: `Refund of ${formatINR(
          invoice.pricing.refundedAmountPaise
        )} credited. No real money was collected or refunded.`,
      };
    }
    return {
      title: "INVOICE (SAMPLE)",
      subtitle: "Test Simulation — No Actual Payment Received",
      bannerTitle: "SAMPLE / TEST — NO ACTUAL PAYMENT RECEIVED",
      bannerText:
        "This is a localhost test simulation preview. No money was collected and no real booking was confirmed.",
    };
  }
  if (invoice.paymentStatus === "Paid") {
    return {
      title: "INVOICE",
      subtitle: "Booking Confirmation & Payment Receipt",
      bannerTitle: "Payment Successful",
      bannerText:
        "Your booking is confirmed and your payment has been received in full.",
    };
  }
  if (invoice.paymentStatus === "Partially Paid") {
    return {
      title: "ADVANCE RECEIPT",
      subtitle: "Booking Advance Payment Receipt",
      bannerTitle: "Advance Payment Received",
      bannerText: `Advance of ${formatINR(
        invoice.pricing.netPaidPaise
      )} received. Remaining balance of ${formatINR(
        invoice.pricing.balanceDuePaise
      )} is due before departure.`,
    };
  }
  if (invoice.paymentStatus === "Refunded" || invoice.paymentStatus === "Partially Refunded") {
    return {
      title: "ADJUSTMENT RECEIPT",
      subtitle: "Payment & Refund Summary",
      bannerTitle: invoice.paymentStatus,
      bannerText: `Refund of ${formatINR(
        invoice.pricing.refundedAmountPaise
      )} has been recorded against this booking.`,
    };
  }
  return {
    title: "INVOICE",
    subtitle: `Booking Payment Status: ${invoice.paymentStatus}`,
    bannerTitle: invoice.paymentStatus,
    bannerText:
      "Payment is not settled in full yet. This document reflects the current booking balance.",
  };
}

/**
 * Renders safe HTML invoice preview matching the finalized Traviska invoice layout.
 */
function renderInvoiceHtml(invoice) {
  let html = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const company = invoice.companySnapshot || {};
  const titles = getDocumentTitles(invoice);
  const badge = getStatusBadgeStyle(invoice.paymentStatus);

  const logoPath = getLogoPath();
  let logoImg = "";
  if (logoPath) {
    const base64 = fs.readFileSync(logoPath).toString("base64");
    logoImg = `<img src="data:image/jpeg;base64,${base64}" alt="Traviska Logo" class="brand-logo" />`;
  }

  const regParts = [];
  if (company.gstRegistered && company.gstin) {
    regParts.push(`GSTIN: ${escapeHtml(company.gstin)}`);
  }
  if (company.pan) regParts.push(`PAN: ${escapeHtml(company.pan)}`);
  if (company.udyam) regParts.push(`Udyam: ${escapeHtml(company.udyam)}`);
  const regLinesHtml = regParts.length
    ? `<div>${regParts.join(" &bull; ")}</div>`
    : "";

  const lineItemsRows = (invoice.lineItems || [])
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.slNo)}</td>
          <td>
            <div class="item-title">${escapeHtml(item.description)}</div>
            ${item.subtext ? `<div class="item-sub">${escapeHtml(item.subtext)}</div>` : ""}
          </td>
          <td class="num">${escapeHtml(formatINR(item.amountPaise))}</td>
        </tr>`
    )
    .join("");

  const discountRow =
    invoice.pricing.discountPaise > 0
      ? `<div class="summary-row"><span>Discount</span><span>- ${escapeHtml(
          formatINR(invoice.pricing.discountPaise)
        )}</span></div>`
      : "";

  const taxRow =
    invoice.pricing.taxAmountPaise > 0
      ? `<div class="summary-row"><span>Tax (${escapeHtml(
          invoice.pricing.taxRatePercent
        )}% ${escapeHtml(invoice.pricing.taxMode)})</span><span>${escapeHtml(
          formatINR(invoice.pricing.taxAmountPaise)
        )}</span></div>`
      : "";

  const refundRow =
    invoice.pricing.refundedAmountPaise > 0
      ? `<div class="summary-row"><span>Refunded</span><span>- ${escapeHtml(
          formatINR(invoice.pricing.refundedAmountPaise)
        )}</span></div>`
      : "";

  const balanceLabel =
    invoice.pricing.refundedAmountPaise > 0
      ? "Net Amount Retained"
      : invoice.pricing.balanceDuePaise > 0
      ? "Remaining Balance Due"
      : "Total Amount Paid";
  const balanceValue =
    invoice.pricing.refundedAmountPaise > 0
      ? formatINR(invoice.pricing.netPaidPaise)
      : invoice.pricing.balanceDuePaise > 0
      ? formatINR(invoice.pricing.balanceDuePaise)
      : formatINR(invoice.pricing.netPaidPaise);
  const displayStatus = getEffectiveDisplayStatus(invoice);

  const replacements = {
    "{{SAMPLE_BANNER}}": invoice.isSample
      ? `<div class="sample-banner">SAMPLE / TEST — NO ACTUAL PAYMENT RECEIVED</div>`
      : "",
    "{{LOGO_IMG}}": logoImg,
    "{{COMPANY_BRAND}}": escapeHtml(company.brand || "TRAVISKA"),
    "{{COMPANY_TAGLINE}}": escapeHtml(company.tagline || "Travel • Explore • Experience"),
    "{{COMPANY_LEGAL_NAME}}": escapeHtml(company.legalName || "Traviska"),
    "{{COMPANY_TYPE}}": escapeHtml(company.businessType || "Partnership Firm"),
    "{{COMPANY_ADDRESS_LINE1}}": escapeHtml(company.address?.line1 || ""),
    "{{COMPANY_ADDRESS_LINE2}}": escapeHtml(company.address?.line2 || ""),
    "{{COMPANY_ADDRESS_LINE3}}": escapeHtml(company.address?.cityStatePin || ""),
    "{{COMPANY_EMAIL}}": escapeHtml(company.email || "admin@traviska.com"),
    "{{COMPANY_WEBSITE}}": escapeHtml(company.websiteDisplay || "www.traviska.com"),
    "{{COMPANY_REG_LINES}}": regLinesHtml,
    "{{INVOICE_TITLE}}": escapeHtml(titles.title),
    "{{INVOICE_SUBTITLE}}": escapeHtml(titles.subtitle),
    "{{INVOICE_NUMBER}}": escapeHtml(invoice.invoiceNumber),
    "{{INVOICE_DATE}}": escapeHtml(formatDateDisplay(invoice.issuedAt)),
    "{{CUSTOMER_NAME}}": escapeHtml(invoice.customerSnapshot?.name || "Customer"),
    "{{CUSTOMER_EMAIL}}": escapeHtml(invoice.customerSnapshot?.email || "—"),
    "{{CUSTOMER_PHONE_ROW}}": invoice.customerSnapshot?.phone
      ? `<div class="info-row"><span class="info-key">Phone</span><span class="info-val">${escapeHtml(
          invoice.customerSnapshot.phone
        )}</span></div>`
      : "",
    "{{CUSTOMER_ADDRESS_ROW}}": invoice.customerSnapshot?.billingAddress
      ? `<div class="info-row"><span class="info-key">Address</span><span class="info-val">${escapeHtml(
          invoice.customerSnapshot.billingAddress
        )}</span></div>`
      : "",
    "{{BOOKING_ID}}": escapeHtml(invoice.bookingCode),
    "{{TRIP_NAME}}": escapeHtml(invoice.tripSnapshot?.title || "—"),
    "{{TRIP_DURATION}}": escapeHtml(invoice.tripSnapshot?.duration || "—"),
    "{{TRAVEL_DATE}}": escapeHtml(invoice.tripSnapshot?.travelDate || "—"),
    "{{TRAVELLERS}}": escapeHtml(
      `${invoice.tripSnapshot?.travellers || 1} ${
        invoice.tripSnapshot?.travellers === 1 ? "Traveller" : "Travellers"
      }`
    ),
    "{{LINE_ITEMS_ROWS}}": lineItemsRows,
    "{{PAYMENT_MODE}}": escapeHtml(invoice.paymentSummary?.mode || "Online"),
    "{{PAYMENT_REFERENCE}}": escapeHtml(invoice.paymentSummary?.reference || "—"),
    "{{PAYMENT_DATE}}": escapeHtml(
      formatDateTimeDisplay(invoice.paymentSummary?.paidAt || invoice.issuedAt)
    ),
    "{{STATUS_CLASS}}": badge.className,
    "{{PAYMENT_STATUS}}": escapeHtml(displayStatus),
    "{{SUBTOTAL}}": escapeHtml(formatINR(invoice.pricing.subtotalPaise)),
    "{{DISCOUNT_ROW}}": discountRow,
    "{{TAX_ROW}}": taxRow,
    "{{TOTAL_PAYABLE}}": escapeHtml(formatINR(invoice.pricing.totalPayablePaise)),
    "{{AMOUNT_PAID}}": escapeHtml(formatINR(invoice.pricing.amountPaidPaise)),
    "{{REFUND_ROW}}": refundRow,
    "{{BALANCE_LABEL}}": escapeHtml(balanceLabel),
    "{{BALANCE_VALUE}}": escapeHtml(balanceValue),
    "{{STATUS_BANNER_TITLE}}": escapeHtml(titles.bannerTitle),
    "{{STATUS_BANNER_TEXT}}": escapeHtml(titles.bannerText),
  };

  for (const [token, val] of Object.entries(replacements)) {
    html = html.split(token).join(val);
  }

  return html;
}

/**
 * Generates an A4 vector PDF with genuine selectable text using PDFKit,
 * matching the finalized Traviska invoice layout, and stores it in a private
 * server storage folder (never public/).
 */
async function generateInvoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 38,
      info: {
        Title: `Traviska Invoice ${invoice.invoiceNumber}`,
        Author: "Traviska",
        Subject: `Invoice for Booking ${invoice.bookingCode}`,
      },
    });

    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width; // 595.28
    const left = 38;
    const right = pageWidth - 38;
    const contentWidth = right - left; // 519.28
    const darkGreen = "#114224";
    const softGreenBg = "#eef6f0";
    const borderGray = "#cbd5e1";
    const textDark = "#0f172a";
    const textBody = "#334155";
    const textMuted = "#64748b";

    // Standard PDF Helvetica fonts do not include the Unicode ₹ (U+20B9) glyph,
    // which renders as a missing-glyph box in PDF viewers. Use crisp "Rs. " for PDFKit.
    const regularFont = "Helvetica";
    const boldFont = "Helvetica-Bold";
    const money = (paise) =>
      `Rs. ${(Math.round(paise || 0) / 100).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    const pdfSafeText = (str) => String(str || "").replace(/₹/g, "Rs. ");

    let y = 34;

    // Sample banner if test/sample
    if (invoice.isSample) {
      doc
        .save()
        .roundedRect(left, y, contentWidth, 24, 4)
        .fillAndStroke("#fef2f2", "#dc2626");
      doc
        .font(boldFont)
        .fontSize(9.5)
        .fillColor("#991b1b")
        .text("SAMPLE / TEST — NO ACTUAL PAYMENT RECEIVED", left, y + 7, {
          width: contentWidth,
          align: "center",
        });
      doc.restore();
      y += 34;
    }

    // HEADER: Logo + Brand on left, Business details on right
    const logoPath = getLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, left, y, { width: 52, height: 52 });
      } catch {
        // Ignore image error if unreadable
      }
    }

    const brandX = logoPath ? left + 62 : left;
    doc
      .font(boldFont)
      .fontSize(19)
      .fillColor(darkGreen)
      .text(invoice.companySnapshot?.brand || "TRAVISKA", brandX, y + 6);
    doc
      .font(regularFont)
      .fontSize(9)
      .fillColor(textMuted)
      .text(
        invoice.companySnapshot?.tagline || "Travel • Explore • Experience",
        brandX,
        y + 29
      );

    const company = invoice.companySnapshot || {};
    const rightColW = 240;
    const rightColX = right - rightColW;
    doc
      .font(boldFont)
      .fontSize(12)
      .fillColor(textDark)
      .text(company.legalName || "Traviska", rightColX, y, {
        width: rightColW,
        align: "right",
      });
    doc
      .font(boldFont)
      .fontSize(9)
      .fillColor(darkGreen)
      .text(company.businessType || "Partnership Firm", rightColX, y + 15, {
        width: rightColW,
        align: "right",
      });
    doc
      .font(regularFont)
      .fontSize(8.2)
      .fillColor(textBody)
      .text(
        `${company.address?.line1 || ""} ${company.address?.line2 || ""}\n${
          company.address?.cityStatePin || ""
        }\n${company.email || "admin@traviska.com"} • ${
          company.websiteDisplay || "www.traviska.com"
        }`,
        rightColX,
        y + 28,
        { width: rightColW, align: "right" }
      );

    y += 72;
    doc
      .moveTo(left, y)
      .lineTo(right, y)
      .lineWidth(1.8)
      .strokeColor(darkGreen)
      .stroke();
    y += 14;

    // TITLE ROW
    const titles = getDocumentTitles(invoice);
    doc.rect(left, y, 4, 34).fill(darkGreen);
    doc
      .font(boldFont)
      .fontSize(20)
      .fillColor(darkGreen)
      .text(titles.title, left + 12, y);
    doc
      .font(regularFont)
      .fontSize(9.5)
      .fillColor(textMuted)
      .text(titles.subtitle, left + 12, y + 23);

    const metaW = 215;
    const metaX = right - metaW;
    doc.roundedRect(metaX, y - 2, metaW, 38, 4).fillAndStroke("#f8fafc", borderGray);
    doc
      .moveTo(metaX + 115, y - 2)
      .lineTo(metaX + 115, y + 36)
      .lineWidth(0.8)
      .strokeColor(borderGray)
      .stroke();

    doc
      .font(regularFont)
      .fontSize(7.5)
      .fillColor(textMuted)
      .text("INVOICE NO.", metaX + 10, y + 4)
      .text("INVOICE DATE", metaX + 125, y + 4);
    doc
      .font(boldFont)
      .fontSize(9.5)
      .fillColor(textDark)
      .text(invoice.invoiceNumber, metaX + 10, y + 16, { width: 100 })
      .text(formatDateDisplay(invoice.issuedAt), metaX + 125, y + 16, {
        width: 82,
      });

    y += 50;

    // TWO-COLUMN INFO CARDS (Billed To + Booking Details)
    const gap = 14;
    const cardW = (contentWidth - gap) / 2;
    const cardH = 104;
    const rightCardX = left + cardW + gap;

    // Left Card: Billed To
    doc.roundedRect(left, y, cardW, cardH, 4).strokeColor(borderGray).lineWidth(0.8).stroke();
    doc.rect(left, y, cardW, 22).fill(darkGreen);
    doc
      .font(boldFont)
      .fontSize(9.5)
      .fillColor("#ffffff")
      .text("Billed To", left + 10, y + 6);

    doc
      .font(boldFont)
      .fontSize(11)
      .fillColor(textDark)
      .text(invoice.customerSnapshot?.name || "Customer", left + 10, y + 30, {
        width: cardW - 20,
      });
    doc
      .font(regularFont)
      .fontSize(8.8)
      .fillColor(textBody)
      .text(`Email: ${invoice.customerSnapshot?.email || "—"}`, left + 10, y + 48, {
        width: cardW - 20,
      });
    if (invoice.customerSnapshot?.phone) {
      doc.text(`Phone: ${invoice.customerSnapshot.phone}`, left + 10, y + 62, {
        width: cardW - 20,
      });
    }
    if (invoice.customerSnapshot?.billingAddress) {
      doc.text(
        `Address: ${invoice.customerSnapshot.billingAddress}`,
        left + 10,
        y + 76,
        { width: cardW - 20 }
      );
    }

    // Right Card: Booking Details
    doc.roundedRect(rightCardX, y, cardW, cardH, 4).strokeColor(borderGray).lineWidth(0.8).stroke();
    doc.rect(rightCardX, y, cardW, 22).fill(darkGreen);
    doc
      .font(boldFont)
      .fontSize(9.5)
      .fillColor("#ffffff")
      .text("Booking Details", rightCardX + 10, y + 6);

    const bRows = [
      ["Booking ID:", invoice.bookingCode],
      ["Trip Name:", invoice.tripSnapshot?.title || "—"],
      ["Duration:", invoice.tripSnapshot?.duration || "—"],
      ["Travel Date:", invoice.tripSnapshot?.travelDate || "—"],
      [
        "Travellers:",
        `${invoice.tripSnapshot?.travellers || 1} ${
          invoice.tripSnapshot?.travellers === 1 ? "Traveller" : "Travellers"
        }`,
      ],
    ];
    let by = y + 29;
    for (const [k, v] of bRows) {
      doc.font(boldFont).fontSize(8.5).fillColor(textMuted).text(k, rightCardX + 10, by);
      doc
        .font(regularFont)
        .fontSize(8.5)
        .fillColor(textDark)
        .text(String(v), rightCardX + 76, by, { width: cardW - 86, ellipsis: true });
      by += 14;
    }

    y += cardH + 16;

    // ITEMIZED TABLE
    const drawTableHeader = (topY) => {
      doc.rect(left, topY, contentWidth, 24).fill(darkGreen);
      doc
        .font(boldFont)
        .fontSize(9)
        .fillColor("#ffffff")
        .text("Sl. No.", left + 10, topY + 7, { width: 45 })
        .text("Description", left + 60, topY + 7, { width: 320 })
        .text("Amount", right - 120, topY + 7, { width: 110, align: "right" });
      return topY + 24;
    };

    y = drawTableHeader(y);

    for (const item of invoice.lineItems || []) {
      const rowHeight = item.subtext ? 38 : 26;
      if (y + rowHeight > doc.page.height - 230) {
        doc.addPage();
        y = 38;
        y = drawTableHeader(y);
      }

      doc
        .rect(left, y, contentWidth, rowHeight)
        .strokeColor(borderGray)
        .lineWidth(0.6)
        .stroke();
      doc
        .font(regularFont)
        .fontSize(9.5)
        .fillColor(textDark)
        .text(String(item.slNo), left + 10, y + 8, { width: 45 });
      doc
        .font(boldFont)
        .fontSize(9.5)
        .fillColor(textDark)
        .text(pdfSafeText(item.description), left + 60, y + 7, { width: 320 });
      if (item.subtext) {
        doc
          .font(regularFont)
          .fontSize(8.2)
          .fillColor(textMuted)
          .text(pdfSafeText(item.subtext), left + 60, y + 21, { width: 320 });
      }
      doc
        .font(boldFont)
        .fontSize(9.5)
        .fillColor(textDark)
        .text(money(item.amountPaise), right - 120, y + 8, {
          width: 110,
          align: "right",
        });

      y += rowHeight;
    }

    y += 16;

    if (y > doc.page.height - 240) {
      doc.addPage();
      y = 38;
    }

    // LOWER TWO-COLUMN SECTION: Payment Information + Summary Box
    const payCardW = 285;
    const sumBoxW = contentWidth - payCardW - 16;
    const sumBoxX = left + payCardW + 16;

    // Payment Information Card
    doc.roundedRect(left, y, payCardW, 102, 4).strokeColor(borderGray).lineWidth(0.8).stroke();
    doc.rect(left, y, payCardW, 22).fill(softGreenBg);
    doc
      .font(boldFont)
      .fontSize(9.5)
      .fillColor(darkGreen)
      .text("Payment Information", left + 10, y + 6);

    const pRows = [
      ["Payment Mode:", invoice.paymentSummary?.mode || "Online"],
      ["Reference:", invoice.paymentSummary?.reference || "—"],
      [
        "Payment Date:",
        formatDateTimeDisplay(invoice.paymentSummary?.paidAt || invoice.issuedAt),
      ],
      ["Status:", getEffectiveDisplayStatus(invoice)],
    ];
    let py = y + 30;
    for (const [k, v] of pRows) {
      doc.font(boldFont).fontSize(8.5).fillColor(textMuted).text(k, left + 10, py);
      doc
        .font(k === "Status:" ? boldFont : regularFont)
        .fontSize(8.5)
        .fillColor(k === "Status:" ? darkGreen : textDark)
        .text(String(v), left + 92, py, { width: payCardW - 102 });
      py += 16;
    }

    // Financial Summary Box
    const sumRows = [["Subtotal", money(invoice.pricing.subtotalPaise)]];
    if (invoice.pricing.discountPaise > 0) {
      sumRows.push(["Discount", `- ${money(invoice.pricing.discountPaise)}`]);
    }
    if (invoice.pricing.taxAmountPaise > 0) {
      sumRows.push([
        `Tax (${invoice.pricing.taxRatePercent}%)`,
        money(invoice.pricing.taxAmountPaise),
      ]);
    }
    sumRows.push(["Total Payable", money(invoice.pricing.totalPayablePaise)]);
    sumRows.push(["Amount Paid", money(invoice.pricing.amountPaidPaise)]);
    if (invoice.pricing.refundedAmountPaise > 0) {
      sumRows.push([
        invoice.refundSettlement?.status === "Initiated"
          ? "Refund Initiated"
          : "Refunded",
        `- ${money(invoice.pricing.refundedAmountPaise)}`,
      ]);
    }
    const balLabel =
      invoice.pricing.refundedAmountPaise > 0
        ? "Net Retained"
        : invoice.pricing.balanceDuePaise > 0
        ? "Remaining Balance"
        : "Total Paid";
    const balVal =
      invoice.pricing.refundedAmountPaise > 0
        ? money(invoice.pricing.netPaidPaise)
        : invoice.pricing.balanceDuePaise > 0
        ? money(invoice.pricing.balanceDuePaise)
        : money(invoice.pricing.netPaidPaise);
    sumRows.push([balLabel, balVal, true]);

    const rowH = 21;
    const totalSumH = sumRows.length * rowH;
    doc
      .roundedRect(sumBoxX, y, sumBoxW, totalSumH, 4)
      .strokeColor(borderGray)
      .lineWidth(0.8)
      .stroke();

    let sy = y;
    for (const [label, val, isHighlight] of sumRows) {
      if (isHighlight) {
        doc.rect(sumBoxX, sy, sumBoxW, rowH).fill(softGreenBg);
      } else {
        doc
          .moveTo(sumBoxX, sy + rowH)
          .lineTo(sumBoxX + sumBoxW, sy + rowH)
          .lineWidth(0.5)
          .strokeColor("#e2e8f0")
          .stroke();
      }
      doc
        .font(isHighlight ? boldFont : regularFont)
        .fontSize(isHighlight ? 9.5 : 8.8)
        .fillColor(isHighlight ? darkGreen : textBody)
        .text(label, sumBoxX + 10, sy + 6, { width: 105 });
      doc
        .font(boldFont)
        .fontSize(isHighlight ? 9.5 : 8.8)
        .fillColor(isHighlight ? darkGreen : textDark)
        .text(val, sumBoxX + 100, sy + 6, {
          width: sumBoxW - 110,
          align: "right",
        });
      sy += rowH;
    }

    y = Math.max(y + 102, sy) + 14;

    // STATUS BANNER
    doc
      .roundedRect(left, y, contentWidth, 38, 4)
      .fillAndStroke(softGreenBg, "#bbf7d0");
    doc
      .font(boldFont)
      .fontSize(9.5)
      .fillColor(darkGreen)
      .text(titles.bannerTitle, left + 12, y + 7);
    doc
      .font(regularFont)
      .fontSize(8.3)
      .fillColor("#14532d")
      .text(titles.bannerText, left + 12, y + 20, { width: contentWidth - 24 });

    y += 48;

    // IMPORTANT INFORMATION BOX
    doc
      .roundedRect(left, y, contentWidth, 68, 4)
      .fillAndStroke("#f8fafc", "#e2e8f0");
    doc
      .font(boldFont)
      .fontSize(9)
      .fillColor(textDark)
      .text("Important Information", left + 12, y + 8);
    doc
      .font(regularFont)
      .fontSize(8)
      .fillColor(textMuted)
      .text(
        "• This is a computer-generated invoice and does not require a physical signature.\n" +
          "• This invoice is issued for travel and tourism services booked with Traviska.\n" +
          "• For changes, cancellations, or refund requests, refer to our policy at www.traviska.com.\n" +
          "• For billing support, contact us at admin@traviska.com.",
        left + 12,
        y + 21,
        { width: contentWidth - 24, lineGap: 2 }
      );

    y += 78;

    // FOOTER
    doc.roundedRect(left, y, contentWidth, 38, 4).fill(darkGreen);
    doc
      .font(boldFont)
      .fontSize(10.5)
      .fillColor("#ffffff")
      .text("Thank you for choosing Traviska!", left, y + 8, {
        width: contentWidth,
        align: "center",
      });
    doc
      .font(regularFont)
      .fontSize(8.5)
      .fillColor("#bbf7d0")
      .text("We look forward to travelling with you again.", left, y + 22, {
        width: contentWidth,
        align: "center",
      });

    doc.end();
  });
}

/**
 * Generates and saves the PDF to private server storage (never public/).
 * Also returns the Buffer for immediate email attachment or streaming.
 */
async function ensureInvoicePdfFile(invoice) {
  fs.mkdirSync(SECURE_PDF_DIR, { recursive: true });
  const safeName = `${invoice.invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  const fullPath = path.join(SECURE_PDF_DIR, safeName);

  const buffer = await generateInvoicePdfBuffer(invoice);
  fs.writeFileSync(fullPath, buffer);

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  invoice.pdfStorage = {
    storageType: "local_secure",
    fileName: safeName,
    relativePath: `storage/invoices/${safeName}`,
    sha256,
    sizeBytes: buffer.length,
    generatedAt: new Date(),
  };
  await invoice.save();

  return { buffer, fileName: safeName, fullPath, sha256, sizeBytes: buffer.length };
}

module.exports = {
  renderInvoiceHtml,
  generateInvoicePdfBuffer,
  ensureInvoicePdfFile,
  getLogoPath,
};
