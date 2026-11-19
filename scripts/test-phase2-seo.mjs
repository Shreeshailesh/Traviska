import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import handler, { safeJsonStringify } from "../api/trip.js";

console.log("=================================================");
console.log("TRAVISKA SEO PHASE 2 — COMPREHENSIVE TEST SUITE");
console.log("=================================================\n");

// 1. Verify dist/index.html metadata and enhanced TravelAgency schema
console.log("--- TEST 1: dist/index.html & TravelAgency JSON-LD ---");
const distIndex = fs.readFileSync(path.resolve("dist/index.html"), "utf-8");

assert(distIndex.includes("<title>Group Trips & Weekend Getaways from Bangalore | Traviska</title>"), "Missing title in index.html");
assert(distIndex.includes('name="description" content="Discover curated group trips, weekend getaways, and trekking expeditions departing from Bangalore with Traviska. Join a verified community of explorers and solo travellers."'), "Missing description in index.html");
assert(distIndex.includes('rel="canonical" href="https://traviska.com/"'), "Missing canonical in index.html");
assert(distIndex.includes('name="robots" content="index, follow"'), "Missing robots in index.html");

// Extract and parse JSON-LD from index.html
const jsonLdMatch = distIndex.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(jsonLdMatch, "No JSON-LD found in index.html");
const parsedJsonLd = JSON.parse(jsonLdMatch[1]);
assert(parsedJsonLd["@context"] === "https://schema.org", "Invalid @context in index.html");

const orgSchema = parsedJsonLd["@graph"].find(item => Array.isArray(item["@type"]) && item["@type"].includes("TravelAgency"));
assert(orgSchema, "Missing TravelAgency schema in index.html");
assert.strictEqual(orgSchema.name, "Traviska");
assert.strictEqual(orgSchema.telephone, "+91 99027 42004");
assert.strictEqual(orgSchema.email, "travelwithtraviska@gmail.com");
assert.strictEqual(orgSchema.address.addressLocality, "Bengaluru");
assert(Array.isArray(orgSchema.sameAs), "sameAs must be an array");

console.log("✓ dist/index.html has valid TravelAgency + WebSite JSON-LD and correct metadata!");

// Helper to simulate request/response for api/trip.js
function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, val) {
      this.headers[key.toLowerCase()] = val;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    }
  };
}

// 2. Test Invalid Trip ID -> HTTP 404
console.log("\n--- TEST 2: Invalid Trip ID Handling (HTTP 404) ---");
{
  const req = { query: { id: "invalid-trip-id" } };
  const res = mockResponse();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 404, `Expected 404 for invalid ID, got ${res.statusCode}`);
  assert.strictEqual(res.headers["x-robots-tag"], "noindex, follow");
  assert(res.headers["cache-control"].includes("max-age=60"), "404 should have bounded cache-control");
  assert(res.body.includes("<title>Trip Not Found | Traviska</title>"), "Expected 'Trip Not Found' title");
  assert(res.body.includes('name="robots" content="noindex, follow"'), "Expected noindex meta tag");
  assert(!res.body.includes('rel="canonical"'), "Canonical must not be present on 404");
  console.log("✓ Invalid trip ID correctly returns HTTP 404 with noindex and no canonical tag");
}

// 3. Test Nonexistent 24-hex ObjectId -> HTTP 404
console.log("\n--- TEST 3: Nonexistent Trip ID (Render 404 -> Serverless 404) ---");
{
  // A syntactically valid ObjectId that does not exist in DB
  const req = { query: { id: "000000000000000000000000" } };
  const res = mockResponse();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 404, `Expected 404 for nonexistent ID, got ${res.statusCode}`);
  assert.strictEqual(res.headers["x-robots-tag"], "noindex, follow");
  assert(res.body.includes("Trip Not Found"), "Expected 'Trip Not Found' in body");
  console.log("✓ Nonexistent trip ID correctly returns HTTP 404 with noindex");
}

// 4. Test Valid Real Trip ID -> HTTP 200 with Prerendered Semantic HTML & JSON-LD
console.log("\n--- TEST 4: Valid Trip Initial HTML (HTTP 200, Bounded Cache, Zero-Flash Hydration) ---");
{
  const realTripId = "6afd00fa1ef66bc5ba14d745";
  const req = { query: { id: realTripId } };
  const res = mockResponse();
  await handler(req, res);

  assert.strictEqual(res.statusCode, 200, `Expected 200 for real trip, got ${res.statusCode}`);
  assert(res.headers["content-type"].includes("text/html"), "Content-type must be text/html");
  // Verify bounded caching policy: max-age=60, s-maxage=120, stale-while-revalidate=300
  assert(res.headers["cache-control"].includes("s-maxage=120"), "Cache-Control must specify bounded s-maxage=120");
  assert(res.headers["cache-control"].includes("stale-while-revalidate=300"), "stale-while-revalidate must be bounded to 300s");
  assert.strictEqual(res.headers["x-robots-tag"], "index, follow");

  // Check Title & Meta
  assert(res.body.includes("<title>Coorg Weekend Trip - 2 Days / 1 Night | Traviska</title>"), "Missing dynamic title in HTML");
  assert(res.body.includes(`rel="canonical" href="https://traviska.com/trip/${realTripId}"`), "Missing canonical URL");
  assert(res.body.includes('property="og:title" content="Coorg Weekend Trip - 2 Days / 1 Night | Traviska"'), "Missing og:title");
  assert(res.body.includes(`property="og:url" content="https://traviska.com/trip/${realTripId}"`), "Missing og:url");
  assert(res.body.includes('name="twitter:card" content="summary_large_image"'), "Missing twitter:card");

  // Check Google-Readable Semantic Pre-rendered HTML inside #root
  assert(res.body.includes('<h1 style="font-size: clamp(30px, 4.5vw, 48px); font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">Coorg Weekend Trip</h1>'), "Missing semantic <h1> in #root");
  assert(res.body.includes("About This Trip"), "Missing 'About This Trip' semantic heading");
  assert(res.body.includes("Expedition Itinerary"), "Missing 'Expedition Itinerary' in initial HTML");
  assert(res.body.includes("What&#039;s Included") || res.body.includes("What's Included"), "Missing inclusions in initial HTML");
  assert(res.body.includes("Starting from ₹4,499"), "Missing formatted price in initial HTML");

  // Check pre-seeded initial state for React zero-flash mount
  assert(res.body.includes('id="__TRAVISKA_STATE__"'), "Missing pre-seeded state script for React zero-flash mount");
  assert(res.body.includes('window.__INITIAL_TRIP__ = {'), "Missing __INITIAL_TRIP__ payload");

  // Extract and validate JSON-LD
  const tripJsonLdMatch = res.body.match(/<script type="application\/ld\+json" id="route-schema">([\s\S]*?)<\/script>/);
  assert(tripJsonLdMatch, "Missing route-schema script tag");
  const tripGraph = JSON.parse(tripJsonLdMatch[1]);
  assert(tripGraph["@graph"], "Missing @graph array in trip JSON-LD");

  // Verify BreadcrumbList
  const breadcrumb = tripGraph["@graph"].find(item => item["@type"] === "BreadcrumbList");
  assert(breadcrumb, "Missing BreadcrumbList in trip JSON-LD");
  assert.strictEqual(breadcrumb.itemListElement.length, 3);
  assert.strictEqual(breadcrumb.itemListElement[0].name, "Home");
  assert.strictEqual(breadcrumb.itemListElement[1].name, "Trips");
  assert.strictEqual(breadcrumb.itemListElement[2].name, "Coorg Weekend Trip");
  assert.strictEqual(breadcrumb.itemListElement[2].item, `https://traviska.com/trip/${realTripId}`);

  // Verify TouristTrip
  const touristTrip = tripGraph["@graph"].find(item => item["@type"] === "TouristTrip");
  assert(touristTrip, "Missing TouristTrip schema in trip JSON-LD");
  assert.strictEqual(touristTrip.name, "Coorg Weekend Trip");
  assert.strictEqual(touristTrip.touristType, "Group Travel");
  assert.strictEqual(touristTrip.offers.price, 4499);
  assert.strictEqual(touristTrip.offers.priceCurrency, "INR");
  // Ensure unverified / invented properties are NOT present
  assert.strictEqual(touristTrip.offers.availability, undefined, "availability must NOT be hardcoded");
  assert.strictEqual(touristTrip.offers.validFrom, undefined, "validFrom must NOT be hardcoded");
  assert.strictEqual(touristTrip.aggregateRating, undefined, "aggregateRating must NOT be invented");

  console.log("✓ Valid trip returns HTTP 200 with bounded edge cache, zero-flash state, and strictly verified TouristTrip + BreadcrumbList JSON-LD!");
}

// 5. Test Internal Linking & Crawlability
console.log("\n--- TEST 5: Internal Linking Crawlability ---");
const homeCode = fs.readFileSync(path.resolve("src/pages/Home.tsx"), "utf-8");
const tripsCode = fs.readFileSync(path.resolve("src/pages/Trips.tsx"), "utf-8");
const tripDetailsCode = fs.readFileSync(path.resolve("src/pages/TripDetails.tsx"), "utf-8");

assert(homeCode.includes('<Link\n                to="/trips"\n                className="popular-view-all-btn"') || homeCode.includes('to="/trips"'), "Home must contain <Link to=\"/trips\">");
assert(homeCode.includes('to={`/trip/${trip._id}`}') || homeCode.includes('to={`/trip/${e._id}`}'), "Home trip cards must use native <Link to={`/trip/:id`}>");
assert(tripsCode.includes('to={`/trip/${trip._id}`}'), "Trips catalogue cards must use native <Link to={`/trip/:id`}>");
assert(tripDetailsCode.includes('to="/trips" className="trip-back-btn"'), "TripDetails error screen must use <Link to=\"/trips\">");

console.log("✓ Internal links use crawlable React Router <Link> components (rendering standard <a href> in the DOM)!");

// 6. Test Safe JSON Serialization & Script Breakout Prevention
console.log("\n--- TEST 6: Safe Serialization & Script Breakout Resistance ---");
const maliciousPayload = {
  title: "Malicious Trip",
  description: "</script><script>alert('XSS')</script> & ' <img src=x onerror=alert(1)>",
  lineBreaks: "Line 1\u2028Line 2\u2029Line 3"
};

const serialized = safeJsonStringify(maliciousPayload);

// Must NOT contain literal </script> or <script>
assert(!serialized.includes("</script>"), "Serialized output must NOT contain literal </script>");
assert(!serialized.includes("<script>"), "Serialized output must NOT contain literal <script>");
assert(!serialized.includes("<"), "Serialized output must NOT contain literal <");
assert(!serialized.includes(">"), "Serialized output must NOT contain literal >");
assert(!serialized.includes("\u2028"), "Serialized output must NOT contain literal Unicode U+2028");
assert(!serialized.includes("\u2029"), "Serialized output must NOT contain literal Unicode U+2029");

// When parsed by a JS engine, it must correctly reconstruct the original value
const parsedBack = JSON.parse(serialized);
assert.strictEqual(parsedBack.description, maliciousPayload.description, "JSON.parse must faithfully restore the original value");
assert.strictEqual(parsedBack.lineBreaks, maliciousPayload.lineBreaks);

console.log("✓ State and JSON-LD serialization safely neutralizes </script> sequences, < > & characters, and Unicode line separators!");

console.log("\n=================================================");
console.log("✓ ALL 6 PHASE 2 AUTOMATED SEO TEST SUITES PASSED!");
console.log("=================================================");
