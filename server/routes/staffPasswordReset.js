const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const StaffInvitation = require("../models/StaffInvitation");
const PasswordResetToken = require("../models/PasswordResetToken");
const EmailOwnershipToken = require("../models/EmailOwnershipToken");
const AuditLog = require("../models/AuditLog");
const { sendPasswordResetEmail, sendAccountStatusVerificationEmail } = require("../services/mailer");

module.exports = function staffPasswordResetRoutes() {
  const router = express.Router();

  const STAFF_ROLES = ["admin", "sales", "sales_lead", "sales_executive", "captain_admin"];

  // Generic public message for unauthenticated external requests (prevents public account enumeration)
  const GENERIC_RESPONSE_MSG = "Request received. If your account is eligible, you'll receive an email with instructions.";

  /**
   * Evaluates the real-time MongoDB status of an email across User and StaffInvitation models.
   * Priority order:
   * 1. Suspended (Rule 5)
   * 2. Deactivated (Rule 6)
   * 3. Super Admin Protected (Cannot use standard staff recovery)
   * 4. Active & Fully Registered (Rule 4)
   * 5. Password pending (Rule 3)
   * 6. Invitation Revoked (Rule 7)
   * 7. Pending verification (Rule 2)
   * 8. Not Registered (Rule 1)
   */
  async function evaluateAccountStatus(email) {
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedEmail) {
      return {
        rule: 1,
        status: "NOT_REGISTERED",
        message: "Account not registered. Contact Traviska administrator.",
        eligible: false,
      };
    }

    const safeEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${safeEmail}$`, "i") },
    });

    const latestInvite = await StaffInvitation.findOne({
      email: { $regex: new RegExp(`^${safeEmail}$`, "i") },
    }).sort({ createdAt: -1 });

    // 1. SUSPENDED: Prioritize suspension over all other statuses (Rule 5)
    if (user && user.isSuspended === true) {
      return {
        rule: 5,
        status: "SUSPENDED",
        message: "Your account is suspended. Contact Traviska administrator.",
        eligible: false,
        user,
      };
    }

    // 2. DEACTIVATED: Prioritize deactivation (Rule 6)
    if (user && user.isActive === false) {
      return {
        rule: 6,
        status: "DEACTIVATED",
        message: "Your account is deactivated. Contact Traviska administrator.",
        eligible: false,
        user,
      };
    }

    // 3. SUPER ADMIN: Protected from routine staff recovery
    if (user && user.role === "super_admin") {
      return {
        rule: 4.1,
        status: "SUPER_ADMIN_RESERVED",
        message: "Super Admin accounts must use the CEO security recovery flow.",
        eligible: false,
        user,
      };
    }

    // 4. ACTIVE: Fully registered with verified email and password set (Rule 4)
    if (user && STAFF_ROLES.includes(user.role)) {
      const hasPassword = Boolean(user.password && user.password.length > 0);
      const isVerified = user.isEmailVerified === true;

      if (hasPassword && isVerified) {
        return {
          rule: 4,
          status: "ACTIVE",
          message: "Password reset link sent. Check your inbox.",
          eligible: true,
          user,
        };
      } else {
        // Email verified but initial password setup incomplete
        return {
          rule: 3,
          status: "PASSWORD_PENDING",
          message: "Complete registration by setting your password.",
          eligible: false,
          user,
        };
      }
    }

    // If no active staff User record exists, check StaffInvitations
    if (latestInvite) {
      // 7. INVITATION REVOKED (Rule 7)
      if (latestInvite.status === "revoked") {
        return {
          rule: 7,
          status: "INVITATION_REVOKED",
          message: "Your invitation has been revoked. Contact Traviska administrator.",
          eligible: false,
          invitation: latestInvite,
        };
      }

      // 3. EMAIL VERIFIED / PASSWORD NOT SET (Rule 3)
      if (latestInvite.isEmailOwnershipVerified === true || latestInvite.status === "verified_pending_password") {
        return {
          rule: 3,
          status: "PASSWORD_PENDING",
          message: "Complete registration by setting your password.",
          eligible: false,
          invitation: latestInvite,
        };
      }

      // 2. INVITED / EMAIL NOT VERIFIED (Rule 2)
      if (["pending", "sent", "pending_delivery"].includes(latestInvite.status)) {
        return {
          rule: 2,
          status: "PENDING_VERIFICATION",
          message: "Please verify your invitation email.",
          eligible: false,
          invitation: latestInvite,
        };
      }
    }

    // 1. NOT REGISTERED (Rule 1)
    return {
      rule: 1,
      status: "NOT_REGISTERED",
      message: "Account not registered. Contact Traviska administrator.",
      eligible: false,
    };
  }

  /**
   * Cryptographically verifies email ownership.
   * STRICT SECURITY: Client-supplied assertion headers (such as x-verified-ownership)
   * or client boolean flags are NEVER accepted as evidence of ownership.
   * Evidence accepted:
   * 1. Valid Bearer JWT from an authenticated session (Super Admin or matching email).
   * 2. Cryptographic EmailOwnershipToken issued to and clicked/received by this inbox.
   * 3. 6-digit EmailOwnershipToken verification code dispatched to this email.
   * 4. Active StaffInvitation token hash issued to this email.
   * 5. Active PasswordResetToken hash issued to this email.
   */
  async function verifyEmailOwnership(req, targetEmail) {
    const normalizedEmail = (targetEmail || "").trim().toLowerCase();

    // 1. Bearer JWT (Authenticated session)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === "super_admin") {
          return { verified: true, method: "SUPER_ADMIN_JWT", email: normalizedEmail || decoded.email };
        }
        if (decoded.email && (!normalizedEmail || decoded.email.toLowerCase() === normalizedEmail)) {
          return { verified: true, method: "OWNER_JWT", email: decoded.email.toLowerCase() };
        }
      } catch {
        // invalid token
      }
    }

    // 2. Cryptographic token check
    const rawToken =
      req.body?.ownershipToken ||
      req.query?.ownershipToken ||
      req.body?.token ||
      req.query?.token ||
      req.headers["x-ownership-token"];

    if (rawToken && typeof rawToken === "string" && rawToken.trim().length >= 16) {
      const cleanToken = rawToken.trim();
      const tokenHash = crypto.createHash("sha256").update(cleanToken).digest("hex");

      // Check EmailOwnershipToken
      const ot = await EmailOwnershipToken.findOne({
        tokenHash,
        status: "active",
        expiresAt: { $gt: new Date() },
      });
      if (ot) {
        if (!normalizedEmail || ot.email.toLowerCase() === normalizedEmail) {
          return { verified: true, method: "EMAIL_OWNERSHIP_TOKEN", email: ot.email.toLowerCase() };
        }
      }

      // Check PasswordResetToken
      const prt = await PasswordResetToken.findOne({
        tokenHash,
        status: "active",
        expiresAt: { $gt: new Date() },
      });
      if (prt) {
        if (!normalizedEmail || prt.email.toLowerCase() === normalizedEmail) {
          return { verified: true, method: "PASSWORD_RESET_TOKEN", email: prt.email.toLowerCase() };
        }
      }

      // Check StaffInvitation
      const inv = await StaffInvitation.findOne({
        tokenHash,
        status: { $ne: "consumed" },
      });
      if (inv) {
        if (!normalizedEmail || inv.email.toLowerCase() === normalizedEmail) {
          return { verified: true, method: "INVITATION_TOKEN", email: inv.email.toLowerCase() };
        }
      }
    }

    // 3. 6-digit Code check
    const code = req.body?.code || req.query?.code;
    if (code && typeof code === "string" && normalizedEmail) {
      const cleanCode = code.trim();
      const ot = await EmailOwnershipToken.findOne({
        email: normalizedEmail,
        code: cleanCode,
        status: "active",
        expiresAt: { $gt: new Date() },
      });
      if (ot) {
        return { verified: true, method: "EMAIL_VERIFICATION_CODE", email: normalizedEmail };
      }
    }

    // Client assertion headers (e.g. x-verified-ownership) are strictly rejected.
    return { verified: false, method: "UNVERIFIED" };
  }

  // 1. POST /api/staff-auth/request-status-verification
  // Initiates email ownership verification by sending a single-use verification link & code
  router.post("/request-status-verification", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ success: false, message: "Valid email address is required." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const safeEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      // Invalidate any existing active ownership tokens for this email
      await EmailOwnershipToken.updateMany(
        { email: normalizedEmail, status: "active" },
        { $set: { status: "expired" } }
      );

      // Generate 32-byte cryptographic token + 6-digit verification code
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const code = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await EmailOwnershipToken.create({
        email: normalizedEmail,
        tokenHash,
        code,
        expiresAt,
        status: "active",
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
      });

      // Find user or invite to personalize email if available
      const [user, invite] = await Promise.all([
        User.findOne({ email: { $regex: new RegExp(`^${safeEmail}$`, "i") } }),
        StaffInvitation.findOne({ email: { $regex: new RegExp(`^${safeEmail}$`, "i") } }).sort({ createdAt: -1 }),
      ]);

      const recipientName = user?.name || invite?.name || "Staff Member";
      const isProduction = process.env.NODE_ENV === "production";
      const defaultOrigin = isProduction ? "https://traviska.com" : "http://localhost:5173";
      const clientOrigin = process.env.CLIENT_URL || req.headers.origin || defaultOrigin;
      const verificationLink = `${clientOrigin}/admin/login?verifyStatusToken=${rawToken}&email=${encodeURIComponent(normalizedEmail)}`;

      await sendAccountStatusVerificationEmail({
        to: normalizedEmail,
        name: recipientName,
        verificationLink,
        code,
        expiresAt,
      });

      return res.json({
        success: true,
        message: "If your email is in our records, a verification link and code have been sent to your inbox.",
      });
    } catch (err) {
      console.error("Request status verification error:", err);
      return res.status(500).json({ success: false, message: "Error requesting email ownership verification." });
    }
  });

  // 2. POST /api/staff-auth/verify-account-status
  // Verifies email ownership and returns the EXACT MongoDB account status
  router.post("/verify-account-status", async (req, res) => {
    try {
      const { email } = req.body;
      const verification = await verifyEmailOwnership(req, email);

      if (!verification.verified) {
        return res.status(401).json({
          success: false,
          verified: false,
          message: "Email ownership could not be verified. Please use the link sent to your email or enter your 6-digit verification code.",
        });
      }

      const verifiedEmail = verification.email;
      const evalResult = await evaluateAccountStatus(verifiedEmail);

      return res.json({
        success: true,
        verified: true,
        email: verifiedEmail,
        rule: evalResult.rule,
        status: evalResult.status,
        message: evalResult.message,
        eligible: evalResult.eligible,
      });
    } catch (err) {
      console.error("Verify account status error:", err);
      return res.status(500).json({ success: false, message: "Error verifying account status." });
    }
  });

  // 3. GET /api/staff-auth/account-status
  // Returns account status ONLY for authenticated Super Admins, verified email owners, or valid cryptographic tokens
  router.get("/account-status", async (req, res) => {
    try {
      const { email } = req.query;
      const verification = await verifyEmailOwnership(req, email);

      if (!verification.verified) {
        return res.status(401).json({
          success: false,
          verified: false,
          message: "Email ownership could not be verified. Cryptographic token or authenticated session required.",
        });
      }

      const verifiedEmail = verification.email;
      const evalResult = await evaluateAccountStatus(verifiedEmail);

      return res.json({
        success: true,
        verified: true,
        email: verifiedEmail,
        rule: evalResult.rule,
        status: evalResult.status,
        message: evalResult.message,
        eligible: evalResult.eligible,
      });
    } catch (err) {
      console.error("Account status check error:", err);
      return res.status(500).json({ success: false, message: "Failed to evaluate account status." });
    }
  });

  // 4. POST /api/staff-auth/forgot-password
  // Evaluates MongoDB status strictly. Issues reset links ONLY for Rule 4 (Active & Registered).
  router.post("/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ success: false, message: "A valid email address is required." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const evalResult = await evaluateAccountStatus(normalizedEmail);

      // If not eligible (Rules 1, 2, 3, 5, 6, 7), DO NOT issue reset token or email
      if (!evalResult.eligible) {
        await AuditLog.create({
          action: "staff.password_reset_rejected",
          details: `Password reset rejected for ${normalizedEmail} (Rule ${evalResult.rule}: ${evalResult.status})`,
          targetEmail: normalizedEmail,
          ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
          userAgent: req.headers["user-agent"] || "",
        });

        // Return the exact real-time MongoDB account status message
        return res.json({
          success: false,
          eligible: false,
          rule: evalResult.rule,
          status: evalResult.status,
          message: evalResult.message,
        });
      }

      // Rule 4: Active & Registered account
      const user = evalResult.user;

      // Invalidate any existing active reset tokens for this user
      await PasswordResetToken.updateMany(
        { userId: user._id, status: "active" },
        { $set: { status: "invalidated" } }
      );

      // Generate cryptographically secure random token (32 bytes hex)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

      await PasswordResetToken.create({
        userId: user._id,
        email: user.email,
        tokenHash,
        expiresAt,
        status: "active",
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
      });

      const isProduction = process.env.NODE_ENV === "production";
      const defaultOrigin = isProduction ? "https://traviska.com" : "http://localhost:5173";
      const clientOrigin = process.env.CLIENT_URL || req.headers.origin || defaultOrigin;
      const resetLink = `${clientOrigin}/staff/reset-password?token=${rawToken}`;

      // Dispatch reset email
      const mailResult = await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink,
        expiresAt,
      });

      if (mailResult && mailResult.success === false) {
        return res.status(500).json({
          success: false,
          message: "Email provider was unable to dispatch reset link. Please contact administrator.",
        });
      }

      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "staff.password_reset_requested",
        details: `Password reset link issued for ${user.email}`,
        targetId: String(user._id),
        targetEmail: user.email,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
      });

      return res.json({
        success: true,
        eligible: true,
        rule: 4,
        status: "ACTIVE",
        message: evalResult.message, // "Password reset link sent. Check your inbox."
      });
    } catch (err) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ success: false, message: "Error processing password reset request." });
    }
  });

  // 2. GET /api/staff-auth/validate-reset-token?token=...
  router.get("/validate-reset-token", async (req, res) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, message: "Reset token is missing." });
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const resetDoc = await PasswordResetToken.findOne({ tokenHash });

      if (!resetDoc) {
        return res.status(404).json({ valid: false, message: "Invalid or unrecognized password reset link." });
      }

      if (resetDoc.status === "consumed") {
        return res.status(400).json({ valid: false, message: "This password reset link has already been used. Please request a new one." });
      }

      if (resetDoc.status === "invalidated") {
        return res.status(400).json({ valid: false, message: "A newer password reset link was requested. This link is no longer valid." });
      }

      if (resetDoc.expiresAt < new Date()) {
        return res.status(410).json({ valid: false, message: "This password reset link has expired. Please request a new one." });
      }

      const user = await User.findById(resetDoc.userId);
      if (!user || user.isSuspended || user.isActive === false) {
        return res.status(403).json({ valid: false, message: "Account is not eligible for password reset. Please contact the administrator." });
      }

      return res.json({
        valid: true,
        email: user.email,
        name: user.name,
      });
    } catch (err) {
      console.error("Validate reset token error:", err);
      return res.status(500).json({ valid: false, message: "Error validating password reset token." });
    }
  });

  // 3. POST /api/staff-auth/reset-password
  router.post("/reset-password", async (req, res) => {
    try {
      const { token, password, confirmPassword } = req.body;

      if (!token || !password) {
        return res.status(400).json({ success: false, message: "Token and new password are required." });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
      }

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

      // Atomically claim the reset token
      const claimedToken = await PasswordResetToken.findOneAndUpdate(
        {
          tokenHash,
          status: "active",
          expiresAt: { $gt: new Date() },
        },
        {
          $set: {
            status: "consumed",
            usedAt: new Date(),
          },
        },
        { returnDocument: "after" }
      );

      if (!claimedToken) {
        return res.status(400).json({
          success: false,
          message: "This password reset link is invalid, expired, or has already been used.",
        });
      }

      const user = await User.findById(claimedToken.userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "Associated staff account no longer exists." });
      }

      if (user.isSuspended || user.isActive === false) {
        return res.status(403).json({ success: false, message: "Account is suspended or inactive. Please contact the administrator." });
      }

      // Hash new password securely
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;
      // Immediately revoke all existing sessions to enforce re-login
      user.sessionsRevokedAt = new Date();
      await user.save();

      await AuditLog.create({
        actorId: user._id,
        actorEmail: user.email,
        actorRole: user.role,
        action: "staff.password_reset_completed",
        details: `Password reset successfully completed for ${user.email}`,
        targetId: String(user._id),
        targetEmail: user.email,
        ipAddress: req.ip || req.headers["x-forwarded-for"] || "",
        userAgent: req.headers["user-agent"] || "",
      });

      return res.json({
        success: true,
        message: "Password updated successfully. Please sign in.",
      });
    } catch (err) {
      console.error("Reset password error:", err);
      return res.status(500).json({ success: false, message: "Failed to update password. Please try again." });
    }
  });

  return router;
};

