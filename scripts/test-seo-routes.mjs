import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// 1. Verify index.html tags
const indexPath = path.resolve("dist/index.html");
const indexHtml = fs.readFileSync(indexPath, "utf-8");

console.log("--- 1. Testing dist/index.html ---");
assert(
  indexHtml.includes("<title>Group Trips & Weekend Getaways from Bangalore | Traviska</title>"),
  "Missing updated title in index.html"
);
assert(
  indexHtml.includes('name="description" content="Discover curated group trips, weekend getaways, and trekking expeditions departing from Bangalore with Traviska. Join a verified community of explorers and solo travellers."'),
  "Missing meta description in index.html"
);
assert(
  indexHtml.includes('name="robots" content="index, follow"'),
  "Missing robots meta tag in index.html"
);
assert(
  indexHtml.includes('rel="canonical" href="https://traviska.com/"'),
  "Missing canonical link in index.html"
);
assert(
  indexHtml.includes('property="og:title" content="Group Trips & Weekend Getaways from Bangalore | Traviska"'),
  "Missing og:title in index.html"
);
assert(
  indexHtml.includes('name="twitter:title" content="Group Trips & Weekend Getaways from Bangalore | Traviska"'),
  "Missing twitter:title in index.html"
);

// Check duplicate tags in index.html
const titleCount = (indexHtml.match(/<title>/g) || []).length;
const descCount = (indexHtml.match(/name="description"/g) || []).length;
const canonicalCount = (indexHtml.match(/rel="canonical"/g) || []).length;
const robotsCount = (indexHtml.match(/name="robots"/g) || []).length;

assert.strictEqual(titleCount, 1, `Expected 1 <title>, found ${titleCount}`);
assert.strictEqual(descCount, 1, `Expected 1 description, found ${descCount}`);
assert.strictEqual(canonicalCount, 1, `Expected 1 canonical, found ${canonicalCount}`);
assert.strictEqual(robotsCount, 1, `Expected 1 robots tag, found ${robotsCount}`);
console.log("✓ dist/index.html has valid, non-duplicated meta tags!");

// 2. Simulate SEO DOM logic across route transitions
console.log("\n--- 2. Simulating SEO DOM Manager Logic Across Routes ---");

// Mock DOM
class MockElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
  }
  setAttribute(k, v) { this.attributes.set(k, v); }
  getAttribute(k) { return this.attributes.get(k); }
  removeAttribute(k) { this.attributes.delete(k); }
  remove() {
    const idx = mockDocument.head.children.indexOf(this);
    if (idx !== -1) mockDocument.head.children.splice(idx, 1);
  }
}

const mockDocument = {
  title: "Group Trips & Weekend Getaways from Bangalore | Traviska",
  head: {
    children: [
      (() => { const el = new MockElement("meta"); el.setAttribute("name", "description"); el.setAttribute("content", "default desc"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("name", "robots"); el.setAttribute("content", "index, follow"); return el; })(),
      (() => { const el = new MockElement("link"); el.setAttribute("rel", "canonical"); el.setAttribute("href", "https://traviska.com/"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("property", "og:title"); el.setAttribute("content", "default"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("property", "og:description"); el.setAttribute("content", "default"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("property", "og:url"); el.setAttribute("content", "https://traviska.com/"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("property", "og:image"); el.setAttribute("content", "https://traviska.com/favicon-512x512.png"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("property", "og:type"); el.setAttribute("content", "website"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("name", "twitter:card"); el.setAttribute("content", "summary"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("name", "twitter:title"); el.setAttribute("content", "default"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("name", "twitter:description"); el.setAttribute("content", "default"); return el; })(),
      (() => { const el = new MockElement("meta"); el.setAttribute("name", "twitter:image"); el.setAttribute("content", "https://traviska.com/favicon-512x512.png"); return el; })(),
    ]
  },
  querySelector(selector) {
    if (selector === 'meta[name="description"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("name") === "description") || null;
    }
    if (selector === 'meta[name="robots"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("name") === "robots") || null;
    }
    if (selector === 'link[rel="canonical"]') {
      return this.head.children.find(c => c.tagName === "LINK" && c.getAttribute("rel") === "canonical") || null;
    }
    if (selector === 'meta[property="og:title"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("property") === "og:title") || null;
    }
    if (selector === 'meta[property="og:description"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("property") === "og:description") || null;
    }
    if (selector === 'meta[property="og:url"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("property") === "og:url") || null;
    }
    if (selector === 'meta[property="og:image"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("property") === "og:image") || null;
    }
    if (selector === 'meta[property="og:type"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("property") === "og:type") || null;
    }
    if (selector === 'meta[name="twitter:card"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("name") === "twitter:card") || null;
    }
    if (selector === 'meta[name="twitter:title"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("name") === "twitter:title") || null;
    }
    if (selector === 'meta[name="twitter:description"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("name") === "twitter:description") || null;
    }
    if (selector === 'meta[name="twitter:image"]') {
      return this.head.children.find(c => c.tagName === "META" && c.getAttribute("name") === "twitter:image") || null;
    }
    return null;
  },
  createElement(tag) {
    const el = new MockElement(tag);
    this.head.children.push(el);
    return el;
  }
};

function applySEO({ title, description, canonical, robots = "index, follow", ogType = "website", ogImage = "https://traviska.com/favicon-512x512.png", twitterCard = "summary" }) {
  if (title) mockDocument.title = title;
  const updateMeta = (selector, attrName, attrVal, content) => {
    if (content === undefined) return;
    let el = mockDocument.querySelector(selector);
    if (!el) {
      el = mockDocument.createElement("meta");
      el.setAttribute(attrName, attrVal);
    }
    el.setAttribute("content", content);
  };
  updateMeta('meta[name="description"]', "name", "description", description);
  updateMeta('meta[name="robots"]', "name", "robots", robots);
  let canonicalEl = mockDocument.querySelector('link[rel="canonical"]');
  if (canonical) {
    if (!canonicalEl) {
      canonicalEl = mockDocument.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
    }
    canonicalEl.setAttribute("href", canonical);
  } else if (canonicalEl) {
    canonicalEl.remove();
  }
  updateMeta('meta[property="og:title"]', "property", "og:title", title);
  updateMeta('meta[property="og:description"]', "property", "og:description", description);
  updateMeta('meta[property="og:type"]', "property", "og:type", ogType);
  updateMeta('meta[property="og:image"]', "property", "og:image", ogImage);
  if (canonical) updateMeta('meta[property="og:url"]', "property", "og:url", canonical);
  updateMeta('meta[name="twitter:card"]', "name", "twitter:card", twitterCard);
  updateMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  updateMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
  updateMeta('meta[name="twitter:image"]', "name", "twitter:image", ogImage);
}

// Route 1: Trips
console.log("Simulating navigation to /trips...");
applySEO({
  title: "Weekend Trips & Group Travel Packages from Bangalore | Traviska",
  description: "Explore upcoming weekend trips, road journeys, and trekking expeditions from Bangalore. Verified itineraries, transparent pricing, and unforgettable community travel.",
  canonical: "https://traviska.com/trips",
  robots: "index, follow"
});
assert.strictEqual(mockDocument.title, "Weekend Trips & Group Travel Packages from Bangalore | Traviska");
assert.strictEqual(mockDocument.querySelector('link[rel="canonical"]').getAttribute("href"), "https://traviska.com/trips");
assert.strictEqual(mockDocument.querySelector('meta[name="robots"]').getAttribute("content"), "index, follow");

// Route 2: About
console.log("Simulating navigation to /about...");
applySEO({
  title: "About Traviska | Group Travel Community in Bengaluru",
  description: "Traviska is Bengaluru's community-first travel company creating immersive, unscripted group journeys. Learn about our story, safety standards, and ethos.",
  canonical: "https://traviska.com/about",
  robots: "index, follow"
});
assert.strictEqual(mockDocument.title, "About Traviska | Group Travel Community in Bengaluru");
assert.strictEqual(mockDocument.querySelector('link[rel="canonical"]').getAttribute("href"), "https://traviska.com/about");

// Route 3: Contact
console.log("Simulating navigation to /contact...");
applySEO({
  title: "Contact Traviska | Trip Enquiries & Group Bookings",
  description: "Connect with Traviska for upcoming trip queries, custom private groups, and corporate getaways. Call or WhatsApp our Bengaluru team at +91 99027 42004.",
  canonical: "https://traviska.com/contact",
  robots: "index, follow"
});
assert.strictEqual(mockDocument.title, "Contact Traviska | Trip Enquiries & Group Bookings");
assert.strictEqual(mockDocument.querySelector('link[rel="canonical"]').getAttribute("href"), "https://traviska.com/contact");

// Route 4: Dynamic Trip Page
console.log("Simulating navigation to /trip/679f123456789abcdef01234...");
const sampleTrip = {
  _id: "679f123456789abcdef01234",
  title: "Coorg Plantation Trail & Camp",
  duration: "2 Days / 1 Night",
  location: "Coorg, Karnataka",
  price: 3899,
  image: "https://images.unsplash.com/sample-coorg.jpg",
  description: "Experience the misty coffee estates and lush waterfalls of Coorg on a curated weekend group escape from Bangalore."
};

const tripTitle = `${sampleTrip.title} - ${sampleTrip.duration} | Traviska`;
const tripDesc = sampleTrip.description;
const tripCanonical = `https://traviska.com/trip/${sampleTrip._id}`;

applySEO({
  title: tripTitle,
  description: tripDesc,
  canonical: tripCanonical,
  robots: "index, follow",
  ogType: "website",
  ogImage: sampleTrip.image,
  twitterCard: "summary_large_image"
});
assert.strictEqual(mockDocument.title, "Coorg Plantation Trail & Camp - 2 Days / 1 Night | Traviska");
assert.strictEqual(mockDocument.querySelector('link[rel="canonical"]').getAttribute("href"), "https://traviska.com/trip/679f123456789abcdef01234");
assert.strictEqual(mockDocument.querySelector('meta[property="og:image"]').getAttribute("content"), "https://images.unsplash.com/sample-coorg.jpg");
assert.strictEqual(mockDocument.querySelector('meta[name="twitter:card"]').getAttribute("content"), "summary_large_image");

// Route 5: Invalid / 404 Trip
console.log("Simulating navigation to /trip/invalid-id (Not Found)...");
applySEO({
  title: "Trip Not Found | Traviska",
  description: "The requested trip package could not be found or is no longer available. Explore our upcoming weekend trips and getaways from Bangalore.",
  robots: "noindex, follow"
});
assert.strictEqual(mockDocument.title, "Trip Not Found | Traviska");
assert.strictEqual(mockDocument.querySelector('meta[name="robots"]').getAttribute("content"), "noindex, follow");
assert.strictEqual(mockDocument.querySelector('link[rel="canonical"]'), null, "Canonical should be removed on 404");

// Route 6: Private Portal (/admin)
console.log("Simulating navigation to /admin (Private Portal)...");
applySEO({
  title: "Traviska | Secure Portal",
  description: "Traviska secure user and management portal.",
  robots: "noindex, nofollow"
});
assert.strictEqual(mockDocument.querySelector('meta[name="robots"]').getAttribute("content"), "noindex, nofollow");
assert.strictEqual(mockDocument.querySelector('link[rel="canonical"]'), null, "Canonical should be removed on private pages");

// Check tag counts in mock DOM (ensure no duplication)
const descElements = mockDocument.head.children.filter(c => c.tagName === "META" && c.getAttribute("name") === "description");
const robotsElements = mockDocument.head.children.filter(c => c.tagName === "META" && c.getAttribute("name") === "robots");
const ogTitleElements = mockDocument.head.children.filter(c => c.tagName === "META" && c.getAttribute("property") === "og:title");
assert.strictEqual(descElements.length, 1, "Duplicate meta description found!");
assert.strictEqual(robotsElements.length, 1, "Duplicate robots tag found!");
assert.strictEqual(ogTitleElements.length, 1, "Duplicate og:title found!");

console.log("\n✓ All SEO route transitions, dynamic trip metadata, 404 safety, and noindex checks passed with ZERO duplicate tags!");

