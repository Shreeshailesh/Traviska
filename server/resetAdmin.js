const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB Connected");

    const hashedPassword = await bcrypt.hash("Traviska@123", 10);

    const user = await User.findOneAndUpdate(
      { email: "admin@traviska.com" },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      console.log("Admin user not found");
    } else {
      console.log("Admin password reset successfully!");
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error(error);
  }
}

resetAdmin();