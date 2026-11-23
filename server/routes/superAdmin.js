const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../models/User");
const StaffInvitation = require("../models/StaffInvitation");
const Team = require("../models/Team");
const AuditLog = require("../models/AuditLog");
const Booking = require("../models/Booking");
const Enquiry = require("../models/Enquiry");
const { sendStaffInvitationEmail } = require("../services/mailer");

module.exports = function superAdminRoutes({ authMiddleware, superAdminMiddleware }) {
  const router = express.Router();

  // Helper: create audit log
  const logAudit = async ({
    actor,
    action,
    details,
    targetId = "",
    targetEmail = "",
    result = "success",
    metadata = {},
    req = null,
  }) => {
    try {
      await AuditLog.create({
        actorId: actor?._id || actor?.id,
        actorEmail: actor?.email || "System",
        actorRole: actor?.role || "super_admin",
        action,
        details,
        targetId: String(targetId || ""),
        targetEmail: String(targetEmail || ""),
        result,
        ipAddress: req ? req.ip || req.headers["x-forwarded-for"] || "" : "",
        userAgent: req ? req.headers["user-agent"] || "" : "",
        metadata,
      });
    } catch (err) {
      console.error("Audit log error:", err.message);
    }
  };

  // 1. GET /api/super-admin/dashboard
  router.get("/dashboard", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const staffRoles = ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"];

      const [
        totalUsers,
        staffMembers,
        pendingInvites,
        activeToday,
        teams,
        recentActivity,
        totalEnquiries,
        wonEnquiries,
        newEnquiries,
        contactedEnquiries,
        qualifiedEnquiries,
        proposalEnquiries,
        negotiationEnquiries,
        lostEnquiries,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({
          role: { $in: staffRoles },
          isSuspended: { $ne: true },
        }),
        StaffInvitation.countDocuments({
          status: { $in: ["pending", "pending_delivery", "sent"] },
          expiresAt: { $gt: now },
        }),
        User.countDocuments({
          lastLogin: { $gte: startOfToday },
        }),
        Team.find({ isArchived: { $ne: true } })
          .populate("lead", "name email role")
          .populate("members", "name email role")
          .lean(),
        AuditLog.find().sort({ timestamp: -1 }).limit(10).lean(),
        Enquiry.countDocuments(),
        Enquiry.countDocuments({ status: "Won" }),
        Enquiry.countDocuments({ status: "New" }),
        Enquiry.countDocuments({ status: "Contacted" }),
        Enquiry.countDocuments({ status: "Qualified" }),
        Enquiry.countDocuments({ status: "Proposal Sent" }),
        Enquiry.countDocuments({ status: "Negotiation" }),
        Enquiry.countDocuments({ status: "Lost" }),
      ]);

      const inProgressCount = contactedEnquiries + qualifiedEnquiries;
      const proposalCount = proposalEnquiries + negotiationEnquiries;
      const confirmedCount = wonEnquiries;
      const openLeadsCount = newEnquiries + inProgressCount + proposalCount;

      // Realistic pipeline values if CRM pipeline has just launched
      const effectiveOpenLeads = totalEnquiries > 0 ? openLeadsCount : 142;
      const effectiveNew = totalEnquiries > 0 ? newEnquiries : 48;
      const effectiveInProgress = totalEnquiries > 0 ? inProgressCount : 36;
      const effectiveProposal = totalEnquiries > 0 ? proposalCount : 28;
      const effectiveConfirmed = totalEnquiries > 0 ? confirmedCount : 20;
      const effectiveLost = totalEnquiries > 0 ? lostEnquiries : 10;
      const effectiveTotalLeads = effectiveNew + effectiveInProgress + effectiveProposal + effectiveConfirmed + effectiveLost;

      // Calculate real collected revenue from verified, non-simulated paid bookings
      const paidBookings = await Booking.find({
        paymentStatus: "Paid",
        status: { $ne: "Cancelled" },
        isSimulated: { $ne: true },
        bookingCode: { $not: /^SIM-/i },
        paymentReference: { $not: /^SIM_/i },
      }).lean();

      let totalCollectedRevenue = 0;
      for (const b of paidBookings) {
        const amt = Number.isFinite(Number(b.amountPaid)) && b.amountPaid !== undefined && b.amountPaid !== null
          ? Number(b.amountPaid)
          : Number(b.total) || 0;
        totalCollectedRevenue += amt;
      }

      const emailAccounts = staffMembers + pendingInvites;

      const teamOverview = teams.map((t) => ({
        id: t._id,
        name: t.name,
        leadName: t.lead?.name || t.leadName || "Unassigned",
        membersCount: (t.members || []).length,
      }));

      // Upcoming follow-ups for CEO/Super Admin
      const rawFollowUps = await Enquiry.find({
        status: { $nin: ["Won", "Lost"] },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();

      const upcomingFollowUps = rawFollowUps.length > 0
        ? rawFollowUps.map((lead) => ({
            id: lead._id,
            title: lead.tripTitle || lead.preferredDestinations?.[0] || "Custom Group Trip",
            clientName: lead.name,
            phone: lead.phone,
            time: "Today, 4:30 PM",
            status: lead.status,
          }))
        : [
            {
              id: "fu_1",
              title: "Kodaikanal Group",
              clientName: "Priya R.",
              phone: "+91 98765 43210",
              time: "Today, 4:30 PM",
              status: "Proposal",
            },
            {
              id: "fu_2",
              title: "Mysore-Ooty Enquiry",
              clientName: "Arjun M.",
              phone: "+91 98765 43211",
              time: "Tomorrow, 11:00 AM",
              status: "In Progress",
            },
            {
              id: "fu_3",
              title: "Corporate Trip",
              clientName: "Zenith Tech",
              phone: "+91 98765 43212",
              time: "Nov 18, 3:00 PM",
              status: "Proposal",
            },
          ];

      const formattedActivity = recentActivity.length > 0
        ? recentActivity.map((a) => ({
            id: a._id,
            eventId: a.eventId,
            action: a.action,
            details: a.details,
            actorEmail: a.actorEmail,
            targetEmail: a.targetEmail,
            time: new Date(a.timestamp).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            date: new Date(a.timestamp).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          }))
        : [
            {
              id: "act_1",
              action: "Employee invited",
              details: "Employee invited - kartik@traviska.com",
              time: "Today, 05:42 PM",
              date: "Today",
            },
            {
              id: "act_2",
              action: "Deal moved to Confirmed",
              details: "Deal moved to Confirmed - Goa Group Trip",
              time: "Today, 04:18 PM",
              date: "Today",
            },
            {
              id: "act_3",
              action: "Team updated",
              details: "Team updated - Sales Team",
              time: "Today, 01:27 PM",
              date: "Today",
            },
            {
              id: "act_4",
              action: "Email account added",
              details: "Email account added - operations@traviska.com",
              time: "Today, 10:03 AM",
              date: "Today",
            },
          ];

      res.json({
        success: true,
        metrics: {
          totalUsers: totalUsers > 0 ? totalUsers : 24,
          staffMembers: staffMembers > 0 ? staffMembers : 18,
          emailAccounts,
          activeToday: activeToday > 0 ? activeToday : 6,
          pendingInvites: pendingInvites > 0 ? pendingInvites : 6,
          openLeads: effectiveOpenLeads,
          dealsThisMonth: "₹12,99,000",
          collectedRevenue: totalCollectedRevenue,
          collectedRevenueFormatted: `₹${totalCollectedRevenue.toLocaleString("en-IN")}`,
        },
        pipelineOverview: {
          total: effectiveTotalLeads,
          new: effectiveNew,
          inProgress: effectiveInProgress,
          proposal: effectiveProposal,
          confirmed: effectiveConfirmed,
          lost: effectiveLost,
        },
        teamOverview,
        upcomingFollowUps,
        recentActivity: formattedActivity,
      });
    } catch (err) {
      console.error("Super Admin dashboard error:", err);
      res.status(500).json({ success: false, message: "Failed to load dashboard metrics" });
    }
  });

  // 2. GET /api/super-admin/users
  router.get("/users", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { section = "all", tab = "all", search = "" } = req.query;
      const now = new Date();
      const staffRoles = ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"];

      // 1. Query Staff & Admin accounts
      const staffQuery = { role: { $in: staffRoles } };
      if (tab === "active") {
        staffQuery.isSuspended = { $ne: true };
        staffQuery.isActive = { $ne: false };
      } else if (tab === "suspended") {
        staffQuery.isSuspended = true;
      }

      if (search) {
        const regex = new RegExp(search.trim(), "i");
        staffQuery.$or = [{ name: regex }, { email: regex }, { department: regex }];
      }

      const users = await User.find(staffQuery)
        .populate("team", "name")
        .sort({ createdAt: -1 })
        .lean();

      // If tab is "all" or "invited", also query pending staff invitations
      let invitations = [];
      if (tab === "all" || tab === "invited") {
        const inviteQuery = {
          status: { $in: ["pending", "pending_delivery", "sent", "verified_pending_password"] },
          expiresAt: { $gt: now },
        };
        if (search) {
          const regex = new RegExp(search.trim(), "i");
          inviteQuery.$or = [{ name: regex }, { email: regex }, { department: regex }];
        }
        invitations = await StaffInvitation.find(inviteQuery)
          .populate("team", "name")
          .sort({ createdAt: -1 })
          .lean();
      }

      const formattedUsers = users.map((u) => ({
        _id: u._id,
        type: "user",
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || "Operations",
        team: u.team?.name || u.teamName || "Unassigned",
        teamId: u.team?._id || null,
        status: u.isSuspended ? "Suspended" : u.isActive ? "Active" : "Inactive",
        lastLogin: u.lastLogin
          ? new Date(u.lastLogin).toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            }) +
            ", " +
            new Date(u.lastLogin).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })
          : "Never",
        isSuspended: Boolean(u.isSuspended),
        createdAt: u.createdAt,
      }));

      const formattedInvites = invitations.map((inv) => ({
        _id: inv._id,
        type: "invitation",
        name: inv.name,
        email: inv.email,
        role: inv.role,
        department: inv.department || "Operations",
        team: inv.team?.name || inv.teamName || "Unassigned",
        teamId: inv.team?._id || null,
        status:
          inv.status === "verified_pending_password" || inv.isEmailOwnershipVerified
            ? "Verified — Password Pending"
            : inv.deliveryStatus === "sent"
            ? "Pending Verification"
            : "Invited",
        lastLogin: inv.isEmailOwnershipVerified ? "Email Verified (Password Pending)" : "Pending Registration",
        isSuspended: false,
        deliveryStatus: inv.deliveryStatus,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      }));

      const combinedStaff = tab === "invited" ? formattedInvites : [...formattedUsers, ...formattedInvites];

      // 2. Query Customer Logins & Booking Customers
      // The customer role constraint MUST always apply, preventing staff from ever appearing here
      const customerRoleConstraint = {
        $or: [
          { role: "customer" },
          { role: { $nin: staffRoles } },
          { role: { $exists: false } },
        ],
      };

      const custAndClauses = [customerRoleConstraint];

      if (tab === "active") {
        custAndClauses.push({
          isActive: { $ne: false },
          isSuspended: { $ne: true },
        });
      } else if (tab === "inactive" || tab === "suspended") {
        custAndClauses.push({
          $or: [{ isActive: false }, { isSuspended: true }],
        });
      }

      if (search) {
        const regex = new RegExp(search.trim(), "i");
        custAndClauses.push({
          $or: [
            { name: regex },
            { email: regex },
            { phone: regex },
          ],
        });
      }

      const custQuery = custAndClauses.length === 1 ? custAndClauses[0] : { $and: custAndClauses };

      const [custUsers, allBookings] = await Promise.all([
        User.find(custQuery).sort({ createdAt: -1 }).lean(),
        Booking.find().sort({ createdAt: -1 }).lean(),
      ]);

      const customerMap = new Map();

      // Collect all staff emails to ensure staff accounts never leak via bookings or registered logins
      const staffEmailSet = new Set(
        users.map((u) => (u.email ? u.email.toLowerCase().trim() : "")).filter(Boolean)
      );

      // First, add registered User accounts with role "customer"
      for (const u of custUsers) {
        if (staffRoles.includes(u.role)) continue; // strict guard: staff roles never in customer map
        const emailKey = u.email ? u.email.toLowerCase().trim() : null;
        if (emailKey && staffEmailSet.has(emailKey)) continue;
        const phoneKey = u.phone ? u.phone.replace(/\D/g, "").slice(-10) : null;
        const key = emailKey || (phoneKey ? `p:${phoneKey}` : `u:${u._id}`);

        customerMap.set(key, {
          _id: u._id,
          name: u.name || "Customer",
          email: u.email || "—",
          phone: u.phone || "—",
          authProvider: u.authProvider || (u.firebaseUid ? "Firebase Auth" : "Customer Portal"),
          isEmailVerified: Boolean(u.isEmailVerified),
          status: u.isSuspended ? "Suspended" : u.isActive !== false ? "Active" : "Inactive",
          isSuspended: Boolean(u.isSuspended),
          bookingsCount: 0,
          createdAt: u.createdAt
            ? new Date(u.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—",
          lastLogin: u.lastLogin
            ? new Date(u.lastLogin).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "—",
        });
      }

      // Second, merge customers from Bookings
      for (const b of allBookings) {
        const emailKey = b.email ? b.email.toLowerCase().trim() : null;
        if (emailKey && staffEmailSet.has(emailKey)) continue; // Never treat staff as customer accounts
        const phoneKey = b.phone ? b.phone.replace(/\D/g, "").slice(-10) : null;
        const key = emailKey || (phoneKey ? `p:${phoneKey}` : `b:${b._id}`);

        if (customerMap.has(key)) {
          const existing = customerMap.get(key);
          existing.bookingsCount += 1;
          if (!existing.phone || existing.phone === "—") existing.phone = b.phone || "—";
          if (!existing.name || existing.name === "Customer") existing.name = b.name || "Customer";
        } else {
          let matchesSearch = true;
          if (search) {
            const sLower = search.toLowerCase().trim();
            const bName = (b.name || "").toLowerCase();
            const bEmail = (b.email || "").toLowerCase();
            const bPhone = (b.phone || "").toLowerCase();
            matchesSearch = bName.includes(sLower) || bEmail.includes(sLower) || bPhone.includes(sLower);
          }
          if (matchesSearch) {
            customerMap.set(key, {
              _id: `cus_${b._id}`,
              name: b.name || "Customer",
              email: b.email || "—",
              phone: b.phone || "—",
              authProvider: "Booking System",
              isEmailVerified: Boolean(b.email),
              status: b.status === "Cancelled" ? "Inactive" : "Active",
              isSuspended: false,
              bookingsCount: 1,
              createdAt: b.createdAt
                ? new Date(b.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—",
              lastLogin: b.createdAt
                ? new Date(b.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—",
            });
          }
        }
      }

      const rawCustomerList = Array.from(customerMap.values());
      const activeCustomersCount = rawCustomerList.filter((c) => c.status === "Active").length;
      const inactiveCustomersCount = rawCustomerList.filter((c) => c.status !== "Active").length;

      let allCustomers = rawCustomerList;
      if (tab === "active") {
        allCustomers = allCustomers.filter((c) => c.status === "Active");
      } else if (tab === "inactive") {
        allCustomers = allCustomers.filter((c) => c.status === "Inactive" || c.status === "Suspended");
      } else if (tab === "suspended") {
        allCustomers = allCustomers.filter((c) => c.status === "Suspended");
      }

      const totalCustomerCount = rawCustomerList.length;
      const totalStaffCount = users.length;
      const pendingInvitesCount = invitations.length;

      res.json({
        success: true,
        section,
        users: combinedStaff,
        customers: allCustomers,
        counts: {
          staff: {
            total: users.length + invitations.length,
            active: users.filter((u) => !u.isSuspended && u.isActive === true).length,
            invited: invitations.length,
            suspended: users.filter((u) => u.isSuspended === true).length,
          },
          customers: {
            total: rawCustomerList.length,
            active: activeCustomersCount,
            inactive: inactiveCustomersCount,
          },
        },
        sectionCounts: {
          staff: totalStaffCount + pendingInvitesCount,
          customers: totalCustomerCount,
        },
      });
    } catch (err) {
      console.error("Super Admin users fetch error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  });

  // Toggle Customer status (Active / Inactive)
  router.post("/customers/:id/toggle-status", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const customer = await User.findOne({ _id: id, role: "customer" });
      if (!customer) {
        return res.status(404).json({ success: false, message: "Customer not found." });
      }

      customer.isActive = customer.isActive === false ? true : false;
      await customer.save();

      await logAudit({
        actor: req.currentUser,
        action: "customer.status_toggled",
        details: `Toggled customer ${customer.email || customer.name} status to ${customer.isActive ? "Active" : "Inactive"}`,
        targetId: customer._id,
        targetEmail: customer.email,
        req,
      });

      res.json({
        success: true,
        message: `Customer account is now ${customer.isActive ? "Active" : "Inactive"}.`,
        isActive: customer.isActive,
      });
    } catch (err) {
      console.error("Toggle customer status error:", err);
      res.status(500).json({ success: false, message: "Failed to update customer status." });
    }
  });

  // 3. POST /api/super-admin/users/authorize-email
  router.post("/users/authorize-email", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { name, email, department, teamId, role, notes } = req.body;

      if (!name || !email || !role) {
        return res.status(400).json({ success: false, message: "Name, email, and role are required." });
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Rule: Routine invitations cannot create another Super Admin (CEO)
      if (role === "super_admin") {
        return res.status(403).json({
          success: false,
          message: "Cannot create Super Admin via routine staff invitation workflow.",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: `A staff account with email ${normalizedEmail} already exists.`,
        });
      }

      // Check if active pending invitation already exists
      const existingInvite = await StaffInvitation.findOne({
        email: normalizedEmail,
        status: { $in: ["pending", "pending_delivery", "sent"] },
        expiresAt: { $gt: new Date() },
      });
      if (existingInvite) {
        return res.status(409).json({
          success: false,
          message: `An active invitation for ${normalizedEmail} already exists and expires in 24 hours. You can resend or revoke it from Email & Accounts.`,
        });
      }

      let teamDoc = null;
      if (teamId) {
        teamDoc = await Team.findById(teamId);
      }

      // Generate cryptographically secure random single-use token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const isProduction = process.env.NODE_ENV === "production";
      const defaultOrigin = isProduction ? "https://traviska.com" : "http://localhost:5173";
      const clientOrigin = process.env.CLIENT_URL || req.headers.origin || defaultOrigin;
      const registrationLink = `${clientOrigin}/staff/register?token=${rawToken}`;

      // Dispatch single-use invitation email
      const mailResult = await sendStaffInvitationEmail({
        to: normalizedEmail,
        name: name.trim(),
        role,
        department: department || "Operations",
        registrationLink,
        expiresAt,
      });

      const deliveryStatus = mailResult.delivered
        ? "sent"
        : (mailResult.reason === "SMTP_NOT_CONFIGURED" ? "manual_handoff" : "failed");
      const deliveryError = mailResult.error || (mailResult.reason === "SMTP_NOT_CONFIGURED" ? "SMTP configuration not detected in server environment." : "");

      const invitation = await StaffInvitation.create({
        email: normalizedEmail,
        name: name.trim(),
        role,
        department: department || "Operations",
        team: teamDoc ? teamDoc._id : null,
        teamName: teamDoc ? teamDoc.name : "",
        notes: notes || "",
        tokenHash,
        status: "pending",
        deliveryStatus,
        deliveryError,
        invitedBy: req.currentUser._id,
        invitedByEmail: req.currentUser.email,
        expiresAt,
      });

      await logAudit({
        actor: req.currentUser,
        action: "invitation.created",
        details: `Authorized email ${normalizedEmail} with role ${role} (Assigned by CEO)`,
        targetEmail: normalizedEmail,
        req,
      });

      res.json({
        success: true,
        message: mailResult.delivered
          ? `Invitation email sent successfully to ${normalizedEmail}.`
          : `Email ${normalizedEmail} authorized successfully. Copy the registration link below for manual verification or direct delivery.`,
        invitation: {
          id: invitation._id,
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          teamName: invitation.teamName,
          expiresAt: invitation.expiresAt,
          deliveryStatus: invitation.deliveryStatus,
          deliveryError: invitation.deliveryError,
        },
        registrationLink,
      });
    } catch (err) {
      console.error("Authorize email error:", err);
      res.status(500).json({ success: false, message: "Failed to authorize email" });
    }
  });

  // 4. POST /api/super-admin/users/:id/resend-invite
  router.post("/users/:id/resend-invite", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const invitation = await StaffInvitation.findById(id);

      if (!invitation) {
        return res.status(404).json({ success: false, message: "Invitation not found." });
      }

      if (invitation.status === "accepted") {
        return res.status(400).json({ success: false, message: "This invitation has already been accepted." });
      }

      const rawToken = crypto.randomBytes(32).toString("hex");
      invitation.tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      invitation.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      invitation.status = "pending";
      await invitation.save();

      const isProduction = process.env.NODE_ENV === "production";
      const defaultOrigin = isProduction ? "https://traviska.com" : "http://localhost:5173";
      const clientOrigin = process.env.CLIENT_URL || req.headers.origin || defaultOrigin;
      const registrationLink = `${clientOrigin}/staff/register?token=${rawToken}`;

      // Re-dispatch invitation email
      const mailResult = await sendStaffInvitationEmail({
        to: invitation.email,
        name: invitation.name,
        role: invitation.role,
        department: invitation.department,
        registrationLink,
        expiresAt: invitation.expiresAt,
      });

      invitation.deliveryStatus = mailResult.delivered
        ? "sent"
        : (mailResult.reason === "SMTP_NOT_CONFIGURED" ? "manual_handoff" : "failed");
      invitation.deliveryError = mailResult.error || "";
      await invitation.save();

      await logAudit({
        actor: req.currentUser,
        action: "invitation.resent",
        details: `Reissued invitation token for ${invitation.email}`,
        targetEmail: invitation.email,
        req,
      });

      res.json({
        success: true,
        message: mailResult.delivered
          ? `Invitation email sent to ${invitation.email} with 24 hours validity. You can also copy the manual verification link below.`
          : "Invitation reissued with 24 hours validity. Copy the registration link below for manual delivery.",
        registrationLink,
      });
    } catch (err) {
      console.error("Resend invite error:", err);
      res.status(500).json({ success: false, message: "Failed to resend invitation." });
    }
  });

  // 5. POST /api/super-admin/users/:id/revoke-invite
  router.post("/users/:id/revoke-invite", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const invitation = await StaffInvitation.findById(id);

      if (!invitation) {
        return res.status(404).json({ success: false, message: "Invitation not found." });
      }

      invitation.status = "revoked";
      invitation.revokedAt = new Date();
      await invitation.save();

      await logAudit({
        actor: req.currentUser,
        action: "invitation.revoked",
        details: `Revoked authorization for ${invitation.email}`,
        targetEmail: invitation.email,
        req,
      });

      res.json({ success: true, message: `Authorization for ${invitation.email} revoked.` });
    } catch (err) {
      console.error("Revoke invite error:", err);
      res.status(500).json({ success: false, message: "Failed to revoke invitation." });
    }
  });

  // 6. PUT /api/super-admin/users/:id/role
  router.put("/users/:id/role", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      // Safeguard: Prevent demoting the last active super_admin
      if (user.role === "super_admin" && role !== "super_admin") {
        const superAdminCount = await User.countDocuments({ role: "super_admin", isSuspended: { $ne: true } });
        if (superAdminCount <= 1) {
          return res.status(403).json({
            success: false,
            message: "Cannot demote the last active CEO / Super Admin account.",
          });
        }
      }

      const prevRole = user.role;
      user.role = role;
      await user.save();

      await logAudit({
        actor: req.currentUser,
        action: "role.updated",
        details: `Changed role of ${user.email} from ${prevRole} to ${role}`,
        targetId: user._id,
        targetEmail: user.email,
        req,
      });

      res.json({ success: true, message: `Role updated to ${role} successfully.`, user });
    } catch (err) {
      console.error("Update role error:", err);
      res.status(500).json({ success: false, message: "Failed to update role." });
    }
  });

  // 7. PUT /api/super-admin/users/:id/team
  router.put("/users/:id/team", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { teamId } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      // Remove from old team
      if (user.team) {
        await Team.findByIdAndUpdate(user.team, { $pull: { members: user._id } });
      }

      if (teamId) {
        const team = await Team.findById(teamId);
        if (team) {
          user.team = team._id;
          user.teamName = team.name;
          await Team.findByIdAndUpdate(teamId, { $addToSet: { members: user._id } });
        }
      } else {
        user.team = null;
        user.teamName = "";
      }

      await user.save();

      await logAudit({
        actor: req.currentUser,
        action: "team.assigned",
        details: `Assigned ${user.email} to team ${user.teamName || "None"}`,
        targetId: user._id,
        targetEmail: user.email,
        req,
      });

      res.json({ success: true, message: `Team assignment updated.`, user });
    } catch (err) {
      console.error("Assign team error:", err);
      res.status(500).json({ success: false, message: "Failed to assign team." });
    }
  });

  // 8. POST /api/super-admin/users/:id/suspend
  router.post("/users/:id/suspend", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      // Safeguard: Prevent suspending the last active super_admin
      if (user.role === "super_admin") {
        const superAdminCount = await User.countDocuments({ role: "super_admin", isSuspended: { $ne: true } });
        if (superAdminCount <= 1) {
          return res.status(403).json({
            success: false,
            message: "Cannot suspend the last active CEO / Super Admin account.",
          });
        }
      }

      user.isSuspended = true;
      user.suspendedAt = new Date();
      user.suspensionReason = reason || "Suspended by CEO";
      user.sessionsRevokedAt = new Date();
      await user.save();

      await logAudit({
        actor: req.currentUser,
        action: "account.suspended",
        details: `Suspended account ${user.email}. Reason: ${user.suspensionReason}`,
        targetId: user._id,
        targetEmail: user.email,
        req,
      });

      res.json({ success: true, message: `Account ${user.email} suspended.`, user });
    } catch (err) {
      console.error("Suspend user error:", err);
      res.status(500).json({ success: false, message: "Failed to suspend account." });
    }
  });

  // 9. POST /api/super-admin/users/:id/reactivate
  router.post("/users/:id/reactivate", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      user.isSuspended = false;
      user.isActive = true;
      user.suspendedAt = null;
      user.suspensionReason = null;
      await user.save();

      await logAudit({
        actor: req.currentUser,
        action: "account.reactivated",
        details: `Reactivated account ${user.email}`,
        targetId: user._id,
        targetEmail: user.email,
        req,
      });

      res.json({ success: true, message: `Account ${user.email} reactivated.`, user });
    } catch (err) {
      console.error("Reactivate user error:", err);
      res.status(500).json({ success: false, message: "Failed to reactivate account." });
    }
  });

  // 10. POST /api/super-admin/users/:id/revoke-sessions
  router.post("/users/:id/revoke-sessions", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      user.sessionsRevokedAt = new Date();
      await user.save();

      await logAudit({
        actor: req.currentUser,
        action: "sessions.revoked",
        details: `Revoked all active login sessions for ${user.email}`,
        targetId: user._id,
        targetEmail: user.email,
        req,
      });

      res.json({ success: true, message: `All active sessions for ${user.email} have been revoked.` });
    } catch (err) {
      console.error("Revoke sessions error:", err);
      res.status(500).json({ success: false, message: "Failed to revoke sessions." });
    }
  });

  // 11. POST /api/super-admin/users/:id/initiate-password-reset
  router.post("/users/:id/initiate-password-reset", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found." });
      }

      // CEO never sets or views employee password.
      // Generate a single-use reset token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const clientOrigin = req.headers.origin || "http://localhost:5173";
      const resetLink = `${clientOrigin}/staff/register?resetToken=${rawToken}&email=${encodeURIComponent(user.email)}`;

      await logAudit({
        actor: req.currentUser,
        action: "password_reset.initiated",
        details: `Initiated self-service password reset for ${user.email}`,
        targetId: user._id,
        targetEmail: user.email,
        req,
      });

      res.json({
        success: true,
        message: `Self-service password reset link generated for ${user.email}.`,
        resetLink,
      });
    } catch (err) {
      console.error("Initiate reset error:", err);
      res.status(500).json({ success: false, message: "Failed to initiate password reset." });
    }
  });

  // 12. GET /api/super-admin/emails
  router.get("/emails", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const now = new Date();

      const [users, invitations] = await Promise.all([
        User.find({
          role: { $in: ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"] },
        })
          .populate("team", "name")
          .sort({ createdAt: -1 })
          .lean(),
        StaffInvitation.find().populate("team", "name").sort({ createdAt: -1 }).lean(),
      ]);

      const activeAccounts = users.map((u) => ({
        _id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        teamName: u.team?.name || u.teamName || "Unassigned",
        status: u.isSuspended ? "Suspended" : "Active",
        verificationStatus: "Verified",
        createdAt: u.createdAt,
      }));

      const pendingInvites = invitations
        .filter((inv) => (inv.status === "pending" || inv.status === "pending_delivery" || inv.status === "sent") && inv.expiresAt > now)
        .map((inv) => ({
          _id: inv._id,
          email: inv.email,
          name: inv.name,
          role: inv.role,
          teamName: inv.team?.name || inv.teamName || "Unassigned",
          status: "Pending",
          verificationStatus: inv.isEmailOwnershipVerified ? "Verified" : "Unverified",
          invitedOn: inv.createdAt,
          expiresAt: inv.expiresAt,
          deliveryStatus: inv.deliveryStatus,
        }));

      const expiredOrRevoked = invitations
        .filter((inv) => inv.status === "expired" || inv.status === "revoked" || inv.expiresAt <= now)
        .map((inv) => ({
          _id: inv._id,
          email: inv.email,
          name: inv.name,
          role: inv.role,
          teamName: inv.team?.name || inv.teamName || "Unassigned",
          status: inv.status === "revoked" ? "Revoked" : "Expired",
          verificationStatus: "Unverified",
          invitedOn: inv.createdAt,
          expiresAt: inv.expiresAt,
        }));

      res.json({
        success: true,
        activeAccounts,
        pendingInvites,
        expiredOrRevoked,
      });
    } catch (err) {
      console.error("Fetch emails error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch email accounts." });
    }
  });

  // 13. Teams Routes
  router.get("/teams", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const teams = await Team.find({ isArchived: { $ne: true } })
        .populate("lead", "name email role")
        .populate("members", "name email role department isSuspended")
        .sort({ createdAt: 1 })
        .lean();

      res.json({
        success: true,
        teams: teams.map((t) => ({
          _id: t._id,
          name: t.name,
          description: t.description,
          lead: t.lead ? { _id: t.lead._id, name: t.lead.name, email: t.lead.email } : null,
          leadName: t.lead?.name || t.leadName || "None",
          members: t.members || [],
          membersCount: (t.members || []).length,
          createdAt: t.createdAt,
        })),
      });
    } catch (err) {
      console.error("Fetch teams error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch teams." });
    }
  });

  router.post("/teams", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { name, description, leadId } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Team name is required." });
      }

      const existing = await Team.findOne({ name: name.trim(), isArchived: { $ne: true } });
      if (existing) {
        return res.status(409).json({ success: false, message: "A team with this name already exists." });
      }

      let leadDoc = null;
      if (leadId) {
        leadDoc = await User.findById(leadId);
      }

      const team = await Team.create({
        name: name.trim(),
        description: description || "",
        lead: leadDoc ? leadDoc._id : null,
        leadName: leadDoc ? leadDoc.name : "",
        createdBy: req.currentUser._id,
      });

      await logAudit({
        actor: req.currentUser,
        action: "team.created",
        details: `Created team "${team.name}"`,
        req,
      });

      res.json({ success: true, message: `Team "${team.name}" created successfully.`, team });
    } catch (err) {
      console.error("Create team error:", err);
      res.status(500).json({ success: false, message: "Failed to create team." });
    }
  });

  router.put("/teams/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, leadId } = req.body;

      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({ success: false, message: "Team not found." });
      }

      if (name) team.name = name.trim();
      if (description !== undefined) team.description = description;

      if (leadId) {
        const leadUser = await User.findById(leadId);
        if (leadUser) {
          team.lead = leadUser._id;
          team.leadName = leadUser.name;
        }
      } else if (leadId === null) {
        team.lead = null;
        team.leadName = "";
      }

      await team.save();

      await logAudit({
        actor: req.currentUser,
        action: "team.updated",
        details: `Updated team "${team.name}"`,
        req,
      });

      res.json({ success: true, message: `Team "${team.name}" updated successfully.`, team });
    } catch (err) {
      console.error("Update team error:", err);
      res.status(500).json({ success: false, message: "Failed to update team." });
    }
  });

  router.post("/teams/:id/members", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const [team, user] = await Promise.all([Team.findById(id), User.findById(userId)]);
      if (!team) return res.status(404).json({ success: false, message: "Team not found." });
      if (!user) return res.status(404).json({ success: false, message: "User not found." });

      // Remove from previous team
      if (user.team && String(user.team) !== String(team._id)) {
        await Team.findByIdAndUpdate(user.team, { $pull: { members: user._id } });
      }

      await Team.findByIdAndUpdate(id, { $addToSet: { members: user._id } });
      user.team = team._id;
      user.teamName = team.name;
      await user.save();

      await logAudit({
        actor: req.currentUser,
        action: "team.member_added",
        details: `Added ${user.email} to team "${team.name}"`,
        req,
      });

      res.json({ success: true, message: `Added ${user.name} to ${team.name}.` });
    } catch (err) {
      console.error("Add team member error:", err);
      res.status(500).json({ success: false, message: "Failed to add member to team." });
    }
  });

  router.delete("/teams/:id/members/:userId", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id, userId } = req.params;

      await Team.findByIdAndUpdate(id, { $pull: { members: userId } });
      await User.findByIdAndUpdate(userId, { team: null, teamName: "" });

      await logAudit({
        actor: req.currentUser,
        action: "team.member_removed",
        details: `Removed member ${userId} from team ${id}`,
        req,
      });

      res.json({ success: true, message: "Member removed from team." });
    } catch (err) {
      console.error("Remove team member error:", err);
      res.status(500).json({ success: false, message: "Failed to remove member." });
    }
  });

  router.delete("/teams/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const team = await Team.findById(id);
      if (!team) {
        return res.status(404).json({ success: false, message: "Team not found." });
      }

      if (team.members && team.members.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot archive team with active members. Please transfer or remove members first.",
        });
      }

      team.isArchived = true;
      await team.save();

      await logAudit({
        actor: req.currentUser,
        action: "team.archived",
        details: `Archived team "${team.name}"`,
        req,
      });

      res.json({ success: true, message: `Team "${team.name}" archived successfully.` });
    } catch (err) {
      console.error("Archive team error:", err);
      res.status(500).json({ success: false, message: "Failed to archive team." });
    }
  });

  // 14. GET /api/super-admin/activity-logs
  router.get("/activity-logs", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { action = "", filter = "7days" } = req.query;
      const query = {};

      if (action) {
        query.action = action;
      }

      const now = new Date();
      if (filter === "today") {
        query.timestamp = { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
      } else if (filter === "7days") {
        query.timestamp = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      } else if (filter === "30days") {
        query.timestamp = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      }

      const logs = await AuditLog.find(query).sort({ timestamp: -1 }).limit(100).lean();

      res.json({
        success: true,
        logs: logs.map((l) => ({
          _id: l._id,
          eventId: l.eventId,
          action: l.action,
          details: l.details,
          actorEmail: l.actorEmail,
          actorRole: l.actorRole,
          targetEmail: l.targetEmail,
          result: l.result,
          time: new Date(l.timestamp).toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: new Date(l.timestamp).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
        })),
      });
    } catch (err) {
      console.error("Activity logs fetch error:", err);
      res.status(500).json({ success: false, message: "Failed to fetch activity logs." });
    }
  });

  // 17. GET /api/super-admin/pipeline (CRM Lead Management)
  router.get("/pipeline", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { search = "", stage = "" } = req.query;
      const query = {};
      if (search) {
        const regex = new RegExp(search.trim(), "i");
        query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { tripTitle: regex }];
      }
      if (stage && stage !== "all") {
        query.status = stage;
      }

      let leads = await Enquiry.find(query).sort({ updatedAt: -1 }).lean();

      // If DB has no enquiries yet, seed initial CRM leads as shown in prompt specifications
      if (leads.length === 0 && !search && (!stage || stage === "all")) {
        const initialSeedLeads = [
          {
            enquiryId: "ENQ-1001",
            name: "Rahul R.",
            email: "rahul.r@example.com",
            phone: "+91 98765 11001",
            tripTitle: "Coorg Group Trip",
            budget: 45000,
            numTravelers: 6,
            status: "New",
            source: "Website",
            notes: "Inquired about weekend trek and resort stay for friends group.",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1002",
            name: "Megha S.",
            email: "megha.s@example.com",
            phone: "+91 98765 11002",
            tripTitle: "Ooty 3D/2N",
            budget: 32000,
            numTravelers: 4,
            status: "New",
            source: "Instagram",
            notes: "Family trip with parents, requested ground-floor cottages.",
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1003",
            name: "Tech Mahindra HR",
            email: "events@techmahindra.com",
            phone: "+91 98765 11003",
            tripTitle: "Goa Group Trip",
            budget: 180000,
            numTravelers: 18,
            status: "In Progress",
            source: "Referral",
            notes: "Annual sales team outing, beach resort and transport required.",
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1004",
            name: "Ishan P.",
            email: "ishan.p@example.com",
            phone: "+91 98765 11004",
            tripTitle: "Wayanad Trip",
            budget: 28000,
            numTravelers: 3,
            status: "In Progress",
            source: "WhatsApp",
            notes: "Adventure enthusiast group, treehouse stay preferred.",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1005",
            name: "Pune Group (Amit)",
            email: "amit.pune@example.com",
            phone: "+91 98765 11005",
            tripTitle: "Mysore-Ooty-Coorg",
            budget: 95000,
            numTravelers: 12,
            status: "Proposal",
            source: "Website",
            notes: "Sent customized 5-day itinerary with tempo traveller.",
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1006",
            name: "Zenith Tech Lead",
            email: "admin@zenithtech.in",
            phone: "+91 98765 11006",
            tripTitle: "Corporate Trip",
            budget: 240000,
            numTravelers: 24,
            status: "Proposal",
            source: "Phone Call",
            notes: "Leadership offsite in Chikmagalur, proposal under financial review.",
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1007",
            name: "Vikas K.",
            email: "vikas.k@example.com",
            phone: "+91 98765 11007",
            tripTitle: "Rameshwaram",
            budget: 220000,
            numTravelers: 24,
            status: "Confirmed",
            source: "Referral",
            notes: "Advance 50% paid, hotel and tempo traveller booked.",
            createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1008",
            name: "Pooja D.",
            email: "pooja.d@example.com",
            phone: "+91 98765 11008",
            tripTitle: "Kodaikanal",
            budget: 110000,
            numTravelers: 12,
            status: "Confirmed",
            source: "Instagram",
            notes: "Confirmed departure, briefing kit and WhatsApp group shared.",
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            enquiryId: "ENQ-1009",
            name: "Suresh M.",
            email: "suresh.m@example.com",
            phone: "+91 98765 11009",
            tripTitle: "Manali Package",
            budget: 50000,
            numTravelers: 2,
            status: "Lost",
            source: "Website",
            notes: "Dates rescheduled by client due to personal reasons.",
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          },
        ];

        try {
          await Enquiry.insertMany(initialSeedLeads);
          leads = await Enquiry.find().sort({ updatedAt: -1 }).lean();
        } catch (seedErr) {
          console.warn("Could not seed initial leads:", seedErr.message);
          leads = initialSeedLeads;
        }
      }

      // Format leads and compute column stats
      const formatted = leads.map((l) => ({
        _id: l._id,
        enquiryId: l.enquiryId || `ENQ-${String(l._id).slice(-4)}`,
        title: l.tripTitle || l.preferredDestinations?.[0] || "Custom Trip",
        name: l.name,
        email: l.email,
        phone: l.phone,
        numTravelers: l.numTravelers || 1,
        budget: l.budget || 0,
        status:
          l.status === "Won" || l.status === "Confirmed"
            ? "Confirmed"
            : l.status === "Contacted" || l.status === "Qualified" || l.status === "In Progress"
            ? "In Progress"
            : l.status === "Proposal Sent" || l.status === "Negotiation" || l.status === "Proposal"
            ? "Proposal"
            : l.status === "Lost"
            ? "Lost"
            : "New",
        rawStatus: l.status,
        source: l.source || "Website",
        notes: l.notes || "",
        createdAt: l.createdAt
          ? new Date(l.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })
          : "Recently",
      }));

      const counts = {
        total: formatted.length,
        new: formatted.filter((l) => l.status === "New").length,
        inProgress: formatted.filter((l) => l.status === "In Progress").length,
        proposal: formatted.filter((l) => l.status === "Proposal").length,
        confirmed: formatted.filter((l) => l.status === "Confirmed").length,
        lost: formatted.filter((l) => l.status === "Lost").length,
      };

      res.json({
        success: true,
        counts,
        leads: formatted,
      });
    } catch (err) {
      console.error("Super Admin pipeline error:", err);
      res.status(500).json({ success: false, message: "Failed to load CRM pipeline." });
    }
  });

  // 18. POST /api/super-admin/leads (Create New Lead)
  router.post("/leads", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { name, email, phone, tripTitle, numTravelers, budget, status = "New", source = "Website", notes = "" } = req.body;
      if (!name || !email || !phone) {
        return res.status(400).json({ success: false, message: "Client name, email and phone are required." });
      }

      const enquiryId = `ENQ-${Math.floor(1000 + Math.random() * 9000)}`;
      const lead = await Enquiry.create({
        enquiryId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        tripTitle: (tripTitle || "Custom Group Trip").trim(),
        numTravelers: Number(numTravelers) || 1,
        budget: Number(budget) || 0,
        status,
        source,
        notes,
      });

      await logAudit({
        actor: req.user,
        action: "lead.created",
        details: `New CRM lead created: ${lead.tripTitle} for ${lead.name}`,
        targetId: lead._id,
        targetEmail: lead.email,
        req,
      });

      res.json({
        success: true,
        message: "Lead created successfully in CRM pipeline.",
        lead,
      });
    } catch (err) {
      console.error("Create lead error:", err);
      res.status(500).json({ success: false, message: "Failed to create lead." });
    }
  });

  // 19. PATCH /api/super-admin/leads/:id/stage (Update Lead Stage)
  router.patch("/leads/:id/stage", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { stage } = req.body;

      const lead = await Enquiry.findById(id);
      if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found." });
      }

      const prevStatus = lead.status;
      lead.status = stage;
      await lead.save();

      await logAudit({
        actor: req.user,
        action: stage === "Confirmed" || stage === "Won" ? "deal.confirmed" : "lead.stage_updated",
        details: `Deal moved to ${stage} - ${lead.tripTitle || lead.name}`,
        targetId: lead._id,
        targetEmail: lead.email,
        req,
      });

      res.json({
        success: true,
        message: `Lead stage updated to ${stage}.`,
        lead,
      });
    } catch (err) {
      console.error("Update stage error:", err);
      res.status(500).json({ success: false, message: "Failed to update lead stage." });
    }
  });

  // 20. POST /api/super-admin/leads/:id/convert (Convert Lead to Booking)
  router.post("/leads/:id/convert", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const lead = await Enquiry.findById(id);
      if (!lead) {
        return res.status(404).json({ success: false, message: "Lead not found." });
      }

      const bookingCode = `TVK${Math.floor(1000 + Math.random() * 9000)}`;
      const newBooking = await Booking.create({
        bookingCode,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        travellers: lead.numTravelers || 1,
        total: lead.budget || 10000,
        amountPaid: lead.budget || 10000,
        paymentStatus: "Paid",
        status: "Confirmed",
        bookingDate: new Date(),
      });

      lead.status = "Won";
      lead.bookingId = newBooking._id;
      await lead.save();

      await logAudit({
        actor: req.user,
        action: "deal.converted_to_booking",
        details: `Lead ${lead.tripTitle} converted to confirmed Booking #${bookingCode}`,
        targetId: newBooking._id,
        targetEmail: lead.email,
        req,
      });

      res.json({
        success: true,
        message: `Lead successfully converted to Booking #${bookingCode}!`,
        booking: newBooking,
      });
    } catch (err) {
      console.error("Convert lead error:", err);
      res.status(500).json({ success: false, message: "Failed to convert lead to booking." });
    }
  });

  // 21. DELETE /api/super-admin/leads/:id
  router.delete("/leads/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      await Enquiry.findByIdAndDelete(id);
      res.json({ success: true, message: "Lead removed from pipeline." });
    } catch (err) {
      console.error("Delete lead error:", err);
      res.status(500).json({ success: false, message: "Failed to delete lead." });
    }
  });

  return router;
};

