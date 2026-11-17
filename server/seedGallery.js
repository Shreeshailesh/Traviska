const mongoose = require("mongoose");
require("dotenv").config();
const GalleryItem = require("./models/GalleryItem");

const starterMedia = [
  // Top Row (Moves Left to Right)
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_top_1",
    row: "top",
    order: 0,
    title: "Misty Sunrise over Wayanad Tea Hills",
    isVisible: true,
  },
  {
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-foggy-pine-forest-42407-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1511497584788-87676104235f?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_top_2",
    row: "top",
    order: 1,
    title: "Floating Through Alpine Pine Forest",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_top_3",
    row: "top",
    order: 2,
    title: "Golden Hour Shores of South Goa",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_top_4",
    row: "top",
    order: 3,
    title: "Serene Mountain Lake Crossing",
    isVisible: true,
  },
  {
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-gentle-waves-crashing-on-a-sandy-beach-42352-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_top_5",
    row: "top",
    order: 5,
    title: "Coastal Waves at Sunset",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_top_6",
    row: "top",
    order: 6,
    title: "Summit Celebrations & Mountain Bonds",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_top_7",
    row: "top",
    order: 7,
    title: "Hidden Emerald Valley Trail",
    isVisible: true,
  },

  // Bottom Row (Moves Right to Left)
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_bot_1",
    row: "bottom",
    order: 0,
    title: "Canoeing through Glacial Waters",
    isVisible: true,
  },
  {
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-campers-talking-around-a-campfire-at-night-42403-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_bot_2",
    row: "bottom",
    order: 1,
    title: "Campfire Stories Under Starry Skies",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_bot_3",
    row: "bottom",
    order: 2,
    title: "Open Highway into the Western Ghats",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_bot_4",
    row: "bottom",
    order: 3,
    title: "Stairways of Ancient Coastal Forts",
    isVisible: true,
  },
  {
    mediaType: "video",
    mediaUrl: "https://assets.mixkit.co/videos/preview/mixkit-waterfall-in-forest-2213-large.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1432405972618-c60b0225b8f9?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_bot_5",
    row: "bottom",
    order: 4,
    title: "Secret Rainforest Waterfall",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_bot_6",
    row: "bottom",
    order: 5,
    title: "Travellers Mapping Tomorrow's Route",
    isVisible: true,
  },
  {
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=1200&q=80",
    thumbnailUrl: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=600&q=80",
    cloudinaryPublicId: "seed_bot_7",
    row: "bottom",
    order: 6,
    title: "Golden Morning in Karnataka Coffee Groves",
    isVisible: true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const count = await GalleryItem.countDocuments();
  if (count === 0) {
    await GalleryItem.insertMany(starterMedia);
    console.log(`Seeded ${starterMedia.length} starter gallery items!`);
  } else {
    console.log(`Gallery collection already has ${count} items. Skipping seed.`);
  }

  await mongoose.disconnect();
}

seed().catch(console.error);

