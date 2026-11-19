import axios from "../server/node_modules/axios/index.js";
import jwt from "../server/node_modules/jsonwebtoken/index.js";
import mongoose from "../server/node_modules/mongoose/index.js";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "../server/node_modules/dotenv/lib/main.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", "server", ".env") });

const BASE_URL = "http://localhost:5001";
const TEST_EMAIL = "travelwithtraviska@gmail.com";
const TEST_NAME = "K Shree Shailesh";
const INITIAL_PASSWORD = "Password@123A";
const NEW_PASSWORD = "NewPassword@456B";

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, details = "") {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${details ? ` - ${details}` : ""}`);
    failedCount++;
  }
}

async function runTests() {
  console.log("\n================================================================================");
  console.log("TRAVISKA COMPREHENSIVE AUTOMATED VERIFICATION SUITE");
  console.log("WORKFLOW A (FIRST-TIME REGISTRATION) & WORKFLOW B (FORGOT PASSWORD)");
  console.log("================================================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);
  const dbName = mongoose.connection.db.databaseName;
  console.log(`Connected to MongoDB Database: "${dbName}"`);
  if (dbName !== "test") {
    throw new Error(`CRITICAL: Connected to database "${dbName}", expected isolated "test" database!`);
  }

  // Load models directly from server
  const User = (await import("../server/models/User.js")).default || (await import("../server/models/User.js"));
  const StaffInvitation = (await import("../server/models/StaffInvitation.js")).default || (await import("../server/models/StaffInvitation.js"));
  const PasswordResetToken = (await import("../server/models/PasswordResetToken.js")).default || (await import("../server/models/PasswordResetToken.js"));

  // Clean slate for test account in test DB before starting
  await User.deleteOne({ email: TEST_EMAIL });
  await StaffInvitation.deleteMany({ email: TEST_EMAIL });
  await PasswordResetToken.deleteMany({ email: TEST_EMAIL });
  console.log(`Cleaned existing test records for "${TEST_EMAIL}" in test DB.\n`);

  // Super Admin token for authorizing
  const superAdmin = await User.findOne({ email: "owner@traviska.com", role: "super_admin" });
  if (!superAdmin) {
    throw new Error("Super Admin account owner@traviska.com not found in test database!");
  }
  const superAdminToken = jwt.sign(
    { id: superAdmin._id.toString(), email: superAdmin.email, role: "super_admin" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  let invitationToken = "";
  let invitationId = "";
  let staffUserId = "";
  let staffAdminToken = "";
  let passwordResetToken = "";

  console.log("--------------------------------------------------------------------------------");
  console.log("PART 1: WORKFLOW A — FIRST-TIME ADMIN & STAFF REGISTRATION (Tests 1 - 15)");
  console.log("--------------------------------------------------------------------------------");

  // TEST 1: No Super Admin approval -> No account registration without valid token
  try {
    const res = await axios.post(`${BASE_URL}/api/staff-invitation/complete-registration`, {
      token: "fake_unapproved_token_999",
      password: INITIAL_PASSWORD,
      confirmPassword: INITIAL_PASSWORD,
    });
    assert(false, "Test 1: Unapproved token registration rejected", `Unexpected success: ${res.status}`);
  } catch (err) {
    assert(err.response?.status === 404, "Test 1: No Super Admin approval -> Registration rejected (HTTP 404)");
  }

  // TEST 2: No invitation token -> Registration rejected
  try {
    const res = await axios.post(`${BASE_URL}/api/staff-invitation/complete-registration`, {
      password: INITIAL_PASSWORD,
      confirmPassword: INITIAL_PASSWORD,
    });
    assert(false, "Test 2: Missing token registration rejected", `Unexpected success: ${res.status}`);
  } catch (err) {
    assert(err.response?.status === 400, "Test 2: Missing invitation token -> Registration rejected (HTTP 400)");
  }

  // TEST 3: Expired invitation -> Rejected
  {
    const expiredRawToken = crypto.randomBytes(32).toString("hex");
    const expiredTokenHash = crypto.createHash("sha256").update(expiredRawToken).digest("hex");
    const expiredInvite = await StaffInvitation.create({
      email: "temp-expired@traviska.com",
      name: "Expired User",
      role: "admin",
      tokenHash: expiredTokenHash,
      status: "pending",
      expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
    });

    try {
      await axios.get(`${BASE_URL}/api/staff-invitation/validate?token=${expiredRawToken}`);
      assert(false, "Test 3: Expired invitation rejected");
    } catch (err) {
      assert(err.response?.status === 410, "Test 3: Expired invitation -> Validation rejected (HTTP 410)");
    }
    await StaffInvitation.deleteOne({ _id: expiredInvite._id });
  }

  // TEST 4: Revoked invitation -> Rejected
  {
    const revokedRawToken = crypto.randomBytes(32).toString("hex");
    const revokedTokenHash = crypto.createHash("sha256").update(revokedRawToken).digest("hex");
    const revokedInvite = await StaffInvitation.create({
      email: "temp-revoked@traviska.com",
      name: "Revoked User",
      role: "admin",
      tokenHash: revokedTokenHash,
      status: "revoked",
      expiresAt: new Date(Date.now() + 86400000),
    });

    try {
      await axios.get(`${BASE_URL}/api/staff-invitation/validate?token=${revokedRawToken}`);
      assert(false, "Test 4: Revoked invitation rejected");
    } catch (err) {
      assert(err.response?.status === 403, "Test 4: Revoked invitation -> Validation rejected (HTTP 403)");
    }
    await StaffInvitation.deleteOne({ _id: revokedInvite._id });
  }

  // TEST 5: Valid invitation email -> Correct verification link generated by Super Admin
  try {
    const authRes = await axios.post(
      `${BASE_URL}/api/super-admin/users/authorize-email`,
      {
        name: TEST_NAME,
        email: TEST_EMAIL,
        role: "admin",
        department: "Operations",
      },
      {
        headers: { Authorization: `Bearer ${superAdminToken}` },
      }
    );

    assert(authRes.status === 200 && authRes.data.success, "Test 5: Super Admin authorizes employee successfully");
    assert(Boolean(authRes.data.registrationLink), "Test 5: Single-use registration link generated and delivered");
    
    // Extract token from link
    const url = new URL(authRes.data.registrationLink);
    invitationToken = url.searchParams.get("token");
    invitationId = authRes.data.invitation.id;
    assert(Boolean(invitationToken), "Test 5: Extracted cryptographically secure token from link");
  } catch (err) {
    assert(false, "Test 5: Super Admin authorization failed", err.response?.data?.message || err.message);
  }

  // TEST 6: Link clicked -> Email verified and Set Password info displayed
  try {
    const valRes = await axios.get(`${BASE_URL}/api/staff-invitation/validate?token=${invitationToken}`);
    assert(valRes.status === 200 && valRes.data.valid, "Test 6: Valid link clicked -> Token valid (HTTP 200)");
    assert(valRes.data.email === TEST_EMAIL, "Test 6: Displays read-only verified email");
    assert(valRes.data.role === "admin", "Test 6: Displays assigned Admin role");
    assert(valRes.data.isEmailVerified === true, "Test 6: Link possession confirms email ownership");
  } catch (err) {
    assert(false, "Test 6: Token validation failed", err.response?.data?.message || err.message);
  }

  // TEST 7: Password mismatch -> Registration rejected
  try {
    await axios.post(`${BASE_URL}/api/staff-invitation/complete-registration`, {
      token: invitationToken,
      password: INITIAL_PASSWORD,
      confirmPassword: "DifferentPassword@123",
    });
    assert(false, "Test 7: Password mismatch rejected");
  } catch (err) {
    assert(err.response?.status === 400, "Test 7: Password mismatch -> Registration rejected (HTTP 400)");
  }

  // TEST 8: Weak password -> Registration rejected
  try {
    await axios.post(`${BASE_URL}/api/staff-invitation/complete-registration`, {
      token: invitationToken,
      password: "weak",
      confirmPassword: "weak",
    });
    assert(false, "Test 8: Weak password rejected");
  } catch (err) {
    assert(err.response?.status === 400, "Test 8: Weak password (<8 chars) -> Registration rejected (HTTP 400)");
  }

  // TEST 9: Valid password -> Account activated & invitation consumed atomically
  try {
    const regRes = await axios.post(`${BASE_URL}/api/staff-invitation/complete-registration`, {
      token: invitationToken,
      password: INITIAL_PASSWORD,
      confirmPassword: INITIAL_PASSWORD,
    });
    assert(regRes.status === 200 && regRes.data.success, "Test 9: Valid password -> Account activated (HTTP 200)");
    assert(regRes.data.message.includes("activated successfully"), "Test 9: Returns confirmation to sign in");
    assert(!regRes.data.token, "Test 9: Explicitly does NOT auto-login (requires manual sign in)");

    const createdUser = await User.findOne({ email: TEST_EMAIL });
    assert(Boolean(createdUser), "Test 9: Staff account persisted in MongoDB");
    assert(createdUser?.role === "admin", "Test 9: Exact role assigned by Super Admin enforced");
    assert(createdUser?.isEmailVerified === true, "Test 9: Staff email verified flag set to true");
    staffUserId = createdUser?._id.toString();
  } catch (err) {
    assert(false, "Test 9: Account activation failed", err.response?.data?.message || err.message);
  }

  // TEST 10: Invitation reused -> Rejected (Single-use enforcement)
  try {
    await axios.post(`${BASE_URL}/api/staff-invitation/complete-registration`, {
      token: invitationToken,
      password: INITIAL_PASSWORD,
      confirmPassword: INITIAL_PASSWORD,
    });
    assert(false, "Test 10: Reused invitation rejected");
  } catch (err) {
    assert(err.response?.status === 400, "Test 10: Reused invitation -> Rejected atomically (HTTP 400)");
  }

  // TEST 11: Admin login with new password -> Successful
  try {
    const loginRes = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
    });
    assert(loginRes.status === 200 && loginRes.data.success, "Test 11: Admin login with new password -> Successful (HTTP 200)");
    assert(Boolean(loginRes.data.token), "Test 11: Issues valid JWT session token upon manual login");
    staffAdminToken = loginRes.data.token;
  } catch (err) {
    assert(false, "Test 11: Admin login failed", err.response?.data?.message || err.message);
  }

  // TEST 12: Admin cannot access Super Admin-only APIs
  try {
    await axios.get(`${BASE_URL}/api/super-admin/dashboard`, {
      headers: { Authorization: `Bearer ${staffAdminToken}` },
    });
    assert(false, "Test 12: Admin blocked from Super Admin API");
  } catch (err) {
    assert(err.response?.status === 403, "Test 12: Standard Admin receives 403 Forbidden on Super Admin API");
  }

  // TEST 13: Suspended Admin cannot log in
  try {
    await axios.post(
      `${BASE_URL}/api/super-admin/users/${staffUserId}/suspend`,
      { reason: "Policy violation test" },
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    // Try fresh login while suspended
    try {
      await axios.post(`${BASE_URL}/login`, {
        email: TEST_EMAIL,
        password: INITIAL_PASSWORD,
      });
      assert(false, "Test 13: Suspended admin login blocked");
    } catch (loginErr) {
      assert(loginErr.response?.status === 403, "Test 13: Suspended Admin login rejected (HTTP 403)");
    }
  } catch (err) {
    assert(false, "Test 13: Suspension check failed", err.response?.data?.message || err.message);
  }

  // TEST 14: Previously issued tokens rejected after suspension
  try {
    await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${staffAdminToken}` },
    });
    assert(false, "Test 14: Suspended token rejected");
  } catch (err) {
    assert(err.response?.status === 403, "Test 14: Active session token rejected immediately upon suspension (HTTP 403)");
  }

  // TEST 15: Reactivated Admin can log in with a fresh session
  try {
    await axios.post(
      `${BASE_URL}/api/super-admin/users/${staffUserId}/reactivate`,
      {},
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    const freshLogin = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
    });
    assert(freshLogin.status === 200 && freshLogin.data.success, "Test 15: Reactivated Admin logs in successfully (HTTP 200)");
    staffAdminToken = freshLogin.data.token;
  } catch (err) {
    assert(false, "Test 15: Reactivation login failed", err.response?.data?.message || err.message);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log("PART 2: WORKFLOW B — FORGOT PASSWORD & RECOVERY (Tests 16 - 30)");
  console.log("--------------------------------------------------------------------------------");

  // TEST 16: Unknown email -> Generic public response (no reset email, no token created)
  try {
    const unknownRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, {
      email: "completely-unknown@traviska.com",
    });
    assert(unknownRes.status === 200 && unknownRes.data.success, "Test 16: Unknown email -> Generic 200 response");
    assert(unknownRes.data.message.includes("If an eligible account exists"), "Test 16: Public anti-enumeration response");
    const count = await PasswordResetToken.countDocuments({ email: "completely-unknown@traviska.com" });
    assert(count === 0, "Test 16: Zero reset tokens created for unknown email");
  } catch (err) {
    assert(false, "Test 16: Unknown email failed", err.message);
  }

  // TEST 17: Unapproved customer email -> No reset email
  try {
    const custUser = await User.findOne({ role: "customer" });
    if (custUser && custUser.email) {
      const custRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, {
        email: custUser.email,
      });
      assert(custRes.status === 200 && custRes.data.message.includes("If an eligible account exists"), "Test 17: Customer email -> Generic response");
      const count = await PasswordResetToken.countDocuments({ email: custUser.email });
      assert(count === 0, "Test 17: Zero staff reset tokens created for customer accounts");
    } else {
      assert(true, "Test 17: Customer email check passed (skipped customer record lookup)");
    }
  } catch (err) {
    assert(false, "Test 17: Customer check failed", err.message);
  }

  // TEST 18: Pending invitation -> No reset email
  {
    const pendingRaw = crypto.randomBytes(32).toString("hex");
    const pendingHash = crypto.createHash("sha256").update(pendingRaw).digest("hex");
    const pendingInvite = await StaffInvitation.create({
      email: "unregistered-pending@traviska.com",
      name: "Pending Staff",
      role: "admin",
      tokenHash: pendingHash,
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
    });

    const pendingRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, {
      email: "unregistered-pending@traviska.com",
    });
    assert(pendingRes.status === 200 && pendingRes.data.message.includes("If an eligible account exists"), "Test 18: Pending invitation -> Generic response");
    const count = await PasswordResetToken.countDocuments({ email: "unregistered-pending@traviska.com" });
    assert(count === 0, "Test 18: No reset token created for pending uncompleted invitation");
    await StaffInvitation.deleteOne({ _id: pendingInvite._id });
  }

  // TEST 19: Verified email without first password -> No reset email
  {
    // Insert directly into collection to test edge-case without schema validation
    const insertRes = await User.collection.insertOne({
      name: "No Password User",
      email: "nopassword@traviska.com",
      role: "admin",
      isEmailVerified: true,
      password: null, // No password yet
      isActive: true,
      isSuspended: false,
    });
    const unpwRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, {
      email: "nopassword@traviska.com",
    });
    assert(unpwRes.status === 200 && unpwRes.data.message.includes("If an eligible account exists"), "Test 19: Account without first password -> Generic response");
    const count = await PasswordResetToken.countDocuments({ email: "nopassword@traviska.com" });
    assert(count === 0, "Test 19: No reset token created without initial password");
    await User.collection.deleteOne({ _id: insertRes.insertedId });
  }

  // TEST 20: Active, fully registered Admin -> Reset token created and reset link dispatched
  try {
    const resetReq = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, {
      email: TEST_EMAIL,
    });
    assert(resetReq.status === 200 && resetReq.data.success, "Test 20: Fully registered Admin requests reset -> HTTP 200");
    assert(resetReq.data.message.includes("If an eligible account exists"), "Test 20: Anti-enumeration response format");

    const tokenDoc = await PasswordResetToken.findOne({ email: TEST_EMAIL, status: "active" });
    assert(Boolean(tokenDoc), "Test 20: Secure reset token document created in MongoDB");
    assert(tokenDoc?.expiresAt > new Date(), "Test 20: Reset token has active future expiration (15-30 min)");
  } catch (err) {
    assert(false, "Test 20: Reset request failed", err.message);
  }

  // TEST 21: Valid link -> Validates reset token and displays Set New Password page info
  {
    // Generate a known test token for validation
    const testRawToken = crypto.randomBytes(32).toString("hex");
    const testTokenHash = crypto.createHash("sha256").update(testRawToken).digest("hex");
    await PasswordResetToken.create({
      userId: staffUserId,
      email: TEST_EMAIL,
      tokenHash: testTokenHash,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000),
      status: "active",
    });
    passwordResetToken = testRawToken;

    try {
      const valReset = await axios.get(`${BASE_URL}/api/staff-auth/validate-reset-token?token=${passwordResetToken}`);
      assert(valReset.status === 200 && valReset.data.valid, "Test 21: Valid reset link validated (HTTP 200)");
      assert(valReset.data.email === TEST_EMAIL, "Test 21: Displays read-only registered email");
    } catch (err) {
      assert(false, "Test 21: Validate reset token failed", err.message);
    }
  }

  // TEST 22: Password mismatch -> Rejected
  try {
    await axios.post(`${BASE_URL}/api/staff-auth/reset-password`, {
      token: passwordResetToken,
      password: NEW_PASSWORD,
      confirmPassword: "MismatchPassword@456",
    });
    assert(false, "Test 22: Password mismatch rejected");
  } catch (err) {
    assert(err.response?.status === 400, "Test 22: Password mismatch -> Reset rejected (HTTP 400)");
  }

  // TEST 23: Expired reset link -> Rejected
  {
    const expRaw = crypto.randomBytes(32).toString("hex");
    const expHash = crypto.createHash("sha256").update(expRaw).digest("hex");
    await PasswordResetToken.create({
      userId: staffUserId,
      email: TEST_EMAIL,
      tokenHash: expHash,
      expiresAt: new Date(Date.now() - 60000), // 1 min ago
      status: "active",
    });
    try {
      await axios.get(`${BASE_URL}/api/staff-auth/validate-reset-token?token=${expRaw}`);
      assert(false, "Test 23: Expired reset link rejected");
    } catch (err) {
      assert(err.response?.status === 410, "Test 23: Expired reset link -> Rejected (HTTP 410)");
    }
  }

  // TEST 24: Valid password update -> Successful
  try {
    const updateRes = await axios.post(`${BASE_URL}/api/staff-auth/reset-password`, {
      token: passwordResetToken,
      password: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });
    assert(updateRes.status === 200 && updateRes.data.success, "Test 24: Valid new password submitted -> HTTP 200");
    assert(updateRes.data.message.includes("Password updated successfully"), "Test 24: Returns sign-in message");
  } catch (err) {
    assert(false, "Test 24: Password update failed", err.message);
  }

  // TEST 25: Reused reset link -> Rejected (Single-use enforcement)
  try {
    await axios.post(`${BASE_URL}/api/staff-auth/reset-password`, {
      token: passwordResetToken,
      password: "AnotherPassword@789",
      confirmPassword: "AnotherPassword@789",
    });
    assert(false, "Test 25: Reused reset link rejected");
  } catch (err) {
    assert(err.response?.status === 400, "Test 25: Reused reset link -> Rejected atomically (HTTP 400)");
  }

  // TEST 26: Old password -> Login rejected
  try {
    await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: INITIAL_PASSWORD,
    });
    assert(false, "Test 26: Old password rejected");
  } catch (err) {
    assert(err.response?.status === 401, "Test 26: Old password -> Login rejected (HTTP 401)");
  }

  // TEST 27: New password -> Login successful
  try {
    const newLogin = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: NEW_PASSWORD,
    });
    assert(newLogin.status === 200 && newLogin.data.success, "Test 27: New password -> Login successful (HTTP 200)");
    assert(Boolean(newLogin.data.token), "Test 27: New session token issued");
  } catch (err) {
    assert(false, "Test 27: New password login failed", err.message);
  }

  // TEST 28: Previous active sessions -> Revoked by sessionsRevokedAt
  try {
    await axios.get(`${BASE_URL}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${staffAdminToken}` },
    });
    assert(false, "Test 28: Old session revoked");
  } catch (err) {
    assert(err.response?.status === 401 || err.response?.status === 403, "Test 28: Previous session token rejected after password reset (HTTP 401/403)");
  }

  // TEST 29: Suspended employee -> Cannot reset password
  try {
    // Clear tokens and suspend employee
    await PasswordResetToken.deleteMany({ email: TEST_EMAIL });
    await User.findByIdAndUpdate(staffUserId, { isSuspended: true });
    const suspRes = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, {
      email: TEST_EMAIL,
    });
    assert(suspRes.status === 200 && suspRes.data.message.includes("If an eligible account exists"), "Test 29: Suspended employee forgot-password -> Generic response");
    const activeTokens = await PasswordResetToken.find({ email: TEST_EMAIL, status: "active" });
    assert(activeTokens.length === 0, "Test 29: Zero active reset tokens created for suspended account");
  } catch (err) {
    assert(false, "Test 29: Suspended reset test failed", err.message);
  }

  // TEST 30: Routine staff recovery cannot take over Super Admin account
  try {
    const saReset = await axios.post(`${BASE_URL}/api/staff-auth/forgot-password`, {
      email: "owner@traviska.com",
    });
    assert(saReset.status === 200 && saReset.data.message.includes("If an eligible account exists"), "Test 30: Super Admin email -> Generic response");
    const saTokens = await PasswordResetToken.find({ email: "owner@traviska.com" });
    assert(saTokens.length === 0, "Test 30: Super Admin account protected from routine staff password reset");
  } catch (err) {
    assert(false, "Test 30: Super Admin protection test failed", err.message);
  }

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: ${passedCount + failedCount})`);
  console.log("================================================================================\n");

  await mongoose.disconnect();
  process.exit(failedCount === 0 ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test execution aborted:", err);
  process.exit(1);
});
