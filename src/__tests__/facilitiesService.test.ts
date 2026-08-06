import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFacility, fetchFacilities, updateFacility } from "@/lib/services/facilitiesService";

const apiClientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  apiFetch: apiClientMocks.apiFetch,
}));

describe("facilitiesService", () => {
  beforeEach(() => {
    apiClientMocks.apiFetch.mockReset();
  });

  it("unwraps the backend create response and sends persisted metadata fields", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      success: true,
      location: {
        location_id: "facility-chicago",
        location_name: "Chicago",
        is_active: true,
        metadata: {
          slug: "chicago",
          region: "Midwest",
          locationCount: 1,
        },
      },
    });

    await expect(
      createFacility("org-1", {
        name: "Chicago",
        slug: "chicago",
        region: "Midwest",
        active: true,
        locationCount: 1,
      })
    ).resolves.toEqual({
      id: "facility-chicago",
      name: "Chicago",
      slug: "chicago",
      region: "Midwest",
      active: true,
      locationCount: 1,
    });

    expect(apiClientMocks.apiFetch).toHaveBeenCalledWith(
      "/organizations/org-1/locations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Chicago",
          location_name: "Chicago",
          active: true,
          is_active: true,
          metadata: {
            slug: "chicago",
            region: "Midwest",
            locationCount: 1,
          },
        }),
      })
    );
  });

  it("unwraps the backend update response instead of treating the wrapper as a facility", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      success: true,
      facility: {
        location_id: "facility-1",
        location_name: "Updated facility",
        is_active: false,
        metadata: { slug: "updated-facility" },
      },
    });

    await expect(
      updateFacility("org-1", "facility-1", {
        name: "Updated facility",
        slug: "updated-facility",
        active: false,
      })
    ).resolves.toMatchObject({
      id: "facility-1",
      name: "Updated facility",
      slug: "updated-facility",
      active: false,
    });
  });

  it("keeps unassigned facilities in All organizations and out of a specific suborganization", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      locations: [
        {
          location_id: "unassigned",
          location_name: "Chicago",
          is_active: true,
          metadata: {},
        },
        {
          location_id: "awct",
          location_name: "Custom AWCT facility",
          is_active: true,
          metadata: { suborg: "awct" },
        },
      ],
    });

    await expect(fetchFacilities("org-1", "all")).resolves.toMatchObject({
      facilities: [{ id: "unassigned" }, { id: "awct" }],
    });
    await expect(fetchFacilities("org-1", "awct")).resolves.toMatchObject({
      facilities: [{ id: "awct" }],
    });
  });
});
