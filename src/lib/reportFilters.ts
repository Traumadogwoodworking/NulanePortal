import {
  getDamageReportFacilityMatchKeys,
  getRsaReportFacilityMatchKeys,
  resolveDamageReportLocationName,
  slugForFacilityLabel,
  stripFacilitySuffix,
} from "@/lib/reportUtils";
import { matchesAnySearchQuery, splitSearchTokens } from "@/lib/searchText";
import type { ReportDamageApiRow, ReportStatus, RsaReportApiRow, ReportSummary } from "@/lib/types";

export const FACILITY_FILTER_ALL = "all";

export type DamageReportFilterKey =
  | "facility"
  | "report_id"
  | "vin"
  | "inspection_type"
  | "make"
  | "model"
  | "yard"
  | "inspector_email"
  | "status"
  | "date_range";

export const DAMAGE_FILTER_OPTIONS: Array<{ key: DamageReportFilterKey; label: string }> = [
  { key: "facility", label: "Facility" },
  { key: "report_id", label: "Report ID" },
  { key: "vin", label: "VIN" },
  { key: "inspection_type", label: "Inspection Type" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "yard", label: "Yard" },
  { key: "inspector_email", label: "Inspector Email" },
  { key: "status", label: "Status" },
  { key: "date_range", label: "Date" },
];

export const INSPECTION_TYPE_OPTIONS = [
  { number: "01", label: "Plant / Origin" },
  { number: "02", label: "Interchange Inspection" },
  { number: "03", label: "Railroad Interchange" },
  { number: "04", label: "Destination Inspection" },
  { number: "05", label: "Dealer Inspection" },
  { number: "06", label: "Pre-Delivery / Port Inspection" },
  { number: "07", label: "Origin on-rail Inspection" },
  { number: "08", label: "Destination on-rail Inspection" },
  { number: "09", label: "Marine Survey Discharge" },
  { number: "21", label: "Major Damage Inspection" },
  { number: "96", label: "Inbound Processing / Storage Yard Arrival" },
  { number: "97", label: "Outbound Processing / Storage Yard Outbound" },
  { number: "98", label: "Dealer Receipt" },
  { number: "99", label: "Letter of Notification" },
] as const;

export function getInspectionTypeLabel(numberOrLabel: string | number | null | undefined): string {
  const normalized = normalizeSearchText(String(numberOrLabel ?? ""));
  if (!normalized) return "";
  const match = INSPECTION_TYPE_OPTIONS.find((option) => option.number === normalized || normalizeSearchText(option.label) === normalized);
  return match ? `${match.number} - ${match.label}` : String(numberOrLabel);
}

export function getActiveInspectionTypeOptions(reports: ReportDamageApiRow[]): Array<{ number: string; label: string; displayLabel: string }> {
  const activeNumbers = new Set<string>();
  for (const report of reports) {
    const rawValue = readInspectionTypeValue(report);
    const normalized = normalizeSearchText(String(rawValue)).replace(/^0+/, "");
    if (normalized) {
      activeNumbers.add(normalized.padStart(2, "0"));
    }
  }
  return INSPECTION_TYPE_OPTIONS
    .filter((option) => activeNumbers.has(option.number))
    .map((option) => ({ ...option, displayLabel: `${option.number} - ${option.label}` }));
}

export type DamageReportFilters = {
  facilityFilter: string;
  searchTerm: string;
  reportIdFilter: string;
  vinFilter: string;
  inspectionTypeFilter: string;
  makeFilter: string;
  modelFilter: string;
  yardFilter: string;
  inspectorEmailFilter: string;
  statusFilter: ReportStatus | "";
  createdFrom: string;
  createdTo: string;
};

export const DEFAULT_DAMAGE_REPORT_FILTERS: DamageReportFilters = {
  facilityFilter: FACILITY_FILTER_ALL,
  searchTerm: "",
  reportIdFilter: "",
  vinFilter: "",
  inspectionTypeFilter: "",
  makeFilter: "",
  modelFilter: "",
  yardFilter: "",
  inspectorEmailFilter: "",
  statusFilter: "",
  createdFrom: "",
  createdTo: "",
};

export type RsaReportFilters = {
  facilityFilter: string;
  searchTerm: string;
  rsaTrackFilter: string;
  rsaSpotFilter: string;
  rsaStartDate: string;
  rsaEndDate: string;
};

export const DEFAULT_RSA_REPORT_FILTERS: RsaReportFilters = {
  facilityFilter: FACILITY_FILTER_ALL,
  searchTerm: "",
  rsaTrackFilter: "",
  rsaSpotFilter: "",
  rsaStartDate: "",
  rsaEndDate: "",
};

export type HomeReportFilters = {
  selectedFacilityKey: string;
  selectedInspectorEmail: string;
  createdFrom: string;
  createdTo: string;
};

export const DEFAULT_HOME_REPORT_FILTERS: HomeReportFilters = {
  selectedFacilityKey: FACILITY_FILTER_ALL,
  selectedInspectorEmail: FACILITY_FILTER_ALL,
  createdFrom: "",
  createdTo: "",
};

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toString().trim().replace(/\s+/g, " ");
}

export function normalizeSearchText(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase();
}

export function normalizeLabel(value: string | null | undefined): string {
  const normalized = normalizeText(stripFacilitySuffix(value));
  return normalized || "Unavailable";
}

type SearchableReportRecord = Record<string, unknown>;

function asRecord(value: unknown): SearchableReportRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as SearchableReportRecord) : null;
}

function readReportString(report: unknown, keys: string[]): string {
  const record = asRecord(report);
  if (!record) return "";
  const nestedPayload = asRecord(record.payload);
  const nestedReport = asRecord(record.report);
  const nestedRaw = asRecord(record.raw);
  const nestedLocation = asRecord(record.location);
  const nestedMetadata = asRecord(record.metadata);
  const payloadMetadata = asRecord(nestedPayload?.metadata);
  const reportMetadata = asRecord(nestedReport?.metadata);
  const rawMetadata = asRecord(nestedRaw?.metadata);
  for (const key of keys) {
    const candidates = [
      record[key],
      nestedPayload?.[key],
      nestedReport?.[key],
      nestedRaw?.[key],
      nestedLocation?.[key],
      nestedMetadata?.[key],
      payloadMetadata?.[key],
      reportMetadata?.[key],
      rawMetadata?.[key],
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
      if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
      if (typeof candidate === "boolean") return String(candidate);
    }
  }
  return "";
}

function readReportDate(report: unknown): string {
  return readReportString(report, ["created_at", "createdAt", "submitted_at", "submittedAt", "updated_at", "updatedAt"]);
}

function readReportStatus(report: unknown): string {
  return readReportString(report, ["status", "scan_status", "scanStatus", "damage_status", "damageStatus"]);
}

function readInspectionTypeValue(report: unknown): string {
  return readReportString(report, [
    "inspection_type_number",
    "inspectionTypeNumber",
    "inspection_type",
    "inspectionType",
    "inspection_type_label",
    "inspectionTypeLabel",
  ]);
}

export function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date(value);
  }
  return new Date(year, month - 1, day);
}

export function getReportDateValue(report: { created_at?: string | null; updated_at?: string | null }): Date | null {
  const value = report.created_at || report.updated_at || null;
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeDamageReportFilters(input: Partial<DamageReportFilters> | null | undefined): DamageReportFilters {
  return {
    facilityFilter: stripFacilitySuffix(normalizeText(input?.facilityFilter)) || FACILITY_FILTER_ALL,
    searchTerm: normalizeText(input?.searchTerm),
    reportIdFilter: normalizeText(input?.reportIdFilter),
    vinFilter: normalizeText(input?.vinFilter),
    inspectionTypeFilter: normalizeText(input?.inspectionTypeFilter),
    makeFilter: normalizeText(input?.makeFilter),
    modelFilter: normalizeText(input?.modelFilter),
    yardFilter: normalizeText(input?.yardFilter),
    inspectorEmailFilter: normalizeText(input?.inspectorEmailFilter),
    statusFilter: normalizeText(input?.statusFilter) as ReportStatus | "",
    createdFrom: normalizeText(input?.createdFrom),
    createdTo: normalizeText(input?.createdTo),
  };
}

export function serializeDamageReportFilters(filters: DamageReportFilters): string {
  return JSON.stringify({
    facilityFilter: filters.facilityFilter,
    searchTerm: filters.searchTerm,
    reportIdFilter: filters.reportIdFilter,
    vinFilter: filters.vinFilter,
    inspectionTypeFilter: filters.inspectionTypeFilter,
    makeFilter: filters.makeFilter,
    modelFilter: filters.modelFilter,
    yardFilter: filters.yardFilter,
    inspectorEmailFilter: filters.inspectorEmailFilter,
    statusFilter: filters.statusFilter,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  });
}

export function normalizeRsaReportFilters(input: Partial<RsaReportFilters> | null | undefined): RsaReportFilters {
  return {
    facilityFilter: stripFacilitySuffix(normalizeText(input?.facilityFilter)) || FACILITY_FILTER_ALL,
    searchTerm: normalizeText(input?.searchTerm),
    rsaTrackFilter: normalizeText(input?.rsaTrackFilter),
    rsaSpotFilter: normalizeText(input?.rsaSpotFilter),
    rsaStartDate: normalizeText(input?.rsaStartDate),
    rsaEndDate: normalizeText(input?.rsaEndDate),
  };
}

export function serializeRsaReportFilters(filters: RsaReportFilters): string {
  return JSON.stringify({
    facilityFilter: filters.facilityFilter,
    searchTerm: filters.searchTerm,
    rsaTrackFilter: filters.rsaTrackFilter,
    rsaSpotFilter: filters.rsaSpotFilter,
    rsaStartDate: filters.rsaStartDate,
    rsaEndDate: filters.rsaEndDate,
  });
}

export function normalizeHomeReportFilters(input: Partial<HomeReportFilters> | null | undefined): HomeReportFilters {
  return {
    selectedFacilityKey: stripFacilitySuffix(normalizeText(input?.selectedFacilityKey)) || FACILITY_FILTER_ALL,
    selectedInspectorEmail: stripFacilitySuffix(normalizeText(input?.selectedInspectorEmail)) || FACILITY_FILTER_ALL,
    createdFrom: normalizeText(input?.createdFrom),
    createdTo: normalizeText(input?.createdTo),
  };
}

export function serializeHomeReportFilters(filters: HomeReportFilters): string {
  return JSON.stringify({
    selectedFacilityKey: filters.selectedFacilityKey,
    selectedInspectorEmail: filters.selectedInspectorEmail,
    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,
  });
}

export function reportWithinDateRange(
  value: string | Date | null | undefined,
  createdFrom: string,
  createdTo: string
): boolean {
  const createdAt = value instanceof Date ? value : value ? parseDateInputValue(value) : null;
  if (!createdAt || Number.isNaN(createdAt.getTime())) return false;
  if (createdFrom) {
    const fromDate = parseDateInputValue(createdFrom);
    fromDate.setHours(0, 0, 0, 0);
    if (createdAt < fromDate) return false;
  }
  if (createdTo) {
    const toDate = parseDateInputValue(createdTo);
    toDate.setHours(23, 59, 59, 999);
    if (createdAt > toDate) return false;
  }
  return true;
}

export function matchesFacilitySlugFilter(label: string, facilityFilter: string): boolean {
  if (!facilityFilter || facilityFilter === FACILITY_FILTER_ALL) {
    return true;
  }
  return slugForFacilityLabel(label || "Unknown facility") === stripFacilitySuffix(facilityFilter);
}

function matchesFacilityFilterKeys(keys: string[], facilityFilter: string): boolean {
  if (!facilityFilter || facilityFilter === FACILITY_FILTER_ALL) {
    return true;
  }
  const normalizedFilter = normalizeSearchText(stripFacilitySuffix(facilityFilter));
  const slugFilter = slugForFacilityLabel(facilityFilter);
  return keys.some((key) => {
    const normalizedKey = normalizeSearchText(stripFacilitySuffix(key));
    return normalizedKey === normalizedFilter || slugForFacilityLabel(key) === slugFilter;
  });
}

export function matchesSelectionValue(value: string | null | undefined, selectedValue: string): boolean {
  if (!selectedValue || selectedValue === FACILITY_FILTER_ALL) {
    return true;
  }
  return normalizeSearchText(value) === normalizeSearchText(selectedValue);
}

function normalizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
}

export function buildDamageSearchText(report: ReportDamageApiRow, locationName: string): string {
  const overview = report.overview ?? {};
  const damageEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  const entryText = damageEntries
    .flatMap((entry) => {
      const record = entry as Record<string, unknown>;
      return [
        record.damage_area,
        record.damage_area_code,
        record.damage_type,
        record.damage_type_code,
        record.comments,
        record.notes,
        record.severity,
        record.severity_level,
      ];
    })
    .filter(Boolean)
    .map(normalizeCsvValue)
    .join(" ");
  return [
    readReportString(report, ["id", "reportId", "report_id"]),
    report.report_id,
    readReportString(report, ["vin", "vehicleVin", "vehicle_vin"]),
    report.vin,
    readReportString(report, ["make", "vehicleMake", "vehicle_make"]),
    report.make,
    readReportString(report, ["model", "vehicleModel", "vehicle_model"]),
    report.model,
    report.year,
    readReportStatus(report),
    readReportString(report, ["inspector_email", "inspectorEmail", "user_email", "userEmail"]),
    locationName,
    readReportString(report, ["facility_id", "facilityId", "location_id", "locationId", "facilityName", "facility_name", "locationLabel", "location_label"]),
    readReportString(report, ["yard", "yardName", "yard_name", "yardLabel", "yard_label", "yardId", "yard_id"]),
    typeof overview.comments === "string" ? overview.comments : "",
    typeof overview.bay_location === "string" ? overview.bay_location : "",
    typeof overview.navigation === "string"
      ? overview.navigation
      : typeof overview.navigation_text === "string"
        ? overview.navigation_text
        : typeof overview.navigationText === "string"
          ? overview.navigationText
          : "",
    entryText,
  ]
    .map(normalizeCsvValue)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesAnyToken(haystack: string, query: string): boolean {
  const tokens = splitSearchTokens(query);
  if (tokens.length === 0) return true;
  const normalizedHaystack = normalizeSearchText(haystack);
  return tokens.some((token) => normalizedHaystack.includes(token.toLowerCase()));
}

function matchesInspectionType(report: ReportDamageApiRow, query: string): boolean {
  if (!query) return true;
  const rawValue = readInspectionTypeValue(report);
  const normalizedQuery = normalizeSearchText(query);
  const normalizedValue = normalizeSearchText(String(rawValue));
  const numericQuery = normalizedQuery.replace(/\D+/g, "").replace(/^0+/, "");
  const numericValue = normalizedValue.replace(/\D+/g, "").replace(/^0+/, "");
  if (normalizedValue && normalizedValue.includes(normalizedQuery)) return true;
  if (numericQuery && numericValue && numericValue.includes(numericQuery)) return true;
  return INSPECTION_TYPE_OPTIONS.some((option) => {
    const optionNumber = normalizeSearchText(option.number).replace(/^0+/, "");
    const optionLabel = normalizeSearchText(option.label);
    if (!optionNumber.includes(numericQuery || normalizedQuery) && !optionLabel.includes(normalizedQuery)) {
      return false;
    }
    return (
      normalizedValue === normalizeSearchText(option.number) ||
      numericValue === optionNumber ||
      normalizedValue === optionLabel ||
      normalizedQuery === normalizeSearchText(option.label)
    );
  });
}

export function matchesDamageReportFilters(report: ReportDamageApiRow, filters: DamageReportFilters): boolean {
  const locationName = resolveDamageReportLocationName(report);
  if (!matchesFacilityFilterKeys(getDamageReportFacilityMatchKeys(report), filters.facilityFilter)) {
    return false;
  }

  const normalizedStatus = normalizeSearchText(readReportStatus(report) || "open");
  const damageSearchText = buildDamageSearchText(report, locationName);
  const reportId = normalizeSearchText(readReportString(report, ["report_id", "reportId", "id"]));
  const vin = normalizeSearchText(readReportString(report, ["vin", "vehicleVin", "vehicle_vin"]));
  const make = normalizeSearchText(readReportString(report, ["make", "vehicleMake", "vehicle_make"]));
  const model = normalizeSearchText(readReportString(report, ["model", "vehicleModel", "vehicle_model"]));
  const yard = normalizeSearchText(readReportString(report, ["yard", "yardName", "yard_name", "yardLabel", "yard_label", "yardId", "yard_id"]));
  const inspectorEmail = normalizeSearchText(readReportString(report, ["inspector_email", "inspectorEmail", "user_email", "userEmail"]));

  if (filters.reportIdFilter && !matchesAnyToken(reportId, filters.reportIdFilter)) return false;
  if (filters.statusFilter && normalizedStatus !== normalizeSearchText(filters.statusFilter)) return false;
  if (filters.vinFilter && !matchesAnyToken(vin, filters.vinFilter)) return false;
  if (filters.inspectionTypeFilter && !matchesInspectionType(report, filters.inspectionTypeFilter)) return false;
  if (filters.makeFilter && !matchesAnyToken(make, filters.makeFilter)) return false;
  if (filters.modelFilter && !matchesAnyToken(model, filters.modelFilter)) return false;
  if (filters.yardFilter && !matchesAnyToken(yard, filters.yardFilter)) return false;
  if (filters.inspectorEmailFilter && !matchesAnyToken(inspectorEmail, filters.inspectorEmailFilter)) return false;
  if ((filters.createdFrom || filters.createdTo) && !reportWithinDateRange(readReportDate(report), filters.createdFrom, filters.createdTo)) {
    return false;
  }
  if (filters.searchTerm && !matchesAnySearchQuery(damageSearchText, filters.searchTerm)) {
    return false;
  }
  return true;
}

type RsaSearchableReport = Pick<ReportSummary, "id" | "inspectorEmail" | "track" | "spot">;

export function buildRsaSearchText(
  summary: RsaSearchableReport,
  railcarSpot: string | null | undefined,
  railcarId: string,
  allVins: string[]
): string {
  return [
    summary.id,
    summary.inspectorEmail,
    summary.track,
    railcarSpot,
    summary.spot,
    railcarId,
    ...allVins,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function matchesRsaSummaryFilters(
  summary: {
    facilityName?: string | null;
    locationName?: string | null;
    track?: string | null;
    spot?: string | null;
    createdAt?: string | null;
  },
  filters: RsaReportFilters
): boolean {
  const label = summary.facilityName || summary.locationName || "RSA facility";
  const rsaMatchKeys = Array.isArray((summary as { facilityMatchKeys?: string[] }).facilityMatchKeys)
    ? ((summary as { facilityMatchKeys?: string[] }).facilityMatchKeys ?? [])
    : [label];
  if (!matchesFacilityFilterKeys(rsaMatchKeys, filters.facilityFilter)) {
    return false;
  }
  if (filters.rsaTrackFilter && summary.track !== filters.rsaTrackFilter) return false;
  if (filters.rsaSpotFilter && summary.spot !== filters.rsaSpotFilter) return false;
  if ((filters.rsaStartDate || filters.rsaEndDate) && !reportWithinDateRange(summary.createdAt, filters.rsaStartDate, filters.rsaEndDate)) {
    return false;
  }
  return true;
}

export function matchesRsaRailcarSearch(
  summary: RsaSearchableReport,
  railcarSpot: string | null | undefined,
  railcarId: string,
  allVins: string[],
  searchTerm: string
): boolean {
  return matchesAnySearchQuery(buildRsaSearchText(summary, railcarSpot, railcarId, allVins), searchTerm);
}

export function matchesHomeDamageReportFilters(
  report: ReportDamageApiRow,
  filters: HomeReportFilters,
  selectedFacilityReportIds: Set<string>
): boolean {
  if (filters.selectedFacilityKey !== FACILITY_FILTER_ALL && !selectedFacilityReportIds.has(report.report_id)) {
    return false;
  }
  return reportWithinDateRange(report.created_at || report.updated_at || null, filters.createdFrom, filters.createdTo);
}

export function matchesHomeInspectorEmailFilter(report: ReportDamageApiRow, selectedInspectorEmail: string): boolean {
  return matchesSelectionValue(report.inspector_email || "", selectedInspectorEmail);
}

export function matchesHomeRsaReportFilters(
  report: RsaReportApiRow,
  filters: HomeReportFilters,
  selectedFacilityLabel: string
): boolean {
  if (selectedFacilityLabel) {
    if (!matchesFacilityFilterKeys(getRsaReportFacilityMatchKeys(report), selectedFacilityLabel)) {
      return false;
    }
  }
  return reportWithinDateRange(report.created_at || report.updated_at || null, filters.createdFrom, filters.createdTo);
}
