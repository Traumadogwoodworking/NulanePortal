import { execFileSync } from "child_process";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const PLATFORM_PACKAGES = [
  { name: "lightningcss-linux-x64-gnu", spec: "lightningcss-linux-x64-gnu@1.32.0" },
  { name: "@tailwindcss/oxide-linux-x64-gnu", spec: "@tailwindcss/oxide-linux-x64-gnu@4.2.4" },
  { name: "lightningcss-win32-x64-msvc", spec: "lightningcss-win32-x64-msvc@1.32.0" },
  { name: "@tailwindcss/oxide-win32-x64-msvc", spec: "@tailwindcss/oxide-win32-x64-msvc@4.1.18" },
  { name: "@rollup/rollup-win32-x64-msvc", spec: "@rollup/rollup-win32-x64-msvc@4.34.8" },
];

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
  const npmCommand =
    process.platform === "win32" && process.env.npm_execpath
      ? process.execPath
      : process.platform === "win32"
        ? "npm.cmd"
        : "npm";
  const npmArgs =
    process.platform === "win32" && process.env.npm_execpath
      ? [process.env.npm_execpath, "install", "--no-save", "--force", ...packages.map((pkg) => pkg.spec)]
      : ["install", "--no-save", "--force", ...packages.map((pkg) => pkg.spec)];
  execFileSync(npmCommand, npmArgs, {
    stdio: "inherit",
  });
}

const currentPlatformPackages = PLATFORM_PACKAGES.filter((pkg) => {
  if (process.platform === "win32") {
    return pkg.name.includes("win32");
  }
  if (process.platform === "linux") {
    return pkg.name.includes("linux");
  }
  return false;
});

if (currentPlatformPackages.length > 0) {
  const missing = currentPlatformPackages.filter((pkg) => !hasPackage(pkg.name));
  installMissingPackages(missing);
}
