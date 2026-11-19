/**
 * test-account-status-rules.mjs
 * 
 * Verifies the 7 exact account status rules and Forgot Password enforcement:
 * 1. NOT REGISTERED -> "Account not registered. Contact Traviska administrator."
 * 2. INVITED / EMAIL NOT VERIFIED -> "Your account is pending email verification."
 * 3. EMAIL VERIFIED / PASSWORD NOT SET -> "Your registration is incomplete. Please set your password."
 * 4. ACTIVE / FULLY REGISTERED -> "Password reset link sent. Check your inbox."
 * 5. SUSPENDED -> "Your account has been suspended. Contact Traviska administrator."
 * 6. DEACTIVATED -> "Your account is deactivated. Contact Traviska administrator."
 * 7. INVITATION REVOKED -> "Your invitation has been revoked. Contact Traviska administrator."
 */

import mongoose from "../server/node_modules/mongoose/index.js";
import dotenv from "../server/node_modules/dotenv/lib/main.js";
import axios from "../server/node_modules/axios/index.js";
import jwt from "../server/node_modules/jsonwebtoken/index.js";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", "server", ".env") });

const BASE_URL = "http://localhost:5001";
let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failedCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTests() {
  console.log("=".repeat(80));
  console.log("TRAVISKA — STRICT ACCOUNT STATUS & FORGOT PASSWORD TEST SUITE");
  console.log("=".repeat(80));

  await mongoose.connect(process.env.MONGODB_URI);
  const dbName = mongoose.connection.name;
  console.log(`Connected to database: "${dbName}"`);
  assert(dbName === "test", "Database is confirmed isolated 'test' database");

  // Get Super Admin token for authorized calls
  const superAdmin = await mongoose.connection.db.collection("users").findOne({
    email: "owner@traviska.com",
    role: "super_admin",
  });
  assert(Boolean(superAdmin), "Super Admin owner@traviska.com exists");

  const saToken = jwt.sign(
    { id: superAdmin._id.toString(), email: superAdmin.email, role: "super_admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const saHeaders = { Authorization: `Bearer ${saToken}` };

  // --------------------------------------------------------------------------
  // RULE 1: NOT REGISTERED
  // --------------------------------------------------------------------------
  console.log("\n--- RULE 1: NOT REGISTERED ---");
  const unknownEmail = "unknown-user-never-invited@traviska.com";
  // Clean any remnant
  await mongoose.connection.db.collection("users").deleteMany({ email: unknownEmail });
  await mongoose.connection.db.collection("staffinvitations").deleteMany({ email: unknownEmail });

  // 1A. Verified / Account Status endpoint
  const r1StatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${unknownEmail}`);
  assert(r1StatusRes.data.status === "NOT_REGISTERED", "Status is NOT_REGISTERED");
  assert(r1StatusRes.data.rule === 1, "Rule is 1");
  assert(r1StatusRes.data.message === "Account not registered. Contact Traviska administrator.", "Exact Rule 1 message returned");
  assert(r1StatusRes.data.eligible === false, "Account is not eligible for reset");

  // 1B. Public Forgot Password form (Uniform neutral message + no tokens created)
  const r1PublicRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, { email: unknownEmail });
  assert(r1PublicRes.data.success === true, "Public response is successful");
  assert(r1PublicRes.data.message === "If an eligible account exists, check your inbox for a password reset link.", "Uniform neutral message returned");
  assert(r1PublicRes.data.rule === 1, "Internal rule evaluated to 1");

  // Verify 0 reset tokens in MongoDB
  const r1TokenCount = await mongoose.connection.db.collection("passwordresettokens").countDocuments({ email: unknownEmail });
  assert(r1TokenCount === 0, "Zero reset tokens created in MongoDB for unregistered account");

  // --------------------------------------------------------------------------
  // RULE 2: INVITED / EMAIL NOT VERIFIED
  // --------------------------------------------------------------------------
  console.log("\n--- RULE 2: INVITED / EMAIL NOT VERIFIED ---");
  const invitedEmail = "pending-verification-employee@traviska.com";
  await mongoose.connection.db.collection("users").deleteMany({ email: invitedEmail });
  await mongoose.connection.db.collection("staffinvitations").deleteMany({ email: invitedEmail });

  // Create pending invitation
  await axios.post(
    `${BASE_URL}/api/super-admin/users/authorize-email`,
    {
      name: "Pending Employee",
      email: invitedEmail,
      role: "admin",
      department: "Operations",
    },
    { headers: saHeaders }
  );

  // 2A. Verified / Account Status endpoint
  const r2StatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${invitedEmail}`);
  assert(r2StatusRes.data.status === "INVITED_EMAIL_NOT_VERIFIED", "Status is INVITED_EMAIL_NOT_VERIFIED");
  assert(r2StatusRes.data.rule === 2, "Rule is 2");
  assert(r2StatusRes.data.message === "Your account is pending email verification.", "Exact Rule 2 message returned");
  assert(r2StatusRes.data.eligible === false, "Account is not eligible for reset");

  // 2B. Forgot Password attempt
  const r2PublicRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, { email: invitedEmail });
  assert(r2PublicRes.data.rule === 2, "Internal rule evaluated to 2");
  assert(r2PublicRes.data.ruleMessage === "Your account is pending email verification.", "Verified rule message is Rule 2");

  const r2TokenCount = await mongoose.connection.db.collection("passwordresettokens").countDocuments({ email: invitedEmail });
  assert(r2TokenCount === 0, "Zero reset tokens created in MongoDB for invited/unverified account");

  // --------------------------------------------------------------------------
  // RULE 3: EMAIL VERIFIED / PASSWORD NOT SET
  // --------------------------------------------------------------------------
  console.log("\n--- RULE 3: EMAIL VERIFIED / PASSWORD NOT SET ---");
  // Employee clicks link, confirming email ownership, but has not completed password creation
  const inv2Doc = await mongoose.connection.db.collection("staffinvitations").findOne({ email: invitedEmail });
  // Simulate clicking link by updating invitation
  await mongoose.connection.db.collection("staffinvitations").updateOne(
    { _id: inv2Doc._id },
    { $set: { isEmailOwnershipVerified: true, status: "verified_pending_password" } }
  );

  // 3A. Verified / Account Status endpoint
  const r3StatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${invitedEmail}`);
  assert(r3StatusRes.data.status === "EMAIL_VERIFIED_PASSWORD_PENDING", "Status is EMAIL_VERIFIED_PASSWORD_PENDING");
  assert(r3StatusRes.data.rule === 3, "Rule is 3");
  assert(r3StatusRes.data.message === "Your registration is incomplete. Please set your password.", "Exact Rule 3 message returned");
  assert(r3StatusRes.data.eligible === false, "Account is not eligible for reset");

  // 3B. User account must NOT be Active (no user account exists yet)
  const r3UserCheck = await mongoose.connection.db.collection("users").findOne({ email: invitedEmail });
  assert(!r3UserCheck, "No active User document exists before password creation");

  // 3C. Forgot Password attempt
  const r3PublicRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, { email: invitedEmail });
  assert(r3PublicRes.data.rule === 3, "Internal rule evaluated to 3");
  assert(r3PublicRes.data.ruleMessage === "Your registration is incomplete. Please set your password.", "Verified rule message is Rule 3");

  const r3TokenCount = await mongoose.connection.db.collection("passwordresettokens").countDocuments({ email: invitedEmail });
  assert(r3TokenCount === 0, "Zero reset tokens created in MongoDB for incomplete registration");

  // --------------------------------------------------------------------------
  // RULE 4: ACTIVE / FULLY REGISTERED
  // --------------------------------------------------------------------------
  console.log("\n--- RULE 4: ACTIVE / FULLY REGISTERED ---");
  const activeEmail = "active-staff-member@traviska.com";
  await mongoose.connection.db.collection("users").deleteMany({ email: activeEmail });
  await mongoose.connection.db.collection("staffinvitations").deleteMany({ email: activeEmail });

  // Create an active, fully registered staff account
  const salt = await (await import("../server/node_modules/bcryptjs/index.js")).default.genSalt(10);
  const hash = await (await import("../server/node_modules/bcryptjs/index.js")).default.hash("Traviska@12345", salt);

  const activeUser = await mongoose.connection.db.collection("users").insertOne({
    name: "Active Staff",
    email: activeEmail,
    role: "admin",
    password: hash,
    isActive: true,
    isSuspended: false,
    isEmailVerified: true,
    department: "Operations",
    createdAt: new Date(),
  });

  // 4A. Verified / Account Status endpoint
  const r4StatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${activeEmail}`);
  assert(r4StatusRes.data.status === "ACTIVE", "Status is ACTIVE");
  assert(r4StatusRes.data.rule === 4, "Rule is 4");
  assert(r4StatusRes.data.message === "Password reset link sent. Check your inbox.", "Exact Rule 4 message returned");
  assert(r4StatusRes.data.eligible === true, "Account is eligible for reset");

  // 4B. Forgot Password attempt for active user
  await mongoose.connection.db.collection("passwordresettokens").deleteMany({ email: activeEmail });
  const r4PublicRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, { email: activeEmail });
  assert(r4PublicRes.data.rule === 4, "Internal rule evaluated to 4");
  assert(r4PublicRes.data.ruleMessage === "Password reset link sent. Check your inbox.", "Verified rule message is Rule 4");

  // Active reset token must exist in MongoDB
  const r4TokenDoc = await mongoose.connection.db.collection("passwordresettokens").findOne({
    email: activeEmail,
    status: "active",
  });
  assert(Boolean(r4TokenDoc), "Secure expiring single-use reset token created in MongoDB");
  assert(r4TokenDoc.expiresAt > new Date(), "Reset token has future expiration");

  // --------------------------------------------------------------------------
  // RULE 5: SUSPENDED
  // --------------------------------------------------------------------------
  console.log("\n--- RULE 5: SUSPENDED ---");
  // Suspend the active user
  await axios.post(
    `${BASE_URL}/api/super-admin/users/${activeUser.insertedId}/suspend`,
    { reason: "Compliance suspension" },
    { headers: saHeaders }
  );

  // 5A. Verified / Account Status endpoint
  const r5StatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${activeEmail}`);
  assert(r5StatusRes.data.status === "SUSPENDED", "Status is SUSPENDED");
  assert(r5StatusRes.data.rule === 5, "Rule is 5");
  assert(r5StatusRes.data.message === "Your account has been suspended. Contact Traviska administrator.", "Exact Rule 5 message returned");
  assert(r5StatusRes.data.eligible === false, "Suspended account is not eligible for reset");

  // 5B. Forgot Password attempt while suspended
  await mongoose.connection.db.collection("passwordresettokens").deleteMany({ email: activeEmail });
  const r5PublicRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, { email: activeEmail });
  assert(r5PublicRes.data.rule === 5, "Internal rule evaluated to 5");
  assert(r5PublicRes.data.ruleMessage === "Your account has been suspended. Contact Traviska administrator.", "Verified rule message is Rule 5");

  const r5TokenCount = await mongoose.connection.db.collection("passwordresettokens").countDocuments({ email: activeEmail, status: "active" });
  assert(r5TokenCount === 0, "Zero reset tokens created in MongoDB for suspended account");

  // 5C. Login blocked
  try {
    await axios.post(`${BASE_URL}/login`, { email: activeEmail, password: "Traviska@12345", portal: "admin" });
    assert(false, "Suspended login should fail");
  } catch (err) {
    assert(err.response?.status === 403, "Login blocked for suspended account (HTTP 403)");
  }

  // --------------------------------------------------------------------------
  // RULE 6: DEACTIVATED
  // --------------------------------------------------------------------------
  console.log("\n--- RULE 6: DEACTIVATED ---");
  // Mark user deactivated (isActive: false, isSuspended: false)
  await mongoose.connection.db.collection("users").updateOne(
    { _id: activeUser.insertedId },
    { $set: { isActive: false, isSuspended: false } }
  );

  // 6A. Verified / Account Status endpoint
  const r6StatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${activeEmail}`);
  assert(r6StatusRes.data.status === "DEACTIVATED", "Status is DEACTIVATED");
  assert(r6StatusRes.data.rule === 6, "Rule is 6");
  assert(r6StatusRes.data.message === "Your account is deactivated. Contact Traviska administrator.", "Exact Rule 6 message returned");
  assert(r6StatusRes.data.eligible === false, "Deactivated account is not eligible for reset");

  // 6B. Forgot Password attempt while deactivated
  const r6PublicRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, { email: activeEmail });
  assert(r6PublicRes.data.rule === 6, "Internal rule evaluated to 6");
  assert(r6PublicRes.data.ruleMessage === "Your account is deactivated. Contact Traviska administrator.", "Verified rule message is Rule 6");

  const r6TokenCount = await mongoose.connection.db.collection("passwordresettokens").countDocuments({ email: activeEmail, status: "active" });
  assert(r6TokenCount === 0, "Zero reset tokens created in MongoDB for deactivated account");

  // 6C. Login blocked
  try {
    await axios.post(`${BASE_URL}/login`, { email: activeEmail, password: "Traviska@12345", portal: "admin" });
    assert(false, "Deactivated login should fail");
  } catch (err) {
    assert(err.response?.status === 403, "Login blocked for deactivated account (HTTP 403)");
  }

  // --------------------------------------------------------------------------
  // RULE 7: INVITATION REVOKED
  // --------------------------------------------------------------------------
  console.log("\n--- RULE 7: INVITATION REVOKED ---");
  const revokedEmail = "revoked-invitation-test@traviska.com";
  await mongoose.connection.db.collection("users").deleteMany({ email: revokedEmail });
  await mongoose.connection.db.collection("staffinvitations").deleteMany({ email: revokedEmail });

  // Create an invitation then revoke it
  const authRevRes = await axios.post(
    `${BASE_URL}/api/super-admin/users/authorize-email`,
    {
      name: "Revoked Candidate",
      email: revokedEmail,
      role: "admin",
      department: "Operations",
    },
    { headers: saHeaders }
  );
  const revInviteDoc = await mongoose.connection.db.collection("staffinvitations").findOne({ email: revokedEmail });

  await axios.post(
    `${BASE_URL}/api/super-admin/users/${revInviteDoc._id}/revoke-invite`,
    {},
    { headers: saHeaders }
  );

  // 7A. Verified / Account Status endpoint
  const r7StatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${revokedEmail}`);
  assert(r7StatusRes.data.status === "INVITATION_REVOKED", "Status is INVITATION_REVOKED");
  assert(r7StatusRes.data.rule === 7, "Rule is 7");
  assert(r7StatusRes.data.message === "Your invitation has been revoked. Contact Traviska administrator.", "Exact Rule 7 message returned");
  assert(r7StatusRes.data.eligible === false, "Revoked invitation is not eligible for reset");

  // 7B. Forgot Password attempt for revoked invitation
  const r7PublicRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, { email: revokedEmail });
  assert(r7PublicRes.data.rule === 7, "Internal rule evaluated to 7");
  assert(r7PublicRes.data.ruleMessage === "Your invitation has been revoked. Contact Traviska administrator.", "Verified rule message is Rule 7");

  const r7TokenCount = await mongoose.connection.db.collection("passwordresettokens").countDocuments({ email: revokedEmail });
  assert(r7TokenCount === 0, "Zero reset tokens created in MongoDB for revoked invitation");

  // --------------------------------------------------------------------------
  // REACTIVATED ACCOUNT
  // --------------------------------------------------------------------------
  console.log("\n--- REACTIVATION ---");
  await axios.post(
    `${BASE_URL}/api/super-admin/users/${activeUser.insertedId}/reactivate`,
    {},
    { headers: saHeaders }
  );

  const reactivatedStatusRes = await axios.get(`${BASE_URL}/api/staff-auth/account-status?email=${activeEmail}`);
  assert(reactivatedStatusRes.data.status === "ACTIVE", "Status returns to ACTIVE upon reactivation");
  assert(reactivatedStatusRes.data.eligible === true, "Reactivated account is eligible for password reset");

  const reactivateLoginRes = await axios.post(`${BASE_URL}/login`, {
    email: activeEmail,
    password: "Traviska@12345",
    portal: "admin",
  });
  assert(reactivateLoginRes.data.success === true, "Reactivated account can log in via /login (HTTP 200)");

  // --------------------------------------------------------------------------
  // CLEAN UP TEST ARTIFACTS
  // --------------------------------------------------------------------------
  await mongoose.connection.db.collection("users").deleteMany({ email: { $ne: "owner@traviska.com" } });
  await mongoose.connection.db.collection("staffinvitations").deleteMany({});
  await mongoose.connection.db.collection("passwordresettokens").deleteMany({});

  console.log("\n" + "=".repeat(80));
  console.log(`ALL RULES TESTED: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("=".repeat(80));

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error("Test execution failed:", err.message);
  process.exit(1);
});

