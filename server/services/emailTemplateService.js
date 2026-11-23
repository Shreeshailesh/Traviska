const LOGO_HTTPS_URL = "https://traviska.com/logo.jpg";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getStatusPillStyle(tone = "neutral") {
  switch (tone) {
    case "success":
      return "background:#dcfce7;color:#166534;border:1px solid #bbf7d0;";
    case "warning":
      return "background:#fef3c7;color:#92400e;border:1px solid #fde68a;";
    case "danger":
      return "background:#fee2e2;color:#991b1b;border:1px solid #fecaca;";
    case "info":
      return "background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;";
    default:
      return "background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;";
  }
}

/**
 * Renders a premium, Outlook/Gmail/Apple Mail/mobile-compatible Traviska HTML email
 * matching the official dark-green + white card brand design, plus a plain-text alternative.
 */
function renderCustomerEmail({
  eyebrow = "BOOKING UPDATE",
  statusLabel = "",
  statusTone = "neutral",
  title,
  previewText = "",
  customerName = "Traveller",
  introParagraphs = [],
  details = [], // [{ label, value, highlight?: boolean }]
  nextStepsTitle = "What happens next?",
  nextStepsBody = "",
  ctaLabel = "View My Trips",
  ctaUrl = "https://traviska.com/customer/dashboard",
  policyAttachmentName = "",
  policyAttachmentNote = "",
}) {
  const safeName = escapeHtml(customerName || "Traveller");
  const safeTitle = escapeHtml(title || "Traviska Update");
  const safeEyebrow = escapeHtml(eyebrow);
  const safeStatus = escapeHtml(statusLabel);
  const pillStyle = getStatusPillStyle(statusTone);

  const introHtml = (introParagraphs || [])
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#334155;">${escapeHtml(p)}</p>`
    )
    .join("");

  const detailRowsHtml = (details || [])
    .filter((d) => d && d.label && d.value !== undefined && d.value !== null && String(d.value).trim() !== "")
    .map((d) => {
      if (d.highlight) {
        return `
          <tr>
            <td style="padding:12px 14px;border-top:1px solid #e2e8f0;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(d.label)}</td>
            <td align="right" style="padding:12px 14px;border-top:1px solid #e2e8f0;font-size:15px;font-weight:700;color:#114224;">${escapeHtml(d.value)}</td>
          </tr>`;
      }
      return `
        <tr>
          <td style="padding:8px 14px;font-size:13px;color:#64748b;">${escapeHtml(d.label)}</td>
          <td align="right" style="padding:8px 14px;font-size:13px;font-weight:600;color:#0f172a;">${escapeHtml(d.value)}</td>
        </tr>`;
    })
    .join("");

  const detailsCardHtml = detailRowsHtml
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:16px 0;">
         ${detailRowsHtml}
       </table>`
    : "";

  const nextStepsHtml = nextStepsBody
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:16px 0;">
         <tr>
           <td style="padding:14px 16px;">
             <div style="font-size:13px;font-weight:700;color:#166534;margin-bottom:4px;">${escapeHtml(nextStepsTitle)}</div>
             <div style="font-size:13px;line-height:1.5;color:#14532d;">${escapeHtml(nextStepsBody)}</div>
           </td>
         </tr>
       </table>`
    : "";

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;margin:18px 0 8px 0;">
           <tr>
             <td align="center">
               <a href="${escapeHtml(ctaUrl)}" style="display:block;width:100%;box-sizing:border-box;background:#114224;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 20px;border-radius:8px;text-align:center;">
                 ${escapeHtml(ctaLabel)}
               </a>
             </td>
           </tr>
         </table>`
      : "";

  const policyHtml = policyAttachmentName
    ? `<div style="margin:14px 0 0 0;padding:10px 12px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;font-size:12px;color:#475569;">
         <strong>Attachment:</strong> ${escapeHtml(policyAttachmentName)}
         ${policyAttachmentNote ? `<div style="margin-top:3px;color:#64748b;">${escapeHtml(policyAttachmentNote)}</div>` : ""}
       </div>`
    : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
  ${previewText ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>` : ""}
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
          <!-- BRAND HEADER -->
          <tr>
            <td align="center" style="background:#114224;padding:22px 24px;">
              <img src="${LOGO_HTTPS_URL}" alt="Traviska" width="44" height="44" style="display:block;border-radius:50%;border:2px solid rgba(255,255,255,0.25);margin:0 auto 8px auto;object-fit:cover;" />
              <div style="font-size:20px;font-weight:800;letter-spacing:1.4px;color:#ffffff;">TRAVISKA</div>
              <div style="font-size:10.5px;letter-spacing:1.6px;color:#bbf7d0;margin-top:3px;">TRAVEL • EXPLORE • EXPERIENCE</div>
            </td>
          </tr>

          <!-- BODY CARD -->
          <tr>
            <td style="padding:26px 24px 20px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:10px;">
                <tr>
                  <td style="font-size:11px;font-weight:700;letter-spacing:0.8px;color:#64748b;text-transform:uppercase;">${safeEyebrow}</td>
                  ${
                    safeStatus
                      ? `<td align="right"><span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;${pillStyle}">${safeStatus}</span></td>`
                      : ""
                  }
                </tr>
              </table>

              <h1 style="margin:0 0 14px 0;font-size:20px;line-height:1.3;font-weight:800;color:#114224;">${safeTitle}</h1>
              <p style="margin:0 0 12px 0;font-size:14px;color:#0f172a;">Dear <strong>${safeName}</strong>,</p>
              ${introHtml}
              ${detailsCardHtml}
              ${nextStepsHtml}
              ${ctaHtml}
              ${policyHtml}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding:18px 24px 22px 24px;border-top:1px solid #e2e8f0;background:#ffffff;">
              <div style="font-size:13px;font-weight:700;color:#0f172a;">Team Traviska</div>
              <div style="font-size:11.5px;color:#64748b;margin-top:2px;">Travel • Explore • Experience</div>
              <div style="font-size:12px;color:#475569;margin-top:6px;">
                <a href="https://traviska.com" style="color:#114224;text-decoration:none;">https://traviska.com</a> &nbsp;•&nbsp;
                <a href="mailto:admin@traviska.com" style="color:#114224;text-decoration:none;">admin@traviska.com</a>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Copyright &copy; 2026 Traviska. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `TRAVISKA — ${title}`,
    statusLabel ? `Status: ${statusLabel}` : "",
    "",
    `Dear ${customerName || "Traveller"},`,
    ...(introParagraphs || []),
    "",
    ...(details || []).map((d) => `${d.label}: ${d.value}`),
    nextStepsBody ? `\n${nextStepsTitle}\n${nextStepsBody}` : "",
    ctaUrl ? `\n${ctaLabel}: ${ctaUrl}` : "",
    policyAttachmentName ? `\nAttachment: ${policyAttachmentName} ${policyAttachmentNote ? `(${policyAttachmentNote})` : ""}` : "",
    "\nTeam Traviska\nTravel • Explore • Experience\nWebsite: https://traviska.com\nSupport: admin@traviska.com",
  ].filter((l) => l !== "");

  return { html, text: textLines.join("\n") };
}

/**
 * Compact operational layout for internal Traviska Admin/Staff alerts.
 */
function renderStaffAlertEmail({
  urgencyLabel = "ACTION REQUIRED",
  urgencyTone = "warning",
  title,
  bookingCode,
  customerSummary,
  tripTitle,
  amountSummary = "",
  reason = "",
  actionRequired = "",
  adminUrl = "https://traviska.com/admin/booking-requests",
}) {
  return renderCustomerEmail({
    eyebrow: "INTERNAL STAFF ALERT",
    statusLabel: urgencyLabel,
    statusTone: urgencyTone,
    title,
    customerName: "Traviska Operations Team",
    introParagraphs: [actionRequired || "An operational event requires review in Regular Admin."],
    details: [
      { label: "Booking ID", value: bookingCode || "—" },
      { label: "Trip", value: tripTitle || "—" },
      { label: "Customer", value: customerSummary || "—" },
      ...(reason ? [{ label: "Reason", value: reason }] : []),
      ...(amountSummary ? [{ label: "Financial / Refund", value: amountSummary, highlight: true }] : []),
    ],
    nextStepsTitle: "Action Required",
    nextStepsBody: "Open Regular Admin → Booking Requests to review, approve, or resolve this item.",
    ctaLabel: "Open Admin Booking Requests",
    ctaUrl: adminUrl,
  });
}

module.exports = {
  LOGO_HTTPS_URL,
  escapeHtml,
  renderCustomerEmail,
  renderStaffAlertEmail,
};
