import { execFileSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const PLATFORM_PACKAGES = [
  { name: "lightningcss-win32-x64-msvc", spec: "lightningcss-win32-x64-msvc@1.32.0" },
  { name: "@tailwindcss/oxide-win32-x64-msvc", spec: "@tailwindcss/oxide-win32-x64-msvc@4.1.18" },
  { name: "@rollup/rollup-win32-x64-msvc", spec: "@rollup/rollup-win32-x64-msvc@4.34.8" },
];

function isWindows() {
  return process.platform === "win32";
}

function hasPackage(name) {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
}

function installMissingPackages(packages) {
  if (packages.length === 0) {
    return;
  }
  console.log(`[native-deps] repairing missing Windows packages: ${packages.map((pkg) => pkg.spec).join(", ")}`);
  execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--no-save", "--force", ...packages.map((pkg) => pkg.spec)], {
    stdio: "inherit",
  });
}

if (isWindows()) {
  const missing = PLATFORM_PACKAGES.filter((pkg) => !hasPackage(pkg.name));
  installMissingPackages(missing);
}
