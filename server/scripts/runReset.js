const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { resetAllSampleData } = require("../utils/resetSampleData");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/traviska";

async function main() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI);
  console.log("Connected successfully.");

  console.log("Resetting all sample data...");
  const results = await resetAllSampleData();
  console.log("Reset Results:", results);

  await mongoose.disconnect();
  console.log("Done! Sample data reset complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});

