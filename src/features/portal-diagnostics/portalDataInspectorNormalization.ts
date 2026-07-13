import type {
  NormalizedPortalDataInspector,
  PortalDataInspectorInput,
  PortalDiagnosticValue,
} from "@/features/portal-diagnostics/portalDataInspectorModel";

type UnknownRecord = Record<string, unknown>;

const REDACTED = "[redacted]";

const CANONICAL_SAFE_FIELDS = new Set([
  "dateFrom",
  "dateTo",
  "facilityId",
  "yard",
  "inspectionTypeNumber",
  "status",
  "make",
  "model",
  "severity",
  "damageArea",
  "damageType",
  "page",
  "pageSize",
  "sort",
]);

const CANONICAL_REDACTED_FIELDS = new Set(["inspector", "search"]);

const ENDPOINT_SAFE_FIELDS = new Set([
  "from",
  "to",
  "date_from",
  "date_to",
  "facility_id",
  "facilityId",
  "location_id",
  "locationId",
  "yard",
  "yard_id",
  "yardId",
  "inspection_type",
  "inspectionType",
  "inspection_type_number",
  "inspectionTypeNumber",
  "status",
  "make",
  "model",
  "severity",
  "damage_area",
  "damageArea",
  "damage_type",
  "damageType",
  "page",
  "pageSize",
  "page_size",
  "limit",
  "offset",
  "sort",
]);

const ENDPOINT_REDACTED_FIELDS = new Set([
  "inspector",
  "inspector_email",
  "inspectorEmail",
  "search",
  "user_id",
  "userId",
]);

const FORBIDDEN_DIAGNOSTIC_KEY = /authorization|bearer|cookie|token|secret|password|api[_-]?key|session|jwt/i;

const FACET_COUNT_KEYS = [
  "facilities",
  "yards",
  "inspectionTypes",
  "inspectors",
  "statuses",
  "makes",
  "models",
  "severities",
  "damageAreas",
  "damageTypes",
] as const;

const REQUEST_STATUS = new Set([
  "idle",
  "loading",
  "refreshing",
  "success",
  "empty",
  "partial",
  "stale",
  "failure",
  "error",
  "timeout",
  "aborted",
  "unknown",
]);

const SNAPSHOT_STATUS = new Set([
  "idle",
  "queued",
  "running",
  "ready",
  "failed",
  "expired",
  "timeout",
  "stale",
  "disabled",
  "unknown",
]);

const CACHE_STATE = new Set([
  "empty",
  "miss",
  "hit",
  "fresh",
  "stale",
  "revalidating",
  "disabled",
  "unknown",
]);

const ERROR_CATEGORY = new Set([
  "none",
  "network",
  "timeout",
  "authorization",
  "validation",
  "server",
  "schema",
  "aborted",
  "unknown",
]);

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePrimitive(value: unknown): PortalDiagnosticValue | undefined {
  if (value === null) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text ? text.slice(0, 160) : undefined;
}

function normalizeAllowlistedRecord(
  value: unknown,
  safeFields: Set<string>,
  redactedFields: Set<string>,
): Record<string, PortalDiagnosticValue> {
  if (!isRecord(value)) return {};
  const result: Record<string, PortalDiagnosticValue> = {};
  for (const key of Object.keys(value).sort()) {
    if (FORBIDDEN_DIAGNOSTIC_KEY.test(key)) continue;
    if (redactedFields.has(key)) {
      if (normalizePrimitive(value[key]) !== undefined) result[key] = REDACTED;
      continue;
    }
    if (!safeFields.has(key)) continue;
    const normalized = normalizePrimitive(value[key]);
    if (normalized !== undefined) result[key] = normalized;
  }
  return result;
}

export function redactCanonicalFilters(value: unknown): Record<string, PortalDiagnosticValue> {
  return normalizeAllowlistedRecord(value, CANONICAL_SAFE_FIELDS, CANONICAL_REDACTED_FIELDS);
}

export function redactEndpointParams(value: unknown): Record<string, PortalDiagnosticValue> {
  return normalizeAllowlistedRecord(value, ENDPOINT_SAFE_FIELDS, ENDPOINT_REDACTED_FIELDS);
}

export function normalizeDiagnosticEndpoint(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim(), "https://portal.invalid");
    return url.pathname.startsWith("/") ? url.pathname.slice(0, 240) : null;
  } catch {
    return null;
  }
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.floor(value);
}

function normalizeDuration(value: unknown, startedAt: string | null, endedAt: string | null): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (!startedAt || !endedAt) return null;
  return Math.max(new Date(endedAt).getTime() - new Date(startedAt).getTime(), 0);
}

function normalizeRequestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && /^[a-z0-9._:-]{1,128}$/i.test(text) ? text : null;
}

function normalizeKnownStatus(value: unknown, allowed: Set<string>, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const status = value.trim().toLowerCase();
  return allowed.has(status) ? status : fallback;
}

function normalizeRequestStatus(value: unknown): string | number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599) return value;
  return normalizeKnownStatus(value, REQUEST_STATUS, "unknown");
}

function normalizeFacetSource(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const source = value.trim();
  return source && /^[a-z0-9._:/-]{1,100}$/i.test(source) ? source : "unknown";
}

function normalizeFacetCounts(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {};
  return FACET_COUNT_KEYS.reduce<Record<string, number>>((result, key) => {
    const count = normalizeCount(value[key]);
    if (count !== null) result[key] = count;
    return result;
  }, {});
}

export function normalizePortalDataInspectorInput(input: PortalDataInspectorInput): NormalizedPortalDataInspector {
  const request = input.request ?? {};
  const startedAt = normalizeTimestamp(request.startedAt);
  const endedAt = normalizeTimestamp(request.endedAt);
  return {
    canonicalFilters: redactCanonicalFilters(input.canonicalFilters),
    endpointParams: redactEndpointParams(input.endpointParams),
    activeEndpoint: normalizeDiagnosticEndpoint(input.activeEndpoint),
    request: {
      requestId: normalizeRequestId(request.requestId),
      startedAt,
      endedAt,
      durationMs: normalizeDuration(request.durationMs, startedAt, endedAt),
      status: normalizeRequestStatus(request.status),
    },
    counts: {
      rows: normalizeCount(input.rowCount),
      total: normalizeCount(input.totalCount),
    },
    facets: {
      source: normalizeFacetSource(input.facetSource),
      counts: normalizeFacetCounts(input.facetCounts),
    },
    snapshotStatus: normalizeKnownStatus(input.snapshotStatus, SNAPSHOT_STATUS, "unknown"),
    cacheState: normalizeKnownStatus(input.cacheState, CACHE_STATE, "unknown"),
    errorCategory: normalizeKnownStatus(input.errorCategory, ERROR_CATEGORY, "unknown"),
    lastUpdated: normalizeTimestamp(input.lastUpdated),
  };
}

export function isPortalDataInspectorRuntimeEnabled(
  nodeEnv = process.env.NODE_ENV,
  explicitFlag = process.env.NEXT_PUBLIC_PORTAL_DATA_INSPECTOR,
): boolean {
  return nodeEnv === "development" || explicitFlag === "1";
}
