require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

// Replace with your MongoDB connection string
mongoose.connect(process.env.MONGODB_URI);

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    const admin = new User({
      name: "Traviska Admin",
      email: "admin@traviska.com",
      password: hashedPassword,
    });

    await admin.save();

    console.log("✅ Admin user created successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

createAdmin();