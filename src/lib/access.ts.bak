import { FacilitySummary, LocationSummary } from "./types";

export type PermissionKey =
  | "portal.admin"
  | "portal.dashboard.view"
  | "portal.reports.view"
  | "portal.facilities.manage"
  | "portal.people.view"
  | "portal.notifications.manage";

export function hasPermission(permissions: string[] | undefined, key: PermissionKey): boolean {
  if (!permissions) {
    return false;
  }
  if (permissions.includes("portal.admin")) {
    return true;
  }
  return permissions.includes(key);
}

export interface FacilityScope {
  facility: FacilitySummary;
  locations: LocationSummary[];
}

export function buildFacilityScope(
  facilities: FacilitySummary[],
  locations: LocationSummary[],
  facilityId?: string
): FacilityScope | null {
  if (!facilityId) {
    return null;
  }
  const facility = facilities.find((f) => f.id === facilityId);
  if (!facility) {
    return null;
  }
  const scopedLocations = locations.filter((loc) => loc.facilityId === facilityId);
  return {
    facility,
    locations: scopedLocations,
  };
}

export function facilityFilterLabel(facility: FacilitySummary): string {
  return `${facility.name} (${facility.slug.toUpperCase()})`;
}
