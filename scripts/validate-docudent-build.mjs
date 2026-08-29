import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const buildRoot = path.resolve(".next/server/app");
const manifestPath = path.resolve(".next/server/app-paths-manifest.json");
const forbiddenRoutes = [
  "/analytics",
  "/branding",
  "/dashboard",
  "/delivery-rules",
  "/facilities",
  "/organizations",
  "/people",
  "/resources",
  "/users",
  "/reports/rsa",
  "/inspection/24-hour",
];
const forbiddenRenderedCopy = [
  /Inspection[- ]Trac/i,
  /inspection-trac\.com/i,
  /\bAWCT(?:\.inc)?\b/i,
  /\bJNAP\b/i,
  /\bSHAP\b/i,
  /\bDefinian\b/i,
  /\bCircle Logistics\b/i,
  /\bRSA Reports?\b/i,
];

async function renderedFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return renderedFiles(target);
      return /\.(?:html|rsc)$/.test(entry.name) ? [target] : [];
    })
  );
  return files.flat();
}

const manifest = await readFile(manifestPath, "utf8");
const failures = forbiddenRoutes.filter((route) => manifest.includes(`\"${route}/page\"`));

for (const file of await renderedFiles(buildRoot)) {
  const output = await readFile(file, "utf8");
  for (const pattern of forbiddenRenderedCopy) {
    if (pattern.test(output)) failures.push(`${path.relative(process.cwd(), file)}: ${pattern}`);
  }
}

if (failures.length) {
  console.error(`DocuDent built-output boundary failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log("DocuDent built-output boundary passed.");
