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

describe("24-hour inspection access", () => {
  test("shows the tab for portal users regardless of SHAP assignment", () => {
    const shapSections = filterNavSectionsByAccess(navSections, buildAccessInfo({ isShap: true }));
    const otherFacilitySections = filterNavSectionsByAccess(navSections, buildAccessInfo({ isShap: false }));

    expect(shapSections.flatMap((section) => section.items.map((item) => item.href))).toContain("/inspection/24-hour");
    expect(otherFacilitySections.flatMap((section) => section.items.map((item) => item.href))).toContain("/inspection/24-hour");
  });

  test("allows direct access without a SHAP facility", () => {
    const route = getRouteByPath("/inspection/24-hour");

    expect(getAccessBarrier(route, buildAccessInfo({ isShap: true }))).toBeNull();
    expect(getAccessBarrier(route, buildAccessInfo({ isShap: false }))).toBeNull();
  });
});
