import { apiFetch } from "@/lib/apiClient";
import type { FacilitySummary, FacilitiesListResponse, LocationSummary } from "@/lib/types";
import type { ResponseError } from "../apiClient";
import {
  appendOrganizationScope,
  rowMatchesOrganizationScope,
  type PortalOrganizationScopeKey,
} from "@/lib/portalOrganizations";

const FACILITIES_ENDPOINT = (organizationId: string) => `/organizations/${organizationId}/locations`;
const LOCATIONS_ENDPOINT = (organizationId: string) => `/organizations/${organizationId}/locations`;
const LOCATION_MEMBERSHIPS_ENDPOINT = (organizationId: string) => `/admin/organizations/${organizationId}/location-memberships`;
const FACILITY_USERS_ENDPOINT = (organizationId: string, facilityId: string) => `/admin/organizations/${organizationId}/locations/${facilityId}/users`;

function mapLocationToFacility(location: LocationSummary & { active?: boolean; slug?: string; region?: string; locationCount?: number }): FacilitySummary {
  return {
    id: location.id,
    name: location.name,
    slug: location.slug || location.id,
    region: location.region,
    active: location.active ?? true,
    locationCount: location.locationCount ?? 1,
  };
}

function mapRowToLocationSummary(
  row: Record<string, unknown>
): LocationSummary {
  const metadata = (row.metadata && typeof row.metadata === "object") ? row.metadata as Record<string, unknown> : {};
  return {
    id: (row.location_id || row.locationId || "").toString(),
    name: (row.location_name || row.locationName || row.location_label || row.locationLabel || "").toString() || "Facility",
    facilityId: (row.location_id || row.locationId || "").toString(),
    city: (metadata.city || "").toString(),
    state: (metadata.state || "").toString(),
  };
}

function readArrayFromPayload<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Unexpected facility response shape.");
  }
  const typedPayload = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = typedPayload[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (value && typeof value === "object") {
      const nestedValue = value as Record<string, unknown>;
      for (const nestedKey of keys) {
        if (Array.isArray(nestedValue[nestedKey])) {
          return nestedValue[nestedKey] as T[];
        }
      }
    }
  }
  throw new Error("Unexpected facility response shape.");
}

function getFacilityNameFields(row: Record<string, unknown>) {
  return {
    location_id: row.location_id,
    locationId: row.locationId,
    location_name: row.location_name,
    locationName: row.locationName,
    location_label: row.location_label,
    locationLabel: row.locationLabel,
    name: row.name,
    label: row.label,
  };
}

function normalizeFacilitySummary(row: Record<string, unknown>): FacilitySummary {
  const location = mapRowToLocationSummary(row);
  return mapLocationToFacility(location);
}

export async function fetchOrganizationLocations(
  organizationId: string,
  organizationScope?: PortalOrganizationScopeKey
): Promise<LocationSummary[]> {
  if (!organizationId) {
    return [];
  }
  const resolvedUrl = appendOrganizationScope(LOCATIONS_ENDPOINT(organizationId), organizationScope);
  const payload = await apiFetch<unknown>(resolvedUrl);
  const rows = readArrayFromPayload<Record<string, unknown>>(payload, ["locations", "facilities", "data", "results", "rows"]);
  if (process.env.NODE_ENV === "development") {
    console.info("[facilities] loaded locations", {
      resolvedUrl,
      organizationId,
      rawCount: rows.length,
      normalizedCount: rows.length,
      firstFields: rows[0] ? getFacilityNameFields(rows[0]) : {},
    });
  }
  return rows
    .filter((row) => rowMatchesOrganizationScope(row, organizationScope))
    .map(mapRowToLocationSummary);
}

export async function fetchFacilities(
  organizationId: string,
  organizationScope?: PortalOrganizationScopeKey
): Promise<FacilitiesListResponse> {
  if (!organizationId) {
    return { facilities: [] };
  }
  const resolvedUrl = appendOrganizationScope(FACILITIES_ENDPOINT(organizationId), organizationScope);
  const payload = await apiFetch<unknown>(resolvedUrl);
  const rows = readArrayFromPayload<Record<string, unknown>>(payload, ["locations", "facilities", "data", "results", "rows"]);
  const facilities = rows
    .filter((row) => rowMatchesOrganizationScope(row, organizationScope))
    .map(normalizeFacilitySummary);
  if (process.env.NODE_ENV === "development") {
    console.info("[facilities] loaded facilities", {
      resolvedUrl,
      organizationId,
      rawCount: rows.length,
      normalizedCount: facilities.length,
      firstFields: facilities[0]
        ? {
          id: facilities[0].id,
          name: facilities[0].name,
            slug: facilities[0].slug,
          }
        : {},
    });
  }
  return { facilities };
}

export async function fetchFacilityDetail(
  organizationId: string,
  facilityId: string
): Promise<FacilitySummary | null> {
  if (!organizationId || !facilityId) {
    return null;
  }
  return apiFetch<FacilitySummary>(`${FACILITIES_ENDPOINT(organizationId)}/${facilityId}`);
}

export async function createFacility(
  organizationId: string,
  payload: Omit<FacilitySummary, 'id'>
): Promise<FacilitySummary> {
  return apiFetch<FacilitySummary>(FACILITIES_ENDPOINT(organizationId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateFacility(
  organizationId: string,
  facilityId: string,
  patch: Partial<FacilitySummary>
): Promise<FacilitySummary> {
  return apiFetch<FacilitySummary>(`${FACILITIES_ENDPOINT(organizationId)}/${facilityId}`, {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function fetchLocationMemberships(organizationId: string): Promise<LocationSummary[]> {
  if (!organizationId) {
    return [];
  }
  const payload = await apiFetch<unknown>(LOCATION_MEMBERSHIPS_ENDPOINT(organizationId));
  return readArrayFromPayload<LocationSummary>(payload, ["location_memberships", "memberships", "data", "results", "rows"]);
}

export async function fetchFacilityUsers(organizationId: string, facilityId: string): Promise<string[]> {
  if (!organizationId || !facilityId) {
    return [];
  }
  const payload = await apiFetch<unknown>(FACILITY_USERS_ENDPOINT(organizationId, facilityId));
  const userRecords = readArrayFromPayload<{ id: string }>(payload, ["users", "data", "results", "rows"]);
  const userIds = userRecords.map(user => user.id);
  return userIds;
}

export class FacilitiesAdapter {
  static async getFacilities(
    organizationId: string,
    organizationScope?: PortalOrganizationScopeKey
  ): Promise<FacilitySummary[]> {
    try {
      const response = await fetchFacilities(organizationId, organizationScope);
      return response.facilities;
    } catch (error) {
      if ((error as ResponseError).status === 404) {
        console.warn(`Facilities endpoint returned 404, falling back to locations for organizationId: ${organizationId}`);
        const locations = await fetchOrganizationLocations(organizationId, organizationScope);
        return locations.map(mapLocationToFacility);
      }
      throw error;
    }
  }

  static async getFacilityDetail(
    organizationId: string,
    facilityId: string
  ): Promise<FacilitySummary | null> {
    return fetchFacilityDetail(organizationId, facilityId);
  }

  static async createFacility(
    organizationId: string,
    payload: Omit<FacilitySummary, 'id'>
  ): Promise<FacilitySummary> {
    return createFacility(organizationId, payload);
  }

  static async updateFacility(
    organizationId: string,
    facilityId: string,
    patch: Partial<FacilitySummary>
  ): Promise<FacilitySummary> {
    return updateFacility(organizationId, facilityId, patch);
  }

  static async getLocationMemberships(organizationId: string): Promise<LocationSummary[]> {
    return fetchLocationMemberships(organizationId);
  }

  static async getFacilityUsers(organizationId: string, facilityId: string): Promise<string[]> {
    return fetchFacilityUsers(organizationId, facilityId);
  }
}
