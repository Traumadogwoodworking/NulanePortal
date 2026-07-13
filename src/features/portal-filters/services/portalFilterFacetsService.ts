import { apiFetch } from "@/lib/apiClient";
import { parsePortalFilterFacetsResponse } from "@/features/portal-filters/adapters/portalFilterFacets";
import type { PortalFilterFacetsResponse } from "@/features/portal-filters/model/facets";

export const PORTAL_FILTER_FACETS_ENDPOINT = "/reports/filter-options";
export const PORTAL_FILTER_FACETS_TIMEOUT_MS = 15_000;

export async function fetchPortalFilterFacets(): Promise<PortalFilterFacetsResponse> {
  const payload = await apiFetch<unknown>(PORTAL_FILTER_FACETS_ENDPOINT, {
    portal: {
      callerLabel: "reports.filterOptions",
      timeoutMs: PORTAL_FILTER_FACETS_TIMEOUT_MS,
    },
  });

  return parsePortalFilterFacetsResponse(payload);
}

