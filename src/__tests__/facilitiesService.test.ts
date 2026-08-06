import { beforeEach, describe, expect, it, vi } from "vitest";
import { createFacility, deleteFacility, fetchFacilities, updateFacility } from "@/lib/services/facilitiesService";

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

  it("requires and sends the exact facility-name confirmation for removal", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      success: true,
      location: {
        location_id: "facility-chicago",
        location_name: "Chicago",
        is_active: true,
        metadata: { slug: "chicago" },
      },
    });

    await expect(deleteFacility("org-1", "facility-chicago", "  Chicago  ")).resolves.toMatchObject({
      id: "facility-chicago",
      name: "Chicago",
    });
    expect(apiClientMocks.apiFetch).toHaveBeenCalledWith(
      "/organizations/org-1/locations/facility-chicago",
      {
        method: "DELETE",
        body: JSON.stringify({ confirmation_name: "Chicago" }),
      }
    );

    await expect(deleteFacility("org-1", "facility-chicago", "   ")).rejects.toThrow(
      "Type the facility name to confirm removal."
    );
  });

  it("normalizes and persists facility yards with nested areas", async () => {
    const backendLocation = {
      location_id: "facility-1",
      location_name: "Chicago",
      is_active: true,
      metadata: {
        slug: "chicago",
        yards: [
          {
            yard_id: "yard-north",
            yard_name: "North Yard",
            yard_code: "NORTH",
            is_active: true,
            areas: [
              { area_id: "area-inbound", area_name: "Inbound", is_active: true },
              "Outbound",
            ],
          },
        ],
      },
    };
    apiClientMocks.apiFetch.mockResolvedValueOnce({ locations: [backendLocation] });

    const response = await fetchFacilities("org-1", "all");
    expect(response.facilities[0].yards).toEqual([
      {
        yardId: "yard-north",
        name: "North Yard",
        code: "NORTH",
        active: true,
        areas: [
          { areaId: "area-inbound", name: "Inbound", active: true },
          { areaId: "Outbound", name: "Outbound", active: true },
        ],
      },
    ]);

    apiClientMocks.apiFetch.mockResolvedValueOnce({ success: true, location: backendLocation });
    await updateFacility("org-1", "facility-1", {
      ...response.facilities[0],
      yards: response.facilities[0].yards,
    });

    const updateCall = apiClientMocks.apiFetch.mock.calls[1];
    expect(updateCall[0]).toBe("/organizations/org-1/locations/facility-1");
    expect(updateCall[1]).toMatchObject({ method: "PUT" });
    expect(JSON.parse(String(updateCall[1]?.body))).toMatchObject({
      metadata: {
        yards: [
          {
            yard_id: "yard-north",
            yard_name: "North Yard",
            yard_code: "NORTH",
            areas: [
              { area_id: "area-inbound", area_name: "Inbound" },
              { area_id: "Outbound", area_name: "Outbound" },
            ],
          },
        ],
      },
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
