import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const manifestPath = resolve(root, "release/definian.production.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const args = new Set(process.argv.slice(2));
const productionBuild = process.env.VERCEL_ENV === "production" || args.has("--require-env");
const requireClean = args.has("--require-clean");

const failures = [];
const requireEqual = (label, actual, expected) => {
  if (actual !== expected) failures.push(`${label} expected ${expected}, received ${actual || "<missing>"}`);
};

if (manifest.product !== "definian-portal" || manifest.environment !== "production") {
  failures.push("release manifest is not the Definian production identity");
}

const brandingSource = readFileSync(resolve(root, "src/portal/products/definian/config.ts"), "utf8");
const authSource = readFileSync(resolve(root, "src/lib/portalAuth.ts"), "utf8");
const loginSource = readFileSync(resolve(root, "src/app/login/page.tsx"), "utf8");

for (const [label, source, expected] of [
  ["branding client ID", brandingSource, manifest.auth0.clientId],
  ["branding organization", brandingSource, manifest.auth0.organizationId],
  ["Auth0 domain", authSource, manifest.auth0.domain],
  ["Auth0 audience", authSource, manifest.auth0.audience],
]) {
  if (!source.includes(expected)) failures.push(`${label} is not pinned in the expected source boundary`);
}

if (!loginSource.includes("LoginRedirectClient") || loginSource.includes("EmbeddedLoginPage")) {
  failures.push("/login is not wired to the Universal Login redirect client");
}
if (authSource.includes('prompt: "login"')) {
  failures.push("Auth0 login forces credential entry instead of allowing an existing SSO session");
}
for (const retiredPath of [
  "src/app/api/auth/embedded-login/route.ts",
  "src/portal/products/definian/auth/EmbeddedLoginPage.tsx",
  "src/portal/products/definian/auth/embeddedLoginRoute.ts",
]) {
  if (existsSync(resolve(root, retiredPath))) failures.push(`retired embedded-auth file still exists: ${retiredPath}`);
}

if (productionBuild) {
  const expectedEnvironment = {
    NEXT_PUBLIC_PORTAL_BRANDING: manifest.brandingPreset,
    NEXT_PUBLIC_API_BASE_URL: manifest.browserApiBaseUrl,
    PORTAL_API_UPSTREAM: manifest.apiUpstream,
    NEXT_PUBLIC_AUTH0_DOMAIN: manifest.auth0.domain,
    NEXT_PUBLIC_AUTH0_CLIENT_ID: manifest.auth0.clientId,
    NEXT_PUBLIC_AUTH0_AUDIENCE: manifest.auth0.audience,
    NEXT_PUBLIC_AUTH0_ORGANIZATION_ID: manifest.auth0.organizationId,
    NEXT_PUBLIC_AUTH0_REDIRECT_URI: manifest.auth0.callbackUrl,
    NEXT_PUBLIC_AUTH0_REDIRECT_MODE: "fixed"
  };
  for (const [key, expected] of Object.entries(expectedEnvironment)) {
    requireEqual(key, process.env[key], expected);
  }
}

let commit = process.env.VERCEL_GIT_COMMIT_SHA || "deployment-source-unavailable";
if (existsSync(resolve(root, ".git"))) {
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    if (requireClean) {
      const status = execFileSync("git", ["status", "--porcelain=v1", "--untracked-files=all"], {
        cwd: root,
        encoding: "utf8"
      }).trim();
      if (status) failures.push("release worktree is dirty");
    }
  } catch (error) {
    failures.push(`unable to inspect Git release state: ${error instanceof Error ? error.message : String(error)}`);
  }
} else if (requireClean) {
  failures.push("release clean-tree check requires Git metadata");
}

if (failures.length) {
  console.error(JSON.stringify({ ok: false, product: manifest.product, failures }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  product: manifest.product,
  environment: manifest.environment,
  commit,
  identity: {
    brandingPreset: manifest.brandingPreset,
    portalUrl: manifest.portalUrl,
    browserApiBaseUrl: manifest.browserApiBaseUrl,
    apiUpstream: manifest.apiUpstream,
    auth0Domain: manifest.auth0.domain,
    auth0ClientId: manifest.auth0.clientId,
    auth0Audience: manifest.auth0.audience,
    auth0OrganizationId: manifest.auth0.organizationId,
    auth0CallbackUrl: manifest.auth0.callbackUrl
  }
}, null, 2));
