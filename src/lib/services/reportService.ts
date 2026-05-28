import { apiFetch, apiFetchResponse } from "@/lib/apiClient";
import { isDevMockEnabled } from "@/lib/devMockApi";
import { buildApiUrl, normalizeMediaUrl } from "@/lib/config";
import { getPortalAccessToken } from "@/lib/portalAuth";
import type {
  ReportDamageApiRow,
  ReportFilters,
  RsaReportApiRow,
} from "@/lib/types";

const REPORTS_ENDPOINT = "/report/pull";
const REPORT_MUTATIONS_ENDPOINT = "/reports";
const RSA_REPORTS_ENDPOINT = "/reports/rsa";
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
    const candidate = value?.toString().trim();
    if (candidate) {
      params.set(key, candidate);
    }
  });
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

export function buildNormalizedReportQueryString(filters: ReportFilters = {}) {
  return buildReportQueryString(filters);
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

function normalizeDamageReportRow(report: ReportDamageApiRow | Record<string, unknown>): ReportDamageApiRow {
  const record = report as Record<string, unknown>;
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
  return {
    ...(report as ReportDamageApiRow),
    report_id: reportId || (record.report_id as string) || "",
    ...(organizationId ? { organization_id: organizationId } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {}),
  };
}

function normalizeRsaReportRow(report: RsaReportApiRow | Record<string, unknown>): RsaReportApiRow {
  const record = report as Record<string, unknown>;
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
  return {
    ...(report as RsaReportApiRow),
    report_id: reportId || (record.report_id as string) || "",
    ...(organizationId ? { organization_id: organizationId } : {}),
    ...(createdAt ? { created_at: createdAt } : {}),
    ...(updatedAt ? { updated_at: updatedAt } : {}),
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
  const queryString = buildReportQueryString(damageFilters);
  const response = await apiFetch<unknown>(`${REPORTS_ENDPOINT}${queryString}`);
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
  const response = await apiFetch<unknown>(RSA_REPORTS_ENDPOINT);
  const results = extractReportsArray<RsaReportApiRow>(response).map((report) => normalizeRsaReportRow(report));
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
      const response = await apiFetch<unknown>(`${REPORTS_ENDPOINT}${queryString}`);
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
      const response = await apiFetch<unknown>(RSA_REPORTS_ENDPOINT);
      const results = extractReportsArray<RsaReportApiRow>(response).map((report) => normalizeRsaReportRow(report));
      return results;
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
    const response = await apiFetch<unknown>(MILESTONE_FETCH_ENDPOINT);
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
    });
    return result;
  }
 
  static async deleteReport(reportId: string): Promise<boolean> {
    if (isDevMockEnabled()) {
      return true;
    }
    await apiFetch(`${REPORT_MUTATIONS_ENDPOINT}/${reportId}`, {
      method: "DELETE",
    });
    // Clear cache to ensure the report vanishes from lists on next fetch
    this.clearCache();
    return true;
  }

  static resolveDamageReportPdfUrl(report: ReportDamageApiRow): string | null {
    const candidates = [
      report.pdf_url,
      (report as { pdfUrl?: unknown }).pdfUrl,
      (report as { report_pdf_url?: unknown }).report_pdf_url,
      (report as { pdf_url_original?: unknown }).pdf_url_original,
      report.overview?.pdf_url,
    ]
      .map((value) => value?.toString().trim())
      .filter(Boolean) as string[];
    return candidates.length > 0 ? normalizeMediaUrl(candidates[0]) : null;
  }

  static async downloadDamageReportPhotosZip(report: ReportDamageApiRow): Promise<void> {
    if (isDevMockEnabled()) {
      return;
    }
    const reportId = report.report_id?.toString().trim();
    if (!reportId) {
      throw new Error("This report does not have a valid report id.");
    }
    const response = await apiFetchResponse(`${REPORT_MUTATIONS_ENDPOINT}/${encodeURIComponent(reportId)}/photos/archive`, {
      method: "GET",
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
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const reportLabel = `${report.vin || report.report_id || "report"}`.trim().replace(/[^a-z0-9_-]+/gi, "_");
    anchor.download = `${reportLabel}_photos.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
