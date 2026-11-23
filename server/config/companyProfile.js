/**
 * Configurable Traviska Business & Tax Profile
 * Verified against production business profile before live invoice issuance.
 * Never invent GSTIN, PAN, Udyam numbers, or arbitrary tax rates.
 */

function getCompanyProfile() {
  const gstRegistered = process.env.TRAVISKA_GST_REGISTERED === "true";
  const gstin = (process.env.TRAVISKA_GSTIN || "").trim();
  const pan = (process.env.TRAVISKA_PAN || "").trim();
  const udyam = (process.env.TRAVISKA_UDYAM || "").trim();
  const taxRatePercent = gstRegistered
    ? Math.max(0, Number(process.env.TRAVISKA_TAX_RATE_PERCENT || 0))
    : 0;
  const taxMode =
    process.env.TRAVISKA_TAX_MODE === "inclusive" ? "inclusive" : "exclusive";

  return {
    brand: "TRAVISKA",
    legalName: "Traviska",
    businessType: "Partnership Firm",
    tagline: "Travel • Explore • Experience",
    website: "https://traviska.com",
    websiteDisplay: "www.traviska.com",
    email: "admin@traviska.com",
    address: {
      line1: "93, 10th Main Road, Begur Road,",
      line2: "Hongasandra, Bengaluru,",
      cityStatePin: "Karnataka 560114, India",
      full: "93, 10th Main Road, Begur Road, Hongasandra, Bengaluru, Karnataka 560114, India",
    },
    gstRegistered,
    gstin,
    pan,
    udyam,
    taxRatePercent,
    taxMode: gstRegistered && taxRatePercent > 0 ? taxMode : "none",
    financialYearStartMonth: 4, // April (India FY: Apr - Mar)
  };
}

/**
 * Checks whether mandatory legal & tax details are confirmed before issuing
 * real LIVE invoices. Sample/test previews are always allowed.
 */
function validateLiveIssuanceProfile(profile = getCompanyProfile()) {
  const missing = [];
  if (!profile.pan) {
    missing.push("TRAVISKA_PAN (Partnership Firm PAN not configured)");
  }
  if (!profile.udyam) {
    missing.push("TRAVISKA_UDYAM (Udyam registration number not configured)");
  }
  if (process.env.TRAVISKA_GST_REGISTERED === undefined) {
    missing.push(
      "TRAVISKA_GST_REGISTERED (GST registration status must be explicitly confirmed as true/false)"
    );
  }
  if (profile.gstRegistered && !profile.gstin) {
    missing.push("TRAVISKA_GSTIN (GSTIN required when GST registered is true)");
  }

  return {
    readyForLiveIssuance: missing.length === 0,
    missingFields: missing,
  };
}

module.exports = {
  getCompanyProfile,
  validateLiveIssuanceProfile,
};

