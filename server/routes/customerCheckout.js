const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");
const Coupon = require("../models/Coupon");
const PaymentEvent = require("../models/PaymentEvent");
const { validateCouponForBooking } = require("./coupons");
const { rupeesToPaise, paiseToRupees, formatINR } = require("../services/invoiceService");
const { parseAndValidatePhone } = require("../services/whatsappService");
const { getGatewayAdapter } = require("../services/paymentGatewayAdapter");
const { issueInvoiceAndNotifyForBooking } = require("../services/bookingInvoiceHook");

/**
 * Customer Checkout & Dev Payment Simulator Routes
 *
 * - POST /api/customer/checkout/create-pending : Creates a Pending booking after validating
 *   Firebase customer auth, trip, departure slot capacity, pickup location, coupon, and pricing.
 * - POST /api/customer/checkout/simulate-payment : Strictly development-only payment simulator
 *   that refuses to run in production OR against the shared production "test" database.
 */
module.exports = function customerCheckoutRoutes({ authMiddleware }) {
  const router = express.Router();

  const isProduction = () => process.env.NODE_ENV === "production";

  function getConnectedDbName() {
    return mongoose.connection?.db?.databaseName || "";
  }

  function isDatabaseIsolatedForSimulation() {
    if (process.env.ALLOW_SIMULATOR_ON_TEST_DB === "true") return false; // Never bypass isolation
    const dbName = getConnectedDbName();
    // "test" on cluster0.tanmtps.mongodb.net holds live records; block simulator writes to it.
    if (dbName === "test") return false;
    return true;
  }

  function assertCustomerRole(req, res) {
    if (req.user?.role !== "customer" || !req.currentUser) {
      res.status(403).json({
        success: false,
        message: "Customer authentication required.",
      });
      return false;
    }
    return true;
  }

  router.get("/api/customer/checkout/config", (req, res) => {
    const gatewayProvider = (process.env.PAYMENT_GATEWAY_PROVIDER || "").trim();
    const gatewayConnected = Boolean(gatewayProvider && gatewayProvider !== "simulator");
    const dbName = getConnectedDbName();
    const dbIsolated = isDatabaseIsolatedForSimulation();

    res.json({
      success: true,
      environment: isProduction() ? "production" : "development",
      simulatorEnabled: !isProduction(),
      dbIsolated,
      databaseName: isProduction() ? undefined : dbName,
      gatewayConnected,
    });
  });

  // 1. Create a Pending Customer Booking (no seat deduction or invoice until verified payment)
  router.post("/api/customer/checkout/create-pending", authMiddleware, async (req, res) => {
    if (!assertCustomerRole(req, res)) return;

    try {
      const {
        tripId,
        slotId,
        travellers,
        travellerDetails,
        pickupLocationId,
        couponCode,
        name,
        email,
        phone,
        requests,
        whatsappOptIn,
        checkoutRequestId,
      } = req.body || {};

      const cleanName = String(name || "").trim();
      const cleanEmail = String(email || "").trim().toLowerCase();
      const cleanPhone = String(phone || "").trim();

      if (!cleanName || !cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: "A valid customer name and email address are required.",
        });
      }

      const parsedPhone = parseAndValidatePhone(cleanPhone);
      if (!parsedPhone.valid) {
        return res.status(400).json({
          success: false,
          message: parsedPhone.reason || "A valid mobile phone number is required.",
        });
      }

      const reqKey = String(checkoutRequestId || "").trim();
      if (reqKey) {
        const existing = await Booking.findOne({
          checkoutRequestId: reqKey,
          customerId: req.currentUser._id,
        });
        if (existing) {
          return res.json({
            success: true,
            duplicatePrevented: true,
            booking: existing,
            pricing: {
              originalTotal: existing.originalTotal ?? existing.total,
              discountAmount: existing.discountAmount || 0,
              finalPayable: existing.total,
              couponCode: existing.couponCode || null,
            },
          });
        }
      }

      const travellerCount = Number(travellers);
      if (!Number.isSafeInteger(travellerCount) || travellerCount < 1 || travellerCount > 50) {
        return res.status(400).json({
          success: false,
          message: "Traveller count must be a valid integer between 1 and 50.",
        });
      }

      if (!mongoose.isValidObjectId(tripId) || !mongoose.isValidObjectId(slotId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid trip or departure slot.",
        });
      }

      const trip = await Trip.findById(tripId);
      const slot = await TripSlot.findOne({
        _id: slotId,
        trip: tripId,
        isClosed: false,
      });

      if (!trip || !slot) {
        return res.status(400).json({
          success: false,
          message: "Selected trip or departure is unavailable.",
        });
      }

      if (slot.totalSlots - slot.bookedSlots < travellerCount) {
        return res.status(400).json({
          success: false,
          message: "Not enough seats available for the selected departure.",
        });
      }

      // Validate traveller details
      const normalizedTravellers = Array.isArray(travellerDetails) ? travellerDetails : [];
      if (normalizedTravellers.length !== travellerCount) {
        return res.status(400).json({
          success: false,
          message: "Traveller details must match the selected traveller count.",
        });
      }
      for (let i = 0; i < normalizedTravellers.length; i += 1) {
        const t = normalizedTravellers[i] || {};
        const tName = String(i === 0 ? t.name || cleanName : t.name || "").trim();
        const tAge = Number(t.age);
        if (!tName || !Number.isFinite(tAge) || tAge < 1 || tAge > 120) {
          return res.status(400).json({
            success: false,
            message: `Please provide a valid name and age for Traveller ${i + 1}.`,
          });
        }
      }

      // Validate pickup location against Admin-configured trip pickups
      const activePickups = Array.isArray(trip.pickupLocations)
        ? trip.pickupLocations.filter((p) => p.isActive !== false)
        : [];
      let matchedPickup = null;

      if (activePickups.length > 0) {
        if (!pickupLocationId) {
          return res.status(400).json({
            success: false,
            message: "Please select a pickup location.",
          });
        }
        matchedPickup = activePickups.find(
          (p) => String(p._id) === String(pickupLocationId)
        );
        if (!matchedPickup) {
          return res.status(400).json({
            success: false,
            message: "Selected pickup location is invalid for this trip.",
          });
        }
      }

      let effectivePickupTime = matchedPickup ? matchedPickup.pickupTime || "" : "";
      if (matchedPickup && Array.isArray(matchedPickup.dateOverrides)) {
        const override = matchedPickup.dateOverrides.find(
          (o) =>
            (slot._id && o.slotId && String(o.slotId) === String(slot._id)) ||
            (slot.date && o.date && o.date.trim() === String(slot.date).trim())
        );
        if (override && override.pickupTime) {
          effectivePickupTime = override.pickupTime;
        }
      }

      const pickupSnapshot = matchedPickup
        ? {
            name: matchedPickup.name || "",
            address: matchedPickup.address || "",
            landmark: matchedPickup.landmark || "",
            pickupTime: effectivePickupTime,
            googleMapsUrl: matchedPickup.googleMapsUrl || "",
          }
        : {
            name: "",
            address: "",
            landmark: "",
            pickupTime: "",
            googleMapsUrl: "",
          };

      // Trusted server-side pricing & coupon validation
      const unitPricePaise = rupeesToPaise(trip.price);
      if (unitPricePaise <= 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid trip pricing configuration.",
        });
      }

      const originalTotalPaise = unitPricePaise * travellerCount;
      const originalTotal = paiseToRupees(originalTotalPaise);

      let discountAmount = 0;
      let finalPayable = originalTotal;
      let appliedCouponCode = null;

      if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
        const couponValidation = await validateCouponForBooking({
          code: couponCode,
          tripId: trip._id,
          tripTitle: trip.title,
          bookingAmount: originalTotal,
          customerPhone: parsedPhone.e164,
          customerEmail: cleanEmail,
        });

        if (!couponValidation.isValid) {
          return res.status(400).json({
            success: false,
            message: couponValidation.message || "Invalid coupon code.",
          });
        }

        discountAmount = couponValidation.discountAmount;
        finalPayable = Math.max(0, couponValidation.finalPayable);
        appliedCouponCode = couponValidation.cleanCode;
      }

      const bookingCode = `TVK${Math.floor(1000 + Math.random() * 9000)}-${crypto
        .randomBytes(2)
        .toString("hex")
        .toUpperCase()}`;

      const booking = await Booking.create({
        customerId: req.currentUser._id,
        name: cleanName,
        email: cleanEmail,
        phone: parsedPhone.e164,
        trip: {
          title: trip.title,
          location: trip.location,
          duration: trip.duration,
          price: String(paiseToRupees(unitPricePaise)),
          image: trip.image,
          description: trip.description,
        },
        slotId: slot._id,
        date: slot.date,
        pickupLocation: pickupSnapshot.name
          ? `${pickupSnapshot.name}${pickupSnapshot.pickupTime ? ` (${pickupSnapshot.pickupTime})` : ""}`
          : "",
        pickupLocationId: matchedPickup ? matchedPickup._id : null,
        pickupDetails: pickupSnapshot,
        bookingCode,
        travellers: travellerCount,
        travellerDetails: normalizedTravellers.map((t, idx) => ({
          name: String(idx === 0 ? t.name || cleanName : t.name || "").trim(),
          phone: String(idx === 0 ? t.phone || parsedPhone.e164 : t.phone || "").trim(),
          gender: t.gender || "Male",
          age: String(t.age || "").trim(),
        })),
        requests: String(requests || "").trim(),
        originalTotal,
        couponCode: appliedCouponCode,
        discountAmount,
        total: finalPayable,
        bookingSource: "Online",
        paymentMethod: "Razorpay",
        paymentStatus: "Pending",
        status: "Pending",
        whatsappOptIn: Boolean(whatsappOptIn),
        whatsappOptInAt: whatsappOptIn ? new Date() : null,
        ...(reqKey ? { checkoutRequestId: reqKey } : {}),
      });

      return res.status(201).json({
        success: true,
        booking,
        pricing: {
          originalTotal,
          discountAmount,
          finalPayable,
          couponCode: appliedCouponCode,
        },
      });
    } catch (err) {
      if (err?.code === 11000 && req.body?.checkoutRequestId) {
        const existing = await Booking.findOne({
          checkoutRequestId: String(req.body.checkoutRequestId).trim(),
          customerId: req.currentUser._id,
        });
        if (existing) {
          return res.json({
            success: true,
            duplicatePrevented: true,
            booking: existing,
          });
        }
      }
      console.error("Customer create-pending error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to initialize booking.",
      });
    }
  });

  // 2. Development-Only Customer Payment Simulator (strictly blocked in production & on live "test" DB)
  router.post("/api/customer/checkout/simulate-payment", authMiddleware, async (req, res) => {
    if (isProduction()) {
      return res.status(403).json({
        success: false,
        message: "Payment simulator is strictly disabled in production.",
      });
    }

    if (!isDatabaseIsolatedForSimulation()) {
      return res.status(403).json({
        success: false,
        code: "DB_NOT_ISOLATED",
        message:
          "Test simulator blocked: connected to shared 'test' database. Configure an isolated dev database (e.g. traviska_dev) in server/.env before running write-based simulations.",
      });
    }

    if (!assertCustomerRole(req, res)) return;

    try {
      const { bookingId, outcome = "succeeded", paymentAmount } = req.body || {};
      if (!mongoose.isValidObjectId(bookingId)) {
        return res.status(400).json({ success: false, message: "Invalid booking ID." });
      }

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found." });
      }

      if (String(booking.customerId) !== String(req.currentUser._id)) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to pay for this booking.",
        });
      }

      if (booking.status === "Confirmed" && booking.paymentStatus === "Paid") {
        return res.json({
          success: true,
          duplicatePrevented: true,
          bookingConfirmed: true,
          message: "Booking payment has already been processed.",
          booking,
        });
      }

      const totalPayablePaise = rupeesToPaise(booking.total || 0);
      const isPartial = outcome === "partial";
      const isFailed = outcome === "failed";

      let payPaise = totalPayablePaise;
      if (isPartial) {
        const requestedPaise =
          paymentAmount !== undefined && paymentAmount !== ""
            ? rupeesToPaise(paymentAmount)
            : Math.round(totalPayablePaise / 2);
        if (requestedPaise <= 0 || requestedPaise >= totalPayablePaise) {
          return res.status(400).json({
            success: false,
            message: `Partial advance must be between ₹1 and ${formatINR(totalPayablePaise - 100)}.`,
          });
        }
        payPaise = requestedPaise;
      }

      const adapter = getGatewayAdapter("simulator");
      const order = await adapter.createPaymentOrder({
        bookingId: booking._id,
        amountPaise: payPaise,
      });

      const normalizedEvent = await adapter.verifyPayment({
        bookingId: booking._id,
        amountPaise: payPaise,
        paymentType: isPartial ? "Advance" : "Full",
        simulateOutcome: isFailed ? "failed" : "succeeded",
      });
      normalizedEvent.providerOrderId = order.providerOrderId;

      const paymentEvent = await PaymentEvent.create({
        ...normalizedEvent,
        environment: "test",
        isSimulated: true,
        bookingId: booking._id,
        bookingCode: booking.bookingCode || "",
        notes: `[DEV CUSTOMER SIMULATOR] ${outcome} payment`,
        createdBy: req.currentUser._id,
      });

      if (isFailed) {
        booking.paymentStatus = "Failed";
        await booking.save();
        return res.status(402).json({
          success: false,
          paymentVerified: false,
          bookingConfirmed: false,
          message: "Simulated payment failed. Booking remains unconfirmed and no seats were deducted.",
          booking,
          paymentEvent,
        });
      }

      // Reserve seats atomically (only if not already confirmed)
      if (booking.status !== "Confirmed") {
        const reservedSlot = await TripSlot.findOneAndUpdate(
          {
            _id: booking.slotId,
            isClosed: false,
            $expr: {
              $gte: [{ $subtract: ["$totalSlots", "$bookedSlots"] }, booking.travellers],
            },
          },
          { $inc: { bookedSlots: booking.travellers } },
          { new: true }
        );

        if (!reservedSlot) {
          return res.status(409).json({
            success: false,
            bookingConfirmed: false,
            message: "Seats are no longer available for this departure.",
          });
        }

        if (booking.couponCode) {
          await Coupon.updateOne(
            { code: String(booking.couponCode).trim().toUpperCase() },
            { $inc: { usageCount: 1 } }
          );
        }
      }

      booking.orderId = order.providerOrderId;
      booking.paymentId = normalizedEvent.providerPaymentId;
      booking.paymentReference = normalizedEvent.providerPaymentId;
      booking.paymentMethod = "Razorpay";
      booking.paymentStatus = isPartial ? "Pending" : "Paid";
      booking.status = "Confirmed";
      await booking.save();

      const hookResult = await issueInvoiceAndNotifyForBooking({
        booking,
        currentUser: req.currentUser,
        origin: req.headers.origin || "",
        paymentEvent,
        allowPartial: isPartial,
      });

      return res.json({
        success: true,
        simulated: true,
        paymentVerified: true,
        bookingConfirmed: true,
        message: isPartial
          ? "Simulated advance payment recorded. Sample Advance Receipt issued."
          : "Simulated payment successful! Booking confirmed and sample invoice generated.",
        booking,
        paymentEvent,
        invoice: hookResult?.invoice || null,
        emailResult: hookResult?.emailResult || null,
        whatsappPreview: hookResult?.whatsappPreview || null,
      });
    } catch (err) {
      console.error("Customer simulate-payment error:", err);
      return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || "Simulated payment failed.",
      });
    }
  });

  return router;
};
