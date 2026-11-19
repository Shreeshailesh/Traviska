import fs from "node:fs";
import path from "node:path";

const DEFAULT_IMAGE = "https://traviska.com/favicon-512x512.png";
const BACKEND_BASE = "https://traviska-backend.onrender.com";

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Safely serializes objects for embedding directly inside HTML <script> tags.
 * Escapes HTML-sensitive characters and Unicode line separators to prevent script breakouts.
 */
export function safeJsonStringify(obj, space = 0) {
  return JSON.stringify(obj, null, space)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

let cachedTemplate = null;

function getTemplate() {
  if (cachedTemplate) return cachedTemplate;
  const candidates = [
    path.join(process.cwd(), "api", "_template.html"),
    path.join(process.cwd(), "dist", "index.html"),
    path.join(process.cwd(), "index.html"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cachedTemplate = fs.readFileSync(p, "utf-8");
        return cachedTemplate;
      }
    } catch {}
  }

  // Fallback HTML shell if no template file exists
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Traviska</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>`;
}

function buildNotFoundHtml(template, id) {
  const safeId = escapeHtml(id);
  const title = "Trip Not Found | Traviska";
  const desc = "The requested trip package could not be found or is no longer available. Explore our upcoming weekend trips and getaways from Bangalore.";
  
  let html = template;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${desc}" />`);
  html = html.replace(/<meta name="robots" content=".*?" \/>/i, `<meta name="robots" content="noindex, follow" />`);
  html = html.replace(/<link rel="canonical" href=".*?" \/>/i, "");

  const bodyContent = `
    <div style="min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; font-family: sans-serif; background: #060d08; color: #ffffff;">
      <h1 style="font-size: 32px; font-weight: 800; margin-bottom: 12px; color: #a8e063;">Trip Not Found</h1>
      <p style="color: #94a3b8; font-size: 16px; max-width: 480px; margin-bottom: 28px; line-height: 1.6;">The trip journey you are looking for (ID: ${safeId}) does not exist, has expired, or has been removed.</p>
      <a href="/trips" style="display: inline-block; background: #14351a; border: 1.5px solid rgba(168, 224, 99, 0.4); color: #ffffff; padding: 12px 28px; border-radius: 25px; text-decoration: none; font-weight: 700;">Browse All Trips &rarr;</a>
    </div>
  `;

  html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  return html;
}

function buildErrorHtml(template, message) {
  const safeMsg = escapeHtml(message);
  let html = template;
  html = html.replace(/<title>.*?<\/title>/i, `<title>Service Unavailable | Traviska</title>`);
  html = html.replace(/<meta name="robots" content=".*?" \/>/i, `<meta name="robots" content="noindex, nofollow" />`);
  html = html.replace(/<link rel="canonical" href=".*?" \/>/i, "");

  const bodyContent = `
    <div style="min-height: 80vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px 20px; font-family: sans-serif; background: #060d08; color: #ffffff;">
      <h1 style="font-size: 28px; font-weight: 800; margin-bottom: 12px; color: #e2e8f0;">Service Temporarily Unavailable</h1>
      <p style="color: #94a3b8; font-size: 15px; max-width: 460px; margin-bottom: 24px; line-height: 1.6;">${safeMsg}. Please retry in a few moments.</p>
      <a href="/trips" style="display: inline-block; background: #14351a; border: 1.5px solid rgba(168, 224, 99, 0.4); color: #ffffff; padding: 10px 24px; border-radius: 25px; text-decoration: none; font-weight: 600;">Back to Trips &rarr;</a>
    </div>
  `;

  html = html.replace('<div id="root"></div>', `<div id="root">${bodyContent}</div>`);
  return html;
}

export default async function handler(req, res) {
  // Extract ID from query or URL path fallback
  let id = req.query?.id;
  if (!id && req.url) {
    const match = req.url.match(/\/trip\/([a-fA-F0-9]{24})/);
    if (match) id = match[1];
  }

  // 1. Validate ID format (MongoDB ObjectId is exactly 24 hex characters)
  if (!id || !/^[0-9a-fA-F]{24}$/.test(String(id))) {
    const template = getTemplate();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Short 60s cache for invalid IDs
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.setHeader("X-Robots-Tag", "noindex, follow");
    return res.status(404).send(buildNotFoundHtml(template, id || "invalid"));
  }

  // 2. Fetch trip from Render backend API with a resilient timeout
  let trip = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const apiRes = await fetch(`${BACKEND_BASE}/trips/${id}`, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (apiRes.status === 404) {
      const template = getTemplate();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      // Short 60s cache for 404s so newly created trips show up quickly
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
      res.setHeader("X-Robots-Tag", "noindex, follow");
      return res.status(404).send(buildNotFoundHtml(template, id));
    }

    if (!apiRes.ok) {
      throw new Error(`Backend returned status ${apiRes.status}`);
    }

    trip = await apiRes.json();
  } catch (err) {
    console.error("Trip SSR Error:", err.message);
    const template = getTemplate();
    // NEVER cache temporary backend failures
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Retry-After", "30");
    return res.status(503).send(buildErrorHtml(template, "We are experiencing a temporary connection issue"));
  }

  if (!trip || !trip.title) {
    const template = getTemplate();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
    res.setHeader("X-Robots-Tag", "noindex, follow");
    return res.status(404).send(buildNotFoundHtml(template, id));
  }

  // 3. Construct Dynamic Metadata strictly from verified fields
  const cleanTitle = trip.title.trim();
  const cleanDuration = (trip.duration || "").trim();
  const cleanLocation = (trip.location || "").trim();
  const cleanPrice = Number(trip.price || 0);

  // Construct SEO title
  let seoTitle = cleanTitle;
  if (cleanDuration) {
    seoTitle = `${cleanTitle} - ${cleanDuration} | Traviska`;
  } else if (cleanLocation && !cleanTitle.toLowerCase().includes(cleanLocation.toLowerCase())) {
    seoTitle = `${cleanTitle} - ${cleanLocation} | Traviska`;
  } else {
    seoTitle = `${cleanTitle} | Traviska`;
  }

  // Construct SEO description
  let seoDesc = "";
  if (trip.description && trip.description.trim().length > 30) {
    const normalized = trip.description.replace(/\s+/g, " ").trim();
    seoDesc = normalized.length <= 155 ? normalized : normalized.slice(0, 152) + "...";
  } else {
    const durTxt = cleanDuration ? ` ${cleanDuration} journey` : " trip";
    const locTxt = cleanLocation ? ` in ${cleanLocation}` : "";
    const prcTxt = cleanPrice > 0 ? ` starting from ₹${cleanPrice.toLocaleString("en-IN")}` : "";
    seoDesc = `Explore ${cleanTitle}, a curated${durTxt}${locTxt} with Traviska${prcTxt}. View full itinerary, guidelines, and book your slot.`;
  }

  const canonicalUrl = `https://traviska.com/trip/${id}`;
  const ogImage = (trip.image && trip.image.startsWith("https://")) ? trip.image : DEFAULT_IMAGE;

  // 4. Construct JSON-LD Structured Data (Strictly verified facts only)
  // NOTE: InStock, validFrom, ratings and reviews are NOT invented
  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://traviska.com/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Trips",
            "item": "https://traviska.com/trips"
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": cleanTitle,
            "item": canonicalUrl
          }
        ]
      },
      {
        "@type": "TouristTrip",
        "@id": `${canonicalUrl}#trip`,
        "name": cleanTitle,
        "description": seoDesc,
        "url": canonicalUrl,
        "image": ogImage,
        "touristType": "Group Travel",
        "provider": {
          "@type": ["Organization", "TravelAgency"],
          "@id": "https://traviska.com/#organization",
          "name": "Traviska",
          "url": "https://traviska.com"
        },
        ...(cleanLocation ? {
          "contentLocation": {
            "@type": "Place",
            "name": cleanLocation
          }
        } : {}),
        ...(cleanPrice > 0 ? {
          "offers": {
            "@type": "Offer",
            "price": cleanPrice,
            "priceCurrency": "INR",
            "url": canonicalUrl
          }
        } : {})
      }
    ]
  };

  // 5. Construct Google-Readable Semantic Pre-rendered Content
  const itinerarySnippet = trip.itinerary ? `
    <div class="trip-card-box" style="margin-top: 24px; padding: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #a8e063; margin-bottom: 12px;">Expedition Itinerary</h2>
      <div style="color: #cbd5e1; line-height: 1.7; font-size: 15px; white-space: pre-line;">${escapeHtml(trip.itinerary)}</div>
    </div>
  ` : "";

  const highlightsSnippet = trip.highlights ? `
    <div class="trip-card-box" style="margin-top: 24px; padding: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #a8e063; margin-bottom: 12px;">Trip Highlights</h2>
      <div style="color: #cbd5e1; line-height: 1.7; font-size: 15px; white-space: pre-line;">${escapeHtml(trip.highlights)}</div>
    </div>
  ` : "";

  const inclusionsSnippet = trip.inclusions ? `
    <div class="trip-card-box" style="margin-top: 24px; padding: 24px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #a8e063; margin-bottom: 12px;">What's Included</h2>
      <div style="color: #cbd5e1; line-height: 1.7; font-size: 15px; white-space: pre-line;">${escapeHtml(trip.inclusions)}</div>
    </div>
  ` : "";

  const semanticHtml = `
    <div class="trip-details-page-wrap" style="color: #ffffff; background: #060d08; min-height: 100vh;">
      <section class="trip-hero-banner" style="position: relative; padding: 120px 24px 60px; background: linear-gradient(180deg, rgba(6,13,8,0.7) 0%, #060d08 100%);">
        <div style="max-width: 1200px; margin: 0 auto;">
          <a href="/trips" style="display: inline-flex; align-items: center; gap: 8px; color: #a8e063; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 20px;">&larr; Back to Trips</a>
          <h1 style="font-size: clamp(30px, 4.5vw, 48px); font-weight: 800; margin: 0 0 12px; letter-spacing: -0.5px;">${escapeHtml(cleanTitle)}</h1>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 24px;">
            <span style="color: #cbd5e1; font-size: 16px;">📍 ${escapeHtml(cleanLocation || "Scenic Expedition")}</span>
            <span style="background: rgba(168, 224, 99, 0.15); border: 1px solid rgba(168, 224, 99, 0.3); color: #a8e063; padding: 6px 16px; border-radius: 20px; font-weight: 700; font-size: 14px;">Starting from ₹${cleanPrice.toLocaleString("en-IN")}</span>
          </div>
        </div>
      </section>

      <main style="max-width: 1200px; margin: 0 auto; padding: 0 24px 80px;">
        <div class="trip-card-box" style="padding: 28px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;">
          <h2 style="font-size: 22px; font-weight: 700; color: #ffffff; margin-bottom: 14px;">About This Trip</h2>
          <p style="color: #cbd5e1; font-size: 16px; line-height: 1.75; margin: 0 0 20px;">${escapeHtml(trip.description || "Experience the misty hills, lush forests, and serene landscapes with Traviska.")}</p>
          <div style="display: flex; gap: 24px; color: #94a3b8; font-size: 15px;">
            <span>⏱️ <strong>${escapeHtml(cleanDuration || "Curated Adventure")}</strong></span>
            <span>📍 <strong>${escapeHtml(cleanLocation || "Karnataka")}</strong></span>
          </div>
        </div>

        ${itinerarySnippet}
        ${highlightsSnippet}
        ${inclusionsSnippet}
      </main>
    </div>
  `;

  // Safe serialized public trip object for React zero-flash mounting
  const publicTripData = {
    _id: String(trip._id),
    title: String(trip.title || ""),
    location: String(trip.location || ""),
    duration: String(trip.duration || ""),
    price: Number(trip.price || 0),
    image: String(trip.image || ""),
    photos: Array.isArray(trip.photos) ? trip.photos : [],
    description: String(trip.description || ""),
    itinerary: String(trip.itinerary || ""),
    highlights: String(trip.highlights || ""),
    inclusions: String(trip.inclusions || ""),
    exclusions: String(trip.exclusions || ""),
    slots: Array.isArray(trip.slots) ? trip.slots : [],
  };

  // 6. Inject Metadata, Content, and Pre-seeded Initial State into Template
  const template = getTemplate();
  let html = template;

  // Title
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(seoTitle)}</title>`);

  // Meta Description
  html = html.replace(
    /<meta name="description" content=".*?" \/>/i,
    `<meta name="description" content="${escapeHtml(seoDesc)}" />`
  );

  // Canonical
  html = html.replace(
    /<link rel="canonical" href=".*?" \/>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // Robots
  html = html.replace(
    /<meta name="robots" content=".*?" \/>/i,
    `<meta name="robots" content="index, follow" />`
  );

  // Open Graph
  html = html.replace(
    /<meta property="og:title" content=".*?" \/>/i,
    `<meta property="og:title" content="${escapeHtml(seoTitle)}" />`
  );
  html = html.replace(
    /<meta property="og:description" content=".*?" \/>/i,
    `<meta property="og:description" content="${escapeHtml(seoDesc)}" />`
  );
  html = html.replace(
    /<meta property="og:url" content=".*?" \/>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );
  html = html.replace(
    /<meta property="og:image" content=".*?" \/>/i,
    `<meta property="og:image" content="${ogImage}" />`
  );

  // Twitter Card
  html = html.replace(
    /<meta name="twitter:card" content=".*?" \/>/i,
    `<meta name="twitter:card" content="summary_large_image" />`
  );
  html = html.replace(
    /<meta name="twitter:title" content=".*?" \/>/i,
    `<meta name="twitter:title" content="${escapeHtml(seoTitle)}" />`
  );
  html = html.replace(
    /<meta name="twitter:description" content=".*?" \/>/i,
    `<meta name="twitter:description" content="${escapeHtml(seoDesc)}" />`
  );
  html = html.replace(
    /<meta name="twitter:image" content=".*?" \/>/i,
    `<meta name="twitter:image" content="${ogImage}" />`
  );

  // Inject JSON-LD Schema with harmonized id="route-schema" (safely serialized)
  const jsonLdTag = `\n  <script type="application/ld+json" id="route-schema">\n  ${safeJsonStringify(jsonLdGraph, 2)}\n  </script>`;
  html = html.replace('</head>', `${jsonLdTag}\n</head>`);

  // Inject Pre-rendered Semantic Content into #root
  html = html.replace('<div id="root"></div>', `<div id="root">${semanticHtml}</div>`);

  // Inject Pre-seeded Window State before </body> for zero-flash React mount (safely serialized)
  const stateScript = `\n  <script id="__TRAVISKA_STATE__">window.__INITIAL_TRIP__ = ${safeJsonStringify(publicTripData)};</script>\n`;
  html = html.replace('</body>', `${stateScript}</body>`);

  // 7. Deliver Response with Bounded Edge Caching (2 min edge, 5 min stale-while-revalidate)
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
  res.setHeader("X-Robots-Tag", "index, follow");

  return res.status(200).send(html);
}
