import { formatFacilityDisplayName } from "@/lib/facilityDisplay";

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
