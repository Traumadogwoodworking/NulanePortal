import { describe, expect, it } from "vitest";

import {
  buildPortalFilterUrl,
  parsePortalFilterLocation,
} from "@/features/portal-filters/hooks/usePortalFilters";

describe("portal filter URL state", () => {
  it("rejects page-unsupported fields while retaining supported values", () => {
    const result = parsePortalFilterLocation("?facility=loc-1&yard=yard-1&damage_type=dent", {
      allowedFields: ["facilityId", "yard"],
    });

    expect(result.query).toEqual({ facilityId: "loc-1", yard: "yard-1" });
    expect(result.issues).toEqual([
      expect.objectContaining({ code: "unsupported_field", field: "damageType" }),
    ]);
  });

  it("preserves explicitly declared non-filter presentation parameters", () => {
    expect(
      buildPortalFilterUrl(
        "/home",
        "#chart",
        { facilityId: "loc-1", inspectionTypeNumber: "04" },
        "?countMode=damages&old=x",
        ["countMode"]
      )
    ).toBe("/home?facility=loc-1&inspection_type=04&countMode=damages#chart");
  });

  it("does not let a preserved parameter become a canonical filter issue", () => {
    expect(
      parsePortalFilterLocation("?countMode=damages&inspection_type=04", {
        preserveUrlParameters: ["countMode"],
      })
    ).toEqual({ query: { inspectionTypeNumber: "04" }, issues: [] });
  });
});
