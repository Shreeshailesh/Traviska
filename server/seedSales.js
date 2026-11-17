const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./models/User");
const Enquiry = require("./models/Enquiry");
const FollowUp = require("./models/FollowUp");
const Trip = require("./models/Trip");
const TripSlot = require("./models/TripSlot");

async function seedSalesData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB...");

    // 1. Create or update a dedicated sales executive
    const salesHashedPassword = await bcrypt.hash("Traviska@123", 10);
    const salesUser = await User.findOneAndUpdate(
      { email: "sales@traviska.com" },
      {
        name: "Arun Verma (Sales)",
        password: salesHashedPassword,
        role: "sales",
        phone: "9876543210",
        department: "Expedition Sales",
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log("✅ Sales executive ready: sales@traviska.com / Traviska@123");

    // 2. Fetch active trip/slots to link sample enquiries
    const trip = await Trip.findOne();
    const slot = await TripSlot.findOne();

    // 3. Check if enquiries already exist, if not create sample pipeline leads
    const count = await Enquiry.countDocuments();
    if (count === 0) {
      console.log("Seeding sample customer enquiries...");

      const sampleEnquiries = [
        {
          name: "Rohit Agarwal",
          email: "rohit.a@gmail.com",
          phone: "9812345678",
          tripId: trip?._id || null,
          tripTitle: trip?.title || "Coorg Weekend Getaway",
          slotId: slot?._id || null,
          departureDate: slot?.date || "28 Nov 2026",
          numTravelers: 3,
          budget: 18000,
          source: "Website",
          status: "New",
          priority: "High",
          assignedTo: salesUser._id,
          assignedToName: salesUser.name,
          notes: "Group of 3 colleagues looking for homestay with bonfire and plantation walk.",
        },
        {
          name: "Neha Kulkarni",
          email: "neha.k@yahoo.com",
          phone: "9988776655",
          tripId: trip?._id || null,
          tripTitle: trip?.title || "Gokarna Beach Trek",
          slotId: slot?._id || null,
          departureDate: slot?.date || "05 Dec 2026",
          numTravelers: 2,
          budget: 13000,
          source: "Instagram",
          status: "Qualified",
          priority: "Medium",
          assignedTo: salesUser._id,
          assignedToName: salesUser.name,
          notes: "Interested in sunset beach trek and scuba diving. Follow up with revised quote.",
        },
        {
          name: "Vikram Singhania",
          email: "vikram.s@outlook.com",
          phone: "9765432109",
          tripId: trip?._id || null,
          tripTitle: trip?.title || "Wayanad Rainforest Camp",
          slotId: slot?._id || null,
          departureDate: slot?.date || "12 Dec 2026",
          numTravelers: 6,
          budget: 42000,
          source: "Phone Call",
          status: "Negotiation",
          priority: "Urgent",
          assignedTo: salesUser._id,
          assignedToName: salesUser.name,
          notes: "Family booking of 6 pax. Requested 10% group discount and private vehicle.",
        },
      ];

      for (const enqData of sampleEnquiries) {
        const enq = new Enquiry(enqData);
        await enq.save();

        // Add follow-up
        const followUpTime = new Date();
        followUpTime.setHours(followUpTime.getHours() + 1);
        const fu = new FollowUp({
          enquiryId: enq._id,
          enquiryCode: enq.enquiryId,
          customerName: enq.name,
          customerPhone: enq.phone,
          salesEmployeeId: salesUser._id,
          salesEmployeeName: salesUser.name,
          scheduledAt: followUpTime,
          type: "Call",
          status: "Scheduled",
          summary: `Call ${enq.name} regarding itinerary & quote confirmation`,
        });
        await fu.save();
      }
      console.log("✅ Seeded 3 sample customer enquiries with follow-up tasks!");
    } else {
      console.log(`Enquiries already present (${count} records).`);
    }

    await mongoose.disconnect();
    console.log("Seed complete.");
  } catch (err) {
    console.error("Seeding error:", err);
  }
}

seedSalesData();
