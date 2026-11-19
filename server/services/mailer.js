const nodemailer = require("nodemailer");
const { auth: getFirebaseAuth } = require("../firebaseAdmin");

/**
 * Mailer service for Traviska Staff Onboarding & Authentication
 * Supports SMTP (Gmail, SendGrid, Amazon SES, custom SMTP)
 * Falls back to Firebase Auth email dispatch when SMTP is unconfigured,
 * while always preserving the registrationLink for manual handoff if needed.
 */

const FIREBASE_WEB_API_KEY =
  process.env.FIREBASE_WEB_API_KEY ||
  process.env.VITE_FIREBASE_API_KEY ||
  "AIzaSyBVjgjccqW_FuQOl0sl_bViFxTqMCkYcP4";

async function sendFirebaseContinueEmail({ to, name, continueUrl, label = "email" }) {
  const firebaseAuth = getFirebaseAuth();
  let fbUser;

  try {
    fbUser = await firebaseAuth.getUserByEmail(to);
    const updates = {};
    if (fbUser.emailVerified) updates.emailVerified = false;
    if (name && fbUser.displayName !== name) updates.displayName = name;
    if (Object.keys(updates).length > 0) {
      fbUser = await firebaseAuth.updateUser(fbUser.uid, updates);
    }
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      fbUser = await firebaseAuth.createUser({
        email: to,
        displayName: name || "Traviska Staff",
        emailVerified: false,
      });
    } else {
      throw err;
    }
  }

  const customToken = await firebaseAuth.createCustomToken(fbUser.uid);
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const signInData = await signInRes.json();
  if (!signInRes.ok || !signInData.idToken) {
    throw new Error(signInData?.error?.message || "Firebase signInWithCustomToken failed");
  }

  const oobRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "VERIFY_EMAIL",
        idToken: signInData.idToken,
        continueUrl,
      }),
    }
  );
  const oobData = await oobRes.json();
  if (!oobRes.ok) {
    throw new Error(oobData?.error?.message || "Firebase sendOobCode failed");
  }

  console.log(`[Mailer: Firebase] ${label} sent to ${to}`);
  return {
    success: true,
    delivered: true,
    provider: "firebase",
  };
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
}

const getFromAddress = () => {
  return process.env.SMTP_FROM || process.env.EMAIL_FROM || '"Traviska Team" <no-reply@traviska.com>';
};

/**
 * WORKFLOW A: Send Staff Invitation Email
 * Subject: "You're invited to join Traviska — Verify Email & Set Password"
 * Button: "Verify Email & Set Password"
 */
async function sendStaffInvitationEmail({ to, name, role, department, registrationLink, expiresAt }) {
  const transporter = getTransporter();

  const formattedRole = role
    ? role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Staff Member";

  const expiryString = expiresAt ? new Date(expiresAt).toUTCString() : "24 hours";

  if (!transporter) {
    try {
      const fbResult = await sendFirebaseContinueEmail({
        to,
        name,
        continueUrl: registrationLink,
        label: "Staff invitation email",
      });
      return { ...fbResult, registrationLink };
    } catch (fbErr) {
      console.error(`[Mailer: Firebase] Failed for ${to}:`, fbErr.message);
      console.log(`\n======================================================`);
      console.log(`[Mailer: LOCAL/MANUAL DISPATCH] Staff Invitation`);
      console.log(`Recipient: ${name} <${to}>`);
      console.log(`Role: ${formattedRole} (${department || "Operations"})`);
      console.log(`Verification & Registration URL: ${registrationLink}`);
      console.log(`Expires: ${expiryString}`);
      console.log(`======================================================\n`);
      return {
        success: true,
        delivered: false,
        reason: "SMTP_NOT_CONFIGURED",
        error: fbErr.message,
        registrationLink,
      };
    }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #092816; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; }
    .header p { color: #86efac; margin: 6px 0 0; font-size: 14px; font-weight: 500; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
    .role-badge { display: inline-block; background: #ecfdf5; color: #065f46; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-bottom: 20px; border: 1px solid #a7f3d0; }
    .cta-btn { display: inline-block; background: #092816; color: #ffffff !important; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 24px 0; text-align: center; }
    .link-fallback { background: #f1f5f9; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #475569; }
    .footer { border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TRAVISKA</h1>
      <p>Staff Portal Onboarding</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${name || "there"},</div>
      <p>You have been officially invited by the CEO to join the Traviska team:</p>
      <div>
        <span class="role-badge">Role: ${formattedRole} &bull; ${department || "Operations"}</span>
      </div>
      <p>To verify your email and set your account password, click the button below:</p>
      <div style="text-align: center;">
        <a href="${registrationLink}" class="cta-btn" target="_blank">Verify Email &amp; Set Password &rarr;</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:</p>
      <div class="link-fallback">${registrationLink}</div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        &bull; This is a single-use secure link expiring on ${expiryString}.<br>
        &bull; Clicking the link verifies your email ownership and lets you create your password.
      </p>
    </div>
    <div class="footer">
      This is an automated administrative invitation from Traviska. If you were not expecting this, please notify your administrator immediately.
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: "You're invited to join Traviska — Verify Email & Set Password",
      html,
      text: `Hello ${name},\n\nYou have been invited to join Traviska as ${formattedRole} (${department || "Operations"}).\n\nPlease verify your email and set your password here:\n${registrationLink}\n\nThis single-use link expires on ${expiryString}.`,
    });

    console.log(`[Mailer] Staff invitation sent to ${to}. MessageId: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mailer] Error sending invitation email to ${to}:`, err.message);
    return { success: false, delivered: false, error: err.message, registrationLink };
  }
}

/**
 * WORKFLOW B: Send Password Reset Email
 * Subject: "Traviska — Reset Your Password"
 * Button: "Reset Password"
 */
async function sendPasswordResetEmail({ to, name, resetLink, expiresAt }) {
  const transporter = getTransporter();
  const expiryString = expiresAt ? new Date(expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "15 minutes";

  if (!transporter) {
    try {
      const fbResult = await sendFirebaseContinueEmail({
        to,
        name,
        continueUrl: resetLink,
        label: "Password reset email",
      });
      return { ...fbResult, resetLink };
    } catch (fbErr) {
      console.error(`[Mailer: Firebase] Password reset failed for ${to}:`, fbErr.message);
      console.log(`\n======================================================`);
      console.log(`[Mailer: LOCAL/MANUAL DISPATCH] Password Reset Request`);
      console.log(`Recipient: ${name} <${to}>`);
      console.log(`Reset URL: ${resetLink}`);
      console.log(`Expires At: ${expiryString}`);
      console.log(`======================================================\n`);
      return {
        success: true,
        delivered: false,
        reason: "SMTP_NOT_CONFIGURED",
        error: fbErr.message,
        resetLink,
      };
    }
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #092816; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; }
    .header p { color: #86efac; margin: 6px 0 0; font-size: 14px; font-weight: 500; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
    .cta-btn { display: inline-block; background: #092816; color: #ffffff !important; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 24px 0; text-align: center; }
    .link-fallback { background: #f1f5f9; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #475569; }
    .footer { border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TRAVISKA</h1>
      <p>Account Recovery</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${name || "there"},</div>
      <p>We received a request to reset the password for your Traviska staff account.</p>
      <p>Click the button below to choose a new password:</p>
      <div style="text-align: center;">
        <a href="${resetLink}" class="cta-btn" target="_blank">Reset Password &rarr;</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">If the button above does not work, copy and paste this link into your browser:</p>
      <div class="link-fallback">${resetLink}</div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        &bull; This secure link expires in 15–30 minutes and can only be used once.<br>
        &bull; If you did not request a password reset, you can safely ignore this email. Your current password remains secure.
      </p>
    </div>
    <div class="footer">
      This is an automated security message from Traviska Staff Portal.
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: "Traviska — Reset Your Password",
      html,
      text: `Hello ${name},\n\nWe received a request to reset your Traviska staff account password.\n\nPlease reset your password here:\n${resetLink}\n\nIf you did not request this, you can safely ignore this email.`,
    });

    console.log(`[Mailer] Password reset email sent to ${to}. MessageId: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mailer] Error sending reset email to ${to}:`, err.message);
    return { success: false, delivered: false, error: err.message, resetLink };
  }
}

/**
 * Send Account Status Verification Email
 * Dispatches a single-use verification link and code to verify email ownership.
 */
async function sendAccountStatusVerificationEmail({ to, name, verificationLink, code, expiresAt }) {
  const transporter = getTransporter();
  const expiryString = expiresAt ? new Date(expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "15 minutes";

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`[Mailer: LOCAL/MANUAL DISPATCH] Account Status Verification`);
    console.log(`Recipient: ${name || "Staff Member"} <${to}>`);
    console.log(`Verification Code: ${code}`);
    console.log(`Status Check URL: ${verificationLink}`);
    console.log(`Expires At: ${expiryString}`);
    console.log(`======================================================\n`);
    return {
      success: true,
      delivered: false,
      reason: "SMTP_NOT_CONFIGURED",
      verificationLink,
      code,
    };
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #092816; padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; }
    .header p { color: #86efac; margin: 6px 0 0; font-size: 14px; font-weight: 500; }
    .body { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 600; margin-bottom: 16px; }
    .code-box { background: #ecfdf5; border: 2px dashed #059669; border-radius: 8px; padding: 16px; text-align: center; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #065f46; margin: 20px 0; }
    .cta-btn { display: inline-block; background: #092816; color: #ffffff !important; padding: 14px 28px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 8px; margin: 16px 0; text-align: center; }
    .link-fallback { background: #f1f5f9; padding: 12px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; color: #475569; }
    .footer { border-top: 1px solid #e2e8f0; padding: 20px 24px; font-size: 12px; color: #64748b; background: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TRAVISKA</h1>
      <p>Staff Account Status Verification</p>
    </div>
    <div class="body">
      <div class="greeting">Hello ${name || "there"},</div>
      <p>We received a request to check the status of your Traviska staff account.</p>
      <p>Your one-time verification code is:</p>
      <div class="code-box">${code}</div>
      <p style="text-align: center;">Or click the button below to view your verified account status directly:</p>
      <div style="text-align: center;">
        <a href="${verificationLink}" class="cta-btn" target="_blank">Verify &amp; View Account Status &rarr;</a>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 20px;">
        &bull; This verification link expires at ${expiryString} and can only be used once.<br>
        &bull; If you did not request this, no action is needed.
      </p>
    </div>
    <div class="footer">
      This is an automated security message from Traviska Staff Portal.
    </div>
  </div>
</body>
</html>
  `;

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject: `Traviska — Account Status Verification Code: ${code}`,
      html,
      text: `Hello ${name || "there"},\n\nYour Traviska account status verification code is: ${code}\n\nOr click here to verify:\n${verificationLink}\n\nExpires in 15 minutes.`,
    });

    console.log(`[Mailer] Status verification email sent to ${to}. MessageId: ${info.messageId}`);
    return { success: true, delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Mailer] Error sending status verification email to ${to}:`, err.message);
    return { success: false, delivered: false, error: err.message, verificationLink };
  }
}

/**
 * Helper to check SMTP configuration status safely
 */
function getSmtpStatus() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const configured = Boolean(host && user);
  return {
    configured,
    host: host || null,
    userConfigured: Boolean(user),
  };
}

module.exports = {
  sendStaffInvitationEmail,
  sendPasswordResetEmail,
  sendAccountStatusVerificationEmail,
  getSmtpStatus,
};
