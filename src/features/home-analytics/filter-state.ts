import { HOME_ANALYTICS_FILTER_KEYS } from "./constants";
import type { ActiveHomeFilterChip, HomeAnalyticsFilters, HomeFilterKey } from "./types";

const DEFAULT_FILTERS: HomeAnalyticsFilters = {
  facilityKey: "all",
  inspectorKey: "",
  countMode: "reports",
};

function clean(value: string | null | undefined): string | undefined {
  const normalized = (value ?? "").trim();
  return normalized || undefined;
}

export function getDefaultHomeAnalyticsFilters(): HomeAnalyticsFilters {
  return { ...DEFAULT_FILTERS };
}

export function parseHomeAnalyticsFilters(params: URLSearchParams): HomeAnalyticsFilters {
  return {
    ...getDefaultHomeAnalyticsFilters(),
    from: clean(params.get("from")),
    to: clean(params.get("to")),
    facilityKey: clean(params.get("facility")) ?? "all",
    inspectorKey: clean(params.get("inspector")) ?? clean(params.get("inspector_email")) ?? "",
    status: clean(params.get("status")),
    query: clean(params.get("q")),
    countMode: params.get("countMode") === "damages" ? "damages" : "reports",
    reportId: clean(params.get("report_id")),
    vin: clean(params.get("vin"))?.toUpperCase(),
    inspectionType: clean(params.get("inspection_type")),
    make: clean(params.get("make")),
    model: clean(params.get("model")),
    yard: clean(params.get("yard")),
    severity: clean(params.get("severity")),
    damageArea: clean(params.get("damage_area")),
  };
}

export function serializeHomeAnalyticsFilters(filters: HomeAnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams();
  const pairs: Array<[string, string | undefined]> = [
    ["from", filters.from],
    ["to", filters.to],
    ["facility", filters.facilityKey && filters.facilityKey !== "all" ? filters.facilityKey : undefined],
    ["inspector", filters.inspectorKey],
    ["status", filters.status],
    ["q", filters.query],
    ["countMode", filters.countMode !== "reports" ? filters.countMode : undefined],
    ["report_id", filters.reportId],
    ["vin", filters.vin],
    ["inspection_type", filters.inspectionType],
    ["make", filters.make],
    ["model", filters.model],
    ["yard", filters.yard],
    ["severity", filters.severity && filters.severity !== "all" ? filters.severity : undefined],
    ["damage_area", filters.damageArea],
  ];
  for (const [key, value] of pairs) {
    const normalized = clean(value);
    if (normalized) params.set(key, normalized);
  }
  return params;
}

export function buildDashboardAnalyticsParams(filters: HomeAnalyticsFilters): Record<string, string> {
  const params = serializeHomeAnalyticsFilters(filters);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key === "facility") {
      if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value)) {
        result.facility_id = value;
      }
      return;
    }
    if (key === "inspector") {
      result.inspector_email = value;
      return;
    }
    if (key === "q" || key === "countMode") {
      return;
    }
    result[key] = value;
  });
  return result;
}

export function getActiveHomeFilterChips(filters: HomeAnalyticsFilters): ActiveHomeFilterChip[] {
  const chips: ActiveHomeFilterChip[] = [];
  const add = (key: string, label: string, value?: string) => {
    const normalized = clean(value);
    if (normalized) chips.push({ key, label, value: normalized });
  };
  add("from", "From", filters.from);
  add("to", "To", filters.to);
  if (filters.facilityKey !== "all") add("facility", "Facility", filters.facilityKey);
  add("inspector", "Inspector", filters.inspectorKey);
  add("status", "Status", filters.status);
  add("report_id", "Report", filters.reportId);
  add("vin", "VIN", filters.vin);
  add("inspection_type", "Inspection", filters.inspectionType);
  add("make", "Make", filters.make);
  add("model", "Model", filters.model);
  add("yard", "Yard", filters.yard);
  if (filters.severity !== "all") add("severity", "Severity", filters.severity);
  add("damage_area", "Damage area", filters.damageArea);
  return chips;
}

export function getHomeFilterKeysWithValues(filters: HomeAnalyticsFilters): HomeFilterKey[] {
  return HOME_ANALYTICS_FILTER_KEYS.filter((key) => {
    if (key === "report_id") return Boolean(filters.reportId);
    if (key === "inspection_type") return Boolean(filters.inspectionType);
    if (key === "inspector_email") return Boolean(filters.inspectorKey);
    const value = filters[key === "vin" ? "vin" : key];
    return Boolean(value);
  });
}
