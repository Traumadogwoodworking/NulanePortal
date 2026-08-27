import { describe, expect, test } from "vitest";
import {
  filterNavSectionsByAccess,
  getAccessBarrier,
  getRouteByPath,
  navSections,
  type SessionAccessInfo,
} from "@/lib/navigation";

function buildAccessInfo(overrides: Partial<SessionAccessInfo> = {}): SessionAccessInfo {
  return {
    isPortalAccessAllowed: true,
    isAdmin: false,
    isOrgAdmin: false,
    isFacilityAdmin: false,
    isSuperAdmin: false,
    isAwct: true,
    isShap: false,
    isSvl: false,
    hasPermission: () => true,
    ...overrides,
  };
}

describe("SVL dashboard access", () => {
  test("removes the Dashboard tab for SVL-assigned users", () => {
    const sections = filterNavSectionsByAccess(navSections, buildAccessInfo({ isSvl: true }));
    const visiblePaths = sections.flatMap((section) => section.items.map((item) => item.href));

    expect(visiblePaths).not.toContain("/dashboard");
    expect(visiblePaths).toContain("/home");
    expect(visiblePaths).toContain("/reports/damage");
  });

  test("blocks direct Dashboard access for SVL users, including super admins", () => {
    const route = getRouteByPath("/dashboard");

    expect(getAccessBarrier(route, buildAccessInfo({ isSvl: true }))).toEqual({ type: "permission" });
    expect(getAccessBarrier(route, buildAccessInfo({ isSvl: true, isSuperAdmin: true }))).toEqual({ type: "permission" });
  });

  test("keeps the direct route available but removes Dashboard from portal navigation", () => {
    expect(getAccessBarrier(getRouteByPath("/dashboard"), buildAccessInfo())).toBeNull();
    const sections = filterNavSectionsByAccess(navSections, buildAccessInfo());
    expect(sections.flatMap((section) => section.items.map((item) => item.href))).not.toContain("/dashboard");
  });
});

describe("DocuDent product routes", () => {
  test("does not register Inspection-Trac-only RSA or 24-hour routes", () => {
    const paths = navSections.flatMap((section) => section.items.map((item) => item.href));

    expect(paths).not.toContain("/inspection/24-hour");
    expect(paths).not.toContain("/reports/rsa");
    expect(getRouteByPath("/inspection/24-hour")).toBeNull();
    expect(getRouteByPath("/reports/rsa")).toBeNull();
  });
});
