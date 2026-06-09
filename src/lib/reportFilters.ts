import { resolveDamageReportLocationName, slugForFacilityLabel, stripFacilitySuffix } from "@/lib/reportUtils";
import { matchesAnySearchQuery, splitSearchTokens } from "@/lib/searchText";
import type { ReportDamageApiRow, ReportStatus, RsaReportApiRow, ReportSummary } from "@/lib/types";

export const FACILITY_FILTER_ALL = "all";

export type DamageReportFilterKey =
  | "facility"
  | "report_id"
  | "vin"
  | "make"
  | "model"
  | "inspector_email"
  | "status"
  | "date_range";

export const DAMAGE_FILTER_OPTIONS: Array<{ key: DamageReportFilterKey; label: string }> = [
  { key: "facility", label: "Facility" },
  { key: "report_id", label: "Report ID" },
  { key: "vin", label: "VIN" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "inspector_email", label: "Inspector Email" },
  { key: "status", label: "Status" },
  { key: "date_range", label: "Date" },
];

export type DamageReportFilters = {
  facilityFilter: string;
  searchTerm: string;
  reportIdFilter: string;
  vinFilter: string;
  makeFilter: string;
  modelFilter: string;
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
  makeFilter: "",
  modelFilter: "",
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
    makeFilter: normalizeText(input?.makeFilter),
    modelFilter: normalizeText(input?.modelFilter),
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
    makeFilter: filters.makeFilter,
    modelFilter: filters.modelFilter,
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
    report.report_id,
    report.vin,
    report.make,
    report.model,
    report.year,
    report.status,
    report.inspector_email,
    locationName,
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

export function matchesDamageReportFilters(report: ReportDamageApiRow, filters: DamageReportFilters): boolean {
  const locationName = resolveDamageReportLocationName(report);
  if (!matchesFacilitySlugFilter(locationName, filters.facilityFilter)) {
    return false;
  }

  const normalizedStatus = (report.status as ReportStatus) || "open";
  const damageSearchText = buildDamageSearchText(report, locationName);
  const reportId = normalizeSearchText(report.report_id || "");
  const vin = normalizeSearchText(report.vin || "");
  const make = normalizeSearchText(report.make || "");
  const model = normalizeSearchText(report.model || "");
  const inspectorEmail = normalizeSearchText(report.inspector_email || (report as unknown as { inspectorEmail?: string }).inspectorEmail || "");

  if (filters.reportIdFilter && !matchesAnyToken(reportId, filters.reportIdFilter)) return false;
  if (filters.statusFilter && normalizedStatus !== filters.statusFilter) return false;
  if (filters.vinFilter && !matchesAnyToken(vin, filters.vinFilter)) return false;
  if (filters.makeFilter && !matchesAnyToken(make, filters.makeFilter)) return false;
  if (filters.modelFilter && !matchesAnyToken(model, filters.modelFilter)) return false;
  if (filters.inspectorEmailFilter && !matchesAnyToken(inspectorEmail, filters.inspectorEmailFilter)) return false;
  if ((filters.createdFrom || filters.createdTo) && report.created_at && !reportWithinDateRange(report.created_at, filters.createdFrom, filters.createdTo)) {
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
  if (!matchesFacilitySlugFilter(label, filters.facilityFilter)) {
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
    const reportLabel = normalizeText(report.facility || report.track || report.spot);
    if (reportLabel.toLowerCase() !== normalizeSearchText(selectedFacilityLabel)) {
      return false;
    }
  }
  return reportWithinDateRange(report.created_at || report.updated_at || null, filters.createdFrom, filters.createdTo);
}
