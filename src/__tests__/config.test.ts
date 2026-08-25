import { afterEach, beforeEach, expect, test, vi } from "vitest";

const originalApiBase = process.env.NEXT_PUBLIC_API_BASE;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const originalPortalApiBase = process.env.NEXT_PUBLIC_PORTAL_API_BASE;
const originalInspectionApiBase = process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_BASE;
const originalInspectionApiUrl = process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_URL;

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
beforeEach(() => {
  vi.resetModules();
  delete process.env.NEXT_PUBLIC_API_BASE;
  delete process.env.NEXT_PUBLIC_PORTAL_API_BASE;
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.nulanesystems.com/api";
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_BASE;
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_URL;
});

test("buildApiUrl does not duplicate the api prefix when the base already ends with /api", async () => {
  const { buildApiUrl } = await import("@/lib/config");

  expect(buildApiUrl("/report/pull?organization_id=org-1")).toBe(
    "https://api.nulanesystems.com/api/report/pull?organization_id=org-1"
  );
  expect(buildApiUrl("/api/report/pull?organization_id=org-1")).toBe(
    "https://api.nulanesystems.com/api/report/pull?organization_id=org-1"
  );
});

test("development defaults to the Definian API when no explicit base is set", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  delete process.env.NEXT_PUBLIC_API_BASE;
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_BASE;
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_URL;
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("https://api.nulanesystems.com/api");
  expect(portalConfig.usesDefaultApiBase).toBe(true);
  expect(buildApiUrl("/dashboard/home-snapshot/request")).toBe(
    "https://api.nulanesystems.com/api/dashboard/home-snapshot/request"
  );
});

test("explicit local API base overrides cannot redirect Definian away from production", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  delete process.env.NEXT_PUBLIC_API_BASE;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api";
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("https://api.nulanesystems.com/api");
  expect(portalConfig.usesDefaultApiBase).toBe(true);
  expect(buildApiUrl("/reports/list")).toBe("https://api.nulanesystems.com/api/reports/list");
});

test("NEXT_PUBLIC_API_BASE_URL cannot redirect Definian away from production", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  delete process.env.NEXT_PUBLIC_API_BASE;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3102/api";
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("https://api.nulanesystems.com/api");
  expect(portalConfig.usesDefaultApiBase).toBe(true);
  expect(buildApiUrl("/inspection/24-hour/portal-display")).toBe(
    "https://api.nulanesystems.com/api/inspection/24-hour/portal-display"
  );
});

test("legacy API environment values cannot select the same-origin proxy", async () => {
  process.env.NEXT_PUBLIC_API_BASE_URL = "/api/portal";
  vi.resetModules();
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("https://api.nulanesystems.com/api");
  expect(buildApiUrl("/user/me")).toBe("https://api.nulanesystems.com/api/user/me");
});

test("the dedicated portal API setting selects the trusted same-origin proxy", async () => {
  process.env.NEXT_PUBLIC_PORTAL_API_BASE = "/api/portal/";
  vi.resetModules();
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("/api/portal");
  expect(portalConfig.usesDefaultApiBase).toBe(false);
  expect(buildApiUrl("/user/me")).toBe("/api/portal/user/me");
  expect(buildApiUrl("/api/report/pull")).toBe("/api/portal/report/pull");
});

test("the dedicated portal API setting rejects arbitrary upstream URLs", async () => {
  process.env.NEXT_PUBLIC_PORTAL_API_BASE = "https://attacker.example/api";
  vi.resetModules();
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("https://api.nulanesystems.com/api");
  expect(portalConfig.usesDefaultApiBase).toBe(true);
  expect(buildApiUrl("/user/me")).toBe("https://api.nulanesystems.com/api/user/me");
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  restoreEnv("NEXT_PUBLIC_API_BASE", originalApiBase);
  restoreEnv("NEXT_PUBLIC_API_BASE_URL", originalApiBaseUrl);
  restoreEnv("NEXT_PUBLIC_PORTAL_API_BASE", originalPortalApiBase);
  restoreEnv("NEXT_PUBLIC_INSPECTION_TRAC_API_BASE", originalInspectionApiBase);
  restoreEnv("NEXT_PUBLIC_INSPECTION_TRAC_API_URL", originalInspectionApiUrl);
});
