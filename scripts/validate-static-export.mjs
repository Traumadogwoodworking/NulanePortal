import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const outDir = path.resolve("out");
const requiredPaths = [
  "index.html",
  "home/index.html",
  "reports/damage/index.html",
  "support/index.html",
  "settings/index.html",
  "login/index.html",
  "auth/callback/index.html",
  "media/Docudent.png",
  "media/Nulane_Systems-removebg-preview-inv.png",
  "_next",
];
const forbiddenTopLevelRoutes = [
  "analytics",
  "branding",
  "contact",
  "contact-us",
  "dashboard",
  "delivery-rules",
  "facilities",
  "get-app",
  "getting-started",
  "join",
  "organizations",
  "people",
  "resources",
  "users",
  "workflow",
];
const forbiddenCopy = [
  /Inspection[- ]Trac/i,
  /inspection-trac\.com/i,
  /\bAWCT(?:\.inc)?\b/i,
  /\bJNAP\b/i,
  /\bSHAP\b/i,
  /\bDefinian\b/i,
  /\bCircle Logistics\b/i,
];

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const missing = [];
for (const entry of requiredPaths) {
  if (!(await exists(path.join(outDir, entry)))) missing.push(entry);
}

const leakedRoutes = [];
for (const route of forbiddenTopLevelRoutes) {
  if (await exists(path.join(outDir, route))) leakedRoutes.push(route);
}

const htmlFiles = [];
async function collectHtml(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) await collectHtml(target);
    if (entry.isFile() && entry.name.endsWith(".html")) htmlFiles.push(target);
  }
}
await collectHtml(outDir);

const leakedCopy = [];
for (const file of htmlFiles) {
  const output = await readFile(file, "utf8");
  for (const pattern of forbiddenCopy) {
    if (pattern.test(output)) leakedCopy.push(`${path.relative(outDir, file)}: ${pattern}`);
  }
}

if (missing.length || leakedRoutes.length || leakedCopy.length) {
  throw new Error([
    missing.length ? `Missing required output: ${missing.join(", ")}` : "",
    leakedRoutes.length ? `Unexpected routes: ${leakedRoutes.join(", ")}` : "",
    ...leakedCopy,
  ].filter(Boolean).join("\n"));
}

console.log("DocuDent static export boundary passed.");
