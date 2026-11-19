/**
 * test-clean-account-lifecycle.mjs
 * 
 * Comprehensive automated verification script covering TESTS 1 through 12:
 * TEST 1 — Clean Database: Only Super Admin remains. No test customers or staff.
 * TEST 2 — Without Approval: Registration rejected. Admin login rejected.
 * TEST 3 — Invite Employee: Status shows Invited/Pending. Email link delivered.
 * TEST 4 — Verify Email Only: Status shows Verified — Password Pending. Account is NOT Active. Login rejected.
 * TEST 5 — Create First Password: Account becomes Active. Admin login succeeds.
 * TEST 6 — Forgot Password: Reset email issued for eligible active account. New password works. Old password rejected.
 * TEST 7 — Suspend Account: Status becomes Suspended. New login fails. Existing tokens fail. No reset email.
 * TEST 8 — Reactivate Account: Status returns to Active only for fully registered users. Fresh login succeeds.
 * TEST 9 — Revoke Invitation: Unused invitation link becomes invalid. Registration cannot continue.
 * TEST 10 — Resend Invitation: Previous link invalid. New link works. No duplicate accounts created.
 * TEST 11 — Customer Accounts: Isolated test customer identities removed.
 * TEST 12 — Super Admin: Existing Super Admin login continues working. Credentials unchanged.
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

const API_BASE = "http://localhost:5001";
const TEST_EMAIL = "travelwithtraviska@gmail.com";
const TEST_PASS_1 = "Traviska@FirstPass2026";
const TEST_PASS_2 = "Traviska@SecondPass2026";

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function run() {
  console.log("=".repeat(80));
  console.log("TRAVISKA — COMPREHENSIVE CLEAN ACCOUNT LIFECYCLE VERIFICATION");
  console.log("=".repeat(80));

  await mongoose.connect(process.env.MONGODB_URI);
  console.log(`Connected to MongoDB Database: "${mongoose.connection.name}"`);

  // Obtain Super Admin token using JWT_SECRET and confirmed Super Admin account from DB
  const superAdmin = await mongoose.connection.db.collection("users").findOne({
    email: "owner@traviska.com",
    role: "super_admin",
  });
  assert(Boolean(superAdmin), "Super Admin owner@traviska.com confirmed in MongoDB");
  assert(superAdmin.isActive === true, "Super Admin isActive is true");
  assert(!superAdmin.isSuspended, "Super Admin is not suspended");

  const saToken = jwt.sign(
    { id: superAdmin._id.toString(), email: superAdmin.email, role: "super_admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  const saHeaders = { Authorization: `Bearer ${saToken}` };

  // --------------------------------------------------------------------------
  // TEST 1 — Clean Database
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 1: Clean Database ---");
  const usersRes = await axios.get(`${API_BASE}/api/super-admin/users`, { headers: saHeaders });
  assert(usersRes.data.success === true, "Super Admin GET /api/super-admin/users succeeds");
  
  const staffList = usersRes.data.users.filter(u => u.type === "user");
  assert(staffList.length === 1, `Expected 1 staff account, found ${staffList.length}`);
  assert(staffList[0].email === "owner@traviska.com", "The sole staff account is owner@traviska.com");
  assert(staffList[0].role === "super_admin", "Super Admin role is super_admin");
  assert(staffList[0].status === "Active", "Super Admin status is Active");
  assert(usersRes.data.counts.staff.active === 1, "Staff active count is 1");
  assert(usersRes.data.counts.staff.invited === 0, "Staff invited count is 0");
  assert(usersRes.data.counts.staff.suspended === 0, "Staff suspended count is 0");
  assert(usersRes.data.counts.customers.total === 0, "Customer count is 0");

  // --------------------------------------------------------------------------
  // TEST 2 — Without Approval
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 2: Without Approval ---");
  try {
    await axios.post(`${API_BASE}/login`, {
      email: TEST_EMAIL,
      password: "RandomPassword123!",
    });
    assert(false, "Unapproved login should fail");
  } catch (err) {
    assert(err.response?.status === 401, "Unapproved login rejected with HTTP 401");
  }

  try {
    await axios.get(`${API_BASE}/api/staff-invitation/validate?token=bogus-token-12345`);
    assert(false, "Bogus invitation token should fail");
  } catch (err) {
    assert(err.response?.status === 404, "Invalid invitation token rejected with HTTP 404");
  }

  // --------------------------------------------------------------------------
  // TEST 3 — Invite Employee
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 3: Invite Employee ---");
  const inviteRes = await axios.post(
    `${API_BASE}/api/super-admin/users/authorize-email`,
    {
      name: "K Shree Shailesh",
      email: TEST_EMAIL,
      role: "admin",
      department: "Operations",
      notes: "Lifecycle testing",
    },
    { headers: saHeaders }
  );
  assert(inviteRes.data.success === true, "Super Admin authorizes employee");
  const regLink = inviteRes.data.registrationLink;
  assert(Boolean(regLink), "Registration link generated and delivered");
  const token = new URL(regLink).searchParams.get("token");
  assert(Boolean(token), "Extracted secure token from registration link");

  // Check Super Admin view
  const afterInviteUsers = await axios.get(`${API_BASE}/api/super-admin/users`, { headers: saHeaders });
  const pendingInvite = afterInviteUsers.data.users.find(u => u.email === TEST_EMAIL);
  assert(Boolean(pendingInvite), "Invited employee appears in Super Admin list");
  assert(
    pendingInvite.status === "Invited" || pendingInvite.status === "Pending Verification",
    `Status displays as '${pendingInvite.status}'`
  );
  assert(pendingInvite.lastLogin === "Pending Registration", "Last login shows 'Pending Registration'");

  // --------------------------------------------------------------------------
  // TEST 4 — Verify Email Only (Link clicked, password NOT set)
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 4: Verify Email Only ---");
  const validateRes = await axios.get(`${API_BASE}/api/staff-invitation/validate?token=${token}`);
  assert(validateRes.data.valid === true, "Token validation succeeds upon link click");
  assert(validateRes.data.email === TEST_EMAIL, "Verified email returned");
  assert(validateRes.data.isEmailVerified === true, "Email ownership verified flag is true");

  // Check Super Admin view after email verification
  const afterVerifyUsers = await axios.get(`${API_BASE}/api/super-admin/users`, { headers: saHeaders });
  const verifiedInvite = afterVerifyUsers.data.users.find(u => u.email === TEST_EMAIL);
  assert(
    verifiedInvite.status === "Verified — Password Pending",
    `Status transitioned to 'Verified — Password Pending' (got: '${verifiedInvite.status}')`
  );

  // Login MUST still be blocked because password has not been created!
  try {
    await axios.post(`${API_BASE}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASS_1,
    });
    assert(false, "Login should fail before password creation");
  } catch (err) {
    assert(err.response?.status === 401, "Login strictly blocked before password creation (HTTP 401)");
  }

  // --------------------------------------------------------------------------
  // TEST 5 — Create First Password
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 5: Create First Password ---");
  const completeRes = await axios.post(`${API_BASE}/api/staff-invitation/complete-registration`, {
    token,
    password: TEST_PASS_1,
    confirmPassword: TEST_PASS_1,
  });
  assert(completeRes.data.success === true, "Registration completed with valid initial password");
  assert(completeRes.data.message.includes("activated"), "Confirmation returned to sign in");

  // Check Super Admin view: User must now be Active
  const afterCompleteUsers = await axios.get(`${API_BASE}/api/super-admin/users`, { headers: saHeaders });
  const activeUser = afterCompleteUsers.data.users.find(u => u.email === TEST_EMAIL);
  assert(activeUser.type === "user", "Account is now a registered user document");
  assert(activeUser.status === "Active", "Status is now Active");

  // Admin Login succeeds
  const adminLoginRes = await axios.post(`${API_BASE}/login`, {
    email: TEST_EMAIL,
    password: TEST_PASS_1,
  });
  assert(adminLoginRes.data.success === true, "Admin logs in successfully with new password");
  const adminToken = adminLoginRes.data.token;
  assert(Boolean(adminToken), "JWT token issued upon manual login");

  // --------------------------------------------------------------------------
  // TEST 6 — Forgot Password
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 6: Forgot Password ---");
  const forgotRes = await axios.post(`${API_BASE}/api/staff-auth/forgot-password`, {
    email: TEST_EMAIL,
  });
  assert(forgotRes.data.success === true, "Forgot password endpoint returns success");
  
  // Find the generated reset token in DB
  const resetDoc = await mongoose.connection.db.collection("passwordresettokens").findOne({
    email: TEST_EMAIL,
    status: "active",
  });
  assert(Boolean(resetDoc), "Active password reset token document exists in MongoDB");
  assert(resetDoc.expiresAt > new Date(), "Reset token has future expiration");

  // Simulate resetting password
  // Validate token
  const resetTokenHash = resetDoc.tokenHash;
  // Let us reset with direct API:
  // To test validate-reset-token and reset-password via API, we can issue a fresh raw token or reset directly
  // In the real flow, rawToken is emailed. We test the reset-password endpoint with the hash in DB:
  const rawResetToken = crypto.randomBytes(32).toString("hex");
  const rawResetHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
  await mongoose.connection.db.collection("passwordresettokens").updateOne(
    { _id: resetDoc._id },
    { $set: { tokenHash: rawResetHash } }
  );

  const valResetRes = await axios.get(`${API_BASE}/api/staff-auth/validate-reset-token?token=${rawResetToken}`);
  assert(valResetRes.data.valid === true, "Reset token validated successfully");

  const resetPasswordRes = await axios.post(`${API_BASE}/api/staff-auth/reset-password`, {
    token: rawResetToken,
    password: TEST_PASS_2,
    confirmPassword: TEST_PASS_2,
  });
  assert(resetPasswordRes.data.success === true, "Password reset succeeded with new password");

  // Old password must fail
  try {
    await axios.post(`${API_BASE}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASS_1,
    });
    assert(false, "Old password should fail");
  } catch (err) {
    assert(err.response?.status === 401, "Old password rejected (HTTP 401)");
  }

  // New password must succeed
  const newLoginRes = await axios.post(`${API_BASE}/login`, {
    email: TEST_EMAIL,
    password: TEST_PASS_2,
  });
  assert(newLoginRes.data.success === true, "New password logs in successfully (HTTP 200)");
  let currentAdminToken = newLoginRes.data.token;

  // --------------------------------------------------------------------------
  // TEST 7 — Suspend Account
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 7: Suspend Account ---");
  const registeredUser = await mongoose.connection.db.collection("users").findOne({ email: TEST_EMAIL });
  const suspendRes = await axios.post(
    `${API_BASE}/api/super-admin/users/${registeredUser._id}/suspend`,
    {},
    { headers: saHeaders }
  );
  assert(suspendRes.data.success === true, "Super Admin suspends account");

  // Check status in Super Admin
  const afterSuspendUsers = await axios.get(`${API_BASE}/api/super-admin/users`, { headers: saHeaders });
  const suspendedUser = afterSuspendUsers.data.users.find(u => u.email === TEST_EMAIL);
  assert(suspendedUser.status === "Suspended", "Status displays as Suspended");

  // Login fails
  try {
    await axios.post(`${API_BASE}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASS_2,
    });
    assert(false, "Suspended login should fail");
  } catch (err) {
    assert(err.response?.status === 403, "Suspended login blocked with HTTP 403");
  }

  // Existing JWT session token rejected
  try {
    await axios.get(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${currentAdminToken}` },
    });
    assert(false, "Active session of suspended user should be rejected");
  } catch (err) {
    assert(err.response?.status === 401 || err.response?.status === 403, "Existing session token rejected immediately");
  }

  // Forgot password must NOT issue a reset token for suspended accounts
  await mongoose.connection.db.collection("passwordresettokens").deleteMany({ email: TEST_EMAIL });
  await axios.post(`${API_BASE}/api/staff-auth/forgot-password`, { email: TEST_EMAIL });
  const suspendedResetCount = await mongoose.connection.db.collection("passwordresettokens").countDocuments({ email: TEST_EMAIL, status: "active" });
  assert(suspendedResetCount === 0, "No password reset token issued for suspended account");

  // --------------------------------------------------------------------------
  // TEST 8 — Reactivate Account
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 8: Reactivate Account ---");
  const reactivateRes = await axios.post(
    `${API_BASE}/api/super-admin/users/${registeredUser._id}/reactivate`,
    {},
    { headers: saHeaders }
  );
  assert(reactivateRes.data.success === true, "Super Admin reactivates account");

  const afterReactivateUsers = await axios.get(`${API_BASE}/api/super-admin/users`, { headers: saHeaders });
  const reactivatedUser = afterReactivateUsers.data.users.find(u => u.email === TEST_EMAIL);
  assert(reactivatedUser.status === "Active", "Reactivated user status is Active");

  const reactivateLoginRes = await axios.post(`${API_BASE}/login`, {
    email: TEST_EMAIL,
    password: TEST_PASS_2,
  });
  assert(reactivateLoginRes.data.success === true, "Reactivated employee logs in successfully (HTTP 200)");

  // --------------------------------------------------------------------------
  // TEST 9 — Revoke Invitation
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 9: Revoke Invitation ---");
  const secondEmail = "test-revoke-employee@traviska.com";
  const auth2Res = await axios.post(
    `${API_BASE}/api/super-admin/users/authorize-email`,
    {
      name: "Revoke Candidate",
      email: secondEmail,
      role: "admin",
      department: "Operations",
    },
    { headers: saHeaders }
  );
  const token2 = new URL(auth2Res.data.registrationLink).searchParams.get("token");
  const inv2Doc = await mongoose.connection.db.collection("staffinvitations").findOne({ email: secondEmail });

  const revokeRes = await axios.post(
    `${API_BASE}/api/super-admin/users/${inv2Doc._id}/revoke-invite`,
    {},
    { headers: saHeaders }
  );
  assert(revokeRes.data.success === true, "Super Admin revokes invitation");

  // Attempting to validate or complete registration must fail
  try {
    await axios.get(`${API_BASE}/api/staff-invitation/validate?token=${token2}`);
    assert(false, "Revoked invitation validation should fail");
  } catch (err) {
    assert(err.response?.status === 403, "Revoked invitation validation rejected with HTTP 403");
  }

  try {
    await axios.post(`${API_BASE}/api/staff-invitation/complete-registration`, {
      token: token2,
      password: TEST_PASS_1,
      confirmPassword: TEST_PASS_1,
    });
    assert(false, "Revoked invitation completion should fail");
  } catch (err) {
    assert(err.response?.status === 403, "Revoked invitation registration completion rejected with HTTP 403");
  }

  // --------------------------------------------------------------------------
  // TEST 10 — Resend Invitation
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 10: Resend Invitation ---");
  const thirdEmail = "test-resend-employee@traviska.com";
  const auth3Res = await axios.post(
    `${API_BASE}/api/super-admin/users/authorize-email`,
    {
      name: "Resend Candidate",
      email: thirdEmail,
      role: "admin",
      department: "Operations",
    },
    { headers: saHeaders }
  );
  const originalToken3 = new URL(auth3Res.data.registrationLink).searchParams.get("token");
  const inv3Doc = await mongoose.connection.db.collection("staffinvitations").findOne({ email: thirdEmail });

  const resendRes = await axios.post(
    `${API_BASE}/api/super-admin/users/${inv3Doc._id}/resend-invite`,
    {},
    { headers: saHeaders }
  );
  assert(resendRes.data.success === true, "Super Admin resends invitation");
  const newToken3 = new URL(resendRes.data.registrationLink).searchParams.get("token");
  assert(originalToken3 !== newToken3, "New token is generated and differs from old token");

  // Old token must fail
  try {
    await axios.get(`${API_BASE}/api/staff-invitation/validate?token=${originalToken3}`);
    assert(false, "Old invitation token should fail after resend");
  } catch (err) {
    assert(err.response?.status === 404, "Old token rejected (HTTP 404)");
  }

  // New token must succeed
  const valNewRes = await axios.get(`${API_BASE}/api/staff-invitation/validate?token=${newToken3}`);
  assert(valNewRes.data.valid === true, "New token validates successfully (HTTP 200)");

  // Clean up temporary candidates from test DB
  await mongoose.connection.db.collection("staffinvitations").deleteMany({
    email: { $in: [secondEmail, thirdEmail] },
  });

  // --------------------------------------------------------------------------
  // TEST 11 — Customer Accounts
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 11: Customer Accounts ---");
  const customerCount = await mongoose.connection.db.collection("users").countDocuments({ role: "customer" });
  assert(customerCount === 0, `Isolated test customer count is 0 (found ${customerCount})`);

  // --------------------------------------------------------------------------
  // TEST 12 — Super Admin Integrity
  // --------------------------------------------------------------------------
  console.log("\n--- TEST 12: Super Admin Integrity ---");
  const finalSaUser = await mongoose.connection.db.collection("users").findOne({ email: "owner@traviska.com" });
  assert(Boolean(finalSaUser), "Super Admin account owner@traviska.com remains present");
  assert(finalSaUser.role === "super_admin", "Super Admin role is super_admin");
  assert(finalSaUser.isActive === true, "Super Admin isActive is true");
  assert(finalSaUser.isSuspended === false, "Super Admin isSuspended is false");

  // Clean the test employee account so the test DB is left clean with ONLY Super Admin
  await mongoose.connection.db.collection("users").deleteMany({ email: TEST_EMAIL });
  await mongoose.connection.db.collection("staffinvitations").deleteMany({ email: TEST_EMAIL });
  await mongoose.connection.db.collection("passwordresettokens").deleteMany({ email: TEST_EMAIL });

  const finalCheck = await axios.get(`${API_BASE}/api/super-admin/users`, { headers: saHeaders });
  const finalStaff = finalCheck.data.users.filter(u => u.type === "user");
  assert(finalStaff.length === 1, "Clean test DB contains exactly 1 staff member");
  assert(finalStaff[0].email === "owner@traviska.com", "Sole staff member is owner@traviska.com");
  assert(finalCheck.data.counts.staff.active === 1, "Final active staff count is 1");
  assert(finalCheck.data.counts.staff.invited === 0, "Final invited staff count is 0");
  assert(finalCheck.data.counts.staff.suspended === 0, "Final suspended staff count is 0");
  assert(finalCheck.data.counts.customers.total === 0, "Final customer count is 0");

  console.log("\n" + "=".repeat(80));
  console.log(`ALL 12 TESTS COMPLETED: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("=".repeat(80));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Test execution aborted:", err.message);
  process.exit(1);
});
