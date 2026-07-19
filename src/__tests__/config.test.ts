import { afterEach, beforeEach, expect, test, vi } from "vitest";

const originalApiBase = process.env.NEXT_PUBLIC_API_BASE;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
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
  process.env.NEXT_PUBLIC_API_BASE = "https://api.nulanesystems.com/inspection-trac/api";
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_BASE;
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_URL;
});

test("buildApiUrl does not duplicate the api prefix when the base already ends with /api", async () => {
  const { buildApiUrl } = await import("@/lib/config");

  expect(buildApiUrl("/report/pull?organization_id=org-1")).toBe(
    "https://api.nulanesystems.com/inspection-trac/api/report/pull?organization_id=org-1"
  );
  expect(buildApiUrl("/api/report/pull?organization_id=org-1")).toBe(
    "https://api.nulanesystems.com/inspection-trac/api/report/pull?organization_id=org-1"
  );
});

test("development defaults to the real Inspection-Trac API when no explicit base is set", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  delete process.env.NEXT_PUBLIC_API_BASE;
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_BASE;
  delete process.env.NEXT_PUBLIC_INSPECTION_TRAC_API_URL;
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("https://api.nulanesystems.com/inspection-trac/api");
  expect(portalConfig.usesDefaultApiBase).toBe(true);
  expect(buildApiUrl("/dashboard/home-snapshot/request")).toBe(
    "https://api.nulanesystems.com/inspection-trac/api/dashboard/home-snapshot/request"
  );
});

test("explicit local API base overrides are honored", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  process.env.NEXT_PUBLIC_API_BASE = "http://localhost:4000/api";
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("http://localhost:4000/api");
  expect(portalConfig.usesDefaultApiBase).toBe(false);
  expect(buildApiUrl("/reports/list")).toBe("http://localhost:4000/api/reports/list");
});

test("the documented NEXT_PUBLIC_API_BASE_URL development override is honored", async () => {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "development");
  delete process.env.NEXT_PUBLIC_API_BASE;
  process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:3102/api";
  const { buildApiUrl, portalConfig } = await import("@/lib/config");

  expect(portalConfig.apiBase).toBe("http://localhost:3102/api");
  expect(portalConfig.usesDefaultApiBase).toBe(false);
  expect(buildApiUrl("/inspection/24-hour/portal-display")).toBe(
    "http://localhost:3102/api/inspection/24-hour/portal-display"
  );
});

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  restoreEnv("NEXT_PUBLIC_API_BASE", originalApiBase);
  restoreEnv("NEXT_PUBLIC_API_BASE_URL", originalApiBaseUrl);
  restoreEnv("NEXT_PUBLIC_INSPECTION_TRAC_API_BASE", originalInspectionApiBase);
  restoreEnv("NEXT_PUBLIC_INSPECTION_TRAC_API_URL", originalInspectionApiUrl);
});
