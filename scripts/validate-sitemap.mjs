import https from "node:https";

const BASE_URL = "https://traviska.com";
const BACKEND_URL = "https://traviska-backend.onrender.com";

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
          }
        });
      })
      .on("error", reject);
  });
}

async function validate() {
  console.log("🔍 Fetching live published trips from Render backend...");
  const trips = await fetchJson(`${BACKEND_URL}/trips`);
  console.log(`✅ Received ${trips.length} trips.`);

  const staticRoutes = [
    { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${BASE_URL}/trips`, priority: "0.9", changefreq: "daily" },
    { loc: `${BASE_URL}/about`, priority: "0.7", changefreq: "monthly" },
    { loc: `${BASE_URL}/contact`, priority: "0.7", changefreq: "monthly" },
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
    xml += `    <loc>${BASE_URL}/trip/${trip._id}</loc>\n`;
    xml += `    <lastmod>${lastmod}</lastmod>\n`;
    xml += `    <changefreq>weekly</changefreq>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  // 1. Basic XML Well-Formedness
  if (!xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    throw new Error("Missing XML declaration");
  }
  if (!xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
    throw new Error("Missing sitemap namespace urlset tag");
  }
  if (!xml.endsWith("</urlset>")) {
    throw new Error("Missing closing </urlset> tag");
  }

  // Count open and close tags
  const openUrlCount = (xml.match(/<url>/g) || []).length;
  const closeUrlCount = (xml.match(/<\/url>/g) || []).length;
  if (openUrlCount !== closeUrlCount) {
    throw new Error(`Mismatched <url> tags: ${openUrlCount} open vs ${closeUrlCount} close`);
  }

  console.log(`✅ XML structure verified: well-formed with ${openUrlCount} URL entries.`);
  console.log(`   - 4 Static URLs: /, /trips, /about, /contact`);
  console.log(`   - ${trips.length} Dynamic Trip URLs:`);
  for (const trip of trips) {
    console.log(`     * ${BASE_URL}/trip/${trip._id} (${trip.title || "Untitled"})`);
  }

  return xml;
}

validate().catch((err) => {
  console.error("❌ Sitemap validation error:", err.message);
  process.exit(1);
});
