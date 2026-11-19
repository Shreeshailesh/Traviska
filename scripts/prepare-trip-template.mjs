import fs from "node:fs";
import path from "node:path";

const distIndex = path.resolve("dist/index.html");
const apiTemplate = path.resolve("api/_template.html");

if (fs.existsSync(distIndex)) {
  fs.mkdirSync(path.dirname(apiTemplate), { recursive: true });
  fs.copyFileSync(distIndex, apiTemplate);
  console.log("✓ Copied dist/index.html to api/_template.html for serverless trip rendering");
} else {
  console.warn("⚠️ dist/index.html not found, cannot copy to api/_template.html");
}

