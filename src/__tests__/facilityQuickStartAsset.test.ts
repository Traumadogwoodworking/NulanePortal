import { describe, expect, it } from "vitest";
import {
  getFacilityQuickStartAsset,
  getPublishedQuickStartFacilities,
} from "@/components/facilities/facilityQuickStartAsset";

describe("published facility quick starts", () => {
  it("does not inherit an Inspection-Trac customer packet", () => {
    expect(
      getFacilityQuickStartAsset({
        id: "unknown-id",
        slug: "unknown-slug",
      }),
    ).toBeNull();
    expect(getPublishedQuickStartFacilities([], [])).toEqual([]);
  });
});
