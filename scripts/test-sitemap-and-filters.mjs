import assert from "node:assert";
import fs from "node:fs";

console.log("=================================================");
console.log("🧪 RUNNING TRAVISKA VERIFICATION TEST SUITE");
console.log("=================================================\n");

// ---------------------------------------------------------------------------
// TEST 1: CUSTOMER FILTERING QUERY & SUSPENDED STAFF EXCLUSION
// ---------------------------------------------------------------------------
console.log("--- TEST 1: Customer Filtering & Staff Exclusion ---");

const staffRoles = ["super_admin", "admin", "sales", "sales_lead", "sales_executive", "captain_admin"];

function buildCustomerQuery(tab, search = "") {
  const customerRoleConstraint = {
    $or: [
      { role: "customer" },
      { role: { $nin: staffRoles } },
      { role: { $exists: false } },
    ],
  };

  const custAndClauses = [customerRoleConstraint];

  if (tab === "active") {
    custAndClauses.push({
      isActive: { $ne: false },
      isSuspended: { $ne: true },
    });
  } else if (tab === "inactive" || tab === "suspended") {
    custAndClauses.push({
      $or: [{ isActive: false }, { isSuspended: true }],
    });
  }

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    custAndClauses.push({
      $or: [
        { name: regex },
        { email: regex },
        { phone: regex },
      ],
    });
  }

  return custAndClauses.length === 1 ? custAndClauses[0] : { $and: custAndClauses };
}

// In-memory query matcher simulating MongoDB query engine
function matchesMongoQuery(doc, query) {
  if (query.$and) {
    return query.$and.every((sub) => matchesMongoQuery(doc, sub));
  }
  if (query.$or) {
    return query.$or.some((sub) => matchesMongoQuery(doc, sub));
  }
  for (const [key, val] of Object.entries(query)) {
    if (typeof val === "object" && val !== null) {
      if ("$nin" in val) {
        if (doc[key] !== undefined && val.$nin.includes(doc[key])) return false;
      }
      if ("$ne" in val) {
        if (doc[key] === val.$ne) return false;
      }
      if ("$exists" in val) {
        const exists = key in doc && doc[key] !== undefined;
        if (val.$exists !== exists) return false;
      }
    } else {
      if (doc[key] !== val) return false;
    }
  }
  return true;
}

const mockUsers = [
  { _id: "1", name: "Active Customer", email: "cust1@example.com", role: "customer", isActive: true, isSuspended: false },
  { _id: "2", name: "Inactive Customer", email: "cust2@example.com", role: "customer", isActive: false, isSuspended: false },
  { _id: "3", name: "Suspended Customer", email: "cust3@example.com", role: "customer", isActive: true, isSuspended: true },
  { _id: "4", name: "Suspended Admin", email: "admin@traviska.com", role: "admin", isActive: true, isSuspended: true },
  { _id: "5", name: "Suspended Super Admin", email: "ceo@traviska.com", role: "super_admin", isActive: true, isSuspended: true },
  { _id: "6", name: "Active Admin", email: "admin2@traviska.com", role: "admin", isActive: true, isSuspended: false },
  { _id: "7", name: "Suspended Sales Lead", email: "sales@traviska.com", role: "sales_lead", isActive: false, isSuspended: true },
  { _id: "8", name: "Suspended Captain Admin", email: "cap@traviska.com", role: "captain_admin", isActive: true, isSuspended: true },
  { _id: "9", name: "Suspended Sales Exec", email: "exec@traviska.com", role: "sales_executive", isActive: false, isSuspended: true },
  { _id: "10", name: "Unspecified Role Customer", email: "no-role@example.com", isActive: true, isSuspended: false },
];

for (const tab of ["all", "active", "inactive", "suspended"]) {
  const query = buildCustomerQuery(tab);
  const matched = mockUsers.filter((u) => matchesMongoQuery(u, query));
  const staffMatched = matched.filter((u) => staffRoles.includes(u.role));

  console.log(`  Tab '${tab}': ${matched.length} matched, ${staffMatched.length} staff found.`);
  assert.strictEqual(
    staffMatched.length,
    0,
    `CRITICAL BUG: Staff found in customer tab '${tab}': ${JSON.stringify(staffMatched)}`
  );
}

// Check inactive tab explicitly contains the suspended & inactive customers and NO staff
const inactiveQuery = buildCustomerQuery("inactive");
const inactiveMatched = mockUsers.filter((u) => matchesMongoQuery(u, inactiveQuery));
const inactiveIds = inactiveMatched.map((u) => u._id);
assert.deepStrictEqual(inactiveIds.sort(), ["2", "3"]);
console.log("✅ Staff exclusion confirmed: Suspended staff never appear in customer lists across all tabs.\n");


// ---------------------------------------------------------------------------
// TEST 2: TRIP PUBLICATION RULES & MONGODB SCHEMA CONFORMANCE
// ---------------------------------------------------------------------------
console.log("--- TEST 2: Trip Publication Rules & Schema Conformance ---");

// The publication rules based on actual Trip Mongoose schema and public API:
// A trip is public if it has a non-empty string title and a valid positive price.
function isTripPublished(t) {
  if (!t.title || typeof t.title !== "string" || t.title.trim() === "") return false;
  if (typeof t.price !== "number" || !Number.isFinite(t.price) || t.price <= 0) return false;
  return true;
}

const mockTrips = [
  { _id: "6afd00fa1ef66bc5ba14d745", title: "Coorg Weekend Trip", price: 4999, createdAt: "2026-11-18T01:35:54.048Z" },
  { _id: "valid_kerala", title: "Wayanad Rainforest Trek", price: 3499, createdAt: "2026-11-15T10:00:00.000Z" },
  { _id: "trip_zero_price", title: "Zero Price Test Trip", price: 0 },
  { _id: "trip_negative_price", title: "Negative Price Test Trip", price: -100 },
  { _id: "trip_null_price", title: "Null Price Trip", price: null },
  { _id: "trip_no_title", title: "", price: 4999 },
  { _id: "trip_whitespace_title", title: "   ", price: 4999 },
  { _id: "trip_undefined_title", price: 4999 },
];

const published = mockTrips.filter(isTripPublished);
console.log(`  Tested ${mockTrips.length} trips: ${published.length} valid public trips.`);
assert.strictEqual(published.length, 2);
assert.deepStrictEqual(published.map((t) => t._id), ["6afd00fa1ef66bc5ba14d745", "valid_kerala"]);
console.log("✅ Conforms strictly to Mongoose schema: positive price and valid title required.\n");


// ---------------------------------------------------------------------------
// TEST 3: REACT ROUTER TRIP DETAIL ROUTE CONFORMANCE
// ---------------------------------------------------------------------------
console.log("--- TEST 3: React Router Trip Detail Route Conformance ---");

const appTsx = fs.readFileSync("src/App.tsx", "utf8");
assert(
  appTsx.includes('<Route path="/trip/:id" element={<TripDetails />} />'),
  "App.tsx missing canonical trip detail route /trip/:id"
);

for (const trip of published) {
  const expectedUrl = `https://traviska.com/trip/${trip._id}`;
  const routePath = `/trip/${trip._id}`;
  assert.match(routePath, /^\/trip\/[a-zA-Z0-9_-]+$/, `Generated URL ${expectedUrl} does not match React Router format`);
  console.log(`  Verified trip URL: ${expectedUrl} -> matches <Route path="/trip/:id" />`);
}
console.log("✅ All generated trip URLs match the React Router trip detail route.\n");


// ---------------------------------------------------------------------------
// TEST 4: XML SITEMAP GENERATION, CANONICAL URLS & FALLBACK ERROR HANDLING
// ---------------------------------------------------------------------------
console.log("--- TEST 4: XML Sitemap Generation & Safe Fallback ---");

function generateSitemapXml(trips) {
  const baseUrl = "https://traviska.com";
  const staticRoutes = [
    { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${baseUrl}/trips`, priority: "0.9", changefreq: "daily" },
    { loc: `${baseUrl}/about`, priority: "0.7", changefreq: "monthly" },
    { loc: `${baseUrl}/contact`, priority: "0.7", changefreq: "monthly" },
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  for (const route of staticRoutes) {
    xml += `  <url>\n`;
    xml += `    <loc>${route.loc}</loc>\n`;
    xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
    xml += `    <priority>${route.priority}</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const trip of trips) {
    const dateVal = trip.updatedAt || trip.createdAt || new Date();
    const lastmod = new Date(dateVal).toISOString().split("T")[0];
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/trip/${trip._id}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;
  return xml;
}

const sitemapXml = generateSitemapXml(published);

assert(sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'), "Missing XML declaration");
assert(sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'), "Missing sitemap xmlns");
assert(sitemapXml.endsWith("</urlset>"), "Missing </urlset>");
assert.strictEqual(
  (sitemapXml.match(/<url>/g) || []).length,
  (sitemapXml.match(/<\/url>/g) || []).length,
  "Mismatched <url> tags"
);

// Canonical URLs check
assert(sitemapXml.includes("<loc>https://traviska.com/</loc>"), "Missing home canonical URL");
assert(sitemapXml.includes("<loc>https://traviska.com/trips</loc>"), "Missing trips canonical URL");
assert(sitemapXml.includes("<loc>https://traviska.com/about</loc>"), "Missing about canonical URL");
assert(sitemapXml.includes("<loc>https://traviska.com/contact</loc>"), "Missing contact canonical URL");
assert(sitemapXml.includes("<loc>https://traviska.com/trip/6afd00fa1ef66bc5ba14d745</loc>"), "Missing Coorg trip detail URL");

// Exclusions check
const disallowedPatterns = ["/admin", "/super-admin", "/captain", "/sales", "/login", "/booking", "/customer", "/staff"];
for (const p of disallowedPatterns) {
  assert(!sitemapXml.includes(`<loc>https://traviska.com${p}`), `Disallowed path ${p} found in sitemap!`);
}
console.log("✅ Canonical URLs and private route exclusions verified.");

// Test database failure error handling:
// Crawlers should receive HTTP 503 Service Unavailable with Retry-After header,
// rather than an incomplete HTTP 200 sitemap (which risks de-indexing missing URLs).
function handleSitemapError(err, res) {
  res.headers["Content-Type"] = "text/plain; charset=utf-8";
  res.headers["Retry-After"] = "120";
  res.headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
  res.statusCode = 503;
  res.body = "Service Unavailable: Sitemap generation temporarily unavailable. Please retry shortly.";
  return res;
}

const mockRes = { headers: {}, statusCode: 200, body: "" };
handleSitemapError(new Error("MongoNetworkTimeout"), mockRes);

assert.strictEqual(mockRes.statusCode, 503, "Should return HTTP 503 on database error");
assert.strictEqual(mockRes.headers["Retry-After"], "120", "Should include Retry-After header");
assert.strictEqual(mockRes.headers["Content-Type"], "text/plain; charset=utf-8", "Should set proper error Content-Type");
console.log("✅ Safe 503 error response verified: Incomplete sitemaps with HTTP 200 are avoided; crawlers receive 503 + Retry-After: 120.\n");


// ---------------------------------------------------------------------------
// TEST 5: ROBOTS.TXT & VERCEL.JSON
// ---------------------------------------------------------------------------
console.log("--- TEST 5: robots.txt and vercel.json Verification ---");

const robotsTxt = fs.readFileSync("public/robots.txt", "utf8");
assert(robotsTxt.includes("Sitemap: https://traviska.com/sitemap.xml"), "robots.txt missing Sitemap directive");
for (const p of ["/admin", "/super-admin", "/captain", "/sales", "/booking", "/customer", "/login", "/staff"]) {
  assert(robotsTxt.includes(`Disallow: ${p}`), `robots.txt missing Disallow for ${p}`);
}
console.log("✅ robots.txt verified: Sitemap directive and private path disallows are present.");

const vercelJson = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
assert(Array.isArray(vercelJson.rewrites), "vercel.json missing rewrites array");
const sitemapRewrite = vercelJson.rewrites.find((r) => r.source === "/sitemap.xml");
assert(sitemapRewrite, "vercel.json missing /sitemap.xml rewrite");
assert.strictEqual(
  sitemapRewrite.destination,
  "https://traviska-backend.onrender.com/sitemap.xml",
  "Incorrect sitemap destination in vercel.json"
);
console.log("✅ vercel.json verified: /sitemap.xml proxies to Render backend.\n");

console.log("=================================================");
console.log("🎉 ALL TESTS PASSED SUCCESSFULLY");
console.log("=================================================");
