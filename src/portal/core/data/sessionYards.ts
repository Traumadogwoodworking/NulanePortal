import type { PortalSessionResponse } from "@/lib/types";

export type PortalYardOption = {
  value: string;
  label: string;
  facilityId?: string;
  facilityLabel?: string;
};

type YardRecord = {
  yard_id?: unknown;
  yardId?: unknown;
  code?: unknown;
  id?: unknown;
  value?: unknown;
  name?: unknown;
  label?: unknown;
  yard_name?: unknown;
  yardName?: unknown;
};

function cleanString(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function readYardArray(record: Record<string, unknown>): unknown[] {
  const metadata = record.metadata && typeof record.metadata === "object" ? record.metadata as Record<string, unknown> : {};
  const candidates = [
    record.yards,
    record.yard_options,
    record.yardOptions,
    metadata.yards,
    metadata.yard_options,
    metadata.yardOptions,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function readLocationId(record: Record<string, unknown>): string {
  return cleanString(record.location_id) || cleanString(record.locationId) || cleanString(record.facility_id) || cleanString(record.facilityId) || cleanString(record.id);
}

function readLocationLabel(record: Record<string, unknown>): string {
  return (
    cleanString(record.location_label) ||
    cleanString(record.locationLabel) ||
    cleanString(record.display_name) ||
    cleanString(record.displayName) ||
    cleanString(record.location_name) ||
    cleanString(record.locationName) ||
    cleanString(record.name)
  );
}

function normalizeYardOption(raw: unknown, facility: Record<string, unknown>): PortalYardOption | null {
  if (typeof raw === "string" || typeof raw === "number") {
    const value = cleanString(raw);
    return value
      ? {
          value,
          label: value,
          facilityId: readLocationId(facility) || undefined,
          facilityLabel: readLocationLabel(facility) || undefined,
        }
      : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const yard = raw as YardRecord;
  const value =
    cleanString(yard.yard_id) ||
    cleanString(yard.yardId) ||
    cleanString(yard.code) ||
    cleanString(yard.id) ||
    cleanString(yard.value) ||
    cleanString(yard.name) ||
    cleanString(yard.label);
  const label =
    cleanString(yard.name) ||
    cleanString(yard.label) ||
    cleanString(yard.yard_name) ||
    cleanString(yard.yardName) ||
    cleanString(yard.code) ||
    value;
  if (!value) return null;
  return {
    value,
    label,
    facilityId: readLocationId(facility) || undefined,
    facilityLabel: readLocationLabel(facility) || undefined,
  };
}

export function getSessionYardOptions(session: PortalSessionResponse | null | undefined): PortalYardOption[] {
  if (!session) return [];
  const root = session as unknown as Record<string, unknown>;
  const locationGroups = [
    root.locations,
    root.facilities,
    root.available_locations,
    root.availableLocations,
    root.available_facilities,
    root.availableFacilities,
  ];
  const options = new Map<string, PortalYardOption>();
  for (const group of locationGroups) {
    if (!Array.isArray(group)) continue;
    for (const item of group) {
      if (!item || typeof item !== "object") continue;
      const facility = item as Record<string, unknown>;
      for (const rawYard of readYardArray(facility)) {
        const option = normalizeYardOption(rawYard, facility);
        if (!option) continue;
        const dedupeKey = `${option.value.toLowerCase()}::${option.facilityId ?? ""}`;
        if (!options.has(dedupeKey)) options.set(dedupeKey, option);
      }
    }
  }
  return Array.from(options.values()).sort((left, right) =>
    `${left.facilityLabel ?? ""} ${left.label}`.localeCompare(`${right.facilityLabel ?? ""} ${right.label}`)
  );
}
