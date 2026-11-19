import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const masterPath = "/Users/shailesh/.gemini/antigravity/brain/89617d9a-d241-4f96-a207-6bb5b4778bcc/inspect_favicon_flipped_v.png";
const publicDir = "public";

console.log("Generating upright favicons from master:", masterPath);

// 1. Copy 512x512 master
fs.copyFileSync(masterPath, path.join(publicDir, "favicon-512x512.png"));
console.log("✅ Created public/favicon-512x512.png");

// Helper to resize with sips
function resizePng(width, height, outName) {
  const outPath = path.join(publicDir, outName);
  execSync(`sips -z ${height} ${width} "${masterPath}" --out "${outPath}"`);
  console.log(`✅ Created public/${outName} (${width}x${height})`);
  return fs.readFileSync(outPath);
}

const b192 = resizePng(192, 192, "favicon-192x192.png");
const b180 = resizePng(180, 180, "apple-touch-icon.png");
const b48 = resizePng(48, 48, "favicon-48x48.png");
const b32 = resizePng(32, 32, "favicon-32x32.png");
const b16 = resizePng(16, 16, "favicon-16x16.png");

// Copy 48x48 as favicon.png
fs.copyFileSync(path.join(publicDir, "favicon-48x48.png"), path.join(publicDir, "favicon.png"));
console.log("✅ Created public/favicon.png");

// Build multi-size favicon.ico with 16, 32, 48 PNG frames
function buildIco(frames) {
  const count = frames.length;
  const headerSize = 6;
  const entrySize = 16;
  let offset = headerSize + count * entrySize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // Icon type = 1
  header.writeUInt16LE(count, 4); // Number of images

  const entries = [];
  for (const f of frames) {
    const entry = Buffer.alloc(entrySize);
    entry.writeUInt8(f.width >= 256 ? 0 : f.width, 0);
    entry.writeUInt8(f.height >= 256 ? 0 : f.height, 1);
    entry.writeUInt8(0, 2); // Palette
    entry.writeUInt8(0, 3); // Reserved
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // Bits per pixel
    entry.writeUInt32LE(f.data.length, 8); // Image size in bytes
    entry.writeUInt32LE(offset, 12); // Offset of image data
    entries.push(entry);
    offset += f.data.length;
  }

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

const icoBuffer = buildIco([
  { width: 16, height: 16, data: b16 },
  { width: 32, height: 32, data: b32 },
  { width: 48, height: 48, data: b48 },
]);
fs.writeFileSync(path.join(publicDir, "favicon.ico"), icoBuffer);
console.log("✅ Created public/favicon.ico (multi-resolution 16x16, 32x32, 48x48)");

// Generate upright favicon.svg
const b512Base64 = fs.readFileSync(path.join(publicDir, "favicon-512x512.png")).toString("base64");
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <image href="data:image/png;base64,${b512Base64}" width="512" height="512"/>
</svg>
`;
fs.writeFileSync(path.join(publicDir, "favicon.svg"), svgContent);
console.log("✅ Created public/favicon.svg (upright SVG wrapper)");

console.log("\nAll favicon assets generated successfully!");

