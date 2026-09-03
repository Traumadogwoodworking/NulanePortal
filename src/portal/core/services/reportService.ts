import { apiFetch, apiFetchResponse, type PortalApiRequestInit } from "@/lib/apiClient";
import { isDevMockEnabled } from "@/lib/devMockApi";
import { buildApiUrl, normalizeMediaUrl } from "@/lib/config";
import { getPortalAccessToken } from "@/lib/portalAuth";
import { ACTIVE_PORTAL_BRANDING } from "@/lib/brandingPresets";
import { normalizeReportListRows } from "@/lib/reportNormalizer";
import type {
  ReportDamageApiRow,
  ReportFilters,
  RsaReportApiRow,
} from "@/lib/types";

export type DashboardAnalyticsParams = {
  suborg?: string;
  from?: string;
  to?: string;
  facility_id?: string;
  location_id?: string;
  inspection_type?: string;
  module_key?: string;
  status?: string;
  user_id?: string;
  inspector_email?: string;
  report_id?: string;
  vin?: string;
  make?: string;
  model?: string;
  yard?: string;
  severity?: string;
  damage_area?: string;
  search?: string;
};

export type DashboardAnalyticsFilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type DashboardAnalyticsSeriesRow = {
  label?: string;
  value?: string;
  count?: number;
  date?: string;
  name?: string;
  filterValue?: string;
  damageReports?: number;
  rsaReports?: number;
  noDamageReports?: number;
  clearReports?: number;
  totalReports?: number;
  reportCount?: number;
  [key: string]: unknown;
};

export type DashboardAnalyticsResponse = {
  range?: {
    from?: string | null;
    to?: string | null;
  };
  scope?: Record<string, unknown>;
  totals?: {
    totalReports?: number;
    damageReports?: number;
    noDamageReports?: number;
    noDamageCount?: number;
    noDamageScans?: number;
    twentyFourHourReports?: number;
    twentyFourHourCount?: number;
    inspection02Reports?: number;
    inspection02Count?: number;
    rsaReports?: number;
    damageReportsToday?: number;
    noDamageReportsToday?: number;
    rsaReportsToday?: number;
    reportsToday?: number;
    reportsLast7Days?: number;
    reportsThisWeek?: number;
    reportsThisMonth?: number;
    reportsThisYear?: number;
    vins?: number;
    entries?: number;
    facilities?: number;
  };
  currentPeriod?: {
    damageToday?: number;
    rsaToday?: number;
    damageLast7Days?: number;
    rsaLast7Days?: number;
    damageMonthToDate?: number;
    damageYearToDate?: number;
  };
  severity?: Array<{ level: string; label: string; count: number; percent?: number }>;
  severityGroups?: {
    low?: number;
    medium?: number;
    high?: number;
  };
  dailyTrend?: Array<{
    date: string;
    totalReports?: number;
    damageReports: number;
    noDamageReports?: number;
    rsaReports: number;
  }>;
  byFacilityDaily?: Array<Record<string, unknown>>;
  facilityDaily?: Array<Record<string, unknown>>;
  byFacility?: Array<Record<string, unknown>>;
  facilities?: Array<Record<string, unknown>>;
  topAreas?: Array<{ name: string; count: number }>;
  topTypes?: Array<{ name: string; count: number }>;
  byInspector?: Array<{ email: string; label?: string; reportCount: number; damageEntries?: number; totalDamages?: number; severity?: unknown[] }>;
  byInspectorDaily?: Array<Record<string, unknown>>;
  recentActivity?: Array<Record<string, unknown>>;
  byInspectionType?: Array<Record<string, unknown>>;
  filters?: {
    facilities?: DashboardAnalyticsFilterOption[];
    yards?: DashboardAnalyticsFilterOption[];
    severities?: DashboardAnalyticsFilterOption[];
    damageAreas?: DashboardAnalyticsFilterOption[];
    damageTypes?: DashboardAnalyticsFilterOption[];
    inspectors?: DashboardAnalyticsFilterOption[];
    inspectionTypes?: DashboardAnalyticsFilterOption[];
    statuses?: DashboardAnalyticsFilterOption[];
    makes?: DashboardAnalyticsFilterOption[];
    models?: DashboardAnalyticsFilterOption[];
  };
  series?: {
    dailyDamageTrend?: DashboardAnalyticsSeriesRow[];
    severityBreakdown?: DashboardAnalyticsSeriesRow[];
    topDamageAreas?: DashboardAnalyticsSeriesRow[];
    topFacilities?: DashboardAnalyticsSeriesRow[];
    topYards?: DashboardAnalyticsSeriesRow[];
    topModels?: DashboardAnalyticsSeriesRow[];
    inspectorVolume?: DashboardAnalyticsSeriesRow[];
  };
  meta?: {
    generatedAt?: string;
    filterHash?: string;
    rowCount?: number;
  };
};

export type ReportListParams = {
  suborg?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
  sort?: string;
  search?: string;
  report_id?: string;
  vin?: string;
  make?: string;
  model?: string;
  yard?: string;
  facility_id?: string;
  location_id?: string;
  inspection_type?: string;
  module_key?: string;
  status?: string;
  from?: string;
  to?: string;
  inspector_email?: string;
  severity?: string;
  damage_area?: string;
  damage_type?: string;
  include_damage_entries?: boolean;
  include_overview?: boolean;
  include_location?: boolean;
  include_pdf?: boolean;
  include_media?: boolean;
  include_image_thumbs?: boolean;
};

export type ReportFilterOptionsResponse = Record<string, unknown>;

export type ReportListRow = {
  report_id: string;
  reportId?: string;
  id?: string;
  organization_id?: string;
  sourceType?: string;
  source_type?: string;
  vin?: string;
  vehicleVin?: string;
  make?: string;
  model?: string;
  year?: number | string | null;
  status?: string;
  damageStatus?: string;
  damage_status?: string;
  scanStatus?: string;
  scan_status?: string;
  inspectorName?: string;
  inspector_name?: string;
  inspector_email?: string;
  inspectorEmail?: string;
  userEmail?: string;
  created_at?: string;
  createdAt?: string;
  submitted_at?: string;
  submittedAt?: string;
  updated_at?: string;
  updatedAt?: string;
  inspection_type_number?: string | number | null;
  inspectionTypeNumber?: string | number | null;
  inspection_type_label?: string | null;
  inspectionTypeLabel?: string | null;
  module_key?: string | null;
  moduleKey?: string | null;
  location_id?: string | null;
  locationId?: string | null;
  facility_id?: string | null;
  facilityId?: string | null;
  location_label?: string | null;
  locationLabel?: string | null;
  location_name?: string | null;
  locationName?: string | null;
  facility?: string | null;
  facilityName?: string | null;
  navigation?: string | null;
  yard?: string | null;
  yardId?: string | null;
  yard_id?: string | null;
  yardName?: string | null;
  yard_name?: string | null;
  yardLabel?: string | null;
  yard_label?: string | null;
  location?: unknown;
  damage_summary?: unknown[] | { count?: number; max_severity?: string | number | null; maxSeverity?: string | number | null };
  damage_entries?: unknown[];
  photoUrls?: unknown[];
  photo_urls?: unknown[];
  photos?: unknown[];
  splatUrls?: unknown[];
  splat_urls?: unknown[];
  pdfUrl?: string | null;
  pdf_url?: string | null;
  media?: Record<string, unknown> | null;
  mediaPayload?: Record<string, unknown> | null;
  media_payload?: Record<string, unknown> | null;
  raw?: Record<string, unknown>;
};

export type ReportListResponse = {
  rows: ReportListRow[];
  page: number;
  pageSize: number;
  limit?: number;
  total: number;
  hasNextPage: boolean;
  sort?: string;
  filters?: Record<string, unknown>;
};

function readStableDamageReportId(row: Record<string, unknown>): string {
  const nestedReport = row.report && typeof row.report === "object" && !Array.isArray(row.report)
    ? (row.report as Record<string, unknown>)
    : null;
  const candidates = [row.report_id, row.reportId, nestedReport?.report_id, nestedReport?.reportId];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    if (typeof candidate === "number" && Number.isFinite(candidate)) return String(candidate);
  }
  return "";
}

export function sanitizeDamageReportListRows(rows: unknown[] | undefined): ReportListRow[] {
  const sanitized: ReportListRow[] = [];
  const seenReportIds = new Set<string>();

  for (const value of rows ?? []) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const reportId = readStableDamageReportId(row);
    if (!reportId || seenReportIds.has(reportId)) continue;
    seenReportIds.add(reportId);
    sanitized.push({ ...row, report_id: reportId } as ReportListRow);
  }

  return sanitized;
}

const REPORTS_ENDPOINT = "/report/pull";
const REPORTS_LIST_ENDPOINT = REPORTS_ENDPOINT;
const REPORTS_FILTER_OPTIONS_ENDPOINT = "/reports/filter-options";
const REPORT_MUTATIONS_ENDPOINT = "/reports";
const RSA_REPORTS_ENDPOINT = "/railcar-scans/report/pull";
const RSA_REPORTS_PAGE_SIZE = 200;
const RSA_REPORTS_MAX_PAGES = 20;
const RSA_REPORTS_LOOKBACK_DAYS = 5;
const REPORT_LIST_TIMEOUT_MS = 15000;
const REPORT_DETAIL_TIMEOUT_MS = 20000;
const REPORTS_PAGINATION_BATCH_SIZE = 4;
const DAMAGE_REPORTS_SNAPSHOT_MAX_PAGES = 1;
const MILESTONE_FETCH_ENDPOINT = "/reports/milestones";
const MILESTONE_SUBMIT_ENDPOINT = "/milestones/reports";

type DamageReportOrgFields = {
  organization_id?: unknown;
  organizationId?: unknown;
  org_id?: unknown;
  orgId?: unknown;
  organization?: unknown;
  org?: unknown;
  tenant_id?: unknown;
  tenantId?: unknown;
};

function extractReportsArray<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response;
  }
  if (response && typeof response === "object" && response !== null) {
    const typedResponse = response as Record<string, unknown>;
    if (Array.isArray(typedResponse.reports)) return typedResponse.reports as T[];
    if (typedResponse.data && typeof typedResponse.data === "object") {
      const nestedData = typedResponse.data as Record<string, unknown>;
      if (Array.isArray(nestedData.reports)) return nestedData.reports as T[];
      if (Array.isArray(typedResponse.data)) return typedResponse.data as T[];
    }
    if (Array.isArray(typedResponse.data)) return typedResponse.data as T[];
    if (Array.isArray(typedResponse.rows)) return typedResponse.rows as T[];
    if (Array.isArray(typedResponse.results)) return typedResponse.results as T[];
    if (Array.isArray(typedResponse.report_metadata)) return typedResponse.report_metadata as T[];
    if (Array.isArray(typedResponse.payload)) return typedResponse.payload as T[];
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn("Unknown report response shape:", response);
  }
  return []; // Default to empty array if shape is unknown
}

function readNumericResponseField(response: unknown, fieldName: string): number | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return null;
  }
  const value = (response as Record<string, unknown>)[fieldName];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readBooleanResponseField(response: unknown, fieldName: string): boolean | null {
  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return null;
  }
  const value = (response as Record<string, unknown>)[fieldName];
  return typeof value === "boolean" ? value : null;
}

async function apiFetchReport<T = unknown>(
  path: string,
  options: PortalApiRequestInit = {},
  timeoutMs = REPORT_LIST_TIMEOUT_MS,
  callerLabel = "reports.request"
): Promise<T> {
  return apiFetch<T>(path, {
    ...options,
    portal: {
      ...options.portal,
      callerLabel: options.portal?.callerLabel ?? callerLabel,
      timeoutMs: options.portal?.timeoutMs ?? timeoutMs,
    },
  });
}

function mergeReportsById<T extends { report_id?: string }>(existing: T[], incoming: T[]): T[] {
  const mergedById = new Map<string, T>();

  [...existing, ...incoming].forEach((report, index) => {
    const key = report.report_id?.trim() || `__missing_${index}`;
    mergedById.set(key, report);
  });

  return Array.from(mergedById.values());
}

function getPaginatedFetchEndPage(total: number | null, pageSize: number, maxPages: number): number {
  if (total !== null && total > 0 && pageSize > 0) {
    return Math.min(maxPages, Math.max(1, Math.ceil(total / pageSize)));
  }
  return maxPages;
}

function toDateOnlyString(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRsaLookbackRange(days = RSA_REPORTS_LOOKBACK_DAYS): { date_from: string; date_to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - Math.max(1, days) * 24 * 60 * 60 * 1000);
  return {
    date_from: toDateOnlyString(from),
    date_to: toDateOnlyString(to),
  };
}

function getRsaReportTimestamp(report: RsaReportApiRow): number | null {
  const record = report as unknown as Record<string, unknown>;
  const value = report.created_at || report.updated_at || record.submitted_at;
  if (typeof value !== "string" || !value.trim()) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

async function fetchAllRsaReportPages(params: RsaReportListParams = {}): Promise<RsaReportApiRow[]> {
  const lookbackRange = getRsaLookbackRange();
  const dateFrom = params.date_from || params.from || lookbackRange.date_from;
  const dateTo = params.date_to || params.to || lookbackRange.date_to;
  const firstPageResult = await fetchRsaReportPage({
    ...params,
    page: 1,
    limit: params.limit ?? params.pageSize ?? RSA_REPORTS_PAGE_SIZE,
    date_from: dateFrom,
    date_to: dateTo,
  });
  let merged = firstPageResult.rows;
  const fromTimestamp = new Date(`${dateFrom}T00:00:00`).getTime();
  if (!firstPageResult.hasNextPage || !Number.isFinite(fromTimestamp)) {
    return merged;
  }
  const endPage = getPaginatedFetchEndPage(firstPageResult.total, firstPageResult.pageSize, RSA_REPORTS_MAX_PAGES);
  for (let batchStart = 2; batchStart <= endPage; batchStart += REPORTS_PAGINATION_BATCH_SIZE) {
    const batchPages = Array.from(
      { length: Math.min(REPORTS_PAGINATION_BATCH_SIZE, endPage - batchStart + 1) },
      (_, index) => batchStart + index
    );
    const pageResults = await Promise.allSettled(
      batchPages.map(async (page) => ({
        page,
        response: await fetchRsaReportPage({
          ...params,
          page,
          limit: firstPageResult.pageSize,
          date_from: dateFrom,
          date_to: dateTo,
        }),
      }))
    );
    const rejectedResult = pageResults.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (rejectedResult) {
      throw rejectedResult.reason;
    }

    let shouldStop = false;
    for (const result of pageResults) {
      if (result.status !== "fulfilled") continue;
      const nextRows = result.value.response.rows;
      if (!nextRows.length) {
        shouldStop = true;
        break;
      }
      const beforeCount = merged.length;
      merged = mergeReportsById(merged, nextRows);
      const hasRowsInsideWindow = nextRows.some((row) => {
        const timestamp = getRsaReportTimestamp(row);
        return timestamp === null || timestamp >= fromTimestamp;
      });
      if (!result.value.response.hasNextPage) shouldStop = true;
      if (merged.length >= result.value.response.total) shouldStop = true;
      if (nextRows.length < firstPageResult.pageSize) shouldStop = true;
      if (!hasRowsInsideWindow) shouldStop = true;
      if (merged.length === beforeCount) shouldStop = true;
      if (shouldStop) break;
    }
    if (shouldStop) break;
  }
  return merged.filter((row) => {
    const timestamp = getRsaReportTimestamp(row);
    return timestamp === null || timestamp >= fromTimestamp;
  });
}

export type RsaReportListParams = {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
  from?: string;
  to?: string;
  location_id?: string;
  rail_car_number?: string;
  report_id?: string;
  inspector_email?: string;
};

export type RsaReportListResponse = {
  rows: RsaReportApiRow[];
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
};

export async function fetchRsaReportPage(params: RsaReportListParams = {}): Promise<RsaReportListResponse> {
  const requestedPageSize = Number(params.pageSize ?? params.limit ?? RSA_REPORTS_PAGE_SIZE);
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(Math.max(Math.floor(requestedPageSize), 1), RSA_REPORTS_PAGE_SIZE)
    : RSA_REPORTS_PAGE_SIZE;
  const page = Number.isFinite(Number(params.page)) ? Math.max(1, Math.floor(Number(params.page))) : 1;
  const requestedOffset = params.offset ?? (page - 1) * pageSize;
  const offset = Number.isFinite(Number(requestedOffset)) ? Math.max(0, Math.floor(Number(requestedOffset))) : 0;
  const firstResponse = await apiFetchReport<unknown>(
    `${RSA_REPORTS_ENDPOINT}${buildNamedQueryString(
      {
        limit: pageSize,
        offset,
        date_from: params.date_from ?? params.from,
        date_to: params.date_to ?? params.to,
        location_id: params.location_id,
        rail_car_number: params.rail_car_number,
        report_id: params.report_id,
        inspector_email: params.inspector_email,
      },
      { preserveDateOnly: true }
    )}`,
    {},
    REPORT_LIST_TIMEOUT_MS,
    "rsaReports.page"
  );
  const firstPage = extractReportsArray<RsaReportApiRow>(firstResponse).map((report) => normalizeRsaReportRow(report));
  const responseRecord =
    firstResponse && typeof firstResponse === "object" && !Array.isArray(firstResponse)
      ? (firstResponse as Record<string, unknown>)
      : {};
  const paginationRecord =
    responseRecord.pagination && typeof responseRecord.pagination === "object" && !Array.isArray(responseRecord.pagination)
      ? (responseRecord.pagination as Record<string, unknown>)
      : {};
  const total = readNumericResponseField(firstResponse, "total") ?? readNumericResponseField(paginationRecord, "total");
  const hasNextPage =
    readBooleanResponseField(firstResponse, "hasNextPage") ??
    readBooleanResponseField(paginationRecord, "hasNextPage") ??
    readBooleanResponseField(paginationRecord, "has_more");
  const resolvedTotal = total ?? firstPage.length;
  return {
    rows: firstPage,
    page,
    pageSize,
    total: resolvedTotal,
    hasNextPage:
      hasNextPage === null
        ? firstPage.length >= pageSize && page * pageSize < resolvedTotal
        : hasNextPage,
  };
}

function extractDamageReportsArray(response: unknown): ReportDamageApiRow[] {
  if (Array.isArray(response)) {
    return response as ReportDamageApiRow[];
  }
  if (response && typeof response === "object") {
    const typedResponse = response as Record<string, unknown>;
    if (Array.isArray(typedResponse.reports)) {
      return typedResponse.reports as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.data)) {
      return typedResponse.data as ReportDamageApiRow[];
    }
    if (typedResponse.data && typeof typedResponse.data === "object") {
      const nestedData = typedResponse.data as Record<string, unknown>;
      if (Array.isArray(nestedData.reports)) {
        return nestedData.reports as ReportDamageApiRow[];
      }
    }
    if (Array.isArray(typedResponse.rows)) {
      return typedResponse.rows as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.results)) {
      return typedResponse.results as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.payload)) {
      return typedResponse.payload as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.report_metadata)) {
      return typedResponse.report_metadata as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.reportMetadata)) {
      return typedResponse.reportMetadata as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.reports_metadata)) {
      return typedResponse.reports_metadata as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.items)) {
      return typedResponse.items as ReportDamageApiRow[];
    }
    if (Array.isArray(typedResponse.records)) {
      return typedResponse.records as ReportDamageApiRow[];
    }
  }
  if (process.env.NODE_ENV === "development") {
    const rootRecord =
      response && typeof response === "object" && !Array.isArray(response)
        ? (response as Record<string, unknown>)
        : null;
    const dataRecord =
      rootRecord?.data && typeof rootRecord.data === "object" && !Array.isArray(rootRecord.data)
        ? (rootRecord.data as Record<string, unknown>)
        : null;
    const candidates = {
      rootArray: Array.isArray(response) ? (response as unknown[]).length : null,
      reports: Array.isArray(rootRecord?.reports) ? (rootRecord.reports as unknown[]).length : null,
      dataArray: Array.isArray(rootRecord?.data) ? (rootRecord.data as unknown[]).length : null,
      dataReports: Array.isArray(dataRecord?.reports) ? (dataRecord.reports as unknown[]).length : null,
      rows: Array.isArray(rootRecord?.rows) ? (rootRecord.rows as unknown[]).length : null,
      results: Array.isArray(rootRecord?.results) ? (rootRecord.results as unknown[]).length : null,
      report_metadata: Array.isArray(rootRecord?.report_metadata)
        ? (rootRecord.report_metadata as unknown[]).length
        : null,
      payload: Array.isArray(rootRecord?.payload) ? (rootRecord.payload as unknown[]).length : null,
    };
    console.warn(
      "[damage-reports] unrecognized response shape",
      JSON.stringify(
        {
          isArray: Array.isArray(response),
          topLevelKeys: rootRecord ? Object.keys(rootRecord) : [],
          dataType: rootRecord?.data === null ? "null" : typeof rootRecord?.data,
          dataKeys: dataRecord ? Object.keys(dataRecord) : [],
          candidates,
          firstItemKeys: (() => {
            const firstCandidate =
              Array.isArray(response)
                ? response[0]
                : Array.isArray(rootRecord?.reports)
                  ? rootRecord.reports[0]
                  : Array.isArray(rootRecord?.data)
                    ? rootRecord.data[0]
                    : Array.isArray(dataRecord?.reports)
                      ? dataRecord.reports[0]
                      : Array.isArray(rootRecord?.rows)
                        ? rootRecord.rows[0]
                        : Array.isArray(rootRecord?.results)
                          ? rootRecord.results[0]
                          : Array.isArray(rootRecord?.report_metadata)
                            ? rootRecord.report_metadata[0]
                            : Array.isArray(rootRecord?.reportMetadata)
                              ? rootRecord.reportMetadata[0]
                              : Array.isArray(rootRecord?.reports_metadata)
                                ? rootRecord.reports_metadata[0]
                                : Array.isArray(rootRecord?.items)
                                  ? rootRecord.items[0]
                                  : Array.isArray(rootRecord?.records)
                                    ? rootRecord.records[0]
                                    : Array.isArray(rootRecord?.payload)
                                      ? rootRecord.payload[0]
                                      : null;

            return firstCandidate && typeof firstCandidate === "object" && !Array.isArray(firstCandidate)
              ? Object.keys(firstCandidate as Record<string, unknown>)
              : [];
          })(),
        },
        null,
        2
      )
    );
  }
  throw new Error("Damage reports response shape was not recognized.");
}

function buildReportQueryString(filters: ReportFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    const candidate = normalizeQueryParamValue(key, value);
    if (candidate) {
      params.set(key, candidate);
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function buildNamedQueryString(filters: Record<string, unknown> = {}, options?: { preserveDateOnly?: boolean }) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    const candidate = normalizeQueryParamValue(key, value, options);
    if (candidate) {
      params.set(key, candidate);
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function normalizeQueryParamValue(key: string, value: unknown, options?: { preserveDateOnly?: boolean }): string {
  const candidate = value?.toString().trim() ?? "";
  if (!candidate) return "";
  if (options?.preserveDateOnly && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    return candidate;
  }
  if ((key === "from" || key === "to") && /^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    const [year, month, day] = candidate.split("-").map(Number);
    if (year && month && day) {
      const date =
        key === "from"
          ? new Date(year, month - 1, day, 0, 0, 0, 0)
          : new Date(year, month - 1, day, 23, 59, 59, 999);
      return date.toISOString();
    }
  }
  return candidate;
}

export function buildNormalizedReportQueryString(filters: ReportFilters = {}) {
  return buildReportQueryString(filters);
}

function buildLegacyDashboardAnalytics(
  reports: ReportDamageApiRow[]
): DashboardAnalyticsResponse {
  const countBy = (values: string[]) => {
    const counts = new Map<string, number>();
    values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
    return counts;
  };
  const optionRows = (counts: Map<string, number>) =>
    Array.from(counts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([value, count]) => ({ value, label: value, count }));
  const timestampFor = (report: ReportDamageApiRow) => {
    const record = report as unknown as Record<string, unknown>;
    return String(
      record.submitted_at ||
      record.submittedAt ||
      report.created_at ||
      report.updated_at ||
      ""
    );
  };
  const localDayForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const dayFor = (report: ReportDamageApiRow) => {
    const timestamp = timestampFor(report);
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? "" : localDayForDate(date);
  };
  const facilityFor = (report: ReportDamageApiRow) =>
    String(
      report.location_label ||
      report.location_name ||
      report.facility ||
      report.location?.location_label ||
      report.location?.location_name ||
      report.location_id ||
      report.facility_id ||
      "Other"
    ).trim();
  const entriesFor = (report: ReportDamageApiRow) =>
    Array.isArray(report.damage_entries) ? report.damage_entries : [];
  const severityFor = (report: ReportDamageApiRow) => {
    const values = entriesFor(report)
      .map((entry) => Number(entry?.severity))
      .filter((value) => Number.isFinite(value));
    return values.length ? String(Math.max(...values)) : "";
  };
  const isClear = (report: ReportDamageApiRow) => {
    const record = report as unknown as Record<string, unknown>;
    const status = String(record.damage_status ?? record.damageStatus ?? "").toLowerCase();
    const damageFound = record.damage_found ?? record.damageFound;
    return entriesFor(report).length === 0 &&
      (status === "no_damage" || status === "clear" || damageFound === false);
  };

  const now = new Date();
  const today = localDayForDate(now);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const damaged = reports.filter((report) => !isClear(report));
  const clear = reports.filter(isClear);
  const dated = reports.map((report) => ({ report, date: new Date(timestampFor(report)) }));
  const facilityCounts = countBy(reports.map(facilityFor));
  const severityCounts = countBy(reports.map(severityFor));
  const inspectorCounts = countBy(reports.map((report) => report.inspector_email?.trim() || ""));
  const statusCounts = countBy(reports.map((report) => String(report.status ?? "").trim()));
  const makeCounts = countBy(reports.map((report) => report.make?.trim() || ""));
  const modelCounts = countBy(reports.map((report) => report.model?.trim() || ""));
  const inspectionTypeCounts = countBy(
    reports.map((report) => String(report.inspection_type_number ?? "").trim())
  );
  const areaCounts = countBy(
    reports.flatMap((report) => entriesFor(report).map((entry) => String(entry.damage_area ?? entry.damage_area_code ?? "").trim()))
  );
  const typeCounts = countBy(
    reports.flatMap((report) => entriesFor(report).map((entry) => String(entry.damage_type ?? entry.damage_type_code ?? "").trim()))
  );
  const dailyCounts = countBy(reports.map(dayFor));
  const dailyDamageCounts = countBy(damaged.map(dayFor));
  const dailyClearCounts = countBy(clear.map(dayFor));
  const facilityDaily = new Map<string, { date: string; label: string; totalReports: number; damageReports: number; noDamageReports: number }>();
  const inspectorDaily = new Map<string, { date: string; email: string; label: string; totalReports: number; damageReports: number; noDamageReports: number }>();
  const facilitySummaries = new Map<string, { totalReports: number; damageReports: number; noDamageReports: number }>();
  const inspectorSummaries = new Map<string, { reportCount: number; damageReports: number; noDamageReports: number }>();
  for (const report of reports) {
    const date = dayFor(report);
    const facility = facilityFor(report);
    const inspector = report.inspector_email?.trim() || "Unassigned";
    const clearReport = isClear(report);
    const facilitySummary = facilitySummaries.get(facility) ?? { totalReports: 0, damageReports: 0, noDamageReports: 0 };
    facilitySummary.totalReports += 1;
    facilitySummary.damageReports += clearReport ? 0 : 1;
    facilitySummary.noDamageReports += clearReport ? 1 : 0;
    facilitySummaries.set(facility, facilitySummary);
    const inspectorSummary = inspectorSummaries.get(inspector) ?? { reportCount: 0, damageReports: 0, noDamageReports: 0 };
    inspectorSummary.reportCount += 1;
    inspectorSummary.damageReports += clearReport ? 0 : 1;
    inspectorSummary.noDamageReports += clearReport ? 1 : 0;
    inspectorSummaries.set(inspector, inspectorSummary);
    if (!date) continue;
    const facilityDailyKey = `${date}\n${facility}`;
    const facilityDay = facilityDaily.get(facilityDailyKey) ?? { date, label: facility, totalReports: 0, damageReports: 0, noDamageReports: 0 };
    facilityDay.totalReports += 1;
    facilityDay.damageReports += clearReport ? 0 : 1;
    facilityDay.noDamageReports += clearReport ? 1 : 0;
    facilityDaily.set(facilityDailyKey, facilityDay);
    const inspectorDailyKey = `${date}\n${inspector}`;
    const inspectorDay = inspectorDaily.get(inspectorDailyKey) ?? { date, email: inspector, label: inspector, totalReports: 0, damageReports: 0, noDamageReports: 0 };
    inspectorDay.totalReports += 1;
    inspectorDay.damageReports += clearReport ? 0 : 1;
    inspectorDay.noDamageReports += clearReport ? 1 : 0;
    inspectorDaily.set(inspectorDailyKey, inspectorDay);
  }

  return {
    totals: {
      totalReports: reports.length,
      damageReports: damaged.length,
      noDamageReports: clear.length,
      reportsToday: dailyCounts.get(today) ?? 0,
      reportsLast7Days: dated.filter(({ date }) => !Number.isNaN(date.getTime()) && date >= weekAgo).length,
      reportsThisMonth: dated.filter(({ date }) => !Number.isNaN(date.getTime()) && date >= monthStart).length,
      reportsThisYear: dated.filter(({ date }) => !Number.isNaN(date.getTime()) && date >= yearStart).length,
      damageReportsToday: damaged.filter((report) => dayFor(report) === today).length,
      noDamageReportsToday: clear.filter((report) => dayFor(report) === today).length,
      vins: new Set(reports.map((report) => report.vin?.trim().toUpperCase()).filter(Boolean)).size,
      entries: reports.reduce((sum, report) => sum + entriesFor(report).length, 0),
      facilities: facilityCounts.size,
    },
    currentPeriod: {
      damageToday: damaged.filter((report) => dayFor(report) === today).length,
      damageLast7Days: damaged.filter((report) => {
        const date = new Date(timestampFor(report));
        return !Number.isNaN(date.getTime()) && date >= weekAgo;
      }).length,
      damageMonthToDate: damaged.filter((report) => {
        const date = new Date(timestampFor(report));
        return !Number.isNaN(date.getTime()) && date >= monthStart;
      }).length,
      damageYearToDate: damaged.filter((report) => {
        const date = new Date(timestampFor(report));
        return !Number.isNaN(date.getTime()) && date >= yearStart;
      }).length,
    },
    severity: Array.from(severityCounts.entries()).map(([level, count]) => ({
      level,
      label: `Severity ${level}`,
      count,
    })),
    dailyTrend: Array.from(dailyCounts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, count]) => ({
        date,
        totalReports: count,
        damageReports: dailyDamageCounts.get(date) ?? 0,
        noDamageReports: dailyClearCounts.get(date) ?? 0,
        rsaReports: 0,
      })),
    byFacilityDaily: Array.from(facilityDaily.values()),
    byInspectorDaily: Array.from(inspectorDaily.values()),
    byFacility: Array.from(facilitySummaries.entries()).map(([label, counts]) => ({
      id: label,
      label,
      name: label,
      ...counts,
    })),
    topAreas: Array.from(areaCounts.entries()).map(([name, count]) => ({ name, count })),
    topTypes: Array.from(typeCounts.entries()).map(([name, count]) => ({ name, count })),
    byInspector: Array.from(inspectorSummaries.entries()).map(([email, counts]) => ({
      email,
      label: email,
      ...counts,
    })),
    recentActivity: reports.slice(0, 50) as unknown as Array<Record<string, unknown>>,
    filters: {
      facilities: optionRows(facilityCounts),
      severities: optionRows(severityCounts),
      damageAreas: optionRows(areaCounts),
      damageTypes: optionRows(typeCounts),
      inspectors: optionRows(inspectorCounts),
      inspectionTypes: optionRows(inspectionTypeCounts),
      statuses: optionRows(statusCounts),
      makes: optionRows(makeCounts),
      models: optionRows(modelCounts),
    },
    meta: {
      generatedAt: new Date().toISOString(),
      rowCount: reports.length,
    },
  };
}

export async function fetchDashboardAnalytics(params: DashboardAnalyticsParams = {}): Promise<DashboardAnalyticsResponse> {
  if (ACTIVE_PORTAL_BRANDING === "definianInspection") {
    return buildLegacyDashboardAnalytics(
      await fetchDamageReportsUncached(params as ReportFilters)
    );
  }
  try {
    return await apiFetch<DashboardAnalyticsResponse>(`/dashboard/analytics${buildNamedQueryString(params)}`, {
      portal: {
        callerLabel: "dashboard.analytics",
        timeoutMs: REPORT_LIST_TIMEOUT_MS,
      },
    });
  } catch (error) {
    if (Number((error as { status?: unknown })?.status) !== 404) throw error;
    const reports = await fetchDamageReportsUncached(params as ReportFilters);
    return buildLegacyDashboardAnalytics(reports);
  }
}

export async function fetchReportFilterOptions(
  suborg?: string
): Promise<ReportFilterOptionsResponse> {
  if (ACTIVE_PORTAL_BRANDING === "definianInspection") {
    const analytics = await fetchDashboardAnalytics({ suborg });
    return analytics.filters ?? {};
  }
  try {
    return await apiFetch<ReportFilterOptionsResponse>(
      `${REPORTS_FILTER_OPTIONS_ENDPOINT}${buildNamedQueryString({ suborg })}`,
      {
        portal: {
          callerLabel: "damageReports.filterOptions",
          timeoutMs: REPORT_LIST_TIMEOUT_MS,
        },
      }
    );
  } catch (error) {
    if (Number((error as { status?: unknown })?.status) !== 404) throw error;
    const analytics = await fetchDashboardAnalytics({ suborg });
    return analytics.filters ?? {};
  }
}

export async function fetchReportList(params: ReportListParams = {}): Promise<ReportListResponse> {
  const resolvedPageSize = params.limit ?? params.pageSize ?? 50;
  const hydrateDefinianReports = ACTIVE_PORTAL_BRANDING === "definianInspection";
  const queryParams = {
    suborg: params.suborg,
    page: params.page ?? 1,
    pageSize: resolvedPageSize,
    limit: params.limit ?? resolvedPageSize,
    sort: params.sort ?? "created_at_desc",
    search: params.search,
    report_id: params.report_id,
    vin: params.vin,
    make: params.make,
    model: params.model,
    yard: params.yard,
    facility_id: params.facility_id,
    location_id: params.location_id,
    inspection_type: params.inspection_type,
    module_key: params.module_key,
    status: params.status,
    from: params.from,
    to: params.to,
    inspector_email: params.inspector_email,
    severity: params.severity,
    damage_area: params.damage_area,
    damage_type: params.damage_type,
    include_damage_entries: params.include_damage_entries ?? hydrateDefinianReports,
    include_overview: params.include_overview ?? hydrateDefinianReports,
    include_location: params.include_location ?? hydrateDefinianReports,
    include_pdf: params.include_pdf ?? hydrateDefinianReports,
    include_media: params.include_media ?? hydrateDefinianReports,
    include_image_thumbs: params.include_image_thumbs ?? hydrateDefinianReports,
  };
  const response = await apiFetchReport<unknown>(
    `${REPORTS_LIST_ENDPOINT}${buildNamedQueryString(queryParams)}`,
    {},
    REPORT_LIST_TIMEOUT_MS,
    "damageReports.list"
  );
  if (Array.isArray(response)) {
    const rows = sanitizeDamageReportListRows(response);
    if (response.length > 0 && rows.length === 0) {
      throw new Error("Reports response contained rows without stable report IDs.");
    }
    return {
      rows,
      page: params.page ?? 1,
      pageSize: resolvedPageSize,
      limit: resolvedPageSize,
      total: rows.length,
      hasNextPage: rows.length >= resolvedPageSize,
      sort: queryParams.sort,
      filters: queryParams,
    };
  }
  const record = response && typeof response === "object" ? (response as Record<string, unknown>) : {};
  const data = record.data && typeof record.data === "object" && !Array.isArray(record.data) ? (record.data as Record<string, unknown>) : null;
  const rawRows =
    (Array.isArray(record.rows) ? record.rows : null) ??
    (Array.isArray(record.reports) ? record.reports : null) ??
    (Array.isArray(record.items) ? record.items : null) ??
    (Array.isArray(record.results) ? record.results : null) ??
    (Array.isArray(record.report_metadata) ? record.report_metadata : null) ??
    (Array.isArray(record.reportMetadata) ? record.reportMetadata : null) ??
    (Array.isArray(record.reports_metadata) ? record.reports_metadata : null) ??
    (Array.isArray(record.data) ? record.data : null) ??
    (data && Array.isArray(data.rows) ? data.rows : null) ??
    (data && Array.isArray(data.reports) ? data.reports : null) ??
    (data && Array.isArray(data.report_metadata) ? data.report_metadata : null) ??
    [];
  const rows = sanitizeDamageReportListRows(rawRows);
  if (rawRows.length > 0 && rows.length === 0) {
    throw new Error("Reports response contained rows without stable report IDs.");
  }
  const page = Number(record.page ?? data?.page ?? params.page ?? 1);
  const pageSize = Number(record.pageSize ?? record.limit ?? data?.pageSize ?? data?.limit ?? resolvedPageSize);
  const total = Number(record.total ?? data?.total ?? rows.length);
  const hasNextPage =
    typeof record.hasNextPage === "boolean"
      ? record.hasNextPage
      : typeof data?.hasNextPage === "boolean"
        ? data.hasNextPage
        : rows.length >= pageSize && page * pageSize < total;
  return {
    rows: rows as ReportListRow[],
    page,
    pageSize,
    limit: Number(record.limit ?? data?.limit ?? pageSize),
    total,
    hasNextPage,
    sort: typeof record.sort === "string" ? record.sort : queryParams.sort,
    filters: (record.filters && typeof record.filters === "object" ? record.filters : queryParams) as Record<string, unknown>,
  };
}

function reportListRowToDamageReport(row: ReportListRow): ReportDamageApiRow {
  const normalized = normalizeReportListRows([row])[0];
  const raw = row as Record<string, unknown>;
  return normalizeDamageReportRow({
    ...raw,
    report_id: normalized?.reportId || normalized?.id || row.report_id || raw.id,
    vin: normalized?.vin || row.vin,
    inspection_type_number: normalized?.inspectionTypeNumber || raw.inspection_type_number,
    status: normalized?.status || raw.status,
    inspector_email: normalized?.inspectorEmail || raw.inspector_email,
    created_at: normalized?.createdAt || raw.created_at,
    updated_at: normalized?.updatedAt || raw.updated_at,
    location_id: normalized?.facilityId || raw.location_id,
    facility_id: normalized?.facilityId || raw.facility_id,
    location_label: normalized?.locationLabel || raw.location_label,
    location_name: normalized?.locationLabel || raw.location_name,
    facility: normalized?.facilityName || raw.facility,
    navigation: normalized?.locationLabel || raw.navigation,
    yard: normalized?.yardName || raw.yard,
    yard_id: normalized?.yardId || raw.yard_id,
    yard_name: normalized?.yardName || raw.yard_name,
    yard_label: normalized?.yardName || raw.yard_label,
    photo_urls: normalized?.photoUrls ?? raw.photo_urls,
    splat_urls: normalized?.splatUrls ?? raw.splat_urls,
    pdf_url: normalized?.pdfUrl || raw.pdf_url,
    damage_summary: Array.isArray(raw.damage_summary) ? raw.damage_summary : [],
    damage_entries: Array.isArray(raw.damage_entries)
      ? raw.damage_entries
      : Array.isArray(raw.damageEntries)
        ? raw.damageEntries
        : [],
    metadata: {
      ...(raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata) ? raw.metadata : {}),
      listEndpoint: REPORTS_LIST_ENDPOINT,
      listRow: true,
    },
  } as ReportDamageApiRow);
}

export async function fetchDamageReportListSnapshot(params: ReportListParams = {}): Promise<ReportDamageApiRow[]> {
  const resolvedPage = params.page ?? 1;
  const resolvedPageSize = params.pageSize ?? params.limit ?? 100;
  const response = await fetchReportList({
    ...params,
    page: resolvedPage,
    pageSize: resolvedPageSize,
    limit: params.limit ?? params.pageSize ?? resolvedPageSize,
    sort: params.sort ?? "created_at_desc",
  });
  let merged = response.rows.map(reportListRowToDamageReport);

  if (
    resolvedPage !== 1 ||
    !response.hasNextPage ||
    !response.rows.length ||
    response.rows.length < response.pageSize
  ) {
    return merged;
  }

  const effectiveTotal = response.hasNextPage && response.total <= merged.length ? null : response.total;
  const endPage = getPaginatedFetchEndPage(effectiveTotal, response.pageSize, DAMAGE_REPORTS_SNAPSHOT_MAX_PAGES);
  for (let batchStart = 2; batchStart <= endPage; batchStart += REPORTS_PAGINATION_BATCH_SIZE) {
    const batchPages = Array.from(
      { length: Math.min(REPORTS_PAGINATION_BATCH_SIZE, endPage - batchStart + 1) },
      (_, index) => batchStart + index
    );
    const pageResults = await Promise.allSettled(
      batchPages.map(async (page) => ({
        page,
        response: await fetchReportList({
          ...params,
          page,
          pageSize: response.pageSize,
          limit: response.pageSize,
          sort: params.sort ?? "created_at_desc",
        }),
      }))
    );
    const rejectedResult = pageResults.find((result): result is PromiseRejectedResult => result.status === "rejected");
    if (rejectedResult) {
      throw rejectedResult.reason;
    }

    let shouldStop = false;
    for (const result of pageResults) {
      if (result.status !== "fulfilled") continue;
      const nextResponse = result.value.response;
      const nextRows = nextResponse.rows.map(reportListRowToDamageReport);
      if (!nextRows.length) {
        shouldStop = true;
        break;
      }

      const beforeCount = merged.length;
      merged = mergeReportsById(merged, nextRows);
      const hasReliableTotal = nextResponse.total > merged.length || !nextResponse.hasNextPage;
      if (!nextResponse.hasNextPage) shouldStop = true;
      if (hasReliableTotal && nextResponse.total > 0 && merged.length >= nextResponse.total) shouldStop = true;
      if (nextResponse.rows.length < nextResponse.pageSize) shouldStop = true;
      if (merged.length === beforeCount) shouldStop = true;
      if (shouldStop) break;
    }

    if (shouldStop) {
      break;
    }
  }

  return merged;
}

export async function fetchDamageReportDetail(reportId: string): Promise<ReportDamageApiRow | null> {
  const normalizedReportId = reportId.trim();
  if (!normalizedReportId) return null;
  const response = await apiFetchReport<unknown>(
    `${REPORTS_ENDPOINT}${buildReportQueryString({ report_id: normalizedReportId })}`,
    {},
    REPORT_DETAIL_TIMEOUT_MS,
    "damageReports.detail"
  );
  const parsedReports = extractDamageReportsArray(response);
  const normalizedReports = parsedReports.map((report) => normalizeDamageReportRow(report));
  return normalizedReports.find((report) => report.report_id === normalizedReportId) ?? null;
}

function getDamageReportOrganizationId(filters: ReportFilters = {}): string | null {
  const candidate = filters.organization_id ?? filters.org_id;
  const normalized = candidate?.toString().trim();
  return normalized ? normalized : null;
}

function resolveStringCandidate(...candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === "string") {
      const normalized = candidate.trim();
      if (normalized) {
        return normalized;
      }
    }
  }
  return null;
}

function normalizeSplatImageUrl(report: Record<string, unknown>): string | null {
  const nestedReport = report.report && typeof report.report === "object" ? (report.report as Record<string, unknown>) : null;
  const nestedPayload = report.payload && typeof report.payload === "object" ? (report.payload as Record<string, unknown>) : null;
  return resolveStringCandidate(
    report.splatImageUrl,
    report.splat_image_url,
    report.splatUrl,
    report.splat_url,
    report.splat_chart_url,
    report.splatChartUrl,
    report.splatChart,
    report.mapPhoto,
    nestedReport?.splatImageUrl,
    nestedReport?.splat_image_url,
    nestedReport?.splatUrl,
    nestedReport?.splat_url,
    nestedPayload?.splatImageUrl,
    nestedPayload?.splat_image_url,
    nestedPayload?.splatUrl,
    nestedPayload?.splat_url,
    Array.isArray(report.splat_urls) ? report.splat_urls[0] : null,
    Array.isArray(report.splat_urls_original) ? report.splat_urls_original[0] : null
  );
}

function readNestedObject(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function resolveDamageReportSplatImageUrl(report: ReportDamageApiRow | Record<string, unknown>): string | null {
  const record = report as Record<string, unknown>;
  return normalizeSplatImageUrl(record);
}

function normalizeDamageReportRow(report: ReportDamageApiRow | Record<string, unknown>): ReportDamageApiRow {
  const record = report as Record<string, unknown>;
  const location = readNestedObject(record, "location");
  const metadata = readNestedObject(record, "metadata");
  const payload = readNestedObject(record, "payload");
  const nestedReport = readNestedObject(record, "report");
  const payloadMetadata = payload ? readNestedObject(payload, "metadata") : null;
  const nestedReportMetadata = nestedReport ? readNestedObject(nestedReport, "metadata") : null;
  const reportId = resolveStringCandidate(
    record.report_id,
    record.reportId,
    record.id,
    (record.report as Record<string, unknown> | undefined)?.report_id,
    (record.report as Record<string, unknown> | undefined)?.reportId
  );
  const organizationId = resolveStringCandidate(
    record.organization_id,
    record.organizationId,
    record.org_id,
    record.orgId,
    record.tenant_id,
    record.tenantId
  );
  const createdAt = resolveStringCandidate(
    record.created_at,
    record.createdAt,
    record.submitted_at,
    record.submittedAt,
    record.updated_at,
    record.updatedAt
  );
  const updatedAt = resolveStringCandidate(
    record.updated_at,
    record.updatedAt,
    record.created_at,
    record.createdAt,
    record.submitted_at,
    record.submittedAt
  );
  const locationId = resolveStringCandidate(
    record.location_id,
    record.locationId,
    record.facility_id,
    record.facilityId,
    location?.location_id,
    location?.locationId,
    location?.facility_id,
    location?.facilityId,
    metadata?.location_id,
    metadata?.facility_id,
    payload?.location_id,
    payload?.facility_id,
    nestedReport?.location_id,
    nestedReport?.facility_id
  );
  const facilityId = resolveStringCandidate(
    record.facility_id,
    record.facilityId,
    record.location_id,
    record.locationId,
    location?.facility_id,
    location?.facilityId,
    location?.location_id,
    location?.locationId,
    metadata?.facility_id,
    metadata?.location_id,
    payload?.facility_id,
    payload?.location_id,
    nestedReport?.facility_id,
    nestedReport?.location_id
  );
  const locationLabel = resolveStringCandidate(
    record.location_label,
    record.locationLabel,
    location?.location_label,
    location?.locationLabel,
    metadata?.location_label,
    payload?.location_label,
    nestedReport?.location_label
  );
  const locationName = resolveStringCandidate(
    record.location_name,
    record.locationName,
    location?.location_name,
    location?.locationName,
    metadata?.location_name,
    payload?.location_name,
    nestedReport?.location_name
  );
  const facility = resolveStringCandidate(
    record.facility,
    record.facility_name,
    record.facilityName,
    location?.facility,
    metadata?.facility,
    metadata?.facility_name,
    metadata?.facilityName,
    payload?.facility,
    payload?.facility_name,
    payload?.facilityName,
    nestedReport?.facility,
    nestedReport?.facility_name,
    nestedReport?.facilityName
  );
  const navigation = resolveStringCandidate(
    record.navigation,
    record.navFacility,
    location?.navigation,
    metadata?.navigation,
    metadata?.navigation_row,
    payload?.navigation,
    payload?.navigation_row,
    nestedReport?.navigation,
    nestedReport?.navigation_row
  );
  const yardId = resolveStringCandidate(
    record.yard_id,
    record.yardId,
    metadata?.yard_id,
    metadata?.yardId,
    payload?.yard_id,
    payload?.yardId,
    payloadMetadata?.yard_id,
    payloadMetadata?.yardId,
    nestedReport?.yard_id,
    nestedReport?.yardId,
    nestedReportMetadata?.yard_id,
    nestedReportMetadata?.yardId,
    location?.yard_id,
    location?.yardId
  );
  const yard = resolveStringCandidate(
    record.yard,
    record.yard_name,
    record.yardName,
    record.yard_label,
    record.yardLabel,
    metadata?.yard,
    metadata?.yard_name,
    metadata?.yardName,
    metadata?.yard_label,
    metadata?.yardLabel,
    payload?.yard,
    payload?.yard_name,
    payload?.yardName,
    payload?.yard_label,
    payload?.yardLabel,
    payloadMetadata?.yard,
    payloadMetadata?.yard_name,
    payloadMetadata?.yardName,
    payloadMetadata?.yard_label,
    payloadMetadata?.yardLabel,
    nestedReport?.yard,
    nestedReport?.yard_name,
    nestedReport?.yardName,
    nestedReport?.yard_label,
    nestedReport?.yardLabel,
    nestedReportMetadata?.yard,
    nestedReportMetadata?.yard_name,
    nestedReportMetadata?.yardName,
    nestedReportMetadata?.yard_label,
    nestedReportMetadata?.yardLabel,
    location?.yard,
    location?.yard_name,
    location?.yardName,
    location?.yard_label,
    location?.yardLabel
  );
  const splatImageUrl = normalizeSplatImageUrl(record);
  const splatUrls = Array.isArray(record.splat_urls)
    ? record.splat_urls.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
    : [];
  const splatUrlsOriginal = Array.isArray(record.splat_urls_original)
    ? record.splat_urls_original.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
    : [];
  const normalizedSplatUrls = Array.from(new Set([...(splatUrlsOriginal.length ? splatUrlsOriginal : splatUrls), ...(splatImageUrl ? [splatImageUrl] : [])]));
  return {
    ...(report as ReportDamageApiRow),
    report_id: reportId || (record.report_id as string) || "",
    ...(organizationId ? { organization_id: organizationId } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {}),
    ...(locationId ? { location_id: locationId } : {}),
    ...(facilityId ? { facility_id: facilityId } : {}),
    ...(locationLabel ? { location_label: locationLabel } : {}),
    ...(locationName ? { location_name: locationName } : {}),
    ...(facility ? { facility } : {}),
    ...(navigation ? { navigation } : {}),
    ...(yardId ? { yard_id: yardId } : {}),
    ...(yard ? { yard, yard_name: yard, yard_label: yard } : {}),
    ...(splatImageUrl ? { splatImageUrl } : {}),
    ...(normalizedSplatUrls.length ? { splat_urls: normalizedSplatUrls } : {}),
  };
}

function normalizeRsaReportRow(report: RsaReportApiRow | Record<string, unknown>): RsaReportApiRow {
  const record = report as Record<string, unknown>;
  const location = readNestedObject(record, "location");
  const payload = readNestedObject(record, "payload");
  const railcarScan = readNestedObject(record, "railcar_scan");
  const reportId = resolveStringCandidate(record.report_id, record.reportId, record.id);
  const organizationId = resolveStringCandidate(record.organization_id, record.organizationId, record.org_id, record.orgId);
  const createdAt = resolveStringCandidate(
    record.created_at,
    record.createdAt,
    record.submitted_at,
    record.submittedAt,
    record.updated_at,
    record.updatedAt
  );
  const updatedAt = resolveStringCandidate(
    record.updated_at,
    record.updatedAt,
    record.created_at,
    record.createdAt,
    record.submitted_at,
    record.submittedAt
  );
  const locationId = resolveStringCandidate(record.location_id, record.locationId, record.facility_id, record.facilityId, location?.location_id, location?.locationId, location?.facility_id, location?.facilityId, payload?.location_id, payload?.facility_id, railcarScan?.location_id, railcarScan?.facility_id);
  const facilityId = resolveStringCandidate(record.facility_id, record.facilityId, record.location_id, record.locationId, location?.facility_id, location?.facilityId, location?.location_id, location?.locationId, payload?.facility_id, payload?.location_id, railcarScan?.facility_id, railcarScan?.location_id);
  const locationLabel = resolveStringCandidate(record.location_label, record.locationLabel, location?.location_label, location?.locationLabel, payload?.location_label, railcarScan?.location_label);
  const locationName = resolveStringCandidate(record.location_name, record.locationName, location?.location_name, location?.locationName, payload?.location_name, railcarScan?.location_name);
  const facility = resolveStringCandidate(record.facility, record.facility_name, record.facilityName, location?.facility, payload?.facility, payload?.facility_name, payload?.facilityName, railcarScan?.facility, railcarScan?.facility_name, railcarScan?.facilityName);
  const navigation = resolveStringCandidate(record.navigation, record.navFacility, location?.navigation, payload?.navigation, payload?.navigation_row, railcarScan?.navigation, railcarScan?.navigation_row);
  return {
    ...(report as RsaReportApiRow),
    report_id: reportId || (record.report_id as string) || "",
    ...(organizationId ? { organization_id: organizationId } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {}),
    ...(locationId ? { location_id: locationId } : {}),
    ...(facilityId ? { facility_id: facilityId } : {}),
    ...(locationLabel ? { location_label: locationLabel } : {}),
    ...(locationName ? { location_name: locationName } : {}),
    ...(facility ? { facility } : {}),
    ...(navigation ? { navigation } : {}),
  };
}

function getReportOrgFields(report: ReportDamageApiRow): DamageReportOrgFields {
  const payload = report as unknown as Record<string, unknown>;
  return {
    organization_id: payload.organization_id,
    organizationId: payload.organizationId,
    org_id: payload.org_id,
    orgId: payload.orgId,
    organization: payload.organization,
    org: payload.org,
    tenant_id: payload.tenant_id,
    tenantId: payload.tenantId,
  };
}

function resolveOrgFieldString(value: unknown): string | null {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedCandidates = [
      record.organization_id,
      record.organizationId,
      record.org_id,
      record.orgId,
      record.id,
    ];
    for (const nested of nestedCandidates) {
      const normalized = resolveOrgFieldString(nested);
      if (normalized) {
        return normalized;
      }
    }
  }
  return null;
}

function matchesDamageReportOrganization(report: ReportDamageApiRow, currentOrganizationId: string): boolean {
  const fields = getReportOrgFields(report);
  const candidates = [
    fields.organization_id,
    fields.organizationId,
    fields.org_id,
    fields.orgId,
    fields.organization,
    fields.org,
    fields.tenant_id,
    fields.tenantId,
    report.metadata,
    report.payload,
    report.report,
    report.overview,
  ];
  return candidates.some((candidate) => resolveOrgFieldString(candidate) === currentOrganizationId);
}

export async function fetchDamageReportsUncached(filters: ReportFilters = {}): Promise<ReportDamageApiRow[]> {
  const damageFilters = { ...filters };
  const currentOrganizationId = getDamageReportOrganizationId(damageFilters);
  delete damageFilters.organization_id;
  delete damageFilters.org_id;
  const queryString = buildNamedQueryString({
    ...damageFilters,
    ...(ACTIVE_PORTAL_BRANDING === "definianInspection"
      ? {
          include_damage_entries: true,
          include_overview: true,
          include_location: true,
          include_pdf: true,
          include_media: true,
          include_image_thumbs: true,
        }
      : {}),
  });
  const response = await apiFetchReport<unknown>(
    `${REPORTS_ENDPOINT}${queryString}`,
    {},
    REPORT_DETAIL_TIMEOUT_MS,
    "damageReports.legacyPull"
  );
  const parsedReports = extractDamageReportsArray(response);
  const normalizedReports = parsedReports.map((report) => normalizeDamageReportRow(report));
  const results = currentOrganizationId
    ? normalizedReports.filter((report) => matchesDamageReportOrganization(report, currentOrganizationId))
    : normalizedReports;
  if (process.env.NODE_ENV === "development") {
    console.info("[damage-reports] uncached", {
      reportPullCount: parsedReports.length,
      normalizedDamageReportCount: normalizedReports.length,
      filteredDamageReportCount: results.length,
      firstFields: normalizedReports[0]
        ? {
            report_id: normalizedReports[0].report_id,
            organization_id: normalizedReports[0].organization_id,
            created_at: normalizedReports[0].created_at,
            updated_at: normalizedReports[0].updated_at,
            reportId: (normalizedReports[0] as unknown as Record<string, unknown>).reportId,
            createdAt: (normalizedReports[0] as unknown as Record<string, unknown>).createdAt,
            submitted_at: (normalizedReports[0] as unknown as Record<string, unknown>).submitted_at,
            submittedAt: (normalizedReports[0] as unknown as Record<string, unknown>).submittedAt,
          }
        : {},
    });
  }
  return results;
}

export async function fetchRsaReportsUncached(): Promise<RsaReportApiRow[]> {
  const results = await fetchAllRsaReportPages();
  if (process.env.NODE_ENV === "development") {
    console.info("[rsa-reports] uncached", {
      reportPullCount: results.length,
      normalizedRsaReportCount: results.length,
      firstFields: results[0]
        ? {
            report_id: results[0].report_id,
            organization_id: results[0].organization_id,
            created_at: results[0].created_at,
            updated_at: results[0].updated_at,
          }
        : {},
    });
  }
  return results;
}

export class ReportsAdapter {
  static clearCache() {
    return;
  }

  static async updateDamageReport(reportId: string, payload: Record<string, unknown>): Promise<unknown> {
    if (isDevMockEnabled()) {
      return { ok: true, report_id: reportId, payload };
    }
    const normalizedReportId = reportId?.toString().trim();
    if (!normalizedReportId) {
      throw new Error("This report does not have a valid report id.");
    }
    const result = await apiFetch<unknown>(`${REPORT_MUTATIONS_ENDPOINT}/${encodeURIComponent(normalizedReportId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      portal: {
        callerLabel: "damageReports.update",
        timeoutMs: REPORT_DETAIL_TIMEOUT_MS,
      },
    });
    this.clearCache();
    return result;
  }

  static async fetchDamageReports(filters: ReportFilters = {}): Promise<ReportDamageApiRow[]> {
    const damageFilters = { ...filters };
    const currentOrganizationId = getDamageReportOrganizationId(damageFilters);
    delete damageFilters.organization_id;
    delete damageFilters.org_id;
    const queryString = buildReportQueryString(damageFilters);

    try {
      const resolvedUrl = buildApiUrl(`${REPORTS_ENDPOINT}${queryString}`);
      const authToken = await getPortalAccessToken();
      if (process.env.NODE_ENV === "development") {
        console.info("[damage-reports] request", {
          endpoint: REPORTS_ENDPOINT,
          queryString,
          resolvedUrl,
          requestHasOrgQuery: queryString.includes("organization_id=") || queryString.includes("org_id="),
          currentOrganizationId,
          filters: damageFilters,
          authorizationPresent: Boolean(authToken),
        });
      }
      const response = await apiFetchReport<unknown>(
        `${REPORTS_ENDPOINT}${queryString}`,
        {},
        REPORT_DETAIL_TIMEOUT_MS,
        "damageReports.adapterPull"
      );
      const parsedReports = extractDamageReportsArray(response);
      const normalizedReports = parsedReports.map((report) => normalizeDamageReportRow(report));
      const results = currentOrganizationId
        ? normalizedReports.filter((report) => matchesDamageReportOrganization(report, currentOrganizationId))
        : normalizedReports;
      if (process.env.NODE_ENV === "development") {
        console.info("[damage-reports] parsed reports", {
          rawCount: parsedReports.length,
          count: results.length,
          firstKeys:
            results[0] && typeof results[0] === "object"
              ? Object.keys(results[0] as unknown as Record<string, unknown>)
              : [],
        });
        if (normalizedReports.length > 0) {
          const first = normalizedReports[0] as unknown as Record<string, unknown>;
          console.info("[damage-reports] normalized sample", {
            reportPullCount: parsedReports.length,
            normalizedDamageReportCount: normalizedReports.length,
            firstFields: {
              report_id: first.report_id,
              organization_id: first.organization_id,
              created_at: first.created_at,
              updated_at: first.updated_at,
              reportId: first.reportId,
              createdAt: first.createdAt,
              submitted_at: first.submitted_at,
              submittedAt: first.submittedAt,
            },
          });
        }
        if (parsedReports.length > 0 && results.length === 0) {
          console.warn("Backend returned reports, but none matched current organization ID", {
            currentOrganizationId,
            firstReportOrgFields:
              parsedReports[0] && typeof parsedReports[0] === "object"
                ? getReportOrgFields(parsedReports[0] as ReportDamageApiRow)
                : {},
          });
        }
      }
      return results;
    } catch (err) {
      const responseError = err as { status?: number; message?: string };
      if (responseError.status === 404) {
        console.error("Damage reports endpoint missing.", err);
      }
      if (process.env.NODE_ENV === "development") {
        console.warn("[damage-reports] fetch failed", {
          status: responseError.status ?? null,
          message: err instanceof Error ? err.message : String(err),
        });
      }
      throw err;
    }
  }

  static async fetchRsaReports(): Promise<RsaReportApiRow[]> {
    try {
      return await fetchAllRsaReportPages();
    } catch (err) {
      const responseError = err as { status?: number; message?: string };
      if (responseError.status === 404) {
        console.error("RSA reports endpoint missing.", err);
        throw new Error(`Failed to fetch RSA reports: ${responseError.message}`);
      }
      throw err;
    }
  }

  static async fetchMilestones(): Promise<unknown[]> {
    if (isDevMockEnabled()) {
      return [];
    }
    const response = await apiFetch<unknown>(MILESTONE_FETCH_ENDPOINT, {
      portal: {
        callerLabel: "milestones.fetch",
        timeoutMs: REPORT_LIST_TIMEOUT_MS,
      },
    });
    const results = extractReportsArray<unknown>(response);
    return results;
  }

  static async submitMilestone(payload: Record<string, unknown>): Promise<unknown> {
    if (isDevMockEnabled()) {
      return { ok: true, submitted: payload };
    }
    const result = await apiFetch<unknown>(MILESTONE_SUBMIT_ENDPOINT, {
      method: "POST",
      body: JSON.stringify(payload),
      portal: {
        callerLabel: "milestones.submit",
        timeoutMs: REPORT_DETAIL_TIMEOUT_MS,
      },
    });
    return result;
  }
 
  static async deleteReport(reportId: string): Promise<boolean> {
    if (isDevMockEnabled()) {
      return true;
    }
    await apiFetch(`${REPORT_MUTATIONS_ENDPOINT}/${reportId}`, {
      method: "DELETE",
      portal: {
        callerLabel: "reports.delete",
        timeoutMs: REPORT_DETAIL_TIMEOUT_MS,
      },
    });
    // Clear cache to ensure the report vanishes from lists on next fetch
    this.clearCache();
    return true;
  }

  static resolveDamageReportPdfUrl(report: ReportDamageApiRow): string | null {
    const reportRecord = report as unknown as Record<string, unknown>;
    const media = reportRecord.media && typeof reportRecord.media === "object" ? (reportRecord.media as Record<string, unknown>) : {};
    const mediaPayload =
      reportRecord.mediaPayload && typeof reportRecord.mediaPayload === "object"
        ? (reportRecord.mediaPayload as Record<string, unknown>)
        : reportRecord.media_payload && typeof reportRecord.media_payload === "object"
          ? (reportRecord.media_payload as Record<string, unknown>)
          : {};
    const candidates = [
      report.pdf_url,
      (report as { pdfUrl?: unknown }).pdfUrl,
      (report as { report_pdf_url?: unknown }).report_pdf_url,
      (report as { pdf_url_original?: unknown }).pdf_url_original,
      report.overview?.pdf_url,
      media.pdfUrl,
      media.pdf_url,
      mediaPayload.pdfUrl,
      mediaPayload.pdf_url,
      Array.isArray(mediaPayload.pdfUrls) ? mediaPayload.pdfUrls[0] : null,
      Array.isArray(mediaPayload.pdf_urls) ? mediaPayload.pdf_urls[0] : null,
    ]
      .map((value) => value?.toString().trim())
      .filter(Boolean) as string[];
    return candidates.length > 0 ? normalizeMediaUrl(candidates[0]) : null;
  }

  static async fetchDamageReportPdf(report: ReportDamageApiRow): Promise<{ blob: Blob; fileName: string } | null> {
    const pdfUrl = this.resolveDamageReportPdfUrl(report);
    if (!pdfUrl) return null;
    const response = await fetch("/api/portal/pdf-download", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: pdfUrl }),
    });
    if (!response.ok) {
      throw new Error(`Unable to download report PDF (${response.status}).`);
    }
    const reportLabel = `${report.vin || report.report_id || "report"}`.trim().replace(/[^a-z0-9_-]+/gi, "_");
    return {
      blob: await response.blob(),
      fileName: `${reportLabel}_${report.report_id.slice(0, 8)}.pdf`,
    };
  }

  static async fetchDamageReportPhotosArchive(report: ReportDamageApiRow): Promise<{ blob: Blob; fileName: string }> {
    const reportId = report.report_id?.toString().trim();
    if (!reportId) {
      throw new Error("This report does not have a valid report id.");
    }
    const reportLabel = `${report.vin || report.report_id || "report"}`.trim().replace(/[^a-z0-9_-]+/gi, "_");
    if (isDevMockEnabled()) {
      return { blob: new Blob(), fileName: `${reportLabel}_photos.zip` };
    }
    const response = await apiFetchResponse(`${REPORT_MUTATIONS_ENDPOINT}/${encodeURIComponent(reportId)}/photos/archive`, {
      method: "GET",
      portal: {
        callerLabel: "damageReports.photosArchive",
        timeoutMs: REPORT_DETAIL_TIMEOUT_MS,
      },
    });
    if (!response.ok) {
      let message = `Unable to download report photos (${response.status}).`;
      try {
        const body = await response.json();
        if (body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string") {
          message = (body as { error: string }).error;
        }
      } catch {
        // Keep the status-based message.
      }
      throw new Error(message);
    }
    return { blob: await response.blob(), fileName: `${reportLabel}_photos.zip` };
  }

  static async downloadDamageReportPhotosZip(report: ReportDamageApiRow): Promise<void> {
    const archive = await this.fetchDamageReportPhotosArchive(report);
    if (isDevMockEnabled()) return;
    const url = URL.createObjectURL(archive.blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = archive.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
