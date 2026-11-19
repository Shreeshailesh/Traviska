import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import axios from "axios";

dotenv.config({ path: "server/.env" });

const API_BASE = "http://localhost:5001";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: { type: String, default: "" },
    role: { type: String, default: "admin" },
    isEmailVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isSuspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

const invitationSchema = new mongoose.Schema(
  {
    email: { type: String, index: true },
    name: String,
    role: String,
    tokenHash: String,
    status: String,
    isEmailOwnershipVerified: Boolean,
    expiresAt: Date,
  },
  { timestamps: true }
);

const StaffInvitation = mongoose.models.StaffInvitation || mongoose.model("StaffInvitation", invitationSchema);

const resetTokenSchema = new mongoose.Schema(
  {
    userId: mongoose.Schema.Types.ObjectId,
    email: String,
    tokenHash: String,
    status: String,
  },
  { timestamps: true }
);

const PasswordResetToken = mongoose.models.PasswordResetToken || mongoose.model("PasswordResetToken", resetTokenSchema);

const ownershipTokenSchema = new mongoose.Schema(
  {
    email: String,
    tokenHash: String,
    code: String,
    expiresAt: Date,
    status: String,
  },
  { timestamps: true }
);

const EmailOwnershipToken = mongoose.models.EmailOwnershipToken || mongoose.model("EmailOwnershipToken", ownershipTokenSchema);

async function runTests() {
  console.log("================================================================");
  console.log("TRAVISKA — FORGOT PASSWORD STATUS AND OWNERSHIP VERIFICATION TEST");
  console.log("================================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB Atlas test database.\n");

  const results = [];

  // Define test accounts for the 7 statuses
  const testCases = [
    {
      rule: 1,
      name: "Not Registered",
      email: "test-unregistered-account-99@traviska.com",
      expectedStatus: "NOT_REGISTERED",
      expectedMessage: "Account not registered. Contact Traviska administrator.",
      eligible: false,
      setup: async () => {
        await User.deleteOne({ email: "test-unregistered-account-99@traviska.com" });
        await StaffInvitation.deleteMany({ email: "test-unregistered-account-99@traviska.com" });
      },
    },
    {
      rule: 2,
      name: "Pending Verification",
      email: "test-pending-verify@traviska.com",
      expectedStatus: "PENDING_VERIFICATION",
      expectedMessage: "Please verify your invitation email.",
      eligible: false,
      setup: async () => {
        await User.deleteOne({ email: "test-pending-verify@traviska.com" });
        await StaffInvitation.deleteMany({ email: "test-pending-verify@traviska.com" });
        await StaffInvitation.create({
          email: "test-pending-verify@traviska.com",
          name: "Pending Verify Candidate",
          role: "admin",
          tokenHash: crypto.createHash("sha256").update("dummy1").digest("hex"),
          status: "sent",
          isEmailOwnershipVerified: false,
          expiresAt: new Date(Date.now() + 86400000),
        });
      },
    },
    {
      rule: 3,
      name: "Password Pending",
      email: "test-password-pending@traviska.com",
      expectedStatus: "PASSWORD_PENDING",
      expectedMessage: "Complete registration by setting your password.",
      eligible: false,
      setup: async () => {
        await User.deleteOne({ email: "test-password-pending@traviska.com" });
        await StaffInvitation.deleteMany({ email: "test-password-pending@traviska.com" });
        await StaffInvitation.create({
          email: "test-password-pending@traviska.com",
          name: "Password Pending Candidate",
          role: "admin",
          tokenHash: crypto.createHash("sha256").update("dummy2").digest("hex"),
          status: "verified_pending_password",
          isEmailOwnershipVerified: true,
          expiresAt: new Date(Date.now() + 86400000),
        });
      },
    },
    {
      rule: 4,
      name: "Active & Fully Registered",
      email: "test-active-staff@traviska.com",
      expectedStatus: "ACTIVE",
      expectedMessage: "Password reset link sent. Check your inbox.",
      eligible: true,
      setup: async () => {
        await User.deleteOne({ email: "test-active-staff@traviska.com" });
        await StaffInvitation.deleteMany({ email: "test-active-staff@traviska.com" });
        await PasswordResetToken.deleteMany({ email: "test-active-staff@traviska.com" });
        await User.create({
          email: "test-active-staff@traviska.com",
          name: "Active Staff Member",
          password: "$2a$10$hashedpasswordforexampleactive000",
          role: "admin",
          isEmailVerified: true,
          isActive: true,
          isSuspended: false,
        });
      },
    },
    {
      rule: 5,
      name: "Suspended",
      email: "test-suspended-account@traviska.com",
      expectedStatus: "SUSPENDED",
      expectedMessage: "Your account is suspended. Contact Traviska administrator.",
      eligible: false,
      setup: async () => {
        await User.deleteOne({ email: "test-suspended-account@traviska.com" });
        await PasswordResetToken.deleteMany({ email: "test-suspended-account@traviska.com" });
        await User.create({
          email: "test-suspended-account@traviska.com",
          name: "Suspended Employee",
          password: "$2a$10$hashedpasswordforexampleactive000",
          role: "admin",
          isEmailVerified: true,
          isActive: true,
          isSuspended: true,
        });
      },
    },
    {
      rule: 6,
      name: "Deactivated",
      email: "test-deactivated-account@traviska.com",
      expectedStatus: "DEACTIVATED",
      expectedMessage: "Your account is deactivated. Contact Traviska administrator.",
      eligible: false,
      setup: async () => {
        await User.deleteOne({ email: "test-deactivated-account@traviska.com" });
        await PasswordResetToken.deleteMany({ email: "test-deactivated-account@traviska.com" });
        await User.create({
          email: "test-deactivated-account@traviska.com",
          name: "Deactivated Employee",
          password: "$2a$10$hashedpasswordforexampleactive000",
          role: "admin",
          isEmailVerified: true,
          isActive: false,
          isSuspended: false,
        });
      },
    },
    {
      rule: 7,
      name: "Revoked Invitation",
      email: "test-revoked-invite@traviska.com",
      expectedStatus: "INVITATION_REVOKED",
      expectedMessage: "Your invitation has been revoked. Contact Traviska administrator.",
      eligible: false,
      setup: async () => {
        await User.deleteOne({ email: "test-revoked-invite@traviska.com" });
        await StaffInvitation.deleteMany({ email: "test-revoked-invite@traviska.com" });
        await StaffInvitation.create({
          email: "test-revoked-invite@traviska.com",
          name: "Revoked Invitation Candidate",
          role: "admin",
          tokenHash: crypto.createHash("sha256").update("dummy3").digest("hex"),
          status: "revoked",
          isEmailOwnershipVerified: false,
          expiresAt: new Date(Date.now() - 3600000),
        });
      },
    },
  ];

  for (const tc of testCases) {
    console.log(`----------------------------------------------------------------`);
    console.log(`TEST CASE (Rule ${tc.rule}): ${tc.name} [${tc.email}]`);
    await tc.setup();

    // 1. Test Public Unauthenticated Submission
    const initialTokens = await PasswordResetToken.countDocuments({ email: tc.email, status: "active" });
    const pubRes = await axios.post(`${API_BASE}/api/staff-auth/forgot-password`, { email: tc.email });

    const neutralConfirmed = pubRes.data.success && pubRes.data.message === "If an eligible account exists, check your inbox for a password reset link.";
    const afterTokens = await PasswordResetToken.countDocuments({ email: tc.email, status: "active" });
    const tokenCreated = afterTokens > initialTokens;

    console.log(`  [Public Request] Neutral Confirmation: ${neutralConfirmed ? "PASS" : "FAIL"}`);
    console.log(`  [Public Request] Reset Token Generated: ${tokenCreated ? "YES (Active Account)" : "NO (Protected)"}`);

    if (tc.eligible && !tokenCreated) {
      throw new Error(`Expected active reset token for eligible account ${tc.email}`);
    }
    if (!tc.eligible && tokenCreated) {
      throw new Error(`Security Violation: Reset token generated for ineligible account ${tc.email}`);
    }

    // 2. Request Status Verification (Generates single-use code & token in DB)
    await axios.post(`${API_BASE}/api/staff-auth/request-status-verification`, { email: tc.email });
    const ownershipRecord = await EmailOwnershipToken.findOne({ email: tc.email, status: "active" }).sort({ createdAt: -1 });

    if (!ownershipRecord) {
      throw new Error(`Failed to generate EmailOwnershipToken for ${tc.email}`);
    }
    console.log(`  [Ownership Challenge] Verification Code Issued: ${ownershipRecord.code}`);

    // 3. Test Security: Reject Client Header Spoofing (Requirement 6)
    let spoofBlocked = false;
    try {
      await axios.get(`${API_BASE}/api/staff-auth/account-status?email=${encodeURIComponent(tc.email)}`, {
        headers: { "x-verified-ownership": "true" },
      });
    } catch (err) {
      if (err.response?.status === 401) spoofBlocked = true;
    }
    console.log(`  [Security Check] Client-supplied Header Spoofing Rejected: ${spoofBlocked ? "PASS (401 Unauthorized)" : "FAIL"}`);

    // 4. Test Verified Status Display with 6-digit Code (Proves Email Ownership)
    const verifiedRes = await axios.post(`${API_BASE}/api/staff-auth/verify-account-status`, {
      email: tc.email,
      code: ownershipRecord.code,
    });

    const statusMatches = verifiedRes.data.status === tc.expectedStatus;
    const messageMatches = verifiedRes.data.message === tc.expectedMessage;
    const eligibleMatches = verifiedRes.data.eligible === tc.eligible;

    console.log(`  [Verified Status] Evaluated Status: ${verifiedRes.data.status} (Expected: ${tc.expectedStatus}) -> ${statusMatches ? "PASS" : "FAIL"}`);
    console.log(`  [Verified Status] Evaluated Message: "${verifiedRes.data.message}" -> ${messageMatches ? "PASS" : "FAIL"}`);

    results.push({
      rule: tc.rule,
      name: tc.name,
      email: tc.email,
      eligible: tc.eligible,
      neutralConfirmed,
      tokenCreated,
      spoofBlocked,
      verifiedStatus: verifiedRes.data.status,
      verifiedMessage: verifiedRes.data.message,
      passed: neutralConfirmed && spoofBlocked && statusMatches && messageMatches && eligibleMatches,
    });
  }

  // Clean up test records
  for (const tc of testCases) {
    await User.deleteOne({ email: tc.email });
    await StaffInvitation.deleteMany({ email: tc.email });
    await PasswordResetToken.deleteMany({ email: tc.email });
    await EmailOwnershipToken.deleteMany({ email: tc.email });
  }

  await mongoose.disconnect();

  console.log("\n================================================================");
  console.log("FINAL RESULTS SUMMARY");
  console.log("================================================================\n");
  console.table(
    results.map((r) => ({
      Rule: r.rule,
      Status: r.name,
      "Neutral Public": r.neutralConfirmed ? "YES" : "NO",
      "Reset Token": r.tokenCreated ? "ISSUED" : "NONE",
      "Spoof Blocked": r.spoofBlocked ? "YES" : "NO",
      "Verified Status": r.verifiedStatus,
      Passed: r.passed ? "ALL PASS" : "FAIL",
    }))
  );
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
