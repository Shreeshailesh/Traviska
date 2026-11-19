const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const User = require("./models/User");
const AuditLog = require("./models/AuditLog");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/traviska";
const CEO_EMAIL = "owner@traviska.com";

async function bootstrap() {
  const password = process.env.CEO_PASSWORD || process.argv[2];

  if (!password || password.trim().length < 8) {
    console.error("❌ Error: A secure password (minimum 8 characters) must be supplied via CEO_PASSWORD env var or CLI argument.");
    process.exit(1);
  }

  console.log(`[BOOTSTRAP] Connecting to database...`);
  await mongoose.connect(MONGO_URI);
  console.log(`[BOOTSTRAP] Connected.`);

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password.trim(), salt);

  let ceo = await User.findOne({ email: CEO_EMAIL });

  if (ceo) {
    console.log(`[BOOTSTRAP] User ${CEO_EMAIL} already exists. Elevating to super_admin...`);
    ceo.role = "super_admin";
    ceo.name = ceo.name || "Shailesh (CEO)";
    ceo.department = "Executive";
    ceo.password = hashedPassword;
    ceo.isActive = true;
    ceo.isSuspended = false;
    ceo.isEmailVerified = true;
    ceo.authProvider = "password";
    await ceo.save();
  } else {
    console.log(`[BOOTSTRAP] Creating CEO account for ${CEO_EMAIL}...`);
    ceo = await User.create({
      name: "Shailesh (CEO)",
      email: CEO_EMAIL,
      password: hashedPassword,
      role: "super_admin",
      department: "Executive",
      isActive: true,
      isSuspended: false,
      isEmailVerified: true,
      authProvider: "password",
    });
  }

  await AuditLog.create({
    actorId: ceo._id,
    actorEmail: ceo.email,
    actorRole: "super_admin",
    action: "ceo.bootstrapped",
    details: `CEO account ${CEO_EMAIL} was bootstrapped with role super_admin`,
    targetId: String(ceo._id),
    targetEmail: ceo.email,
  });

  console.log(`\n======================================================`);
  console.log(`✅ CEO Super Admin Account Initialized:`);
  console.log(`   Email:    ${CEO_EMAIL}`);
  console.log(`   Role:     super_admin`);
  console.log(`   Status:   Credentials updated securely (secrets withheld)`);
  console.log(`======================================================\n`);

  await mongoose.disconnect();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error("Bootstrap failed:", err);
  process.exit(1);
});

