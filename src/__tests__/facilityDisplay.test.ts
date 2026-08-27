import {
  formatFacilityDisplayName,
  formatOrganizationDisplayName,
} from "@/lib/facilityDisplay";

describe("formatFacilityDisplayName", () => {
  it("preserves backend facility names while normalizing whitespace", () => {
    expect(formatFacilityDisplayName("  Facility   North  ")).toBe("Facility North");
    expect(formatFacilityDisplayName("  ")).toBe("");
  });
});

describe("formatOrganizationDisplayName", () => {
  it("preserves backend organization names while normalizing whitespace", () => {
    expect(formatOrganizationDisplayName("  Example   Organization ")).toBe("Example Organization");
  });
});
