import { buildFacilityGuide, generalResourceGuides, guideHref, resourceSearchText } from "@/components/resources/resourceCatalog";
import type { FacilitySummary } from "@/lib/types";

const testYard = {
  yardId: "main",
  name: "Main Yard",
  code: "MAIN",
  active: true,
  areas: [],
} as unknown as NonNullable<FacilitySummary["yards"]>[number];

const facility: FacilitySummary = {
  id: "facility-1",
  name: "Test Facility",
  slug: "test-facility",
  active: true,
  locationCount: 1,
  yards: [testYard],
};

describe("resource catalog", () => {
  it("creates stable guide URLs without inventing a route per live facility", () => {
    expect(guideHref({ facility: facility.id, task: "facility-start" })).toBe("/resources/guides?facility=facility-1&task=facility-start");
  });

  it("includes configured facility data in the facility guide", () => {
    const guide = buildFacilityGuide(facility);
    expect(guide.title).toBe("Get Started at Test Facility");
    expect(resourceSearchText(guide)).toContain("Main Yard");
    expect(guide.sections.find((section) => section.title === "Location entry")?.steps[0]).toContain("Main Yard");
  });

  it("keeps the shared catalog free of marketing metrics and labels", () => {
    const catalogText = generalResourceGuides.map(resourceSearchText).join(" ").toLowerCase();
    expect(/\b(recommended|popular|field guide|damage frequency|locations|%|lessons learned)\b/.test(catalogText)).toBe(false);
  });
});
