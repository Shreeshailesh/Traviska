const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const StaffInvitation = require("../models/StaffInvitation");
const Team = require("../models/Team");
const AuditLog = require("../models/AuditLog");

module.exports = function staffInvitationRoutes() {
  const router = express.Router();

  // 1. GET /api/staff-invitation/validate?token=...
  router.get("/validate", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return res.status(400).json({ valid: false, message: "Invitation token is missing." });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invitation = await StaffInvitation.findOne({ tokenHash });

      if (!invitation) {
        return res.status(404).json({ valid: false, message: "Invalid invitation token." });
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
          message: "This invitation has expired. Please contact the administrator to re-issue an invitation.",
        });
      }

      res.json({
        valid: true,
        name: invitation.name,
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        teamName: invitation.teamName,
        isEmailOwnershipVerified: Boolean(invitation.isEmailOwnershipVerified),
      });
    } catch (err) {
      console.error("Validate invitation error:", err);
      res.status(500).json({ valid: false, message: "Server error validating invitation." });
    }
  });

  // 2. POST /api/staff-invitation/send-verification-otp
  router.post("/send-verification-otp", async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, message: "Token is required." });

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invitation = await StaffInvitation.findOne({ tokenHash });
      if (!invitation || invitation.expiresAt < new Date() || invitation.status === "accepted") {
        return res.status(400).json({ success: false, message: "Invalid or expired invitation." });
      }

      // Generate 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeHash = crypto.createHash("sha256").update(otpCode).digest("hex");

      invitation.emailVerificationCodeHash = codeHash;
      invitation.emailVerificationCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await invitation.save();

      const hasSmtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

      res.json({
        success: true,
        message: hasSmtp
          ? `Verification code sent to ${invitation.email}.`
          : `Verification code generated for ${invitation.email}.`,
        // In local/sandbox/manual handoff mode without SMTP, deliver code directly for testing
        devVerificationCode: hasSmtp ? undefined : otpCode,
      });
    } catch (err) {
      console.error("Send verification OTP error:", err);
      res.status(500).json({ success: false, message: "Failed to generate verification code." });
    }
  });

  // 3. POST /api/staff-invitation/verify-otp
  router.post("/verify-otp", async (req, res) => {
    try {
      const { token, code } = req.body;
      if (!token || !code) {
        return res.status(400).json({ success: false, message: "Token and verification code are required." });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const invitation = await StaffInvitation.findOne({ tokenHash });
      if (!invitation || invitation.expiresAt < new Date()) {
        return res.status(400).json({ success: false, message: "Invalid or expired invitation." });
      }

      if (!invitation.emailVerificationCodeHash || invitation.emailVerificationCodeExpiresAt < new Date()) {
        return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new one." });
      }

      const inputCodeHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
      if (inputCodeHash !== invitation.emailVerificationCodeHash) {
        return res.status(400).json({ success: false, message: "Invalid verification code. Please try again." });
      }

      invitation.isEmailOwnershipVerified = true;
      invitation.emailVerificationCodeHash = undefined;
      invitation.emailVerificationCodeExpiresAt = undefined;
      await invitation.save();

      res.json({ success: true, message: "Email ownership verified successfully!" });
    } catch (err) {
      console.error("Verify OTP error:", err);
      res.status(500).json({ success: false, message: "Verification failed." });
    }
  });

  // 4. POST /api/staff-invitation/complete-registration
  router.post("/complete-registration", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token || !password) {
        return res.status(400).json({ success: false, message: "Token and password are required." });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
      }

      // Password strength validation: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit
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
          message: "This invitation has already been used. Please log in directly.",
        });
      }

      if (invitation.status === "revoked") {
        return res.status(403).json({ success: false, message: "This invitation has been revoked." });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(410).json({ success: false, message: "This invitation has expired." });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email: invitation.email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: "An account with this email already exists." });
      }

      // Hash password securely with bcryptjs
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Create new Staff User
      const user = await User.create({
        name: invitation.name,
        email: invitation.email,
        password: hashedPassword,
        role: invitation.role,
        department: invitation.department || "Operations",
        team: invitation.team || null,
        teamName: invitation.teamName || "",
        isActive: true,
        isEmailVerified: true,
        authProvider: "password",
        invitedBy: invitation.invitedBy || null,
        lastLogin: new Date(),
      });

      // If assigned to a team, add to Team.members
      if (invitation.team) {
        await Team.findByIdAndUpdate(invitation.team, { $addToSet: { members: user._id } });
      }

      // Mark invitation accepted
      invitation.status = "accepted";
      invitation.acceptedAt = new Date();
      await invitation.save();

      // Log Audit Event
      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "staff.activated",
        details: `Staff member ${user.name} (${user.email}) completed registration with role ${user.role}`,
        targetId: String(user._id),
        targetEmail: user.email,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
      });

      // Generate JWT session token
      const jwtToken = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        message: "Account activated successfully! Welcome to Team Traviska.",
        token: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          teamName: user.teamName,
        },
      });
    } catch (err) {
      console.error("Complete registration error:", err);
      res.status(500).json({ success: false, message: "Registration failed. Please try again." });
    }
  });

  return router;
};

