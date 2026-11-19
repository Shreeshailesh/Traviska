const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Enquiry = require("../models/Enquiry");
const FollowUp = require("../models/FollowUp");
const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const TripSlot = require("../models/TripSlot");
const User = require("../models/User");
const odooIntegration = require("../services/odooIntegration");

module.exports = function ({ authMiddleware }) {
  const router = express.Router();

  /* ------------------------------------------------------------------ */
  /* Middleware & Helpers: Verify Sales or Admin Access                 */
  /* ------------------------------------------------------------------ */
  const isSalesManager = (role) =>
    role === "admin" || role === "super_admin" || role === "sales_lead";

  const salesMiddleware = (req, res, next) => {
    const role = req.user?.role;
    if (
      role !== "admin" &&
      role !== "super_admin" &&
      role !== "sales" &&
      role !== "sales_lead" &&
      role !== "sales_executive"
    ) {
      return res.status(403).json({
        success: false,
        message: "Sales or Admin access required.",
      });
    }
    next();
  };

  /* ------------------------------------------------------------------ */
  /* 1. PUBLIC ENQUIRY SUBMISSION (Website, Trip Details, Contact)     */
  /* ------------------------------------------------------------------ */
  router.post("/api/enquiries/public", async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        tripId,
        tripTitle,
        slotId,
        departureDate,
        numTravelers,
        budget,
        preferredDestinations,
        source = "Website",
        notes = "",
      } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({
          success: false,
          message: "Full name, email address, and phone number are required.",
        });
      }

      // If tripId is provided but tripTitle is missing, resolve trip title
      let resolvedTripTitle = tripTitle || "";
      if (tripId && !resolvedTripTitle) {
        const trip = await Trip.findById(tripId).select("title");
        if (trip) resolvedTripTitle = trip.title;
      }

      // Auto-assign round-robin to active sales agent if available
      let assignedTo = null;
      let assignedToName = "Unassigned";
      const salesAgents = await User.find({
        role: { $in: ["sales", "sales_lead"] },
        isActive: true,
      });

      if (salesAgents.length > 0) {
        // Simple random/round-robin selection
        const randomAgent = salesAgents[Math.floor(Math.random() * salesAgents.length)];
        assignedTo = randomAgent._id;
        assignedToName = randomAgent.name;
      }

      const newEnquiry = new Enquiry({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        tripId: tripId || null,
        tripTitle: resolvedTripTitle,
        slotId: slotId || null,
        departureDate: departureDate || "",
        numTravelers: Number(numTravelers) || 1,
        budget: Number(budget) || 0,
        preferredDestinations: Array.isArray(preferredDestinations) ? preferredDestinations : [],
        source,
        notes: notes.trim(),
        status: "New",
        priority: "Medium",
        assignedTo,
        assignedToName,
      });

      await newEnquiry.save();

      // Attempt Odoo sync (will safely log & skip if Odoo is disabled)
      await odooIntegration.syncLead(newEnquiry);

      // Auto-create an initial follow-up reminder for the sales team
      const followUpTime = new Date();
      followUpTime.setHours(followUpTime.getHours() + 2); // 2 hours follow-up SLA
      const initialFollowUp = new FollowUp({
        enquiryId: newEnquiry._id,
        enquiryCode: newEnquiry.enquiryId,
        customerName: newEnquiry.name,
        customerPhone: newEnquiry.phone,
        salesEmployeeId: assignedTo || (salesAgents[0] ? salesAgents[0]._id : newEnquiry._id),
        salesEmployeeName: assignedToName,
        scheduledAt: followUpTime,
        type: "Call",
        status: "Scheduled",
        summary: `Initial enquiry follow-up for ${newEnquiry.tripTitle || "Custom Tour"}`,
      });
      await initialFollowUp.save();

      return res.status(201).json({
        success: true,
        message: "Enquiry submitted successfully. A travel specialist will get in touch shortly!",
        enquiryId: newEnquiry.enquiryId,
      });
    } catch (error) {
      console.error("[SalesPortal] Error saving public enquiry:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to submit enquiry. Please try again or reach out on WhatsApp.",
      });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 2. SALES LOGIN (Dedicated endpoint)                                */
  /* ------------------------------------------------------------------ */
  router.post("/api/sales/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = (email || "").trim().toLowerCase();

      const user = await User.findOne({
        email: { $regex: new RegExp(`^${normalizedEmail}$`, "i") },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (user.role !== "sales" && user.role !== "sales_lead" && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Access restricted to sales personnel and administrators.",
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        success: true,
        message: "Sales Login Successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || "Sales",
        },
      });
    } catch (error) {
      console.error("[SalesPortal] Login error:", error);
      return res.status(500).json({
        success: false,
        message: "Server Error",
      });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 3. DASHBOARD METRICS & PIPELINE SUMMARY                            */
  /* ------------------------------------------------------------------ */
  router.get("/api/sales/dashboard/stats", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const totalEnquiries = await Enquiry.countDocuments();
      const newLeads = await Enquiry.countDocuments({ status: "New" });
      const contactedLeads = await Enquiry.countDocuments({ status: "Contacted" });
      const qualifiedLeads = await Enquiry.countDocuments({ status: "Qualified" });
      const proposalLeads = await Enquiry.countDocuments({ status: "Proposal Sent" });
      const negotiationLeads = await Enquiry.countDocuments({ status: "Negotiation" });
      const wonLeads = await Enquiry.countDocuments({ status: "Won" });
      const lostLeads = await Enquiry.countDocuments({ status: "Lost" });

      const activePipeline = contactedLeads + qualifiedLeads + proposalLeads + negotiationLeads;
      const conversionRate = totalEnquiries > 0 ? ((wonLeads / totalEnquiries) * 100).toFixed(1) : "0.0";

      // Today's Follow-ups
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const todayFollowUpsCount = await FollowUp.countDocuments({
        scheduledAt: { $gte: startOfToday, $lte: endOfToday },
        status: "Scheduled",
      });

      const overdueFollowUpsCount = await FollowUp.countDocuments({
        scheduledAt: { $lt: startOfToday },
        status: "Scheduled",
      });

      // Total Sales Revenue generated through won conversions
      const wonEnquiries = await Enquiry.find({ status: "Won", convertedBookingId: { $ne: null } })
        .populate("convertedBookingId", "total status");

      let totalSalesRevenue = 0;
      wonEnquiries.forEach((enq) => {
        if (enq.convertedBookingId && enq.convertedBookingId.total) {
          totalSalesRevenue += enq.convertedBookingId.total;
        }
      });

      // Recent 5 leads
      const recentLeads = await Enquiry.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("enquiryId name phone tripTitle status priority budget createdAt");

      // Today's upcoming follow-ups
      const upcomingFollowUps = await FollowUp.find({
        scheduledAt: { $gte: startOfToday },
        status: "Scheduled",
      })
        .sort({ scheduledAt: 1 })
        .limit(5);

      return res.json({
        success: true,
        stats: {
          totalEnquiries,
          newLeads,
          activePipeline,
          wonLeads,
          lostLeads,
          conversionRate,
          todayFollowUpsCount,
          overdueFollowUpsCount,
          totalSalesRevenue,
          stages: {
            New: newLeads,
            Contacted: contactedLeads,
            Qualified: qualifiedLeads,
            "Proposal Sent": proposalLeads,
            Negotiation: negotiationLeads,
            Won: wonLeads,
            Lost: lostLeads,
          },
        },
        recentLeads,
        upcomingFollowUps,
      });
    } catch (error) {
      console.error("[SalesPortal] Error fetching stats:", error);
      return res.status(500).json({ success: false, message: "Failed to load dashboard metrics" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 4. ENQUIRIES / LEADS LIST & SEARCH                                 */
  /* ------------------------------------------------------------------ */
  router.get("/api/sales/enquiries", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const { search, status, priority, tripId, assignedTo, page = 1, limit = 50 } = req.query;

      const query = {};

      if (search) {
        const safeSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(safeSearch, "i");
        query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { enquiryId: regex }, { tripTitle: regex }];
      }

      if (status && status !== "All") {
        query.status = status;
      }

      if (priority && priority !== "All") {
        query.priority = priority;
      }

      if (tripId && tripId !== "All") {
        query.tripId = tripId;
      }

      // Restrict individual sales executives strictly to their own assigned leads
      if (!isSalesManager(req.user.role)) {
        query.assignedTo = req.user.id;
      } else if (assignedTo && assignedTo !== "All") {
        query.assignedTo = assignedTo;
      }

      const skip = (Number(page) - 1) * Number(limit);
      const total = await Enquiry.countDocuments(query);
      const enquiries = await Enquiry.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("assignedTo", "name email phone")
        .populate("convertedBookingId", "bookingCode total status paymentStatus");

      return res.json({
        success: true,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        enquiries,
      });
    } catch (error) {
      console.error("[SalesPortal] Error listing enquiries:", error);
      return res.status(500).json({ success: false, message: "Failed to load enquiries" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 5. CREATE ENQUIRY MANUALLY (Sales Agent)                           */
  /* ------------------------------------------------------------------ */
  router.post("/api/sales/enquiries", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
        tripId,
        tripTitle,
        slotId,
        departureDate,
        numTravelers,
        budget,
        source = "Phone Call",
        status = "New",
        priority = "Medium",
        assignedTo,
        notes = "",
      } = req.body;

      if (!name || !phone) {
        return res.status(400).json({ success: false, message: "Customer name and phone number are required." });
      }

      let assignedToName = "Unassigned";
      if (assignedTo) {
        const agent = await User.findById(assignedTo).select("name");
        if (agent) assignedToName = agent.name;
      } else {
        // Assign to the creating user if they are a sales agent
        assignedToName = req.user.name || "Sales Team";
      }

      let resolvedTripTitle = tripTitle || "";
      if (tripId && !resolvedTripTitle) {
        const trip = await Trip.findById(tripId).select("title");
        if (trip) resolvedTripTitle = trip.title;
      }

      const newEnquiry = new Enquiry({
        name: name.trim(),
        email: (email || `${phone.replace(/\D/g, "")}@enquiry.traviska.com`).trim().toLowerCase(),
        phone: phone.trim(),
        tripId: tripId || null,
        tripTitle: resolvedTripTitle,
        slotId: slotId || null,
        departureDate: departureDate || "",
        numTravelers: Number(numTravelers) || 1,
        budget: Number(budget) || 0,
        source,
        status,
        priority,
        assignedTo: assignedTo || req.user.id,
        assignedToName,
        notes: notes.trim(),
      });

      await newEnquiry.save();

      // Odoo sync (will safely log & skip if Odoo is disabled)
      await odooIntegration.syncLead(newEnquiry);

      return res.status(201).json({
        success: true,
        message: "Lead created successfully",
        enquiry: newEnquiry,
      });
    } catch (error) {
      console.error("[SalesPortal] Error creating manual enquiry:", error);
      return res.status(500).json({ success: false, message: "Failed to create lead" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 6. GET SINGLE ENQUIRY WITH FOLLOW-UPS TIMELINE                     */
  /* ------------------------------------------------------------------ */
  router.get("/api/sales/enquiries/:id", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const enquiry = await Enquiry.findById(req.params.id)
        .populate("assignedTo", "name email phone")
        .populate("convertedBookingId");

      if (!enquiry) {
        return res.status(404).json({ success: false, message: "Enquiry not found" });
      }

      // Restrict access: Sales executives can only inspect their own assigned leads
      if (!isSalesManager(req.user.role)) {
        const assignedId = String(enquiry.assignedTo?._id || enquiry.assignedTo || "");
        if (assignedId !== String(req.user.id)) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You are only authorized to view your own assigned leads.",
          });
        }
      }

      const followUps = await FollowUp.find({ enquiryId: enquiry._id }).sort({ scheduledAt: -1 });

      return res.json({
        success: true,
        enquiry,
        followUps,
      });
    } catch (error) {
      console.error("[SalesPortal] Error fetching enquiry:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch enquiry" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 7. UPDATE ENQUIRY (Stage, Priority, Agent, Notes)                  */
  /* ------------------------------------------------------------------ */
  router.patch("/api/sales/enquiries/:id", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const { status, priority, assignedTo, notes, budget, numTravelers, departureDate, lostReason } = req.body;

      const enquiry = await Enquiry.findById(req.params.id);
      if (!enquiry) {
        return res.status(404).json({ success: false, message: "Enquiry not found" });
      }

      // Restrict access: Non-manager sales agents can only update leads assigned to them
      if (!isSalesManager(req.user.role)) {
        const assignedId = String(enquiry.assignedTo?._id || enquiry.assignedTo || "");
        if (assignedId !== String(req.user.id)) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You are only authorized to update your own assigned leads.",
          });
        }

        // Forbid sales executives from reassigning leads
        if (assignedTo !== undefined) {
          return res.status(403).json({
            success: false,
            message: "Access denied. Only sales leads and administrators can reassign leads.",
          });
        }
      }

      if (status !== undefined) enquiry.status = status;
      if (priority !== undefined) enquiry.priority = priority;
      if (notes !== undefined) enquiry.notes = notes;
      if (budget !== undefined) enquiry.budget = Number(budget);
      if (numTravelers !== undefined) enquiry.numTravelers = Number(numTravelers);
      if (departureDate !== undefined) enquiry.departureDate = departureDate;
      if (lostReason !== undefined) enquiry.lostReason = lostReason;

      if (assignedTo !== undefined) {
        enquiry.assignedTo = assignedTo || null;
        if (assignedTo) {
          const agent = await User.findById(assignedTo).select("name");
          enquiry.assignedToName = agent ? agent.name : "Unassigned";
        } else {
          enquiry.assignedToName = "Unassigned";
        }
      }

      await enquiry.save();

      // Trigger safe Odoo sync
      await odooIntegration.syncLead(enquiry);

      return res.json({
        success: true,
        message: "Enquiry updated successfully",
        enquiry,
      });
    } catch (error) {
      console.error("[SalesPortal] Error updating enquiry:", error);
      return res.status(500).json({ success: false, message: "Failed to update enquiry" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 8. FOLLOW-UPS MANAGEMENT                                           */
  /* ------------------------------------------------------------------ */
  router.get("/api/sales/follow-ups", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const { filter = "all", enquiryId } = req.query;
      const query = {};

      if (enquiryId) {
        query.enquiryId = enquiryId;
      }

      const now = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      if (filter === "today") {
        query.scheduledAt = { $gte: startOfToday, $lte: endOfToday };
      } else if (filter === "overdue") {
        query.scheduledAt = { $lt: startOfToday };
        query.status = "Scheduled";
      } else if (filter === "upcoming") {
        query.scheduledAt = { $gt: endOfToday };
        query.status = "Scheduled";
      } else if (filter === "completed") {
        query.status = "Completed";
      }

      const followUps = await FollowUp.find(query)
        .sort({ scheduledAt: 1 })
        .populate("enquiryId", "enquiryId name phone tripTitle status");

      return res.json({
        success: true,
        followUps,
      });
    } catch (error) {
      console.error("[SalesPortal] Error listing follow-ups:", error);
      return res.status(500).json({ success: false, message: "Failed to load follow-ups" });
    }
  });

  router.post("/api/sales/follow-ups", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const { enquiryId, scheduledAt, type = "Call", summary } = req.body;

      if (!enquiryId || !scheduledAt || !summary) {
        return res.status(400).json({ success: false, message: "Enquiry, scheduled time, and summary are required." });
      }

      const enquiry = await Enquiry.findById(enquiryId);
      if (!enquiry) {
        return res.status(404).json({ success: false, message: "Linked enquiry not found." });
      }

      const followUp = new FollowUp({
        enquiryId: enquiry._id,
        enquiryCode: enquiry.enquiryId,
        customerName: enquiry.name,
        customerPhone: enquiry.phone,
        salesEmployeeId: req.user.id,
        salesEmployeeName: req.user.name || "Sales Agent",
        scheduledAt: new Date(scheduledAt),
        type,
        status: "Scheduled",
        summary: summary.trim(),
      });

      await followUp.save();
      await odooIntegration.syncFollowUp(followUp);

      return res.status(201).json({
        success: true,
        message: "Follow-up scheduled successfully",
        followUp,
      });
    } catch (error) {
      console.error("[SalesPortal] Error creating follow-up:", error);
      return res.status(500).json({ success: false, message: "Failed to schedule follow-up" });
    }
  });

  router.patch("/api/sales/follow-ups/:id", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const { status, outcome, scheduledAt } = req.body;
      const followUp = await FollowUp.findById(req.params.id);

      if (!followUp) {
        return res.status(404).json({ success: false, message: "Follow-up not found" });
      }

      if (status) followUp.status = status;
      if (outcome !== undefined) followUp.outcome = outcome;
      if (scheduledAt) followUp.scheduledAt = new Date(scheduledAt);
      if (status === "Completed") followUp.completedAt = new Date();

      await followUp.save();
      return res.json({ success: true, message: "Follow-up updated", followUp });
    } catch (error) {
      console.error("[SalesPortal] Error updating follow-up:", error);
      return res.status(500).json({ success: false, message: "Failed to update follow-up" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 9. TRIP-WISE MANUAL BOOKING / CONVERT ENQUIRY                      */
  /* ------------------------------------------------------------------ */
  router.post("/api/sales/enquiries/:id/convert", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const {
        slotId,
        total,
        paymentMethod = "Bank Transfer",
        paymentReference = "",
        paymentStatus = "Paid",
        travellers = 1,
        travellerDetails = [],
        requests = "",
      } = req.body;

      const enquiry = await Enquiry.findById(req.params.id);
      if (!enquiry) {
        return res.status(404).json({ success: false, message: "Enquiry not found" });
      }

      // Restrict access: Sales executives can only convert their own assigned leads
      if (!isSalesManager(req.user.role)) {
        const assignedId = String(enquiry.assignedTo?._id || enquiry.assignedTo || "");
        if (assignedId !== String(req.user.id)) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You can only convert enquiries assigned to you.",
          });
        }
      }

      if (!slotId) {
        return res.status(400).json({ success: false, message: "Trip departure slot is required." });
      }

      const slot = await TripSlot.findById(slotId).populate("tripId");
      if (!slot) {
        return res.status(404).json({ success: false, message: "Departure slot not found." });
      }

      const trip = slot.tripId;
      const bookingCode = `TRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Create official Booking document
      const newBooking = new Booking({
        name: enquiry.name,
        email: enquiry.email,
        phone: enquiry.phone,
        trip: {
          title: trip.title,
          location: trip.location,
          duration: trip.duration,
          price: String(total),
          image: trip.image || "",
          description: trip.description || "",
        },
        slotId: slot._id,
        date: slot.date,
        bookingCode,
        travellers: Number(travellers) || enquiry.numTravelers || 1,
        travellerDetails: Array.isArray(travellerDetails) && travellerDetails.length > 0
          ? travellerDetails
          : [{ name: enquiry.name, phone: enquiry.phone }],
        requests,
        total: Number(total) || enquiry.budget || 0,
        bookingSource: "Sales",
        paymentMethod,
        paymentReference,
        paymentStatus,
        status: "Confirmed",
        enquiryId: enquiry._id,
        salesRepId: req.user.id,
      });

      await newBooking.save();

      // Update slot seat count if available
      if (slot.capacity) {
        slot.bookedCount = (slot.bookedCount || 0) + (Number(travellers) || 1);
        await slot.save();
      }

      // Mark enquiry as WON
      enquiry.status = "Won";
      enquiry.convertedBookingId = newBooking._id;
      enquiry.convertedAt = new Date();
      await enquiry.save();

      // Sync updated lead to Odoo
      await odooIntegration.syncLead(enquiry);

      return res.status(201).json({
        success: true,
        message: `Enquiry successfully converted to confirmed booking #${bookingCode}!`,
        booking: newBooking,
        enquiry,
      });
    } catch (error) {
      console.error("[SalesPortal] Error converting enquiry to booking:", error);
      return res.status(500).json({ success: false, message: "Failed to convert enquiry to booking" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 10. DIRECT MANUAL BOOKING CREATOR (Without prior enquiry)          */
  /* ------------------------------------------------------------------ */
  router.post("/api/sales/manual-booking", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const {
        customerName,
        customerEmail,
        customerPhone,
        tripId,
        slotId,
        total,
        travellers = 1,
        travellerDetails = [],
        paymentMethod = "UPI",
        paymentReference = "",
        paymentStatus = "Paid",
        notes = "",
      } = req.body;

      if (!customerName || !customerPhone || !slotId) {
        return res.status(400).json({
          success: false,
          message: "Customer name, phone, and trip departure slot are required.",
        });
      }

      const slot = await TripSlot.findById(slotId).populate("tripId");
      if (!slot) {
        return res.status(404).json({ success: false, message: "Trip slot not found." });
      }

      const trip = slot.tripId;
      const bookingCode = `TRV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

      // Create linked Enquiry for 100% CRM coverage and audit
      const enquiry = new Enquiry({
        name: customerName.trim(),
        email: (customerEmail || `${customerPhone.replace(/\D/g, "")}@enquiry.traviska.com`).trim().toLowerCase(),
        phone: customerPhone.trim(),
        tripId: trip._id,
        tripTitle: trip.title,
        slotId: slot._id,
        departureDate: slot.date,
        numTravelers: Number(travellers),
        budget: Number(total),
        source: "Phone Call",
        status: "Won",
        priority: "High",
        assignedTo: req.user.id,
        assignedToName: req.user.name || "Sales Agent",
        notes: notes ? `Direct Sales Booking: ${notes}` : "Direct Sales Booking",
        convertedAt: new Date(),
      });
      await enquiry.save();

      // Create official Booking
      const booking = new Booking({
        name: customerName.trim(),
        email: enquiry.email,
        phone: customerPhone.trim(),
        trip: {
          title: trip.title,
          location: trip.location,
          duration: trip.duration,
          price: String(total),
          image: trip.image || "",
          description: trip.description || "",
        },
        slotId: slot._id,
        date: slot.date,
        bookingCode,
        travellers: Number(travellers),
        travellerDetails: Array.isArray(travellerDetails) && travellerDetails.length > 0
          ? travellerDetails
          : [{ name: customerName, phone: customerPhone }],
        requests: notes,
        total: Number(total),
        bookingSource: "Sales",
        paymentMethod,
        paymentReference,
        paymentStatus,
        status: "Confirmed",
        enquiryId: enquiry._id,
        salesRepId: req.user.id,
      });

      await booking.save();

      // Link booking back to enquiry
      enquiry.convertedBookingId = booking._id;
      await enquiry.save();

      // Increment booked seats
      if (slot.capacity) {
        slot.bookedCount = (slot.bookedCount || 0) + Number(travellers);
        await slot.save();
      }

      await odooIntegration.syncLead(enquiry);

      return res.status(201).json({
        success: true,
        message: `Manual booking created successfully with Booking ID #${bookingCode}`,
        booking,
        enquiry,
      });
    } catch (error) {
      console.error("[SalesPortal] Error creating manual booking:", error);
      return res.status(500).json({ success: false, message: "Failed to create manual booking" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 11. SALES AGENTS TEAM LIST & RECRUITMENT                           */
  /* ------------------------------------------------------------------ */
  router.get("/api/sales/agents", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const agents = await User.find({
        role: { $in: ["sales", "sales_lead", "admin"] },
      }).select("name email phone role department isActive");

      return res.json({ success: true, agents });
    } catch (error) {
      console.error("[SalesPortal] Error fetching agents:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch sales team" });
    }
  });

  router.post("/api/sales/agents", authMiddleware, async (req, res) => {
    try {
      // Only Admin, Super Admin or Sales Lead can create sales employees
      if (!isSalesManager(req.user.role)) {
        return res.status(403).json({ success: false, message: "Admin, Super Admin, or Sales Lead access required." });
      }

      const { name, email, password, phone, role = "sales", department = "Sales" } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, message: "Name, email, and password are required." });
      }

      const existing = await User.findOne({ email: email.trim().toLowerCase() });
      if (existing) {
        return res.status(400).json({ success: false, message: "A user with this email already exists." });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newAgent = new User({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        phone: phone ? phone.trim() : "",
        role: role === "sales_lead" ? "sales_lead" : "sales",
        department,
        isActive: true,
      });

      await newAgent.save();

      return res.status(201).json({
        success: true,
        message: `Sales employee ${newAgent.name} created successfully!`,
        agent: {
          id: newAgent._id,
          name: newAgent.name,
          email: newAgent.email,
          role: newAgent.role,
        },
      });
    } catch (error) {
      console.error("[SalesPortal] Error creating sales agent:", error);
      return res.status(500).json({ success: false, message: "Failed to create sales agent" });
    }
  });

  /* ------------------------------------------------------------------ */
  /* 12. ODOO SYNC CENTER STATUS & FUTURE MIGRATION TRIGGER             */
  /* ------------------------------------------------------------------ */
  router.get("/api/sales/odoo/status", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const statusInfo = odooIntegration.getStatus();
      const totalEnquiries = await Enquiry.countDocuments();
      const syncedEnquiries = await Enquiry.countDocuments({ odooSyncStatus: "synced" });
      const pendingSync = totalEnquiries - syncedEnquiries;

      return res.json({
        success: true,
        odoo: {
          ...statusInfo,
          totalEnquiries,
          syncedEnquiries,
          pendingSync,
        },
      });
    } catch (error) {
      console.error("[SalesPortal] Error fetching Odoo status:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch Odoo status" });
    }
  });

  router.post("/api/sales/odoo/sync-all", authMiddleware, salesMiddleware, async (req, res) => {
    try {
      const result = await odooIntegration.migrateAllPendingLeads();
      return res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error("[SalesPortal] Error running Odoo batch migration:", error);
      return res.status(500).json({ success: false, message: "Odoo synchronization failed" });
    }
  });

  return router;
};

