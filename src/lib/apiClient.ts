import { buildApiUrl, buildDocuFitUrl, portalConfig } from "./config";
import { resolveDevMockResponse, isDevMockEnabled } from "./devMockApi";
import { getPortalAccessToken, logAuthFlow, logoutRejectedPortalSession } from "./portalAuth";

export type PortalApiPhase =
  | "session_start"
  | "session_ready"
  | "token_start"
  | "token_ready"
  | "fetch_start"
  | "response_headers"
  | "body_parse_start"
  | "done"
  | "timeout"
  | "aborted"
  | "auth_expired"
  | "error";

type PortalApiRequestOptions = {
  callerLabel?: string;
  timeoutMs?: number;
  requestId?: string;
  retryCount?: number;
  pollAttempt?: number;
  skipAuthRedirect?: boolean;
};

export type PortalApiRequestInit = RequestInit & {
  portal?: PortalApiRequestOptions;
};

export type ResponseError = Error & { status?: number };

type RequestDebugEntry = {
  requestId: string;
  method: string;
  path: string;
  url: string;
  route: string | null;
  callerLabel: string | null;
  startedAt: number;
  startedAtIso: string;
  phase: PortalApiPhase;
  durationMs: number;
  status?: number;
  contentType?: string | null;
  contentLength?: string | null;
  retryCount?: number;
  pollAttempt?: number;
  errorName?: string;
  errorMessage?: string;
  stalePending?: boolean;
};

type ActiveEntry = RequestDebugEntry & {
  update: (patch: Partial<RequestDebugEntry>) => void;
};

const DEFAULT_TIMEOUT_MS = 15000;
const DEBUG_HISTORY_LIMIT = 80;
const DEBUG_STALE_MS = 10000;
const activeRequests = new Map<string, ActiveEntry>();
const requestHistory: RequestDebugEntry[] = [];
const requestErrors: RequestDebugEntry[] = [];

declare global {
  interface Window {
    __portalFetchDebug?: {
      active: () => RequestDebugEntry[];
      history: () => RequestDebugEntry[];
      lastErrors: () => RequestDebugEntry[];
      clear: () => void;
    };
  }
}

export class PortalApiTimeoutError extends Error {
  requestId: string;
  path: string;
  phase: PortalApiPhase;
  elapsedMs: number;

  constructor(details: { requestId: string; path: string; phase: PortalApiPhase; elapsedMs: number; timeoutMs: number }) {
    super(
      `Portal API request timed out after ${details.timeoutMs}ms (requestId=${details.requestId}, path=${details.path}, phase=${details.phase}, elapsedMs=${details.elapsedMs})`
    );
    this.name = "PortalApiTimeoutError";
    this.requestId = details.requestId;
    this.path = details.path;
    this.phase = details.phase;
    this.elapsedMs = details.elapsedMs;
  }
}

export class PortalApiAuthExpiredError extends Error {
  requestId: string;
  path: string;
  status: number;

  constructor(details: { requestId: string; path: string; status: number }) {
    super(`Session expired. Please sign in again. (requestId=${details.requestId}, path=${details.path}, status=${details.status})`);
    this.name = "PortalApiAuthExpiredError";
    this.requestId = details.requestId;
    this.path = details.path;
    this.status = details.status;
  }
}

export class PortalApiHttpError extends Error {
  requestId: string;
  path: string;
  status: number;
  bodyPreview: string;
  code: string;
  userMessage: string;

  constructor(details: { requestId: string; path: string; status: number; statusText: string; bodyPreview: string }) {
    super(
      `API request failed (${details.status} ${details.statusText}) requestId=${details.requestId} path=${details.path}: ${details.bodyPreview}`
    );
    this.name = "PortalApiHttpError";
    this.requestId = details.requestId;
    this.path = details.path;
    this.status = details.status;
    this.bodyPreview = details.bodyPreview;
    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(details.bodyPreview);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      // Non-JSON upstream errors retain the original diagnostic preview.
    }
    this.code = typeof payload.code === "string" ? payload.code.trim() : "";
    this.userMessage = typeof payload.error === "string" ? payload.error.trim() : "";
  }
}

export class PortalApiNetworkError extends Error {
  requestId: string;
  path: string;

  constructor(details: { requestId: string; path: string; message: string }) {
    super(`Network error requestId=${details.requestId} path=${details.path}: ${details.message}`);
    this.name = "PortalApiNetworkError";
    this.requestId = details.requestId;
    this.path = details.path;
  }
}

export class PortalApiParseError extends Error {
  requestId: string;
  path: string;

  constructor(details: { requestId: string; path: string; message: string }) {
    super(`Response parse error requestId=${details.requestId} path=${details.path}: ${details.message}`);
    this.name = "PortalApiParseError";
    this.requestId = details.requestId;
    this.path = details.path;
  }
}

export class PortalSnapshotTimeoutError extends Error {
  snapshotId?: string;
  status?: string;
  attempts: number;
  elapsedMs: number;

  constructor(details: { snapshotId?: string; status?: string; attempts: number; elapsedMs: number }) {
    super(
      `Analytics snapshot did not become ready. Worker may not be running. snapshot_id=${details.snapshotId ?? "unknown"} status=${details.status ?? "unknown"} attempts=${details.attempts} elapsedMs=${details.elapsedMs}`
    );
    this.name = "PortalSnapshotTimeoutError";
    this.snapshotId = details.snapshotId;
    this.status = details.status;
    this.attempts = details.attempts;
    this.elapsedMs = details.elapsedMs;
  }
}

function nowMs(): number {
  return typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
}

function isTraceEnabled(): boolean {
  if (process.env.NODE_ENV === "development") return true;
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("portalApiTrace") === "1";
  } catch {
    return false;
  }
}

function isPerfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("portalApiPerf") === "1";
  } catch {
    return false;
  }
}

function getCurrentRoute(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.pathname || null;
}

function createRequestId(): string {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 10);
  return `portal-${Date.now().toString(36)}-${randomPart}`;
}

function cloneEntry(entry: RequestDebugEntry): RequestDebugEntry {
  return {
    ...entry,
    durationMs: Math.round(nowMs() - entry.startedAt),
    stalePending: entry.phase !== "done" && entry.phase !== "error" && entry.phase !== "timeout" && entry.phase !== "aborted" && nowMs() - entry.startedAt > DEBUG_STALE_MS,
  };
}

function ensureDebugApi() {
  if (typeof window === "undefined" || window.__portalFetchDebug) return;
  window.__portalFetchDebug = {
    active: () => Array.from(activeRequests.values()).map((entry) => cloneEntry(entry)),
    history: () => requestHistory.map(cloneEntry),
    lastErrors: () => requestErrors.map(cloneEntry),
    clear: () => {
      activeRequests.clear();
      requestHistory.splice(0, requestHistory.length);
      requestErrors.splice(0, requestErrors.length);
    },
  };
}

function trackRequest(details: {
  requestId: string;
  method: string;
  path: string;
  url: string;
  callerLabel: string | null;
  retryCount?: number;
  pollAttempt?: number;
}): ActiveEntry {
  ensureDebugApi();
  const entry: ActiveEntry = {
    requestId: details.requestId,
    method: details.method,
    path: details.path,
    url: details.url,
    route: getCurrentRoute(),
    callerLabel: details.callerLabel,
    startedAt: nowMs(),
    startedAtIso: new Date().toISOString(),
    phase: "session_start",
    durationMs: 0,
    retryCount: details.retryCount,
    pollAttempt: details.pollAttempt,
    update(patch) {
      Object.assign(entry, patch, { durationMs: Math.round(nowMs() - entry.startedAt) });
      if (isPerfEnabled()) {
        console.info("[docudent.perf] apiFetch.phase", cloneEntry(entry));
      }
    },
  };
  activeRequests.set(details.requestId, entry);
  if (isTraceEnabled()) {
    console.groupCollapsed(
      `[portal-api] start ${entry.method} ${entry.path} requestId=${entry.requestId} caller=${entry.callerLabel ?? "unknown"}`
    );
    console.info(cloneEntry(entry));
    console.groupEnd();
  }
  return entry;
}

function finishRequest(entry: ActiveEntry, patch: Partial<RequestDebugEntry>) {
  entry.update(patch);
  const finalEntry = cloneEntry(entry);
  activeRequests.delete(entry.requestId);
  requestHistory.unshift(finalEntry);
  requestHistory.splice(DEBUG_HISTORY_LIMIT);
  if (finalEntry.errorMessage) {
    requestErrors.unshift(finalEntry);
    requestErrors.splice(20);
  }
  if (isTraceEnabled()) {
    console.groupCollapsed(
      `[portal-api] ${finalEntry.errorMessage ? "error" : "done"} ${finalEntry.method} ${finalEntry.path} requestId=${finalEntry.requestId}`
    );
    console.info(finalEntry);
    console.groupEnd();
  }
}

function stripPortalOptions(options: PortalApiRequestInit = {}): RequestInit {
  const { portal: _portal, ...requestOptions } = options;
  return requestOptions;
}

function getHeaderValue(headers: Headers, key: string): string | null {
  try {
    return headers.get(key);
  } catch {
    return null;
  }
}

async function parseJsonBody<T>(response: Response, entry: ActiveEntry): Promise<T> {
  entry.update({ phase: "body_parse_start" });
  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new PortalApiParseError({
      requestId: entry.requestId,
      path: entry.path,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function readErrorPreview(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 500);
  } catch {
    return "No response body";
  }
}

async function withTimeout<T>(
  entry: ActiveEntry,
  timeoutMs: number,
  controller: AbortController | null,
  work: () => Promise<T>
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller?.abort();
      entry.update({ phase: "timeout" });
      reject(
        new PortalApiTimeoutError({
          requestId: entry.requestId,
          path: entry.path,
          phase: entry.phase,
          elapsedMs: Math.round(nowMs() - entry.startedAt),
          timeoutMs,
        })
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([work(), timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function runRequest<T>(
  path: string,
  options: PortalApiRequestInit,
  responseMode: "json" | "raw",
  urlBuilder: (path: string) => string,
  authMode: "portal" | "none"
): Promise<T> {
  const requestOptions = stripPortalOptions(options);
  const portalOptions = options.portal ?? {};
  const method = (requestOptions.method || "GET").toUpperCase();
  const url = urlBuilder(path);
  const requestId = portalOptions.requestId ?? createRequestId();
  const entry = trackRequest({
    requestId,
    method,
    path,
    url,
    callerLabel: portalOptions.callerLabel ?? null,
    retryCount: portalOptions.retryCount,
    pollAttempt: portalOptions.pollAttempt,
  });
  const timeoutMs = portalOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = typeof AbortController !== "undefined" && !requestOptions.signal ? new AbortController() : null;

  try {
    return await withTimeout(entry, timeoutMs, controller, async () => {
      if (isDevMockEnabled()) {
        const mock = await resolveDevMockResponse(path, requestOptions);
        if (mock !== null) {
          entry.update({ phase: "done", status: 200 });
          return mock as T;
        }
      }

      let token = "";
      if (authMode === "portal") {
        entry.update({ phase: "token_start" });
        token = (await getPortalAccessToken()) ?? "";
        entry.update({ phase: "token_ready" });
      } else {
        entry.update({ phase: "session_ready" });
      }

      const headers = {
        "Content-Type": "application/json",
        ...(requestOptions.headers || {}),
        "X-Portal-Request-Id": requestId,
      } as Record<string, string>;
      if (token) headers.Authorization = `Bearer ${token}`;

      const isFormDataBody = typeof FormData !== "undefined" && requestOptions.body instanceof FormData;
      entry.update({ phase: "fetch_start" });
      let response: Response;
      try {
        response = await fetch(url, {
          ...requestOptions,
          cache: requestOptions.cache ?? (method === "GET" ? "no-store" : undefined),
          signal: controller?.signal ?? requestOptions.signal,
          headers: isFormDataBody ? { ...(requestOptions.headers || {}), "X-Portal-Request-Id": requestId } : headers,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          entry.update({ phase: "aborted" });
          throw error;
        }
        throw new PortalApiNetworkError({
          requestId,
          path,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      entry.update({
        phase: "response_headers",
        status: response.status,
        contentType: getHeaderValue(response.headers, "content-type"),
        contentLength: getHeaderValue(response.headers, "content-length"),
      });

      if (response.status === 401 || response.status === 403) {
        entry.update({ phase: "auth_expired" });
        if (response.status === 401 && typeof window !== "undefined" && !portalOptions.skipAuthRedirect) {
          const returnTo = `${window.location.pathname || "/home"}${window.location.search}${window.location.hash}`;
          logAuthFlow("apiFetch.authExpired", {
            reason: `api_${response.status}`,
            redirectTarget: returnTo,
          });
          void logoutRejectedPortalSession(returnTo);
        }
        throw new PortalApiAuthExpiredError({ requestId, path, status: response.status });
      }

      if (!response.ok) {
        const preview = await readErrorPreview(response);
        throw new PortalApiHttpError({
          requestId,
          path,
          status: response.status,
          statusText: response.statusText,
          bodyPreview: preview,
        });
      }

      if (responseMode === "raw") {
        entry.update({ phase: "done" });
        return response as T;
      }
      const body = await parseJsonBody<T>(response, entry);
      entry.update({ phase: "done" });
      return body;
    });
  } catch (error) {
    const normalizedError =
      error instanceof PortalApiTimeoutError ||
      error instanceof PortalApiAuthExpiredError ||
      error instanceof PortalApiHttpError ||
      error instanceof PortalApiNetworkError ||
      error instanceof PortalApiParseError
        ? error
        : error instanceof Error && error.name === "AbortError"
          ? new PortalApiTimeoutError({
              requestId,
              path,
              phase: entry.phase,
              elapsedMs: Math.round(nowMs() - entry.startedAt),
              timeoutMs,
            })
          : new PortalApiNetworkError({ requestId, path, message: error instanceof Error ? error.message : String(error) });
    finishRequest(entry, {
      phase: normalizedError instanceof PortalApiTimeoutError ? "timeout" : entry.phase === "auth_expired" ? "auth_expired" : "error",
      errorName: normalizedError.name,
      errorMessage: normalizedError.message,
    });
    throw normalizedError;
  } finally {
    if (activeRequests.has(requestId)) {
      finishRequest(entry, { phase: "done" });
    }
  }
}

export function getPortalFetchDebugSnapshot() {
  ensureDebugApi();
  return {
    active: Array.from(activeRequests.values()).map((entry) => cloneEntry(entry)),
    history: requestHistory.map(cloneEntry),
    lastErrors: requestErrors.map(cloneEntry),
  };
}

export async function apiFetch<T = unknown>(path: string, options: PortalApiRequestInit = {}): Promise<T> {
  return runRequest<T>(path, options, "json", buildApiUrl, "portal");
}

export async function apiFetchResponse(path: string, options: PortalApiRequestInit = {}): Promise<Response> {
  return runRequest<Response>(path, options, "raw", buildApiUrl, "portal");
}

export async function docuFitFetch<T = unknown>(path: string, options: PortalApiRequestInit = {}): Promise<T> {
  return runRequest<T>(path, options, "json", buildDocuFitUrl, "none");
}

if (typeof window !== "undefined") {
  ensureDebugApi();
}

void portalConfig;
