import { describe, expect, it } from "vitest";
import {
  buildFacilityGuidePdfDefinition,
  facilityStartupSteps,
} from "@/components/facilities/facilityStartupGuide";

describe("facility quick-start guide", () => {
  it("uses automatic sign-in loading language instead of manual refresh instructions", () => {
    const content = facilityStartupSteps.map((step) => `${step.title} ${step.detail}`).join(" ");
    expect(content).toContain("loads during sign-in");
    expect(content.toLowerCase()).not.toContain("refresh your assignments");
  });

  it("includes the permanent registration URL, install links, and support contact", () => {
    const definition = buildFacilityGuidePdfDefinition({
      facilityName: "Chicago Heights",
      organizationName: "Inspection-Trac",
      registrationUrl: "https://inspection-trac.com/join/chicago-heights",
      qrDataUrl: "data:image/png;base64,example",
      supportName: "Inspection-Trac Support",
      supportEmail: "support@inspection-trac.com",
      appName: "Inspection-Trac",
      appStoreUrl: "https://apps.apple.com/example",
      googlePlayUrl: "https://play.google.com/example",
    });

    const serialized = JSON.stringify(definition);
    expect(serialized).toContain("Chicago Heights");
    expect(serialized).toContain("https://inspection-trac.com/join/chicago-heights");
    expect(serialized).toContain("https://apps.apple.com/example");
    expect(serialized).toContain("https://play.google.com/example");
    expect(serialized).toContain("support@inspection-trac.com");
  });
});
