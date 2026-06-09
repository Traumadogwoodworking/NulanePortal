"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Clock3, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import {
  fetchAdminOutbox,
  fetchAdminOutboxHistory,
  fetchAdminOutboxItem,
  normalizeControlTimestamp,
  repairAdminOutbox,
  retryAdminOutbox,
  type ControlOutboxHistoryItem,
  type ControlOutboxItem,
} from "@/lib/services/controlPlaneService";
import { ControlBlockedSurface } from "@/components/control/ControlBlockedSurface";
import { ControlDetailPanel, type ControlDetailField } from "@/components/control/ControlDetailPanel";
import { ControlFilterBar } from "@/components/control/ControlFilterBar";
import { ControlMetricTile } from "@/components/control/ControlMetricTile";
import { ControlSection } from "@/components/control/ControlSection";
import { ControlTableShell } from "@/components/control/ControlTableShell";
import { ControlTracePanel } from "@/components/control/ControlTracePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "queued", label: "Queued" },
  { value: "scheduled", label: "Scheduled" },
  { value: "failed", label: "Failed" },
  { value: "sent", label: "Sent" },
];

function statusTone(status: string): "positive" | "warning" | "danger" | "neutral" {
  if (status === "sent") return "positive";
  if (status === "failed_terminal") return "danger";
  if (status === "failed_retryable") return "warning";
  if (status === "scheduled") return "neutral";
  return "neutral";
}

function isRetryableStatus(status?: string | null): boolean {
  return status === "failed_retryable";
}

function isRepairableRow(row: ControlOutboxItem | null): boolean {
  if (!row) {
    return false;
  }
  return Boolean(row.source_record_id || row.payload_preview?.report_id || row.organization_id);
}

function humanizeStatus(status: string): string {
  switch (status) {
    case "failed_retryable":
      return "Failed / retryable";
    case "failed_terminal":
      return "Failed / terminal";
    case "scheduled":
      return "Scheduled";
    case "sent":
      return "Sent";
    case "queued":
      return "Queued";
    default:
      return status || "Unknown";
  }
}

function formatRecipients(row: ControlOutboxItem | null): string {
  if (!row) return "";
  if (Array.isArray(row.recipient_list) && row.recipient_list.length) {
    return row.recipient_list.join(", ");
  }
  if (Array.isArray(row.recipients) && row.recipients.length) {
    return row.recipients.join(", ");
  }
  return `${row.recipient_count || 0} recipient(s)`;
}

function buildDetailFields(row: ControlOutboxItem | null): ControlDetailField[] {
  if (!row) {
    return [];
  }
  return [
    { label: "Outbox ID", value: row.id },
    { label: "Organization", value: row.organization_id || "Unscoped" },
    { label: "Template", value: row.template_key || row.email_type || "Unmapped" },
    { label: "Subject", value: row.subject || "No subject" },
    { label: "Recipients", value: formatRecipients(row) },
    { label: "Status", value: <StatusBadge label={humanizeStatus(row.status)} tone={statusTone(row.status)} /> },
    { label: "Attempts", value: row.attempt_count },
    { label: "Last attempt", value: normalizeControlTimestamp(row.last_attempt_at) },
    { label: "Next retry", value: normalizeControlTimestamp(row.next_retry_at) },
    { label: "Last error", value: row.last_error_code || "None", helper: row.last_error_message || undefined },
    {
      label: "Source record",
      value: row.source_record_type && row.source_record_id ? `${row.source_record_type}:${row.source_record_id}` : "Not captured",
    },
    {
      label: "Payload preview",
      value: row.payload_preview ? (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3 text-xs leading-5 text-[color:var(--text-primary)]/84">
          {JSON.stringify(row.payload_preview, null, 2)}
        </pre>
      ) : (
        "Not available"
      ),
    },
    { label: "Created", value: normalizeControlTimestamp(row.created_at) },
    { label: "Updated", value: normalizeControlTimestamp(row.updated_at) },
  ];
}

function buildHistoryTone(status: string): "positive" | "warning" | "danger" | "neutral" {
  if (status === "success") return "positive";
  if (status === "failure") return "warning";
  if (status === "blocked") return "danger";
  return "neutral";
}

function historySummary(entry: ControlOutboxHistoryItem): string {
  const pieces = [entry.action, entry.status];
  if (entry.error_code) {
    pieces.push(entry.error_code);
  }
  return pieces.filter(Boolean).join(" · ");
}

export default function ControlOutboxPage() {
  const { organizationId } = usePortalSession();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<ControlOutboxItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ControlOutboxItem | null>(null);
  const [history, setHistory] = useState<ControlOutboxHistoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [failedOnly, setFailedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionPending, setActionPending] = useState<"retry" | "repair" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);

  const templateOptions = useMemo(() => {
    const seen = new Set<string>();
    const values: string[] = [];
    for (const row of rows) {
      const key = row.template_key || row.email_type || "unmapped";
      if (!seen.has(key)) {
        seen.add(key);
        values.push(key);
      }
    }
    return values.sort((left, right) => left.localeCompare(right));
  }, [rows]);

  const metrics = useMemo(() => {
    const failed = rows.filter((row) => row.status.startsWith("failed_"));
    const queued = rows.filter((row) => row.status === "queued" || row.status === "scheduled");
    const sent = rows.filter((row) => row.status === "sent");
    return {
      total: rows.length,
      failed: failed.length,
      queued: queued.length,
      sent: sent.length,
    };
  }, [rows]);

  const loadRows = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAdminOutbox(organizationId, {
        status: statusFilter,
        templateKey: templateFilter === "all" ? undefined : templateFilter,
        failedOnly,
        search: search.trim() || undefined,
        limit: 100,
      });
      setRows(payload.items || []);
      setSelectedId((current) => {
        if (current && payload.items.some((row) => row.id === current)) {
          return current;
        }
        return payload.items[0]?.id || null;
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load outbox queue.");
    } finally {
      setLoading(false);
    }
  };

  const loadSelection = async (id: string) => {
    if (!organizationId || !id) {
      setSelectedRow(null);
      setHistory([]);
      return;
    }
    setDetailLoading(true);
    setActionError(null);
    try {
      const [detail, historyRows] = await Promise.all([
        fetchAdminOutboxItem(id, organizationId),
        fetchAdminOutboxHistory(id, organizationId),
      ]);
      setSelectedRow(detail);
      setHistory(historyRows);
    } catch (detailError) {
      setActionError(detailError instanceof Error ? detailError.message : "Unable to load outbox detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, statusFilter, templateFilter, failedOnly, search]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRow(null);
      setHistory([]);
      return;
    }
    void loadSelection(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, selectedId]);

  useEffect(() => {
    const selected = searchParams?.get("selected") || searchParams?.get("outboxId") || searchParams?.get("outbox");
    if (selected) {
      setSelectedId(selected);
    }
  }, [searchParams]);

  const activeRow = selectedRow ?? rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const linkedReportId =
    activeRow?.source_record_type === "report"
      ? activeRow.source_record_id || (typeof activeRow.payload_preview?.report_id === "string" ? activeRow.payload_preview.report_id : null)
      : typeof activeRow?.payload_preview?.report_id === "string"
        ? activeRow.payload_preview.report_id
        : null;
  const linkedReportHref = linkedReportId ? `/control/reports?reportId=${encodeURIComponent(linkedReportId)}` : null;
  const canRetry = Boolean(activeRow && isRetryableStatus(activeRow.status));
  const canRepair = Boolean(activeRow && isRepairableRow(activeRow));

  const handleRefresh = async () => {
    setActionResult("Refreshing outbox row...");
    setActionError(null);
    await loadRows();
    if (selectedId) {
      await loadSelection(selectedId);
    }
    setActionResult("Outbox queue refreshed.");
  };

  const handleRetry = async () => {
    if (!organizationId || !activeRow) {
      return;
    }
    if (!window.confirm(`Retry outbox item ${activeRow.id}?`)) {
      return;
    }
    setActionPending("retry");
    setActionError(null);
    try {
      const updated = await retryAdminOutbox(activeRow.id, organizationId, "Operator retry from control console");
      if (updated) {
        setSelectedRow(updated);
      }
      await handleRefresh();
      setActionResult(`Retry queued for ${activeRow.id}.`);
    } catch (retryError) {
      setActionError(retryError instanceof Error ? retryError.message : "Retry failed.");
    } finally {
      setActionPending(null);
    }
  };

  const handleRepair = async () => {
    if (!organizationId || !activeRow) {
      return;
    }
    if (!canRepair) {
      return;
    }
    if (!window.confirm(`Repair outbox item ${activeRow.id}? This will reconcile the queue row against its source record.`)) {
      return;
    }
    setActionPending("repair");
    setActionError(null);
    try {
      const updated = await repairAdminOutbox(activeRow.id, organizationId, "Operator repair from control console");
      if (updated) {
        setSelectedRow(updated);
      }
      await handleRefresh();
      setActionResult(`Repair queued for ${activeRow.id}.`);
    } catch (repairError) {
      setActionError(repairError instanceof Error ? repairError.message : "Repair failed.");
    } finally {
      setActionPending(null);
    }
  };

  if (!organizationId) {
    return (
      <ControlBlockedSurface
        title="Outbox operator surface"
        description="This surface requires an authenticated organization session."
        blockers={[
          "No organization session is available to scope the outbox queue.",
          "Administrative outbox actions stay behind org-level authorization.",
        ]}
        liveNotes={[]}
        nextLinks={[]}
      />
    );
  }

  const filterSummary = `${metrics.total} visible · ${metrics.failed} failed · ${metrics.queued} queued · ${metrics.sent} sent`;
  const provenanceLabel = "Real backend queue";
  const retryDisabledReason = activeRow && !canRetry
    ? "Retry is only available for retryable failures."
    : "Retry action is pending.";
  const repairDisabledReason = activeRow && !canRepair
    ? "Repair requires a linked source record or report reference."
    : "Repair action is pending.";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ControlMetricTile label="Visible rows" value={metrics.total} detail="Filtered outbox queue" />
        <ControlMetricTile label="Failed" value={metrics.failed} detail="Retryable + terminal failures" tone={metrics.failed ? "warning" : "positive"} />
        <ControlMetricTile label="Queued / scheduled" value={metrics.queued} detail="Waiting for delivery" tone={metrics.queued ? "warning" : "neutral"} />
        <ControlMetricTile label="Sent" value={metrics.sent} detail="Already delivered or released" tone={metrics.sent ? "positive" : "neutral"} />
      </div>

      <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-secondary)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">Data provenance</p>
            <p className="mt-2">{provenanceLabel}</p>
          </div>

      <ControlFilterBar
        search={search}
        onSearch={setSearch}
        // batch VIN drops are handled in the shared search bar
        placeholder="Search outbox ID, subject, recipient, source record, or error"
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)]/78">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="bg-transparent text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--text-primary)] outline-none"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="inline-flex items-center gap-2 rounded-full border bg-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)]/78">
              Template
              <select
                value={templateFilter}
                onChange={(event) => setTemplateFilter(event.target.value)}
                className="bg-transparent text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--text-primary)] outline-none"
              >
                <option value="all">All</option>
                {templateOptions.map((templateKey) => (
                  <option key={templateKey} value={templateKey}>
                    {templateKey}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setFailedOnly((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] transition ${
                failedOnly
                  ? "border-amber-400/40 bg-amber-500/15 text-amber-100"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-primary)]/84 hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)]"
              }`}
            >
              <TriangleAlert className="h-4 w-4" />
              Failed only
            </button>
          </div>
        }
        actions={
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={loading || detailLoading}
            title={loading || detailLoading ? "Outbox refresh already in progress" : "Refresh outbox queue"}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading || detailLoading ? "animate-spin" : ""}`} />
            {loading || detailLoading ? "Refreshing" : "Refresh"}
          </button>
        }
        summary={<StatusBadge label={filterSummary} tone="neutral" />}
      />

      {error ? (
        <div className="rounded-[1.5rem] border border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] p-4 text-sm text-[color:var(--metric-danger-fg)]">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-[1.5rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-4 text-sm text-[color:var(--metric-warning-fg)]">
          {actionError}
        </div>
      ) : null}
      {actionResult ? (
        <div className="rounded-[1.5rem] border border-[color:var(--metric-positive-border)] bg-[color:var(--metric-positive-bg)] p-4 text-sm text-[color:var(--metric-positive-fg)]">
          {actionResult}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,0.65fr)]">
        <ControlTableShell
          title="Operational outbox"
          description="Safe, authenticated read and action surface for queued outbound emails. Status, template, and failure filters all query the live queue API."
          density="compact"
          loading={loading}
          rowsCount={rows.length}
          columns={[
            { id: "id", label: "Outbox" },
            { id: "template", label: "Template" },
            { id: "recipient", label: "Recipients" },
            { id: "status", label: "Status" },
            { id: "attempts", label: "Attempts" },
            { id: "lastAttempt", label: "Last attempt" },
            { id: "updated", label: "Updated" },
          ]}
          emptyState={
            <div className="space-y-2 text-center">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">No outbox rows match the current filters.</p>
            <p className="text-sm text-[color:var(--text-primary)]/68">This is an empty filtered result, not a backend error. Clear filters or refresh the queue.</p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setTemplateFilter("all");
                setFailedOnly(false);
                setSearch("");
              }}
              className="mt-2 rounded-full border border-[color:var(--border-subtle)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--text-primary)] transition hover:border-[color:var(--brand)]"
            >
              Clear filters
            </button>
          </div>
          }
        >
          {rows.map((row) => {
            const active = row.id === activeRow?.id;
            const rowLinkedReportId =
              row.source_record_type === "report"
                ? row.source_record_id || (typeof row.payload_preview?.report_id === "string" ? row.payload_preview.report_id : null)
                : typeof row.payload_preview?.report_id === "string"
                  ? row.payload_preview.report_id
                  : null;
            const rowLinkedReportCue = rowLinkedReportId ? "Linked report available" : "No linked report available";
            return (
              <tr
                key={row.id}
                data-row-key={row.id}
                className={`cursor-pointer transition ${active ? "bg-slate-100" : "hover:bg-[color:var(--surface-panel-muted)]"}`}
                onClick={() => setSelectedId(row.id)}
              >
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{row.id}</p>
                    <p className="text-xs text-[color:var(--text-primary)]/68">{row.source_record_type && row.source_record_id ? `${row.source_record_type}:${row.source_record_id}` : row.email_type || row.template_key || "Unmapped"}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--brand)]">{rowLinkedReportCue}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]/84">{row.template_key || row.email_type || "Unmapped"}</td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]/84">{formatRecipients(row) || "None captured"}</td>
                <td className="px-3 py-3">
                  <StatusBadge label={humanizeStatus(row.status)} tone={statusTone(row.status)} />
                </td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]/84">{row.attempt_count}</td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]/84">{normalizeControlTimestamp(row.last_attempt_at)}</td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]/84">{normalizeControlTimestamp(row.updated_at)}</td>
              </tr>
            );
          })}
        </ControlTableShell>

              <ControlDetailPanel
            eyebrow="Operator detail"
            title={activeRow ? activeRow.id : "Select an outbox row"}
            subtitle={
              activeRow
                ? `${activeRow.template_key || activeRow.email_type || "Unmapped"} · ${humanizeStatus(activeRow.status)}`
                : "Choose a row to inspect delivery state, payload preview, and attempts."
            }
            fields={buildDetailFields(activeRow)}
            afterFields={
              <ControlTracePanel
                reportId={linkedReportId}
                outboxId={activeRow?.id}
                source={activeRow ? `${activeRow.source_record_type || "outbox"}${activeRow.source_record_id ? `:${activeRow.source_record_id}` : ""}` : null}
                currentStatus={activeRow?.status}
                lastAttempt={normalizeControlTimestamp(activeRow?.last_attempt_at)}
                lastError={activeRow?.last_error_message || activeRow?.last_error_code || null}
                reportHref={linkedReportHref}
                outboxHref={activeRow?.id ? `/control/outbox?selected=${encodeURIComponent(activeRow.id)}` : null}
                auditHref={linkedReportId ? "/control/audit" : null}
              />
            }
            emptyLabel={detailLoading ? "Loading detail" : "Select a row"}
            emptyDescription={
              detailLoading
                ? "Fetching the live row and attempt history."
                : "Pick an outbox item to inspect its history and safe payload preview."
            }
            footer={
              activeRow ? (
                <div className="space-y-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => void handleRetry()}
                      disabled={actionPending !== null || !canRetry}
                      title={actionPending !== null || !canRetry ? retryDisabledReason : "Queue a retry for this retryable failure."}
                      aria-describedby="outbox-action-guardrails"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--metric-warning-fg)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <RotateCcw className={`h-4 w-4 ${actionPending === "retry" ? "animate-spin" : ""}`} />
                      {actionPending === "retry" ? "Retrying..." : "Retry"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRepair()}
                      disabled={actionPending !== null || !canRepair}
                      title={actionPending !== null || !canRepair ? repairDisabledReason : "Queue a queue repair for this row."}
                      aria-describedby="outbox-action-guardrails"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--metric-danger-fg)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      <TriangleAlert className={`h-4 w-4 ${actionPending === "repair" ? "animate-pulse" : ""}`} />
                      {actionPending === "repair" ? "Repairing..." : "Repair"}
                    </button>
                    {linkedReportHref ? (
                      <Link
                        href={linkedReportHref}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)]"
                      >
                        Open linked report
                      </Link>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-secondary)]">
                        No linked report available
                      </span>
                    )}
                  </div>
                  <div id="outbox-action-guardrails" className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3 text-xs leading-5 text-[color:var(--text-secondary)]">
                    Retry is available for retryable failures only. Repair is operator-only and requires a linked source record or report reference.
                  </div>
                  <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/68">
                      <Clock3 className="h-4 w-4" />
                      Attempt history
                    </p>
                    <StatusBadge label={`${history.length} event(s)`} tone="neutral" />
                  </div>
                  {history.length ? (
                    <div className="space-y-2">
                      {history.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <StatusBadge label={entry.action} tone={buildHistoryTone(entry.status)} />
                                <StatusBadge label={`Attempt ${entry.attempt_number}`} tone="neutral" />
                              </div>
                              <p className="text-sm font-medium text-[color:var(--text-primary)]">{historySummary(entry)}</p>
                            </div>
                            <span className="text-xs text-[color:var(--text-primary)]/68">{normalizeControlTimestamp(entry.created_at)}</span>
                          </div>
                          <div className="mt-2 space-y-1 text-xs leading-5 text-[color:var(--text-primary)]/78">
                            <p>Actor: {entry.actor_email || entry.actor_user_id || "system"}</p>
                            <p>Request: {entry.request_id || "—"}</p>
                            <p>Provider message: {entry.provider_message_id || "—"}</p>
                            {entry.metadata && Object.keys(entry.metadata).length ? (
                              <p>Metadata: {JSON.stringify(entry.metadata)}</p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3 text-sm text-[color:var(--text-primary)]/84">
                      No attempt history recorded yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null
          }
        />
      </div>

      <ControlSection
        title="Readout"
        description="The control surface now queries the live operator queue instead of derived report rows. Queue state stays separate from action history, and unsupported resend behavior is not exposed here."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-primary)]/84">
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/68">Scope</p>
            <p className="mt-2">All requests stay scoped to the authenticated organization or an explicitly requested org boundary.</p>
          </div>
          <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-primary)]/84">
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/68">Guardrails</p>
            <p className="mt-2">Retry is blocked for non-retryable failures. Repair requires an explicit operator confirmation and a linked source reference.</p>
          </div>
          <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-primary)]/84">
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/68">Live source</p>
            <p className="mt-2">The backend queue API now sources rows from `email_outbox` and attempt history from `email_outbox_attempts`.</p>
          </div>
        </div>
      </ControlSection>
    </div>
  );
}
