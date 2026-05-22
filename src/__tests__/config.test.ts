import { afterEach, beforeEach, expect, test, vi } from "vitest";

const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const originalLegacyApiBase = process.env.EXT_PUBLIC_DOCUDENT_API_BASE_URL;

beforeEach(() => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.nulanesystems.com/api";
  delete process.env.EXT_PUBLIC_DOCUDENT_API_BASE_URL;
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

afterEach(() => {
  process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
  process.env.EXT_PUBLIC_DOCUDENT_API_BASE_URL = originalLegacyApiBase;
});
