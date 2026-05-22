import { apiFetch } from "@/lib/apiClient";
import { isDevMockEnabled } from "@/lib/devMockApi";
import { fetchAdminOutbox, type ControlOutboxHistoryItem, type ControlOutboxItem } from "@/lib/services/controlPlaneService";
import type { ReportDamageApiRow } from "@/lib/types";

export type ReportLifecycleState =
  | "complete_and_sent"
  | "complete_but_unsent"
  | "artifact_pending"
  | "incomplete_capture"
  | "unrecoverable_partial"
  | "quarantined";

export type ReportOutboxState =
  | "sent"
  | "retry_pending"
  | "waiting_for_artifact"
  | "pending"
  | "failed_terminal"
  | "stale"
  | "none";

export interface ReportOpsDashboardSummary {
  totalSubmissions: number;
  pending: number;
  completed: number;
  issues: number;
  recentActivity: Array<{
    id: string;
    title: string;
    status: string;
    locationId?: string | null;
    locationName?: string | null;
    createdAt?: string | null;
  }>;
  systemStatus?: {
    docudent: boolean;
    portal: boolean;
    embed: boolean;
  };
  scope?: {
    organizationId?: string | null;
    accessibleOrganizationIds?: string[];
    selectedLocationId?: string | null;
    selectedLocationName?: string | null;
    locationLocked?: boolean;
    locationFilterApplied?: boolean;
  };
}

export interface ReportOpsManifestSummary {
  expected_media_count?: number;
  received_media_count?: number;
  pdf_required?: boolean;
  pdf_present?: boolean;
  checksum_expected?: boolean | null;
  checksum_verified?: boolean | null;
  finalized_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReportOpsStatusResponse {
  status?: string;
  expected_media_count?: number;
  received_media_count?: number;
  pdf_present?: boolean;
  checksums_match?: boolean;
  manifest?: ReportOpsManifestSummary | null;
}

export interface ReportOpsMutationResponse {
  report: ReportDamageApiRow;
  status: ReportOpsStatusResponse | null;
  outbox: ControlOutboxItem | null;
  lifecycle_state: ReportLifecycleState;
  outbox_state: ReportOutboxState;
  exact_blocker: string;
  retryable: boolean;
  quarantined: boolean;
  recommended_action: string;
}

export interface ReportOpsRecord {
  reportId: string;
  vin: string;
  createdAt: string | null;
  updatedAt: string | null;
  location: string;
  lifecycleState: ReportLifecycleState;
  outboxState: ReportOutboxState;
  exactBlocker: string;
  retryable: boolean;
  quarantined: boolean;
  recommendedAction: string;
  statusTone: "positive" | "warning" | "danger" | "neutral";
  report: ReportDamageApiRow;
  status: ReportOpsStatusResponse | null;
  outbox: ControlOutboxItem | null;
  outboxHistory: ControlOutboxHistoryItem[];
  mediaSummary: {
    damageEntries: number;
    photos: number;
    splats: number;
    hasPdf: boolean;
    finalized: boolean;
    checksumsMatch: boolean;
    expectedMedia: number | null;
    receivedMedia: number | null;
  };
}

export interface ReportOpsContext {
  summary: ReportOpsDashboardSummary | null;
  reports: ReportDamageApiRow[];
  outboxRows: ControlOutboxItem[];
}

function appendQuery(basePath: string, params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function buildAdminReportMutationPath(
  action: "repair" | "quarantine" | "unquarantine" | "refresh",
  reportId: string,
  organizationId?: string
) {
  const basePath = organizationId
    ? `/admin/organizations/${encodeURIComponent(organizationId)}/reports/${encodeURIComponent(reportId)}/${action}`
    : `/admin/reports/${encodeURIComponent(reportId)}/${action}`;
  return basePath;
}

function safeText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function readCandidateString(...values: unknown[]): string {
  for (const value of values) {
    const text = safeText(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function readCandidateBoolean(...values: unknown[]): boolean | null {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "t", "1", "yes", "y"].includes(normalized)) {
        return true;
      }
      if (["false", "f", "0", "no", "n"].includes(normalized)) {
        return false;
      }
    }
  }
  return null;
}

function readCandidateNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function formatTimestamp(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toLocaleString();
}

export function isReportBlocked(lifecycleState: ReportLifecycleState): boolean {
  return lifecycleState !== "complete_and_sent" && lifecycleState !== "complete_but_unsent";
}

export function lifecycleTone(lifecycleState: ReportLifecycleState): "positive" | "warning" | "danger" | "neutral" {
  switch (lifecycleState) {
    case "complete_and_sent":
      return "positive";
    case "complete_but_unsent":
      return "warning";
    case "artifact_pending":
    case "incomplete_capture":
      return "warning";
    case "unrecoverable_partial":
    case "quarantined":
      return "danger";
    default:
      return "neutral";
  }
}

export function lifecycleLabel(lifecycleState: ReportLifecycleState): string {
  switch (lifecycleState) {
    case "complete_and_sent":
      return "Complete / sent";
    case "complete_but_unsent":
      return "Complete / unsent";
    case "artifact_pending":
      return "Artifact pending";
    case "incomplete_capture":
      return "Incomplete capture";
    case "unrecoverable_partial":
      return "Unrecoverable partial";
    case "quarantined":
      return "Quarantined";
    default:
      return lifecycleState;
  }
}

export function outboxStateTone(outboxState: ReportOutboxState): "positive" | "warning" | "danger" | "neutral" {
  switch (outboxState) {
    case "sent":
      return "positive";
    case "retry_pending":
    case "waiting_for_artifact":
    case "pending":
      return "warning";
    case "failed_terminal":
    case "stale":
      return "danger";
    default:
      return "neutral";
  }
}

export function outboxStateLabel(outboxState: ReportOutboxState): string {
  switch (outboxState) {
    case "sent":
      return "Sent";
    case "retry_pending":
      return "Retry pending";
    case "waiting_for_artifact":
      return "Waiting for artifact";
    case "pending":
      return "Pending";
    case "failed_terminal":
      return "Failed terminal";
    case "stale":
      return "Stale";
    case "none":
      return "No row";
    default:
      return outboxState;
  }
}

function getLocationLabel(report: ReportDamageApiRow): string {
  return readCandidateString(
    report.location?.location_label,
    report.location?.location_name,
    report.location?.facility,
    report.metadata?.location_label,
    report.metadata?.location_name,
    report.metadata?.facility,
    report.metadata?.locationId,
    report.metadata?.location_id,
  ) || "Unattributed";
}

function getPhotosCount(report: ReportDamageApiRow): number {
  const damageEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  return damageEntries.reduce((count, entry) => {
    if (!entry || typeof entry !== "object") {
      return count;
    }
    const photos = Array.isArray(entry.photos) ? entry.photos : [];
    return count + photos.length;
  }, 0);
}

function getSplatCount(report: ReportDamageApiRow): number {
  return Array.isArray(report.splat_urls) ? report.splat_urls.length : 0;
}

function getExplicitQuarantine(report: ReportDamageApiRow): boolean {
  const metadata = report.metadata as Record<string, unknown> | undefined;
  const reportRecord = report.report as Record<string, unknown> | undefined;
  const payload = report.payload as Record<string, unknown> | undefined;
  const overviewMetadata = (report.overview?.metadata as Record<string, unknown> | undefined) ?? undefined;
  return Boolean(
    readCandidateBoolean(
      metadata?.quarantined,
      metadata?.is_quarantined,
      metadata?.operator_quarantined,
      metadata?.investigation_required,
      metadata?.needs_investigation,
      reportRecord?.quarantined,
      reportRecord?.is_quarantined,
      payload?.quarantined,
      payload?.is_quarantined,
      overviewMetadata?.quarantined,
      overviewMetadata?.is_quarantined,
    ),
  );
}

function getExplicitLifecycleState(
  report: ReportDamageApiRow,
  status: ReportOpsStatusResponse | null,
  outbox: ControlOutboxItem | null,
): ReportLifecycleState | null {
  const metadata = report.metadata as Record<string, unknown> | undefined;
  const reportRecord = report.report as Record<string, unknown> | undefined;
  const payload = report.payload as Record<string, unknown> | undefined;
  const overviewMetadata = (report.overview?.metadata as Record<string, unknown> | undefined) ?? undefined;
  const candidate = readCandidateString(
    metadata?.lifecycle_state,
    metadata?.lifecycleState,
    metadata?.report_lifecycle_state,
    metadata?.reportLifecycleState,
    reportRecord?.lifecycle_state,
    reportRecord?.lifecycleState,
    payload?.lifecycle_state,
    payload?.lifecycleState,
    overviewMetadata?.lifecycle_state,
    overviewMetadata?.lifecycleState,
  );
  if (
    candidate === "complete_and_sent" ||
    candidate === "complete_but_unsent" ||
    candidate === "artifact_pending" ||
    candidate === "incomplete_capture" ||
    candidate === "unrecoverable_partial" ||
    candidate === "quarantined"
  ) {
    return candidate;
  }
  if (outbox?.sent_at && status?.manifest?.finalized_at) {
    return "complete_and_sent";
  }
  return null;
}

function getExplicitBlocker(report: ReportDamageApiRow, status: ReportOpsStatusResponse | null, outbox: ControlOutboxItem | null): string {
  const metadata = report.metadata as Record<string, unknown> | undefined;
  const reportRecord = report.report as Record<string, unknown> | undefined;
  const payload = report.payload as Record<string, unknown> | undefined;
  const overviewMetadata = (report.overview?.metadata as Record<string, unknown> | undefined) ?? undefined;
  return readCandidateString(
    metadata?.exact_blocker,
    metadata?.exactBlocker,
    metadata?.blocker,
    reportRecord?.exact_blocker,
    reportRecord?.exactBlocker,
    payload?.exact_blocker,
    payload?.exactBlocker,
    overviewMetadata?.exact_blocker,
    overviewMetadata?.exactBlocker,
    outbox?.last_error_message,
  );
}

function getExplicitRecommendedAction(report: ReportDamageApiRow): string {
  const metadata = report.metadata as Record<string, unknown> | undefined;
  const reportRecord = report.report as Record<string, unknown> | undefined;
  const payload = report.payload as Record<string, unknown> | undefined;
  const overviewMetadata = (report.overview?.metadata as Record<string, unknown> | undefined) ?? undefined;
  return readCandidateString(
    metadata?.recommended_action,
    metadata?.recommendedAction,
    metadata?.next_action,
    reportRecord?.recommended_action,
    reportRecord?.recommendedAction,
    payload?.recommended_action,
    payload?.recommendedAction,
    overviewMetadata?.recommended_action,
    overviewMetadata?.recommendedAction,
  );
}

function deriveLifecycleState(report: ReportDamageApiRow, status: ReportOpsStatusResponse | null, outbox: ControlOutboxItem | null): ReportLifecycleState {
  if (getExplicitQuarantine(report)) {
    return "quarantined";
  }
  const explicit = getExplicitLifecycleState(report, status, outbox);
  if (explicit) {
    return explicit;
  }

  const finalised = Boolean(status?.manifest?.finalized_at);
  const reportStatus = safeText(report.status).toLowerCase();
  const hasOutbox = Boolean(outbox);
  const outboxStatus = safeText(outbox?.status).toLowerCase();
  const expected = readCandidateNumber(status?.manifest?.expected_media_count, status?.expected_media_count);
  const received = readCandidateNumber(status?.manifest?.received_media_count, status?.received_media_count);
  const pdfPresent = Boolean(status?.manifest?.pdf_present ?? status?.pdf_present ?? report.overview?.pdf_url ?? report.pdf_url);
  const pdfRequired = readCandidateBoolean(status?.manifest?.pdf_required) ?? false;
  const checksumsMatch = readCandidateBoolean(status?.checksums_match, status?.manifest?.checksum_verified);
  const hasDamage = Array.isArray(report.damage_entries) && report.damage_entries.length > 0;

  if ((reportStatus === "complete" || finalised) && outbox?.sent_at) {
    return "complete_and_sent";
  }

  if (outboxStatus === "failed_terminal") {
    return "unrecoverable_partial";
  }

  if ((reportStatus === "complete" || finalised) && hasOutbox && outboxStatus !== "sent") {
    return "complete_but_unsent";
  }

  if (received !== null && expected !== null && received < expected) {
    return received > 0 ? "incomplete_capture" : "unrecoverable_partial";
  }

  if ((pdfRequired && !pdfPresent) || (status?.manifest && checksumsMatch === false)) {
    return "artifact_pending";
  }

  if (reportStatus === "processing") {
    return hasDamage || pdfPresent ? "artifact_pending" : "incomplete_capture";
  }

  if (!hasDamage && !pdfPresent) {
    return "incomplete_capture";
  }

  return "artifact_pending";
}

function deriveOutboxState(
  report: ReportDamageApiRow,
  status: ReportOpsStatusResponse | null,
  outbox: ControlOutboxItem | null,
  lifecycleState: ReportLifecycleState
): ReportOutboxState {
  if (!outbox) {
    return lifecycleState === "artifact_pending" || lifecycleState === "incomplete_capture" ? "waiting_for_artifact" : "none";
  }

  if (outbox.sent_at || outbox.status === "sent") {
    return "sent";
  }
  if (outbox.status === "failed_terminal") {
    return "failed_terminal";
  }
  if (outbox.status === "failed_retryable") {
    return "retry_pending";
  }
  if (outbox.status === "scheduled" || outbox.next_retry_at) {
    return "retry_pending";
  }
  if (lifecycleState === "artifact_pending" || lifecycleState === "incomplete_capture") {
    return "waiting_for_artifact";
  }
  if (safeText(report.status).toLowerCase() === "complete" && status?.manifest?.finalized_at && !outbox.sent_at) {
    return "pending";
  }
  return "pending";
}

function deriveExactBlocker(
  report: ReportDamageApiRow,
  status: ReportOpsStatusResponse | null,
  outbox: ControlOutboxItem | null,
  lifecycleState: ReportLifecycleState
): string {
  const explicit = getExplicitBlocker(report, status, outbox);
  if (explicit) {
    return explicit;
  }

  const expected = readCandidateNumber(status?.manifest?.expected_media_count, status?.expected_media_count);
  const received = readCandidateNumber(status?.manifest?.received_media_count, status?.received_media_count);
  const pdfRequired = readCandidateBoolean(status?.manifest?.pdf_required) ?? false;
  const pdfPresent = Boolean(status?.manifest?.pdf_present ?? status?.pdf_present ?? report.overview?.pdf_url ?? report.pdf_url);
  const checksumsMatch = readCandidateBoolean(status?.checksums_match, status?.manifest?.checksum_verified);

  switch (lifecycleState) {
    case "complete_and_sent":
      return "None";
    case "complete_but_unsent":
      return "Manifest finalized but no sent outbox row";
    case "artifact_pending":
      if (pdfRequired && !pdfPresent) {
        return "PDF artifact is missing";
      }
      if (checksumsMatch === false) {
        return "Checksum verification has not completed";
      }
      return "Finalization is waiting on report artifacts";
    case "incomplete_capture":
      if (received !== null && expected !== null) {
        return `Missing ${Math.max(expected - received, 0)} required media artifact(s)`;
      }
      return "Capture is still incomplete";
    case "unrecoverable_partial":
      return outbox?.status === "failed_terminal"
        ? "Terminal outbox failure"
        : "Partial report could not be finalized";
    case "quarantined":
      return "Marked for investigation";
    default:
      return "Unknown blocker";
  }
}

function deriveRecommendedAction(
  report: ReportDamageApiRow,
  status: ReportOpsStatusResponse | null,
  outbox: ControlOutboxItem | null,
  lifecycleState: ReportLifecycleState
): string {
  const explicit = getExplicitRecommendedAction(report);
  if (explicit) {
    return explicit;
  }

  switch (lifecycleState) {
    case "complete_and_sent":
      return "No action required";
    case "complete_but_unsent":
      return outbox?.status === "failed_retryable" ? "Retry the linked outbox row" : "Refresh state and resend if necessary";
    case "artifact_pending":
      return "Wait for artifact finalization and refresh state";
    case "incomplete_capture":
      return "Resume capture and complete the missing media";
    case "unrecoverable_partial":
      return "Quarantine the report and investigate the capture path";
    case "quarantined":
      return "Review the quarantined row and decide whether to repair";
    default:
      return "Refresh report state";
  }
}

function deriveRetryable(outbox: ControlOutboxItem | null, lifecycleState: ReportLifecycleState): boolean {
  if (!outbox) {
    return lifecycleState === "complete_but_unsent";
  }
  return outbox.status === "failed_retryable" || Boolean(outbox.last_error_retryable);
}

function toneForLifecycle(
  lifecycleState: ReportLifecycleState,
  outbox: ControlOutboxItem | null
): "positive" | "warning" | "danger" | "neutral" {
  if (lifecycleState === "complete_and_sent") {
    return "positive";
  }
  if (lifecycleState === "complete_but_unsent" || lifecycleState === "artifact_pending" || lifecycleState === "incomplete_capture") {
    return "warning";
  }
  if (lifecycleState === "unrecoverable_partial" || lifecycleState === "quarantined") {
    return "danger";
  }
  if (outbox?.status === "failed_retryable") {
    return "warning";
  }
  return "neutral";
}

export async function fetchReportOpsDashboardSummary(
  organizationId?: string
): Promise<ReportOpsDashboardSummary | null> {
  if (isDevMockEnabled()) {
    return {
      totalSubmissions: 0,
      pending: 0,
      completed: 0,
      issues: 0,
      recentActivity: [],
      systemStatus: { docudent: true, portal: true, embed: true },
      scope: organizationId ? { organizationId } : undefined,
    };
  }
  const path = appendQuery("/dashboard/summary", organizationId ? { organizationId } : {});
  const payload = await apiFetch<ReportOpsDashboardSummary>(path);
  return payload ?? null;
}

export async function fetchReportOpsReports(
  organizationId?: string,
  filters: {
    reportId?: string;
    vin?: string;
    locationId?: string;
  } = {}
): Promise<ReportDamageApiRow[]> {
  const path = appendQuery("/report/pull", {
    organization_id: organizationId,
    report_id: filters.reportId,
    vin: filters.vin,
    location_id: filters.locationId,
  });
  const payload = await apiFetch<{ reports: ReportDamageApiRow[] }>(path);
  return Array.isArray(payload?.reports) ? payload.reports : [];
}

export async function fetchReportOpsReportStatus(reportId: string): Promise<ReportOpsStatusResponse | null> {
  if (!reportId) {
    return null;
  }
  if (isDevMockEnabled()) {
    return null;
  }
  const payload = await apiFetch<ReportOpsStatusResponse>(`/reports/${encodeURIComponent(reportId)}/status`);
  return payload ?? null;
}

async function runReportMutation(
  action: "repair" | "quarantine" | "unquarantine" | "refresh",
  reportId: string,
  organizationId?: string,
  reason?: string
): Promise<ReportOpsMutationResponse | null> {
  if (!reportId) {
    return null;
  }
  if (isDevMockEnabled()) {
    return null;
  }
  const payload = await apiFetch<ReportOpsMutationResponse>(
    buildAdminReportMutationPath(action, reportId, organizationId),
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  );
  return payload ?? null;
}

export async function fetchReportOpsOutbox(
  organizationId?: string,
  filters: {
    q?: string;
    status?: string;
    failedOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}
): Promise<ControlOutboxItem[]> {
  const payload = await fetchAdminOutbox(organizationId, {
    status: filters.status,
    failedOnly: filters.failedOnly,
    search: filters.q,
    limit: filters.limit ?? 200,
    offset: filters.offset ?? 0,
  });
  return Array.isArray(payload.items) ? payload.items : [];
}

export async function fetchReportOpsOutboxHistory(
  outboxId: string,
  organizationId?: string
): Promise<ControlOutboxHistoryItem[]> {
  if (!outboxId) {
    return [];
  }
  if (isDevMockEnabled()) {
    return [];
  }
  const path = appendQuery(`/admin/outbox/${encodeURIComponent(outboxId)}/history`, {
    organizationId,
  });
  const payload = await apiFetch<{ history: ControlOutboxHistoryItem[] }>(path);
  return Array.isArray(payload?.history) ? payload.history : [];
}

export async function repairReport(
  reportId: string,
  organizationId?: string,
  reason?: string
): Promise<ReportOpsMutationResponse | null> {
  if (isDevMockEnabled()) {
    return null;
  }
  return runReportMutation("repair", reportId, organizationId, reason);
}

export async function quarantineReport(
  reportId: string,
  organizationId?: string,
  reason?: string
): Promise<ReportOpsMutationResponse | null> {
  if (isDevMockEnabled()) {
    return null;
  }
  return runReportMutation("quarantine", reportId, organizationId, reason);
}

export async function unquarantineReport(
  reportId: string,
  organizationId?: string,
  reason?: string
): Promise<ReportOpsMutationResponse | null> {
  if (isDevMockEnabled()) {
    return null;
  }
  return runReportMutation("unquarantine", reportId, organizationId, reason);
}

export async function refreshReportState(
  reportId: string,
  organizationId?: string,
  reason?: string
): Promise<ReportOpsMutationResponse | null> {
  if (isDevMockEnabled()) {
    return null;
  }
  return runReportMutation("refresh", reportId, organizationId, reason);
}

export async function loadReportOpsContext(
  organizationId?: string
): Promise<ReportOpsContext> {
  const [summary, reports, outboxRows] = await Promise.all([
    fetchReportOpsDashboardSummary(organizationId),
    fetchReportOpsReports(organizationId),
    fetchReportOpsOutbox(organizationId, { limit: 200 }),
  ]);

  return {
    summary,
    reports,
    outboxRows,
  };
}

export function buildReportOpsRecord(
  report: ReportDamageApiRow,
  status: ReportOpsStatusResponse | null,
  outboxRows: ControlOutboxItem[]
): ReportOpsRecord {
  const outbox = outboxRows.find(
    (row) => row.source_record_type === "report" && row.source_record_id === report.report_id
  ) ?? outboxRows.find((row) => row.source_record_id === report.report_id) ?? null;
  const lifecycleState = deriveLifecycleState(report, status, outbox);
  const outboxState = deriveOutboxState(report, status, outbox, lifecycleState);
  const damageEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  const photos = getPhotosCount(report);
  const splats = getSplatCount(report);
  const hasPdf = Boolean(
    status?.manifest?.pdf_present ||
      status?.pdf_present ||
      report.pdf_url ||
      report.overview?.pdf_url
  );
  const finalized = Boolean(status?.manifest?.finalized_at);
  const checksumsMatch = status?.checksums_match ?? (status?.manifest?.checksum_verified ?? null) ?? true;
  const expectedMedia = readCandidateNumber(status?.manifest?.expected_media_count, status?.expected_media_count);
  const receivedMedia = readCandidateNumber(status?.manifest?.received_media_count, status?.received_media_count);
  const retryable = deriveRetryable(outbox, lifecycleState);

  return {
    reportId: report.report_id,
    vin: readCandidateString(report.vin, report.metadata?.vin, report.report?.vin) || "Unknown",
    createdAt: report.created_at || null,
    updatedAt: report.updated_at || null,
    location: getLocationLabel(report),
    lifecycleState,
    outboxState,
    exactBlocker: deriveExactBlocker(report, status, outbox, lifecycleState),
    retryable,
    quarantined: lifecycleState === "quarantined",
    recommendedAction: deriveRecommendedAction(report, status, outbox, lifecycleState),
    statusTone: toneForLifecycle(lifecycleState, outbox),
    report,
    status,
    outbox,
    outboxHistory: [],
    mediaSummary: {
      damageEntries: damageEntries.length,
      photos,
      splats,
      hasPdf,
      finalized,
      checksumsMatch,
      expectedMedia,
      receivedMedia,
    },
  };
}

export function attachReportOutboxHistory(
  record: ReportOpsRecord,
  history: ControlOutboxHistoryItem[]
): ReportOpsRecord {
  return {
    ...record,
    outboxHistory: history,
  };
}

export function formatReportOpsTimestamp(value?: string | null): string {
  return formatTimestamp(value) || "Unknown";
}

export function formatReportOpsMediaSummary(record: ReportOpsRecord): string {
  const pieces = [
    `${record.mediaSummary.damageEntries} damage entry(s)`,
    `${record.mediaSummary.photos} photo(s)`,
    `${record.mediaSummary.splats} splat(s)`,
  ];
  if (record.mediaSummary.expectedMedia !== null || record.mediaSummary.receivedMedia !== null) {
    pieces.push(
      `${record.mediaSummary.receivedMedia ?? 0}/${record.mediaSummary.expectedMedia ?? 0} required artifact(s)`
    );
  }
  return pieces.join(" · ");
}

export function buildLifecycleEventRows(record: ReportOpsRecord): Array<{
  label: string;
  value: string;
  tone: "positive" | "warning" | "danger" | "neutral";
}> {
  const rows: Array<{
    label: string;
    value: string;
    tone: "positive" | "warning" | "danger" | "neutral";
  }> = [
    {
      label: "Report created",
      value: formatReportOpsTimestamp(record.createdAt),
      tone: "neutral" as const,
    },
  ];

  if (record.status?.manifest?.finalized_at) {
    rows.push({
      label: "Manifest finalized",
      value: formatReportOpsTimestamp(record.status.manifest.finalized_at),
      tone: "positive" as const,
    });
  }

  if (record.outbox?.created_at) {
    rows.push({
      label: "Outbox row created",
      value: formatReportOpsTimestamp(record.outbox.created_at),
      tone: record.outboxState === "failed_terminal" ? "danger" : "warning",
    });
  }

  if (record.outbox?.sent_at) {
    rows.push({
      label: "Outbox sent",
      value: formatReportOpsTimestamp(record.outbox.sent_at),
      tone: "positive" as const,
    });
  }

  if (record.outboxHistory.length) {
    const latest = record.outboxHistory[record.outboxHistory.length - 1];
    rows.push({
      label: `Latest outbox event (${latest.action})`,
      value: formatReportOpsTimestamp(latest.created_at),
      tone: latest.status === "failure" ? "danger" : latest.status === "success" ? "positive" : "warning",
    });
  }

  return rows;
}
