import { access, readFile, readdir } from "fs/promises";
import { constants } from "fs";
import path from "path";

const outDir = path.resolve("out");
const serverAppDir = path.resolve(".next", "server", "app");

async function exists(filePath) {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function assertRequiredPaths() {
  const required = ["index.html", "404.html", "join/index.html", "getting-started/index.html", "_next"];
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

async function assertServerBuild() {
  const required = [
    "index.html",
    "join.html",
    "getting-started.html",
    "api/portal/[...path]/route.js",
  ];
  const missing = [];
  for (const entry of required) {
    if (!(await exists(path.join(serverAppDir, entry)))) missing.push(entry);
  }
  if (missing.length > 0) {
    throw new Error(`Server build missing required paths: ${missing.join(", ")}`);
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

async function assertFacilityRedirect() {
  const notFoundPage = await readFile(path.join(outDir, "404.html"), "utf8");
  const requiredMarkers = ["window.location.replace", "/join/", "?facility="];
  const missingMarkers = requiredMarkers.filter((marker) => !notFoundPage.includes(marker));
  if (missingMarkers.length > 0) {
    throw new Error(`Static 404 page is missing facility redirect markers: ${missingMarkers.join(", ")}`);
  }
}

async function listRouteFolders() {
  const entries = await readdir(outDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

const hasServerRoutes = await exists(path.join(serverAppDir, "api"));
if (hasServerRoutes) {
  await assertServerBuild();
  console.log(JSON.stringify({ mode: "server", serverAppDir }, null, 2));
} else {
  await assertRequiredPaths();
  await assertPublicAssets();
  await assertFacilityRedirect();
  const routeFolders = await listRouteFolders();
  console.log(JSON.stringify({ mode: "static", outDir, routeFolders }, null, 2));
}
