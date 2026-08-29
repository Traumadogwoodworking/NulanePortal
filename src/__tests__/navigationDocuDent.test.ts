import { describe, expect, test } from "vitest";
import {
  filterNavSectionsByAccess,
  getAccessBarrier,
  getRouteByPath,
  navSections,
  type SessionAccessInfo,
} from "@/lib/navigation";

const allowed: SessionAccessInfo = { isPortalAccessAllowed: true };

describe("DocuDent portal navigation", () => {
  test("exposes exactly the four review routes in the requested order", () => {
    const items = filterNavSectionsByAccess(navSections, allowed)
      .flatMap((section) => section.items)
      .map(({ label, href }) => ({ label, href }));

    expect(items).toEqual([
      { label: "Home", href: "/home" },
      { label: "Damage Submissions", href: "/reports/damage" },
      { label: "Support Tickets", href: "/support" },
      { label: "Settings", href: "/settings" },
    ]);
  });

  test("maps root to Home and rejects routes outside the product surface", () => {
    expect(getRouteByPath("/")?.href).toBe("/home");
    expect(getRouteByPath("/dashboard")).toBeNull();
    expect(getRouteByPath("/reports/other")).toBeNull();
  });

  test("blocks the operational surface without portal access", () => {
    expect(
      getAccessBarrier(getRouteByPath("/home"), { isPortalAccessAllowed: false }),
    ).toEqual({ type: "permission" });
  });
});
