const express = require("express");
const mongoose = require("mongoose");
const Coupon = require("../models/Coupon");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");

// Seed initial coupons from existing Marketing & Campaigns section if not yet created
async function seedDefaultCoupons() {
  try {
    const existingCount = await Coupon.countDocuments();
    if (existingCount > 0) return;

    const defaultCoupons = [
      {
        code: "EXPLORE500",
        discountType: "flat",
        value: 500,
        minBookingAmount: 4000,
        validUntil: "31 Dec 2026",
        expiryDate: new Date("2026-12-31T23:59:59.999Z"),
        usageLimit: 500,
        isActive: true,
        applicableTrips: "All Trips",
        perCustomerLimit: 2,
      },
      {
        code: "COORG10",
        discountType: "percentage",
        value: 10,
        minBookingAmount: 5000,
        validUntil: "30 Nov 2026",
        expiryDate: new Date("2026-11-30T23:59:59.999Z"),
        usageLimit: 200,
        isActive: true,
        applicableTrips: "Coorg Weekend Trip",
        perCustomerLimit: 1,
      },
      {
        code: "NEWYEAR2027",
        discountType: "flat",
        value: 1000,
        minBookingAmount: 8000,
        validUntil: "05 Jan 2027",
        expiryDate: new Date("2027-01-05T23:59:59.999Z"),
        usageLimit: 100,
        isActive: true,
        applicableTrips: "All Trips",
        perCustomerLimit: 1,
      },
      {
        code: "EARLYBIRD",
        discountType: "percentage",
        value: 15,
        minBookingAmount: 6000,
        validUntil: "15 Nov 2026",
        expiryDate: new Date("2026-11-15T23:59:59.999Z"),
        usageLimit: 150,
        isActive: false,
        applicableTrips: "Gokarna & Ooty",
        perCustomerLimit: 1,
      },
    ];

    await Coupon.insertMany(defaultCoupons);
    console.log("Seeded initial Marketing & Campaigns coupons into MongoDB.");
  } catch (err) {
    console.error("Coupon seeding check error:", err.message);
  }
}

// Helper to construct phone regex matching arbitrary spaces and formatting on the last 10 digits
function buildPhoneRegex(last10Digits) {
  const pattern = last10Digits.split("").join("[\\s\\-]*");
  return new RegExp(pattern + "$");
}

// Ensure seeding check runs on load
seedDefaultCoupons();

// Helper to check trip applicability
function isTripApplicable(coupon, trip) {
  if (!coupon || !coupon.applicableTrips) return true;
  const applicable = coupon.applicableTrips.trim().toLowerCase();
  if (applicable === "all trips" || applicable === "all" || applicable === "") {
    return true;
  }

  if (!trip) return false;

  // Check explicit trip ID match
  if (Array.isArray(coupon.applicableTripIds) && coupon.applicableTripIds.length > 0) {
    const tripIdStr = String(trip._id || trip.id || trip);
    const hasIdMatch = coupon.applicableTripIds.some((id) => String(id) === tripIdStr);
    if (hasIdMatch) return true;
  }

  // Check title matching / substring keywords (e.g. "Coorg" in "Coorg Weekend Trip")
  const tripTitle = (trip.title || String(trip)).trim().toLowerCase();
  const applicableTokens = applicable.split(/[,&/|]/).map((t) => t.trim().toLowerCase()).filter(Boolean);

  return applicableTokens.some((token) => {
    // If token is "coorg weekend trip" or "coorg", check if trip title contains token or vice-versa
    const simplifiedToken = token.replace(/trip|weekend|tour|getaway/g, "").trim();
    if (tripTitle.includes(token)) return true;
    if (simplifiedToken && tripTitle.includes(simplifiedToken)) return true;
    return false;
  });
}

// Calculate discount value
function calculateCouponDiscount(coupon, bookingTotal) {
  let discountAmount = 0;
  if (coupon.discountType === "flat") {
    discountAmount = Math.min(coupon.value, bookingTotal);
  } else if (coupon.discountType === "percentage") {
    let calc = Math.round((coupon.value / 100) * bookingTotal);
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
      calc = Math.min(calc, coupon.maxDiscountAmount);
    }
    discountAmount = Math.min(calc, bookingTotal);
  }

  discountAmount = Math.max(0, discountAmount);
  const finalPayable = Math.max(0, bookingTotal - discountAmount);

  return { discountAmount, finalPayable };
}

// Core server-side validation logic
async function validateCouponForBooking({
  code,
  tripId,
  tripTitle,
  bookingAmount,
  customerPhone,
  customerEmail,
  session,
}) {
  if (!code || typeof code !== "string" || !code.trim()) {
    return { isValid: false, message: "Please provide a coupon code." };
  }

  const cleanCode = code.trim().toUpperCase();
  const total = Number(bookingAmount) || 0;

  if (total <= 0) {
    return { isValid: false, message: "Invalid booking amount." };
  }

  const query = Coupon.findOne({ code: cleanCode });
  if (session) query.session(session);
  const coupon = await query;

  if (!coupon) {
    return { isValid: false, message: `Coupon code "${cleanCode}" is not recognized.` };
  }

  // 1. Active status check
  if (!coupon.isActive) {
    return { isValid: false, message: `Coupon "${cleanCode}" is currently disabled.` };
  }

  const now = new Date();

  // 2. Scheduled start date check
  if (coupon.startDate && now < new Date(coupon.startDate)) {
    const startStr = coupon.startDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return { isValid: false, message: `Coupon "${cleanCode}" is scheduled and will activate on ${startStr}.` };
  }

  // 3. Expiry date check
  if (coupon.expiryDate && now > new Date(coupon.expiryDate)) {
    const expiryStr = coupon.validUntil || coupon.expiryDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return { isValid: false, message: `Coupon "${cleanCode}" has expired (valid until ${expiryStr}).` };
  }

  // 4. Trip applicability check
  let targetTrip = null;
  if (tripId && mongoose.isValidObjectId(tripId)) {
    targetTrip = await Trip.findById(tripId).select("title").lean();
  } else if (tripTitle) {
    targetTrip = { title: tripTitle };
  }

  if (targetTrip && !isTripApplicable(coupon, targetTrip)) {
    return {
      isValid: false,
      message: `Coupon "${cleanCode}" is only valid for ${coupon.applicableTrips}.`,
    };
  }

  // 5. Minimum booking amount check
  if (coupon.minBookingAmount && total < coupon.minBookingAmount) {
    return {
      isValid: false,
      message: `Minimum booking total of ₹${coupon.minBookingAmount.toLocaleString("en-IN")} required to use "${cleanCode}".`,
      minBookingAmount: coupon.minBookingAmount,
    };
  }

  // 6. Maximum redemptions / usage limit check
  // Count confirmed paid bookings
  const countQuery = {
    couponCode: cleanCode,
    status: { $ne: "Cancelled" },
    paymentStatus: "Paid",
  };
  const confirmedRedemptions = session
    ? await Booking.countDocuments(countQuery).session(session)
    : await Booking.countDocuments(countQuery);

  if (coupon.usageLimit && confirmedRedemptions >= coupon.usageLimit) {
    return {
      isValid: false,
      message: `Coupon "${cleanCode}" has reached its maximum redemption limit (${coupon.usageLimit}).`,
    };
  }

  // 7. Per-customer limit check
  if (coupon.perCustomerLimit && coupon.perCustomerLimit > 0) {
    const customerIdentifiers = [];
    if (customerPhone && customerPhone.trim()) {
      const cleanPhoneDigits = customerPhone.replace(/\D/g, "").slice(-10);
      if (cleanPhoneDigits.length >= 10) {
        customerIdentifiers.push({ phone: buildPhoneRegex(cleanPhoneDigits) });
      }
    }
    if (customerEmail && customerEmail.trim()) {
      customerIdentifiers.push({ email: customerEmail.trim().toLowerCase() });
    }

    if (customerIdentifiers.length > 0) {
      const customerQuery = {
        couponCode: cleanCode,
        status: { $ne: "Cancelled" },
        paymentStatus: "Paid",
        $or: customerIdentifiers,
      };
      const customerUsage = session
        ? await Booking.countDocuments(customerQuery).session(session)
        : await Booking.countDocuments(customerQuery);

      if (customerUsage >= coupon.perCustomerLimit) {
        return {
          isValid: false,
          message: `You have already used coupon "${cleanCode}" the maximum allowed number of times (${coupon.perCustomerLimit}).`,
        };
      }
    }
  }

  // 8. Calculate discount securely
  const { discountAmount, finalPayable } = calculateCouponDiscount(coupon, total);

  return {
    isValid: true,
    coupon,
    cleanCode,
    discountAmount,
    finalPayable,
    originalTotal: total,
  };
}

module.exports = function couponRoutes({ authMiddleware, adminMiddleware } = {}) {
  const router = express.Router();

  /**
   * GET /coupons/available
   * Returns list of coupons eligible for the selected trip, booking amount, and customer.
   */
  router.get("/coupons/available", async (req, res) => {
    try {
      const { tripId, amount, phone, email } = req.query;
      const bookingTotal = Number(amount) || 0;

      let trip = null;
      if (tripId && mongoose.isValidObjectId(tripId)) {
        trip = await Trip.findById(tripId).select("title price").lean();
      }

      const now = new Date();

      // Find all potentially active coupons
      const candidates = await Coupon.find({
        isActive: true,
        expiryDate: { $gte: now },
        $or: [{ startDate: null }, { startDate: { $lte: now } }],
      })
        .sort({ value: -1 })
        .lean();

      const eligibleOffers = [];

      for (const coupon of candidates) {
        // 1. Check trip applicability
        if (trip && !isTripApplicable(coupon, trip)) {
          continue;
        }

        // 2. Check total usage limit against confirmed redemptions
        const confirmedRedemptions = await Booking.countDocuments({
          couponCode: coupon.code,
          status: { $ne: "Cancelled" },
          paymentStatus: "Paid",
        });
        if (coupon.usageLimit && confirmedRedemptions >= coupon.usageLimit) {
          continue;
        }

        // 3. Check customer limit if phone or email is supplied
        if (coupon.perCustomerLimit && (phone || email)) {
          const customerIdentifiers = [];
          if (phone) {
            const cleanDigits = String(phone).replace(/\D/g, "").slice(-10);
            if (cleanDigits.length >= 10) {
              customerIdentifiers.push({ phone: buildPhoneRegex(cleanDigits) });
            }
          }
          if (email) {
            customerIdentifiers.push({ email: String(email).trim().toLowerCase() });
          }

          if (customerIdentifiers.length > 0) {
            const customerCount = await Booking.countDocuments({
              couponCode: coupon.code,
              status: { $ne: "Cancelled" },
              paymentStatus: "Paid",
              $or: customerIdentifiers,
            });
            if (customerCount >= coupon.perCustomerLimit) {
              continue;
            }
          }
        }

        // Calculate potential discount for the user's current booking total
        let estimatedDiscount = 0;
        let isAmountEligible = true;

        if (bookingTotal > 0) {
          if (coupon.minBookingAmount && bookingTotal < coupon.minBookingAmount) {
            isAmountEligible = false;
          } else {
            const calc = calculateCouponDiscount(coupon, bookingTotal);
            estimatedDiscount = calc.discountAmount;
          }
        }

        eligibleOffers.push({
          id: String(coupon._id),
          code: coupon.code,
          discountType: coupon.discountType,
          value: coupon.value,
          minBookingAmount: coupon.minBookingAmount,
          validUntil: coupon.validUntil || coupon.expiryDate.toLocaleDateString("en-IN"),
          applicableTrips: coupon.applicableTrips,
          estimatedDiscount,
          isAmountEligible,
          shortDescription:
            coupon.discountType === "flat"
              ? `₹${coupon.value} Flat OFF`
              : `${coupon.value}% OFF`,
        });
      }

      res.json({
        success: true,
        offers: eligibleOffers,
      });
    } catch (err) {
      console.error("Error fetching available coupons:", err);
      res.status(500).json({ success: false, message: "Failed to load offers." });
    }
  });

  /**
   * POST /coupons/validate
   * Validates a coupon code entered by the user and computes exact discount
   */
  router.post("/coupons/validate", async (req, res) => {
    try {
      const { code, tripId, amount, phone, email, tripTitle } = req.body;

      const validation = await validateCouponForBooking({
        code,
        tripId,
        tripTitle,
        bookingAmount: amount,
        customerPhone: phone,
        customerEmail: email,
      });

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: validation.message,
          minBookingAmount: validation.minBookingAmount,
        });
      }

      const { coupon, discountAmount, finalPayable, originalTotal } = validation;

      res.json({
        success: true,
        message: `Coupon "${coupon.code}" applied! You save ₹${discountAmount.toLocaleString("en-IN")}.`,
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          value: coupon.value,
          applicableTrips: coupon.applicableTrips,
          minBookingAmount: coupon.minBookingAmount,
          discountAmount,
          finalPayable,
          originalTotal,
        },
      });
    } catch (err) {
      console.error("Coupon validation endpoint error:", err);
      res.status(500).json({ success: false, message: "Failed to validate coupon." });
    }
  });

  /**
   * Admin Endpoints for Marketing & Campaigns section
   */
  if (authMiddleware && adminMiddleware) {
    // GET /admin/coupons - list all coupons with real-time redemption counts
    router.get("/admin/coupons", authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();

        // Calculate actual confirmed redemptions for each coupon
        const enriched = await Promise.all(
          coupons.map(async (c) => {
            const confirmedRedemptions = await Booking.countDocuments({
              couponCode: c.code,
              status: { $ne: "Cancelled" },
              paymentStatus: "Paid",
            });

            return {
              id: String(c._id),
              code: c.code,
              discountType: c.discountType,
              value: c.value,
              minBookingAmount: c.minBookingAmount || 0,
              validUntil: c.validUntil || (c.expiryDate ? new Date(c.expiryDate).toLocaleDateString("en-IN") : "No Expiry"),
              expiryDate: c.expiryDate,
              startDate: c.startDate,
              usageCount: confirmedRedemptions,
              usageLimit: c.usageLimit || 100,
              isActive: Boolean(c.isActive),
              applicableTrips: c.applicableTrips || "All Trips",
              perCustomerLimit: c.perCustomerLimit || 1,
            };
          })
        );

        res.json({ success: true, coupons: enriched });
      } catch (err) {
        console.error("Admin coupons fetch error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch coupons" });
      }
    });

    // POST /admin/coupons - create new coupon
    router.post("/admin/coupons", authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const {
          code,
          discountType,
          value,
          minBookingAmount,
          validUntil,
          usageLimit,
          applicableTrips,
        } = req.body;

        if (!code || !value || !validUntil) {
          return res.status(400).json({
            success: false,
            message: "Coupon code, value, and expiry date are required.",
          });
        }

        const cleanCode = code.trim().toUpperCase();

        const existing = await Coupon.findOne({ code: cleanCode });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: `A coupon with code "${cleanCode}" already exists.`,
          });
        }

        const expiryDate = new Date(validUntil);
        if (isNaN(expiryDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Please provide a valid expiry date.",
          });
        }
        // Set to end of day
        expiryDate.setHours(23, 59, 59, 999);

        const newCoupon = new Coupon({
          code: cleanCode,
          discountType: discountType === "percentage" ? "percentage" : "flat",
          value: Number(value),
          minBookingAmount: Number(minBookingAmount) || 0,
          validUntil: validUntil,
          expiryDate: expiryDate,
          usageLimit: Number(usageLimit) || 100,
          applicableTrips: applicableTrips?.trim() || "All Trips",
          isActive: true,
        });

        await newCoupon.save();

        res.json({
          success: true,
          message: `Coupon "${cleanCode}" created successfully.`,
          coupon: {
            id: String(newCoupon._id),
            code: newCoupon.code,
            discountType: newCoupon.discountType,
            value: newCoupon.value,
            minBookingAmount: newCoupon.minBookingAmount,
            validUntil: newCoupon.validUntil,
            usageCount: 0,
            usageLimit: newCoupon.usageLimit,
            isActive: newCoupon.isActive,
            applicableTrips: newCoupon.applicableTrips,
          },
        });
      } catch (err) {
        console.error("Create coupon error:", err);
        res.status(500).json({ success: false, message: "Failed to create coupon" });
      }
    });

    // PUT /admin/coupons/:id/toggle - toggle active status
    router.put("/admin/coupons/:id/toggle", authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);
        if (!coupon) {
          return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        coupon.isActive = !coupon.isActive;
        await coupon.save();

        res.json({
          success: true,
          isActive: coupon.isActive,
          message: `Coupon "${coupon.code}" is now ${coupon.isActive ? "Active" : "Disabled"}.`,
        });
      } catch (err) {
        console.error("Toggle coupon error:", err);
        res.status(500).json({ success: false, message: "Failed to toggle coupon status" });
      }
    });

    // DELETE /admin/coupons/:id - delete coupon
    router.delete("/admin/coupons/:id", authMiddleware, adminMiddleware, async (req, res) => {
      try {
        const { id } = req.params;
        const deleted = await Coupon.findByIdAndDelete(id);
        if (!deleted) {
          return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.json({
          success: true,
          message: `Coupon "${deleted.code}" deleted successfully.`,
        });
      } catch (err) {
        console.error("Delete coupon error:", err);
        res.status(500).json({ success: false, message: "Failed to delete coupon" });
      }
    });
  }

  return router;
};

module.exports.validateCouponForBooking = validateCouponForBooking;
module.exports.calculateCouponDiscount = calculateCouponDiscount;
