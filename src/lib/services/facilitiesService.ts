import { apiFetch } from "@/lib/apiClient";
import type { FacilitySummary, FacilityYard, FacilityYardArea, FacilitiesListResponse, LocationSummary } from "@/lib/types";
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

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readOptionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function readBoolean(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function normalizeYardArea(value: unknown, index: number): FacilityYardArea | null {
  if (typeof value === "string") {
    const name = value.trim();
    return name ? { areaId: name, name, active: true } : null;
  }
  const row = readRecord(value);
  const name = readOptionalString(
    row.area_name ?? row.areaName ?? row.name ?? row.label ?? row.display_name ?? row.displayName
  );
  const areaId = readOptionalString(
    row.area_id ?? row.areaId ?? row.id ?? row.code ?? name
  );
  if (!name && !areaId) return null;
  return {
    areaId: areaId ?? `area-${index + 1}`,
    name: name ?? areaId ?? `Area ${index + 1}`,
    active: readBoolean(row.is_active ?? row.active, true),
  };
}

function normalizeFacilityYard(value: unknown, index: number): FacilityYard | null {
  if (typeof value === "string") {
    const name = value.trim();
    return name ? { yardId: name, name, code: name, active: true, areas: [] } : null;
  }
  const row = readRecord(value);
  const name = readOptionalString(
    row.yard_name ?? row.yardName ?? row.name ?? row.label ?? row.display_name ?? row.displayName
  );
  const code = readOptionalString(row.code ?? row.yard_code ?? row.yardCode);
  const yardId = readOptionalString(row.yard_id ?? row.yardId ?? row.id ?? code ?? name);
  if (!name && !yardId) return null;
  const rawAreas = row.areas ?? row.yard_areas ?? row.yardAreas ?? row.zones;
  const areas = (Array.isArray(rawAreas) ? rawAreas : [])
    .map(normalizeYardArea)
    .filter((area): area is FacilityYardArea => Boolean(area));
  return {
    yardId: yardId ?? `yard-${index + 1}`,
    name: name ?? yardId ?? `Yard ${index + 1}`,
    code: code ?? yardId ?? `YARD-${index + 1}`,
    active: readBoolean(row.is_active ?? row.active, true),
    areas,
  };
}

function normalizeFacilityYards(row: Record<string, unknown>, metadata: Record<string, unknown>) {
  const rawYards = row.yards ?? row.yard_options ?? row.yardOptions
    ?? metadata.yards ?? metadata.yard_options ?? metadata.yardOptions;
  const yards = (Array.isArray(rawYards) ? rawYards : [])
    .map(normalizeFacilityYard)
    .filter((yard): yard is FacilityYard => Boolean(yard));
  const seen = new Set<string>();
  return yards.filter((yard) => {
    const key = yard.yardId.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function serializeFacilityYardArea(area: FacilityYardArea) {
  return {
    area_id: area.areaId,
    areaId: area.areaId,
    area_name: area.name,
    areaName: area.name,
    name: area.name,
    is_active: area.active,
    active: area.active,
  };
}

function serializeFacilityYard(yard: FacilityYard) {
  return {
    yard_id: yard.yardId,
    yardId: yard.yardId,
    yard_name: yard.name,
    yardName: yard.name,
    display_name: yard.name,
    code: yard.code,
    yard_code: yard.code,
    is_active: yard.active,
    active: yard.active,
    areas: yard.areas.map(serializeFacilityYardArea),
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
  const metadata = readRecord(row.metadata);
  const id = (row.location_id || row.locationId || row.id || "").toString().trim();
  const name = (
    row.location_name ||
    row.locationName ||
    row.name ||
    row.location_label ||
    row.locationLabel ||
    "Facility"
  ).toString().trim();
  const activeValue = row.is_active ?? row.active;
  const countValue = row.locationCount ?? row.location_count ?? metadata.locationCount ?? metadata.location_count;
  const locationCount = Number(countValue);
  const yards = normalizeFacilityYards(row, metadata);
  return {
    id,
    name,
    slug: readOptionalString(row.slug) || readOptionalString(metadata.slug) || id,
    region: readOptionalString(row.region) || readOptionalString(metadata.region),
    active: typeof activeValue === "boolean" ? activeValue : true,
    locationCount: Number.isFinite(locationCount) && locationCount > 0 ? locationCount : 1,
    ...(yards.length ? { yards } : {}),
  };
}

function normalizeFacilityMutationResponse(payload: unknown): FacilitySummary {
  const response = readRecord(payload);
  const candidate = readRecord(response.location || response.facility || response.data || response);
  const facility = normalizeFacilitySummary(candidate);
  if (!facility.id) {
    throw new Error("Facility was saved, but the server response did not identify the location.");
  }
  return facility;
}

function buildFacilityWritePayload(payload: Partial<FacilitySummary>) {
  return {
    name: payload.name,
    location_name: payload.name,
    active: payload.active,
    is_active: payload.active,
    metadata: {
      slug: payload.slug,
      region: payload.region,
      locationCount: payload.locationCount ?? 1,
      ...(Array.isArray(payload.yards)
        ? { yards: payload.yards.map(serializeFacilityYard) }
        : {}),
    },
  };
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
  const response = await apiFetch<unknown>(FACILITIES_ENDPOINT(organizationId), {
    method: "POST",
    body: JSON.stringify(buildFacilityWritePayload(payload)),
  });
  return normalizeFacilityMutationResponse(response);
}

export async function updateFacility(
  organizationId: string,
  facilityId: string,
  patch: Partial<FacilitySummary>
): Promise<FacilitySummary> {
  const response = await apiFetch<unknown>(`${FACILITIES_ENDPOINT(organizationId)}/${facilityId}`, {
    method: "PUT",
    body: JSON.stringify(buildFacilityWritePayload(patch)),
  });
  return normalizeFacilityMutationResponse(response);
}

export async function deleteFacility(
  organizationId: string,
  facilityId: string,
  confirmationName: string
): Promise<FacilitySummary> {
  const normalizedConfirmationName = confirmationName.trim();
  if (!normalizedConfirmationName) {
    throw new Error("Type the facility name to confirm removal.");
  }
  const response = await apiFetch<unknown>(`${FACILITIES_ENDPOINT(organizationId)}/${facilityId}`, {
    method: "DELETE",
    body: JSON.stringify({ confirmation_name: normalizedConfirmationName }),
  });
  return normalizeFacilityMutationResponse(response);
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

  static async deleteFacility(
    organizationId: string,
    facilityId: string,
    confirmationName: string
  ): Promise<FacilitySummary> {
    return deleteFacility(organizationId, facilityId, confirmationName);
  }

  static async getLocationMemberships(organizationId: string): Promise<LocationSummary[]> {
    return fetchLocationMemberships(organizationId);
  }

  static async getFacilityUsers(organizationId: string, facilityId: string): Promise<string[]> {
    return fetchFacilityUsers(organizationId, facilityId);
  }
}
