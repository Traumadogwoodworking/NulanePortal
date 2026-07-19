import { apiFetch } from "@/lib/apiClient";

const TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT = "/inspection/24-hour/portal-display";
const TWENTY_FOUR_HOUR_TIMEOUT_MS = 15_000;

export const TWENTY_FOUR_HOUR_STATUSES = ["normal", "due_12h", "critical", "overdue", "inspected"] as const;
export type TwentyFourHourStatus = (typeof TWENTY_FOUR_HOUR_STATUSES)[number];
export type TwentyFourHourRecordFilter = "all" | "uninspected" | "inspected" | TwentyFourHourStatus;

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

export type TwentyFourHourInspectionResponse = {
  ok: true;
  request_id: string;
  inspection_type: "24_hour";
  generated_at: string;
  current_server_time: string;
  archive_window_days: number;
  snapshot: TwentyFourHourSnapshot;
  summary: Record<TwentyFourHourStatus, number> & {
    total_active: number;
    needs_inspected: number;
  };
  totals: {
    total_active: number;
    needs_inspected: number;
    inspected: number;
  };
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
};

export class TwentyFourHourContractError extends Error {
  requestId: string;

  constructor(message: string, requestId: string) {
    super(`${message} (requestId=${requestId})`);
    this.name = "TwentyFourHourContractError";
    this.requestId = requestId;
  }
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

function canonicalTimestamp(value: unknown): string {
  const candidate = text(value);
  if (!candidate || !/(?:Z|[+-]\d{2}:\d{2})$/i.test(candidate)) return "";
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function readCount(source: Record<string, unknown>, key: string): number {
  return finiteNumber(source[key]) ?? 0;
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
    total_raw_rows: readCount(value, "total_raw_rows"),
    accepted_active_rows: readCount(value, "accepted_active_rows"),
    excluded_stale_rows: readCount(value, "excluded_stale_rows"),
    rejected_malformed_rows: readCount(value, "rejected_malformed_rows"),
    deduplicated_rows: readCount(value, "deduplicated_rows"),
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

export function validateTwentyFourHourInspectionResponse(
  value: unknown,
  fallbackRequestId: string
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
      return;
    }
    seen.add(row.inventory_row_id);
    rows.push(row);
  });

  if (value.rows.length > 0 && rows.length === 0) {
    throw new TwentyFourHourContractError("Every returned inventory row failed contract validation", requestId);
  }
  if (process.env.NODE_ENV === "development" && rejectedSample.length > 0) {
    console.warn("[inspection-24-hour] inspection_24_hour_rows_rejected", {
      request_id: requestId,
      rejected_malformed_count: clientRejectedRows,
      excluded_stale_snapshot_count: clientExcludedStaleRows,
      sample: rejectedSample,
    });
  }

  const sourceTotals = isRecord(value.totals) ? value.totals : {};
  const sourceMetadata = isRecord(value.metadata) ? value.metadata : {};
  const counts = Object.fromEntries(TWENTY_FOUR_HOUR_STATUSES.map((status) => [status, rows.filter((row) => row.severity === status).length])) as Record<TwentyFourHourStatus, number>;
  const inspectedCount = counts.inspected;
  return {
    ok: true,
    request_id: requestId,
    inspection_type: "24_hour",
    generated_at: generatedAt,
    current_server_time: currentServerTime,
    archive_window_days: finiteNumber(value.archive_window_days) ?? 3,
    snapshot,
    summary: {
      ...counts,
      total_active: rows.length,
      needs_inspected: rows.length - inspectedCount,
      inspected: inspectedCount,
    },
    totals: {
      total_active: readCount(sourceTotals, "total_active") || rows.length,
      needs_inspected: readCount(sourceTotals, "needs_inspected") || rows.length - inspectedCount,
      inspected: readCount(sourceTotals, "inspected") || inspectedCount,
    },
    metadata: {
      total_raw_rows: readCount(sourceMetadata, "total_raw_rows") || snapshot.total_raw_rows,
      accepted_active_rows: rows.length,
      excluded_stale_rows: readCount(sourceMetadata, "excluded_stale_rows") + clientExcludedStaleRows,
      rejected_malformed_rows: readCount(sourceMetadata, "rejected_malformed_rows") + clientRejectedRows,
      deduplicated_rows: readCount(sourceMetadata, "deduplicated_rows") + clientDeduplicatedRows,
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

export function getTwentyFourHourRequestId(error: unknown): string {
  return isRecord(error) ? text(error.requestId) : "";
}

export async function fetchTwentyFourHourInspectionDisplay(
  params: TwentyFourHourInspectionParams = {}
): Promise<TwentyFourHourInspectionResponse> {
  const requestId = params.requestId || createRequestId();
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (process.env.NODE_ENV === "development") {
    console.info("[inspection-24-hour] inspection_24_hour_fetch_start", {
      request_id: requestId,
      endpoint: TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT,
      filters: {},
    });
  }
  try {
    const raw = await apiFetch<unknown>(TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT, {
      signal: params.signal,
      headers: { "X-Request-Id": requestId },
      cache: "no-store",
      portal: {
        callerLabel: "inspection-24-hour.portal-display",
        requestId,
        timeoutMs: TWENTY_FOUR_HOUR_TIMEOUT_MS,
      },
    });
    const response = validateTwentyFourHourInspectionResponse(raw, requestId);
    if (process.env.NODE_ENV === "development") {
      console.info("[inspection-24-hour] inspection_24_hour_fetch_success", {
        request_id: response.request_id,
        endpoint: TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT,
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
        endpoint: TWENTY_FOUR_HOUR_DISPLAY_ENDPOINT,
        duration_ms: Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startedAt),
        error_name: error instanceof Error ? error.name : "UnknownError",
        error_message: error instanceof Error ? error.message.slice(0, 500) : "Unknown request failure",
      });
    }
    throw error;
  }
}
