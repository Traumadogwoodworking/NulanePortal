import { describe, expect, it } from "vitest";
import {
  getFacilityQuickStartAsset,
  getPublishedQuickStartFacilities,
} from "@/components/facilities/facilityQuickStartAsset";
import type { FacilitySummary, PortalSessionLocation } from "@/lib/types";

const chicagoId = "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c";
const mainYardId = "yard-ff39eedd-4630-467a-97f6-2149b4c6a6d3";

describe("published facility quick starts", () => {
  it("resolves the normalized live record whose adapter slug is the facility UUID", () => {
    const facility = {
      id: chicagoId,
      name: "Chicago Heights",
      slug: chicagoId,
      active: true,
      locationCount: 1,
      yards: [{ yardId: mainYardId, name: "Main", code: "MAIN", active: true }],
    } as FacilitySummary;

    const asset = getFacilityQuickStartAsset({
      slug: facility.slug,
      id: facility.id,
    });
    expect(asset?.facility.registrationSlug).toBe("chicago-heights");
    expect(asset?.registrationUrl).toBe(
      "https://inspection-trac.com/join/chicago-heights",
    );
    expect(asset?.url).toBe(
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
  });

  it("uses the actual authenticated session location shape and publishes only Chicago Heights", () => {
    const liveChicagoLocation: PortalSessionLocation = {
      location_id: chicagoId,
      organization_id: "org-awct",
      location_name: "Chicago Heights",
      location_label: "Chicago Heights",
      display_name: "Chicago Heights",
      is_active: true,
      metadata: {
        yards: [
          {
            yard_id: mainYardId,
            yard_name: "Main",
            yard_code: "MAIN",
            is_active: true,
          },
        ],
      },
    };
    const otherLocation: PortalSessionLocation = {
      location_id: "other-facility-id",
      organization_id: "org-awct",
      location_name: "SHAP",
      is_active: true,
    };

    const facilities = getPublishedQuickStartFacilities(
      [],
      [liveChicagoLocation, otherLocation],
    );
    expect(facilities).toHaveLength(1);
    expect(facilities[0]).toMatchObject({
      id: chicagoId,
      name: "Chicago Heights",
      slug: "chicago-heights",
    });
    expect(facilities[0]?.yards).toEqual([
      { yardId: mainYardId, name: "Main", code: "MAIN", active: true },
    ]);
  });

  it("does not bind the asset by display-name normalization alone", () => {
    expect(
      getFacilityQuickStartAsset({
        id: "unknown-id",
        slug: "unknown-slug",
      }),
    ).toBeNull();
  });
});
