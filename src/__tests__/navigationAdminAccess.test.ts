import { describe, expect, it } from "vitest";
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
    isAwct: false,
    isShap: false,
    isSvl: false,
    hasPermission: () => false,
    ...overrides,
  };
}

describe("administration navigation access", () => {
  it("hides the Administration section from accounts with only the broad admin signal", () => {
    const visibleSections = filterNavSectionsByAccess(
      navSections,
      buildAccessInfo({ isAdmin: true, hasPermission: () => true }),
    );

    expect(visibleSections.find((section) => section.key === "administration")).toBeUndefined();
  });

  it("blocks direct administration routes without an explicit scoped admin role", () => {
    const broadAdmin = buildAccessInfo({ isAdmin: true, hasPermission: () => true });

    expect(getAccessBarrier(getRouteByPath("/organizations"), broadAdmin)).toEqual({ type: "org-admin" });
    expect(getAccessBarrier(getRouteByPath("/facilities"), broadAdmin)).toEqual({ type: "org-admin" });
    expect(getAccessBarrier(getRouteByPath("/users"), broadAdmin)).toEqual({ type: "org-admin" });
    expect(getAccessBarrier(getRouteByPath("/email"), broadAdmin)).toEqual({ type: "org-admin" });
    expect(getAccessBarrier(getRouteByPath("/branding"), broadAdmin)).toEqual({ type: "org-admin" });
  });
});
