import { getPortalFetchDebugSnapshot } from "@/lib/apiClient";
import type { PortalDataInspectorRequestInput } from "@/features/portal-diagnostics/portalDataInspectorModel";

export type PortalRequestDiagnostic = {
  request: PortalDataInspectorRequestInput | null;
  errorCategory: "none" | "network" | "timeout" | "authorization" | "validation" | "server" | "schema" | "aborted" | "unknown";
  lastUpdated: string | null;
};

function categorizeRequest(errorName: string | undefined, status: number | undefined): PortalRequestDiagnostic["errorCategory"] {
  if (status === 401 || status === 403 || errorName === "PortalApiAuthExpiredError") return "authorization";
  if (status === 400 || status === 404 || status === 409 || status === 422) return "validation";
  if (typeof status === "number" && status >= 500) return "server";
  if (errorName === "PortalApiTimeoutError" || errorName === "PortalSnapshotTimeoutError") return "timeout";
  if (errorName === "PortalApiNetworkError") return "network";
  if (errorName === "PortalApiAbortError") return "aborted";
  if (errorName === "PortalApiParseError" || errorName === "PortalFilterFacetsContractError") return "schema";
  return errorName ? "unknown" : "none";
}

export function getLatestPortalRequestDiagnostic(pathPrefix: string): PortalRequestDiagnostic {
  const snapshot = getPortalFetchDebugSnapshot();
  const activeRequestIds = new Set(snapshot.active.map((entry) => entry.requestId));
  const matchingEntries = [...snapshot.history, ...snapshot.active]
    .filter((entry) => entry.path.startsWith(pathPrefix))
    .sort((left, right) => left.startedAt - right.startedAt);
  const entry = matchingEntries.at(-1);
  if (!entry) return { request: null, errorCategory: "none", lastUpdated: null };

  const isActive = activeRequestIds.has(entry.requestId);
  const endedAt = isActive
    ? null
    : new Date(new Date(entry.startedAtIso).getTime() + entry.durationMs).toISOString();
  return {
    request: {
      requestId: entry.requestId,
      startedAt: entry.startedAtIso,
      endedAt,
      durationMs: entry.durationMs,
      status: entry.status ?? (isActive ? "loading" : entry.phase),
    },
    errorCategory: categorizeRequest(entry.errorName, entry.status),
    lastUpdated: endedAt,
  };
}
