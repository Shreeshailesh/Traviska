const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const StaffInvitation = require("../models/StaffInvitation");
const Team = require("../models/Team");
const AuditLog = require("../models/AuditLog");

module.exports = function staffInvitationRoutes() {
  const router = express.Router();

  // 1. GET /api/staff-invitation/validate?token=...
  // Validates the invitation token and confirms email ownership through link possession.
  router.get("/validate", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, message: "Invitation token is missing." });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invitation = await StaffInvitation.findOne({ tokenHash });

      if (!invitation) {
        return res.status(404).json({ valid: false, message: "Invalid or unrecognized invitation link." });
      }

      if (invitation.status === "accepted") {
        return res.status(400).json({
          valid: false,
          message: "This invitation has already been accepted. Please log in with your credentials.",
        });
      }

      if (invitation.status === "revoked") {
        return res.status(403).json({
          valid: false,
          message: "This invitation has been revoked by the administrator.",
        });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(410).json({
          valid: false,
          message: "This invitation has expired. Please contact your CEO to re-issue an invitation.",
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: invitation.email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({
          valid: false,
          message: "An active account already exists for this email address. Please sign in.",
        });
      }

      // Possession of the cryptographically secure single-use link confirms email ownership
      // Record verified email ownership; account remains uncreated until initial password is set
      if (!invitation.isEmailOwnershipVerified || invitation.status !== "verified_pending_password") {
        invitation.isEmailOwnershipVerified = true;
        if (invitation.status !== "revoked" && invitation.status !== "accepted") {
          invitation.status = "verified_pending_password";
        }
        await invitation.save();
      }

      return res.json({
        valid: true,
        name: invitation.name,
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        teamName: invitation.teamName,
        isEmailVerified: true,
        status: "verified_pending_password",
      });
    } catch (err) {
      console.error("Validate invitation error:", err);
      return res.status(500).json({ valid: false, message: "Server error validating invitation." });
    }
  });

  // 2. POST /api/staff-invitation/complete-registration
  // Validates invitation, password strength, consumes invitation atomically, creates User, and requires manual sign in.
  router.post("/complete-registration", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token || !password) {
        return res.status(400).json({ success: false, message: "Token and password are required." });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
      }

      // Password strength validation: minimum 8 characters, uppercase, lowercase, number
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        return res.status(400).json({
          success: false,
          message: "Password must include at least one uppercase letter, one lowercase letter, and one number.",
        });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invitation = await StaffInvitation.findOne({ tokenHash });

      if (!invitation) {
        return res.status(404).json({ success: false, message: "Invalid invitation token." });
      }

      if (invitation.status === "accepted") {
        return res.status(400).json({
          success: false,
          message: "This invitation has already been accepted. Please log in directly.",
        });
      }

      if (invitation.status === "revoked") {
        return res.status(403).json({ success: false, message: "This invitation has been revoked." });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(410).json({ success: false, message: "This invitation has expired." });
      }

      const normalizedEmail = invitation.email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ success: false, message: "An account with this email already exists." });
      }

      // Atomically claim invitation to ensure single-use execution without race conditions
      const claimedInvitation = await StaffInvitation.findOneAndUpdate(
        {
          _id: invitation._id,
          status: { $in: ["pending", "sent", "pending_delivery", "verified_pending_password"] },
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            status: "accepted",
            acceptedAt: new Date(),
            isEmailOwnershipVerified: true,
          },
        },
        { returnDocument: "after" }
      );

      if (!claimedInvitation) {
        return res.status(400).json({
          success: false,
          message: "This invitation is no longer valid, has expired, or has already been accepted.",
        });
      }

      // Hash password securely with bcryptjs
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new Staff User with assigned role
      const user = await User.create({
        name: invitation.name,
        email: normalizedEmail,
        password: hashedPassword,
        role: invitation.role,
        department: invitation.department || "Operations",
        team: invitation.team || null,
        teamName: invitation.teamName || "",
        isActive: true,
        isEmailVerified: true,
        authProvider: "password",
        invitedBy: invitation.invitedBy || null,
        lastLogin: null,
      });

      // If assigned to a team, add to Team.members
      if (invitation.team) {
        await Team.findByIdAndUpdate(invitation.team, { $addToSet: { members: user._id } });
      }

      // Log Audit Event
      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "staff.activated",
        details: `Staff member ${user.name} (${user.email}) activated account with role ${user.role}`,
        targetId: String(user._id),
        targetEmail: user.email,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
      });

      // Explicitly require manual login; do not automatically grant a session
      return res.json({
        success: true,
        message: "Your account has been activated successfully. Please sign in.",
      });
    } catch (err) {
      console.error("Complete registration error:", err);
      return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
    }
  });

  return router;
};
