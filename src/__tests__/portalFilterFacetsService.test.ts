import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchPortalFilterFacets,
  PORTAL_FILTER_FACETS_ENDPOINT,
  PORTAL_FILTER_FACETS_TIMEOUT_MS,
} from "@/features/portal-filters/services/portalFilterFacetsService";

const apiClientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  apiFetch: apiClientMocks.apiFetch,
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("fetchPortalFilterFacets", () => {
  it("uses the shared request layer and validates the endpoint response", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      facets: {
        facilities: [],
        yards: [],
        inspection_types: [{ value: "04", label: "Inspection 04", count: 1 }],
        inspectors: [],
        statuses: [],
        makes: [],
        models: [],
        severities: [],
        damage_areas: [],
        damage_types: [],
      },
      meta: {
        source: "authorized_report_filter_facets",
        generated_at: "2026-07-12T18:45:00.000Z",
      },
    });

    await expect(fetchPortalFilterFacets()).resolves.toMatchObject({
      facets: { inspectionTypes: [{ value: "04", label: "Inspection 04", count: 1 }] },
      meta: { source: "authorized_report_filter_facets" },
    });
    expect(apiClientMocks.apiFetch).toHaveBeenCalledWith(PORTAL_FILTER_FACETS_ENDPOINT, {
      portal: {
        callerLabel: "reports.filterOptions",
        timeoutMs: PORTAL_FILTER_FACETS_TIMEOUT_MS,
      },
    });
  });
});

