import { apiFetch } from "@/lib/apiClient";

const TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT = "/inspection/24-hour/display";
const TWENTY_FOUR_HOUR_TIMEOUT_MS = 15_000;
const TWENTY_FOUR_HOUR_DEFAULT_PAGE_SIZE = 250;
const TWENTY_FOUR_HOUR_MAX_PAGE_SIZE = 500;

export const TWENTY_FOUR_HOUR_STATUSES = ["normal", "due_12h", "critical", "overdue", "inspected"] as const;
export type TwentyFourHourStatus = (typeof TWENTY_FOUR_HOUR_STATUSES)[number];
export type TwentyFourHourRecordFilter = "all" | "uninspected" | "inspected" | TwentyFourHourStatus;

type Dictionary = Record<string, unknown>;

export type TwentyFourHourPagination = {
  page: number;
  page_size: number;
  total_count: number;
  returned_count: number;
  has_more: boolean;
};

export type TwentyFourHourInspectionRow = {
  id: string;
  inventory_row_id: string;
  snapshot_id: string;
  vin: string;
  bucket: "needs_inspected" | "inspected";
  inspected: boolean;
  severity: TwentyFourHourStatus;
  display_label: string;
  display_background?: string | null;
  display_background_color?: string | null;
  display_text_color?: string | null;
  first_seen_at: string;
  last_seen_at: string;
  current_server_time: string;
  time_in_inventory_seconds: number;
  time_until_24h_seconds: number;
  overdue_seconds: number;
  inspected_at?: string | null;
  inspector?: string | null;
  user?: string | null;
  report_id?: string | null;
  reportId?: string | null;
  inspection_id?: string | null;
  source_csv_date?: string | null;
  source_import_id?: string | null;
  organization_id?: string | null;
  organization_suborg?: string | null;
  yard?: string | null;
  yard_id?: string | null;
  yard_name?: string | null;
  yard_label?: string | null;
  facility?: string | null;
  facility_id?: string | null;
  facility_code?: string | null;
  location_id?: string | null;
  location_label?: string | null;
  location_name?: string | null;
  bay?: string | null;
  row?: string | number | null;
  row_number?: string | number | null;
  spot?: string | number | null;
  location?: string | null;
  inventory_bay?: string | null;
  inventoryBay?: string | null;
  confirmed_bay?: string | null;
  confirmedBay?: string | null;
  sector?: string | null;
};

export type TwentyFourHourSnapshot = {
  id: string;
  status: "completed";
  capture_time: string;
  completed_at: string;
  filename?: string | null;
  total_raw_rows: number;
  accepted_active_rows: number;
  excluded_stale_rows: number;
  rejected_malformed_rows: number;
  deduplicated_rows: number;
};

export type TwentyFourHourInspectionSummary = Record<TwentyFourHourStatus, number> & {
  total_active: number;
  needs_inspected: number;
  inspected: number;
};

export type TwentyFourHourInspectionTotals = {
  total_active: number;
  needs_inspected: number;
  inspected: number;
};

export type TwentyFourHourFilterOptions = Dictionary;

export type TwentyFourHourAppliedFilters = Dictionary;

export type TwentyFourHourInspectionResponse = {
  ok: true;
  request_id: string;
  inspection_type: "24_hour";
  generated_at: string;
  current_server_time: string;
  archive_window_days: number;
  snapshot: TwentyFourHourSnapshot;
  pagination: TwentyFourHourPagination;
  summary: TwentyFourHourInspectionSummary;
  totals: TwentyFourHourInspectionTotals;
  filter_options: TwentyFourHourFilterOptions;
  filters: TwentyFourHourAppliedFilters;
  metadata: {
    total_raw_rows: number;
    accepted_active_rows: number;
    excluded_stale_rows: number;
    rejected_malformed_rows: number;
    deduplicated_rows: number;
    client_rejected_rows: number;
    client_excluded_stale_rows: number;
    client_deduplicated_rows: number;
  };
  rows: TwentyFourHourInspectionRow[];
  warnings: string[];
};

export type TwentyFourHourInspectionParams = {
  signal?: AbortSignal;
  requestId?: string;
  page?: number;
  pageSize?: number;
  page_size?: number;
  facility?: string;
  facilityId?: string;
  facility_id?: string;
  yard?: string;
  yardId?: string;
  yard_id?: string;
  bucket?: string;
  severity?: TwentyFourHourStatus;
  inspected?: boolean | string;
  historyDays?: number | string;
  history_days?: number | string;
  organizationId?: string;
  organization_id?: string;
  organizationSuborg?: string;
  organization_suborg?: string;
  maxRows?: number;
  max_rows?: number;
};

export class TwentyFourHourContractError extends Error {
  requestId: string;

  constructor(message: string, requestId: string) {
    super(`${message} (requestId=${requestId})`);
    this.name = "TwentyFourHourContractError";
    this.requestId = requestId;
  }
}

function clampPage(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return fallback;
  const sanitized = Math.floor(parsed);
  if (sanitized < 1) return 1;
  return sanitized;
}

function clampPageSize(value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return TWENTY_FOUR_HOUR_DEFAULT_PAGE_SIZE;
  const sanitized = Math.floor(parsed);
  if (sanitized < 1) return 1;
  return Math.min(sanitized, TWENTY_FOUR_HOUR_MAX_PAGE_SIZE);
}

function clampMaxRows(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.floor(parsed);
}

function pickTextValue(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return undefined;
}

export function buildTwentyFourHourDisplayEndpoint({
  page = 1,
  pageSize,
  page_size,
  facility = "",
  facilityId = "",
  facility_id = "",
  yard = "",
  yardId = "",
  yard_id = "",
  bucket,
  severity,
  inspected,
  historyDays,
  history_days,
  organizationId = "",
  organization_id = "",
  organizationSuborg = "",
  organization_suborg = "",
  maxRows,
  max_rows,
}: TwentyFourHourInspectionParams & {
  page?: number;
  pageSize?: number;
  page_size?: number;
  maxRows?: number;
  max_rows?: number;
}): string {
  const search = new URLSearchParams();
  const resolvedPage = clampPage(page, 1);
  const resolvedPageSize = clampPageSize(pageSize ?? page_size);
  search.set("page", String(resolvedPage));
  search.set("pageSize", String(resolvedPageSize));
  const resolvedMaxRows = clampMaxRows(maxRows || max_rows);
  if (resolvedMaxRows !== undefined) search.set("maxRows", String(resolvedMaxRows));

  const facilityFilter = pickTextValue(facility, facility_id, facilityId);
  const facilityAlias = facility ? "facility" : facility_id ? "facility_id" : facilityId ? "facilityId" : "";
  if (facilityFilter) search.set(facilityAlias, facilityFilter);

  const yardFilter = pickTextValue(yard, yard_id, yardId);
  const yardAlias = yard ? "yard" : yard_id ? "yard_id" : yardId ? "yardId" : "";
  if (yardFilter) search.set(yardAlias, yardFilter);

  if (bucket?.trim()) search.set("bucket", bucket.trim());
  if (severity?.trim()) search.set("severity", severity.trim());

  const inspectedValue = parseBoolean(inspected);
  if (inspectedValue === true || inspectedValue === false) search.set("inspected", String(inspectedValue));

  const history = pickTextValue(historyDays, history_days);
  if (history) search.set("historyDays", history);

  const orgId = pickTextValue(organizationId, organization_id);
  if (orgId) search.set("organizationId", orgId);
  const orgSuborg = pickTextValue(organizationSuborg, organization_suborg);
  if (orgSuborg) search.set("organizationSuborg", orgSuborg);

  return `${TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT}?${search.toString()}`;
}

export function parseBooleanSearchFilter(value: unknown): boolean | undefined {
  return parseBoolean(value);
}

function createRequestId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);
  return `inspection-24h-${Date.now().toString(36)}-${random}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function safeCount(source: Dictionary, key: string): number {
  return finiteNumber(source[key]) ?? 0;
}

function canonicalTimestamp(value: unknown): string {
  const candidate = text(value);
  if (!candidate || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(candidate)) return "";
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function readCount(value: unknown): number {
  return finiteNumber(value) ?? 0;
}

function validateSnapshot(value: unknown, requestId: string): TwentyFourHourSnapshot {
  if (!isRecord(value)) throw new TwentyFourHourContractError("The API did not return snapshot metadata", requestId);
  const id = text(value.id || value.snapshot_id);
  const captureTime = canonicalTimestamp(value.capture_time);
  const completedAt = canonicalTimestamp(value.completed_at);
  if (!id || value.status !== "completed" || !captureTime || !completedAt) {
    throw new TwentyFourHourContractError("The API returned an incomplete or non-completed snapshot", requestId);
  }
  return {
    id,
    status: "completed",
    capture_time: captureTime,
    completed_at: completedAt,
    filename: text(value.filename) || null,
    total_raw_rows: readCount(value.total_raw_rows),
    accepted_active_rows: readCount(value.accepted_active_rows),
    excluded_stale_rows: readCount(value.excluded_stale_rows),
    rejected_malformed_rows: readCount(value.rejected_malformed_rows),
    deduplicated_rows: readCount(value.deduplicated_rows),
  };
}

function validateRow(value: unknown, snapshotId: string): TwentyFourHourInspectionRow | "stale" | null {
  if (!isRecord(value)) return null;
  const id = text(value.id || value.inventory_row_id);
  const rowSnapshotId = text(value.snapshot_id);
  if (rowSnapshotId && rowSnapshotId !== snapshotId) return "stale";
  const vin = text(value.vin).toUpperCase();
  const severity = text(value.severity) as TwentyFourHourStatus;
  const inspected = value.inspected === true || value.bucket === "inspected";
  const firstSeenAt = canonicalTimestamp(value.first_seen_at);
  const lastSeenAt = canonicalTimestamp(value.last_seen_at);
  const currentServerTime = canonicalTimestamp(value.current_server_time);
  const timeInInventory = finiteNumber(value.time_in_inventory_seconds);
  const timeUntil24h = finiteNumber(value.time_until_24h_seconds);
  const overdue = finiteNumber(value.overdue_seconds);
  if (
    !id || !rowSnapshotId || !vin || !TWENTY_FOUR_HOUR_STATUSES.includes(severity) ||
    !firstSeenAt || !lastSeenAt || !currentServerTime ||
    timeInInventory === null || timeUntil24h === null || overdue === null ||
    (inspected && severity !== "inspected") || (!inspected && severity === "inspected")
  ) return null;
  return {
    ...(value as TwentyFourHourInspectionRow),
    id,
    inventory_row_id: id,
    snapshot_id: rowSnapshotId,
    vin,
    bucket: inspected ? "inspected" : "needs_inspected",
    inspected,
    severity,
    display_label: text(value.display_label) || severity,
    first_seen_at: firstSeenAt,
    last_seen_at: lastSeenAt,
    current_server_time: currentServerTime,
    time_in_inventory_seconds: timeInInventory,
    time_until_24h_seconds: inspected ? 0 : timeUntil24h,
    overdue_seconds: inspected ? 0 : overdue,
    inspected_at: value.inspected_at ? canonicalTimestamp(value.inspected_at) || null : null,
  };
}

function buildSummary(rows: TwentyFourHourInspectionRow[], sourceSummary: Dictionary): TwentyFourHourInspectionSummary {
  const rowCounts = Object.fromEntries(
    TWENTY_FOUR_HOUR_STATUSES.map((status) => [status, rows.filter((row) => row.severity === status).length])
  ) as Record<TwentyFourHourStatus, number>;
  const inspectedCount = rowCounts.inspected;
  const needsInspected = rows.length - inspectedCount;

  return {
    normal: safeCount(sourceSummary, "normal") || rowCounts.normal,
    due_12h: safeCount(sourceSummary, "due_12h") || rowCounts.due_12h,
    critical: safeCount(sourceSummary, "critical") || rowCounts.critical,
    overdue: safeCount(sourceSummary, "overdue") || rowCounts.overdue,
    inspected: safeCount(sourceSummary, "inspected") || inspectedCount,
    total_active: safeCount(sourceSummary, "total_active") || rows.length,
    needs_inspected: safeCount(sourceSummary, "needs_inspected") || needsInspected,
  };
}

function buildTotals(
  rows: TwentyFourHourInspectionRow[],
  summary: TwentyFourHourInspectionSummary,
  sourceTotals: Dictionary
): TwentyFourHourInspectionTotals {
  return {
    total_active: safeCount(sourceTotals, "total_active") || summary.total_active,
    needs_inspected: safeCount(sourceTotals, "needs_inspected") || summary.needs_inspected,
    inspected: safeCount(sourceTotals, "inspected") || summary.inspected,
  };
}

function normalizePagination(
  source: Dictionary,
  fallback: { page: number; page_size: number; total_count?: number; returned_count?: number; has_more?: boolean; }
): TwentyFourHourPagination {
  const page = finiteNumber(source.page) || fallback.page;
  const pageSize = finiteNumber(source.page_size) || fallback.page_size;
  const totalCount = finiteNumber(source.total_count) ?? fallback.total_count ?? 0;
  const returnedCount = finiteNumber(source.returned_count) ?? fallback.returned_count ?? 0;
  const hasMore = typeof source.has_more === "boolean"
    ? source.has_more
    : pageSize > 0 && totalCount > page * pageSize;

  return {
    page: Math.max(Math.floor(page), 1),
    page_size: pageSize,
    total_count: totalCount,
    returned_count: returnedCount,
    has_more: hasMore,
  };
}

export function validateTwentyFourHourInspectionResponse(
  value: unknown,
  fallbackRequestId: string,
  fallbackPagination: { page: number; page_size: number; } = {
    page: 1,
    page_size: TWENTY_FOUR_HOUR_DEFAULT_PAGE_SIZE,
  }
): TwentyFourHourInspectionResponse {
  if (!isRecord(value) || value.ok !== true || value.inspection_type !== "24_hour" || !Array.isArray(value.rows)) {
    throw new TwentyFourHourContractError("The 24-hour API response shape is unusable", fallbackRequestId);
  }
  const requestId = text(value.request_id) || fallbackRequestId;
  const snapshot = validateSnapshot(value.snapshot, requestId);
  const generatedAt = canonicalTimestamp(value.generated_at);
  const currentServerTime = canonicalTimestamp(value.current_server_time);
  if (!generatedAt || !currentServerTime) {
    throw new TwentyFourHourContractError("The API did not return canonical server timestamps", requestId);
  }

  const rows: TwentyFourHourInspectionRow[] = [];
  const seen = new Set<string>();
  let clientRejectedRows = 0;
  let clientExcludedStaleRows = 0;
  let clientDeduplicatedRows = 0;
  const rejectedSample: Array<{ index: number; reason: string }> = [];

  value.rows.forEach((candidate, index) => {
    const row = validateRow(candidate, snapshot.id);
    if (row === "stale") {
      clientExcludedStaleRows += 1;
      if (rejectedSample.length < 5) rejectedSample.push({ index, reason: "snapshot_mismatch" });
      return;
    }
    if (!row) {
      clientRejectedRows += 1;
      if (rejectedSample.length < 5) rejectedSample.push({ index, reason: "malformed_row" });
      return;
    }
    if (seen.has(row.inventory_row_id)) {
      clientDeduplicatedRows += 1;
      if (rejectedSample.length < 5) rejectedSample.push({ index, reason: "duplicate_row" });
      return;
    }
    seen.add(row.inventory_row_id);
    rows.push(row);
  });

  if (value.rows.length > 0 && rows.length === 0) {
    throw new TwentyFourHourContractError("Every returned inventory row failed contract validation", requestId);
  }
  if (process.env.NODE_ENV === "development") {
    console.warn("[inspection-24-hour] inspection_24_hour_rows_rejected", {
      request_id: requestId,
      rejected_malformed_count: clientRejectedRows,
      excluded_stale_snapshot_count: clientExcludedStaleRows,
      sample: rejectedSample,
    });
  }

  const sourceTotals = isRecord(value.totals) ? value.totals : {};
  const sourceSummary = isRecord(value.summary) ? value.summary : {};
  const sourceMetadata = isRecord(value.metadata) ? value.metadata : {};
  const acceptedActiveRows = readCount((sourceMetadata as Dictionary).accepted_active_rows)
    || readCount((sourceSummary as Dictionary).accepted_active_rows)
    || snapshot.accepted_active_rows;
  const sourcePagination = isRecord(value.pagination) ? value.pagination : {};
  const summary = buildSummary(rows, sourceSummary);
  const totals = buildTotals(rows, summary, sourceTotals);
  const pagination = normalizePagination(sourcePagination, {
    page: fallbackPagination.page,
    page_size: fallbackPagination.page_size,
    total_count: rows.length,
    returned_count: rows.length,
    has_more: false,
  });

  return {
    ok: true,
    request_id: requestId,
    inspection_type: "24_hour",
    generated_at: generatedAt,
    current_server_time: currentServerTime,
    archive_window_days: finiteNumber(value.archive_window_days) ?? 3,
    snapshot,
    pagination,
    summary,
    totals,
    filter_options: isRecord(value.filter_options) ? value.filter_options : {},
    filters: isRecord(value.filters) ? value.filters : {},
    metadata: {
      total_raw_rows: readCount(sourceMetadata.total_raw_rows) || snapshot.total_raw_rows,
      accepted_active_rows: acceptedActiveRows || rows.length,
      excluded_stale_rows: readCount(sourceMetadata.excluded_stale_rows) + clientExcludedStaleRows,
      rejected_malformed_rows: readCount(sourceMetadata.rejected_malformed_rows) + clientRejectedRows,
      deduplicated_rows: readCount(sourceMetadata.deduplicated_rows) + clientDeduplicatedRows,
      client_rejected_rows: clientRejectedRows,
      client_excluded_stale_rows: clientExcludedStaleRows,
      client_deduplicated_rows: clientDeduplicatedRows,
    },
    rows,
    warnings: Array.isArray(value.warnings) ? value.warnings.filter((warning): warning is string => typeof warning === "string").slice(0, 20) : [],
  };
}

export function filterTwentyFourHourRows(
  rows: TwentyFourHourInspectionRow[],
  options: { search: string; yard: string; recordFilter: TwentyFourHourRecordFilter }
): TwentyFourHourInspectionRow[] {
  const query = options.search.trim().toLowerCase();
  return rows.filter((row) => {
    const normalizedFields = [
      row.vin,
      row.inventory_row_id,
      row.inspection_id,
      row.report_id,
      row.facility,
      row.facility_id,
      row.facility_code,
      row.yard,
      row.bay,
      row.location,
      row.inventory_bay,
      row.confirmed_bay,
      row.sector,
    ].filter((field): field is string => typeof field === "string").map((field) => field.trim().toLowerCase());
    const matchesSearch = !query || normalizedFields.some((field) => field.includes(query));
    const yard = options.yard.trim().toLowerCase();
    const matchesYard = !yard || normalizedFields.some((field) => field === yard);
    const matchesRecord = options.recordFilter === "all"
      || (options.recordFilter === "inspected" && row.inspected)
      || (options.recordFilter === "uninspected" && !row.inspected)
      || row.severity === options.recordFilter;
    return matchesSearch && matchesYard && matchesRecord;
  });
}

const TWENTY_FOUR_HOUR_WORK_PRIORITY: Record<TwentyFourHourStatus, number> = {
  overdue: 0,
  critical: 1,
  due_12h: 2,
  normal: 3,
  inspected: 4,
};

export function orderTwentyFourHourRowsByPriority(
  rows: TwentyFourHourInspectionRow[]
): TwentyFourHourInspectionRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const severityDifference = TWENTY_FOUR_HOUR_WORK_PRIORITY[left.row.severity] - TWENTY_FOUR_HOUR_WORK_PRIORITY[right.row.severity];
      if (severityDifference !== 0) return severityDifference;

      if (left.row.severity === "overdue") {
        const overdueDifference = right.row.overdue_seconds - left.row.overdue_seconds;
        if (overdueDifference !== 0) return overdueDifference;
      } else if (!left.row.inspected) {
        const dueDifference = left.row.time_until_24h_seconds - right.row.time_until_24h_seconds;
        if (dueDifference !== 0) return dueDifference;
      }

      const firstSeenDifference = Date.parse(left.row.first_seen_at) - Date.parse(right.row.first_seen_at);
      if (Number.isFinite(firstSeenDifference) && firstSeenDifference !== 0) return firstSeenDifference;
      const vinDifference = left.row.vin.localeCompare(right.row.vin);
      return vinDifference || left.index - right.index;
    })
    .map(({ row }) => row);
}

export function getTwentyFourHourRequestId(error: unknown): string {
  return isRecord(error) ? text(error.requestId) : "";
}

export async function fetchTwentyFourHourInspectionDisplay(
  params: TwentyFourHourInspectionParams = {}
): Promise<TwentyFourHourInspectionResponse> {
  const requestId = params.requestId || createRequestId();
  const maxRows = clampMaxRows(params.maxRows || params.max_rows);
  const pageSize = clampPageSize(params.pageSize || params.page_size);
  const page = clampPage(params.page, 1);
  const endpoint = buildTwentyFourHourDisplayEndpoint({
    ...params,
    page,
    pageSize,
    facility: pickTextValue(params.facility, params.facility_id, params.facilityId),
    yard: pickTextValue(params.yard, params.yard_id, params.yardId),
    organizationId: pickTextValue(params.organizationId, params.organization_id),
    organizationSuborg: pickTextValue(params.organizationSuborg, params.organization_suborg),
    historyDays: pickTextValue(params.historyDays, params.history_days),
    maxRows,
  });
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (process.env.NODE_ENV === "development") {
    console.info("[inspection-24-hour] inspection_24_hour_fetch_start", {
      request_id: requestId,
      endpoint,
      filters: {
        facility: pickTextValue(params.facility, params.facility_id, params.facilityId),
        yard: pickTextValue(params.yard, params.yard_id, params.yardId),
        bucket: text(params.bucket),
        severity: text(params.severity),
        inspected: parseBoolean(params.inspected),
        history_days: pickTextValue(params.historyDays, params.history_days),
      },
      page,
      pageSize,
    });
  }
  try {
    const raw = await apiFetch<unknown>(endpoint, {
      signal: params.signal,
      headers: { "X-Request-Id": requestId },
      cache: "no-store",
      portal: {
        callerLabel: "inspection-24-hour.portal-display",
        requestId,
        timeoutMs: TWENTY_FOUR_HOUR_TIMEOUT_MS,
      },
    });
    const response = validateTwentyFourHourInspectionResponse(raw, requestId, {
      page,
      page_size: pageSize,
    });
    if (process.env.NODE_ENV === "development") {
      console.info("[inspection-24-hour] inspection_24_hour_fetch_success", {
        request_id: response.request_id,
        endpoint,
        duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        snapshot_id: response.snapshot.id,
        snapshot_time: response.snapshot.capture_time,
        raw_row_count: response.metadata.total_raw_rows,
        accepted_row_count: response.metadata.accepted_active_rows,
        rejected_malformed_count: response.metadata.rejected_malformed_rows,
        excluded_stale_snapshot_count: response.metadata.excluded_stale_rows,
        deduplicated_count: response.metadata.deduplicated_rows,
        inspected_count: response.summary.inspected,
        uninspected_count: response.summary.needs_inspected,
        status_bucket_counts: Object.fromEntries(TWENTY_FOUR_HOUR_STATUSES.map((status) => [status, response.summary[status]])),
      });
    }
      return response;
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[inspection-24-hour] inspection_24_hour_fetch_error", {
        request_id: getTwentyFourHourRequestId(error) || requestId,
        endpoint,
        duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        error_name: error instanceof Error ? error.name : "UnknownError",
        error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown request failure",
      });
    }
    throw error;
  }
}
