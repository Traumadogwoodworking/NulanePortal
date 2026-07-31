import type { DashboardAnalyticsResponse } from "@/lib/services/reportService";
import type { HomeAnalyticsSnapshotResponse } from "@/lib/services/homeAnalyticsSnapshotService";

export type AnalyticsFilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type PortalAnalyticsFilterOptions = {
  facilities: AnalyticsFilterOption[];
  yards: AnalyticsFilterOption[];
  inspectionTypes: AnalyticsFilterOption[];
  inspectors: AnalyticsFilterOption[];
  severities: AnalyticsFilterOption[];
  damageAreas: AnalyticsFilterOption[];
  damageTypes: AnalyticsFilterOption[];
  statuses: AnalyticsFilterOption[];
  makes: AnalyticsFilterOption[];
  models: AnalyticsFilterOption[];
};

type UnknownRecord = Record<string, unknown>;

function toRecords(value: unknown): UnknownRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is UnknownRecord => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    : [];
}

function firstText(record: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function normalizeOptions(
  sources: unknown[],
  valueKeys: string[],
  labelKeys: string[],
  dedupeBy: "value" | "label" = "value"
): AnalyticsFilterOption[] {
  const source = sources.map(toRecords).find((records) => records.length > 0) ?? [];
  const options = new Map<string, AnalyticsFilterOption>();
  for (const record of source) {
    const value = firstText(record, valueKeys);
    if (!value) continue;
    const label = firstText(record, labelKeys) || value;
    const countValue = Number(record.count ?? record.reportCount ?? record.totalReports);
    const optionKey = (dedupeBy === "label" ? label : value).trim().replace(/\s+/g, " ").toLowerCase();
    options.set(optionKey, {
      value,
      label,
      ...(Number.isFinite(countValue) ? { count: countValue } : {}),
    });
  }
  return Array.from(options.values()).sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { numeric: true, sensitivity: "base" })
  );
}

export function getPortalAnalyticsFilterOptions(
  homeSnapshot?: HomeAnalyticsSnapshotResponse | null,
  dashboardAnalytics?: DashboardAnalyticsResponse | null,
  reportFilterOptions?: UnknownRecord | null
): PortalAnalyticsFilterOptions {
  const snapshotFilters = homeSnapshot?.result?.filter_options as UnknownRecord | undefined;
  const dashboardFilters = dashboardAnalytics?.filters as UnknownRecord | undefined;
  const dashboard = dashboardAnalytics as UnknownRecord | null | undefined;
  const snapshot = snapshotFilters ?? {};
  const filters = dashboardFilters ?? {};
  const reportData =
    reportFilterOptions?.data &&
    typeof reportFilterOptions.data === "object" &&
    !Array.isArray(reportFilterOptions.data)
      ? (reportFilterOptions.data as UnknownRecord)
      : null;
  const reportFilterContainer =
    reportFilterOptions?.filter_options ??
    reportFilterOptions?.filters ??
    reportData?.filter_options ??
    reportData?.filters ??
    reportData ??
    reportFilterOptions;
  const reportFilters =
    reportFilterContainer &&
    typeof reportFilterContainer === "object" &&
    !Array.isArray(reportFilterContainer)
      ? (reportFilterContainer as UnknownRecord)
      : {};

  return {
    facilities: normalizeOptions(
      [reportFilters.facilities, snapshot.facilities, filters.facilities, dashboard?.byFacility, dashboard?.facilities],
      ["facility_id", "facilityId", "location_id", "locationId", "id", "key", "value", "facility", "name", "label"],
      ["label", "facility", "facility_name", "facilityName", "name", "value"],
      "label"
    ),
    yards: normalizeOptions(
      [reportFilters.yards, snapshot.yards, filters.yards, dashboard?.byYard],
      ["value", "yard_id", "yardId", "yard", "key", "name", "label"],
      ["label", "yard", "yard_name", "yardName", "name", "value"]
    ),
    inspectionTypes: normalizeOptions(
      [reportFilters.inspectionTypes, reportFilters.inspection_types, snapshot.inspectionTypes, snapshot.inspection_types, snapshot.inspection_type, filters.inspectionTypes, dashboard?.byInspectionType],
      ["value", "inspection_type_number", "inspectionTypeNumber", "number", "module_key", "label"],
      ["label", "inspection_type_label", "inspectionTypeLabel", "displayLabel", "number", "value"]
    ),
    inspectors: normalizeOptions(
      [reportFilters.inspectors, snapshot.inspectors, filters.inspectors, dashboard?.byInspector],
      ["value", "email", "inspector_email", "inspectorEmail", "user_id", "label"],
      ["label", "email", "inspector_email", "inspectorEmail", "value"]
    ),
    severities: normalizeOptions(
      [reportFilters.severities, reportFilters.severity, snapshot.severities, snapshot.severity, filters.severities, dashboard?.severity],
      ["value", "severity", "level", "label"],
      ["label", "severity", "level", "value"]
    ),
    damageAreas: normalizeOptions(
      [reportFilters.damageAreas, reportFilters.damage_areas, reportFilters.damage_area, snapshot.damageAreas, snapshot.damage_areas, snapshot.damage_area, snapshot.areas, filters.damageAreas, dashboard?.topAreas],
      ["value", "damage_area", "damageArea", "name", "label"],
      ["label", "damage_area", "damageArea", "name", "value"]
    ),
    damageTypes: normalizeOptions(
      [reportFilters.damageTypes, reportFilters.damage_types, reportFilters.damage_type, snapshot.damageTypes, snapshot.damage_types, snapshot.damage_type, filters.damageTypes, dashboard?.topTypes],
      ["value", "damage_type", "damageType", "name", "label"],
      ["label", "damage_type", "damageType", "name", "value"]
    ),
    statuses: normalizeOptions(
      [reportFilters.statuses, snapshot.statuses, filters.statuses, dashboard?.byStatus],
      ["value", "status", "label"],
      ["label", "status", "value"]
    ),
    makes: normalizeOptions(
      [reportFilters.makes, snapshot.makes, filters.makes, dashboard?.byMake],
      ["value", "make", "name", "label"],
      ["label", "make", "name", "value"]
    ),
    models: normalizeOptions(
      [reportFilters.models, snapshot.models, filters.models, dashboard?.byModel],
      ["value", "model", "name", "label"],
      ["label", "model", "name", "value"]
    ),
  };
}
