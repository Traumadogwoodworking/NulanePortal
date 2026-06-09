import { access, readdir } from "fs/promises";
import { constants } from "fs";
import path from "path";

const outDir = path.resolve("out");

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function assertRequiredPaths() {
  const required = ["index.html", "_next"];
  const missing = [];
  for (const entry of required) {
    if (!(await exists(path.join(outDir, entry)))) {
      missing.push(entry);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Static export missing required paths: ${missing.join(", ")}`);
  }
}

async function assertPublicAssets() {
  const assetPaths = [
    "images/inspection-trac-logo.png",
    "media/inspection-trac-logo.png",
    "media/Docudent.png",
  ];
  const missing = [];
  for (const asset of assetPaths) {
    if (!(await exists(path.join(outDir, asset)))) {
      missing.push(asset);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Static export missing expected public assets: ${missing.join(", ")}`);
  }
}

async function listRouteFolders() {
  const entries = await readdir(outDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

await assertRequiredPaths();
await assertPublicAssets();
const routeFolders = await listRouteFolders();
console.log(JSON.stringify({ outDir, routeFolders }, null, 2));
