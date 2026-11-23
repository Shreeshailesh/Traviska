const POLICY_VERSION = "2026-11-v1";

/**
 * Parses a trip departure date into an exact IST timestamp (default 21:00 IST if time-of-day omitted,
 * matching standard Bangalore overnight departures, or exact ISO timestamp if provided).
 */
function parseDepartureIST(dateInput) {
  if (!dateInput) return null;
  if (dateInput instanceof Date && !Number.isNaN(dateInput.getTime())) {
    return dateInput;
  }
  const str = String(dateInput).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T21:00:00.000+05:30`);
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getHoursBeforeDeparture(departureDate, now = new Date()) {
  const dep = parseDepartureIST(departureDate);
  if (!dep) return null;
  return (dep.getTime() - now.getTime()) / (1000 * 60 * 60);
}

/**
 * Customer-initiated cancellation refund calculation (IST boundary-safe, no overlaps/gaps).
 * - >= 360 hours (15+ days): 90% refund (10% fee)
 * - >= 168 and < 360 hours (7 to <15 days): 50% refund (50% fee)
 * - >= 72 and < 168 hours (72h to <7 days): 25% refund (75% fee)
 * - < 72 hours: 0% refund (100% fee)
 */
function calculateCancellationRefund({
  amountPaidRupees,
  departureDate,
  source = "Customer",
  now = new Date(),
}) {
  const paid = Math.max(0, Math.round(Number(amountPaidRupees) || 0));
  const hoursBefore = getHoursBeforeDeparture(departureDate, now);

  if (source === "Traviska") {
    return {
      policyVersion: POLICY_VERSION,
      source: "Traviska",
      hoursBeforeDeparture: hoursBefore,
      tierLabel: "Company-initiated cancellation before departure (100% refund)",
      refundPercentage: 100,
      cancellationFeeRupees: 0,
      eligibleRefundRupees: paid,
      amountPaidRupees: paid,
      deductionExplanation: "No cancellation fee or deduction applies for Traviska-initiated trip cancellations.",
    };
  }

  let refundPercentage = 0;
  let tierLabel = "Less than 72 hours before departure (0% refund)";
  if (hoursBefore !== null) {
    if (hoursBefore >= 360) {
      refundPercentage = 90;
      tierLabel = "15 days or more before departure (90% refund)";
    } else if (hoursBefore >= 168) {
      refundPercentage = 50;
      tierLabel = "7 days to less than 15 days before departure (50% refund)";
    } else if (hoursBefore >= 72) {
      refundPercentage = 25;
      tierLabel = "72 hours to less than 7 days before departure (25% refund)";
    }
  }

  const eligibleRefundRupees = Math.round((paid * refundPercentage) / 100);
  const cancellationFeeRupees = Math.max(0, paid - eligibleRefundRupees);

  return {
    policyVersion: POLICY_VERSION,
    source: "Customer",
    hoursBeforeDeparture: hoursBefore !== null ? Math.round(hoursBefore * 10) / 10 : null,
    tierLabel,
    refundPercentage,
    cancellationFeeRupees,
    eligibleRefundRupees,
    amountPaidRupees: paid,
    deductionExplanation:
      cancellationFeeRupees > 0
        ? `₹${cancellationFeeRupees.toLocaleString("en-IN")} cancellation charge (${100 - refundPercentage}%) deducted from ₹${paid.toLocaleString("en-IN")} actually paid.`
        : "Full eligible refund with no deduction.",
  };
}

/**
 * Customer-requested rescheduling fee & price-difference calculation.
 * - First reschedule >= 168h (7+ days): ₹0 fee
 * - 72h <= hours < 168h OR 2nd+ reschedule: ₹499 per traveller (never stacked twice)
 * - < 72h: normally unavailable (requires Admin review exception)
 */
function calculateRescheduleBreakdown({
  departureDate,
  travellers = 1,
  priorRescheduleCount = 0,
  oldUnitPrice = 0,
  newUnitPrice = 0,
  isCompanyInitiated = false,
  now = new Date(),
}) {
  const pax = Math.max(1, Number(travellers) || 1);
  const hoursBefore = getHoursBeforeDeparture(departureDate, now);

  if (isCompanyInitiated) {
    return {
      policyVersion: POLICY_VERSION,
      eligible: true,
      requiresAdminApproval: false,
      hoursBeforeDeparture: hoursBefore,
      rescheduleFeePerTraveller: 0,
      rescheduleFeeTotal: 0,
      priceDifferenceTotal: 0,
      netPayableExtra: 0,
      netRefundDue: 0,
      ruleSummary: "Company-initiated reschedule: ₹0 rescheduling fee and ₹0 extra charge for an equivalent package.",
    };
  }

  const isUnder72h = hoursBefore === null || hoursBefore < 72;
  const isFirstReschedule = Number(priorRescheduleCount || 0) === 0;
  const isFreeTier = isFirstReschedule && hoursBefore !== null && hoursBefore >= 168;

  // Never stack multiple ₹499 charges for the same event
  const rescheduleFeePerTraveller = isFreeTier ? 0 : 499;
  const rescheduleFeeTotal = rescheduleFeePerTraveller * pax;

  const priceDifferenceTotal = Math.round((Number(newUnitPrice) - Number(oldUnitPrice)) * pax);
  const netDelta = rescheduleFeeTotal + priceDifferenceTotal;

  return {
    policyVersion: POLICY_VERSION,
    eligible: !isUnder72h,
    requiresAdminApproval: isUnder72h,
    hoursBeforeDeparture: hoursBefore !== null ? Math.round(hoursBefore * 10) / 10 : null,
    rescheduleFeePerTraveller,
    rescheduleFeeTotal,
    priceDifferenceTotal,
    netPayableExtra: netDelta > 0 ? netDelta : 0,
    netRefundDue: netDelta < 0 ? Math.abs(netDelta) : 0,
    ruleSummary: isUnder72h
      ? "Rescheduling less than 72 hours before departure is normally unavailable; submit for Admin exception review (₹499/traveller if approved)."
      : isFreeTier
      ? "First reschedule 7+ days before departure: ₹0 Traviska rescheduling fee."
      : "₹499 per traveller rescheduling fee applies (applied once).",
  };
}

const OFFICIAL_CANCELLATION_POLICY = {
  version: POLICY_VERSION,
  legalApprovalStatus: "PENDING_LEGAL_REVIEW",
  legalReviewNote:
    "Pending formal legal compliance review, including India's Consumer Protection (E-Commerce) Rules and subsequent amendments. Existing bookings retain the policy terms accepted at booking time.",
  customerCancellationTiers: [
    { window: "15 days or more before departure (IST)", refundPercent: 90, feePercent: 10 },
    { window: "7 days to less than 15 days before departure (IST)", refundPercent: 50, feePercent: 50 },
    { window: "72 hours to less than 7 days before departure (IST)", refundPercent: 25, feePercent: 75 },
    { window: "Less than 72 hours before departure (IST)", refundPercent: 0, feePercent: 100 },
  ],
  companyCancellationRule:
    "If Traviska cancels an entire trip before departure for any reason (insufficient travellers, severe weather, floods/landslides, government restrictions, road closures, safety, vehicle/accommodation/operational issues), affected customers receive a 100% refund of the amount paid including booking/convenience fees, or may voluntarily accept an alternative date.",
  customerRescheduleRules: [
    "First reschedule requested 7+ days before departure: ₹0 Traviska rescheduling fee.",
    "Reschedule requested 72 hours to <7 days before departure, or second/subsequent reschedule: ₹499 per traveller (never stacked).",
    "Less than 72 hours before departure: normally unavailable; Admin may review exceptions.",
    "Subject to available seats and any disclosed package price difference.",
  ],
  companyRescheduleRules: [
    "Option 1: Accept the new departure date with ₹0 rescheduling fee and ₹0 extra charge for an equivalent package.",
    "Option 2: Cancel with ₹0 fee and receive a 100% refund of the amount paid.",
    "No automatic acceptance if the customer does not respond.",
  ],
};

module.exports = {
  POLICY_VERSION,
  parseDepartureIST,
  getHoursBeforeDeparture,
  calculateCancellationRefund,
  calculateRescheduleBreakdown,
  OFFICIAL_CANCELLATION_POLICY,
};
