import {
  formatFacilityDisplayName,
  formatOrganizationDisplayName,
} from "@/lib/facilityDisplay";

describe("formatFacilityDisplayName", () => {
  it("removes the stale AWCT organization prefix from facility labels", () => {
    expect(formatFacilityDisplayName("AWCT.inc - JNAP")).toBe("JNAP");
    expect(formatFacilityDisplayName("AWCT.inc - SHAP")).toBe("SHAP");
    expect(formatFacilityDisplayName("AWCT.inc - Other")).toBe("Other");
  });

  it("preserves unrelated facility names and blank values", () => {
    expect(formatFacilityDisplayName("Inspection-Trac DEV")).toBe("Inspection-Trac DEV");
    expect(formatFacilityDisplayName("  ")).toBe("");
  });
});

describe("formatOrganizationDisplayName", () => {
  it("keeps legacy matching keys out of customer-facing organization names", () => {
    expect(formatOrganizationDisplayName("AWCT.inc")).toBe("AWCT");
    expect(formatOrganizationDisplayName("AWC Inc.")).toBe("AWC");
    expect(formatOrganizationDisplayName("Inspection-Trac")).toBe(
      "Inspection-Trac",
    );
  });
});
