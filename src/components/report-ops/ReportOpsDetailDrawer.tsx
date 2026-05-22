"use client";

import { ClipboardCopy, RefreshCw, ShieldBan, ShieldCheck, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { ControlDetailPanel, type ControlDetailField } from "@/components/control/ControlDetailPanel";
import { ControlTracePanel } from "@/components/control/ControlTracePanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ReportLifecycleBadge, ReportOutboxBadge } from "./ReportOpsBadge";
import {
  buildLifecycleEventRows,
  formatReportOpsMediaSummary,
  formatReportOpsTimestamp,
  type ReportOpsRecord,
} from "@/lib/services/reportOpsService";

interface ReportOpsDetailDrawerProps {
  record: ReportOpsRecord | null;
  historyLoading?: boolean;
  detailLoading?: boolean;
  pendingAction?: "repair" | "quarantine" | "unquarantine" | "refresh" | "retry" | null;
  onRefresh: () => void;
  onRetryOutbox: () => void;
  onRepair: () => void;
  onQuarantine: () => void;
  onCopyReportId: () => void;
  onCopyVin: () => void;
  copiedField?: string | null;
}

function detailFields(record: ReportOpsRecord): ControlDetailField[] {
  const manifest = record.status?.manifest ?? null;
  return [
    { label: "Report ID", value: record.reportId },
    { label: "VIN", value: record.vin },
    { label: "Location", value: record.location },
    { label: "Created", value: formatReportOpsTimestamp(record.createdAt) },
    { label: "Updated", value: formatReportOpsTimestamp(record.updatedAt) },
    { label: "Lifecycle", value: <ReportLifecycleBadge state={record.lifecycleState} /> },
    { label: "Outbox state", value: <ReportOutboxBadge state={record.outboxState} /> },
    { label: "Exact blocker", value: record.exactBlocker },
    { label: "Recommended action", value: record.recommendedAction },
    {
      label: "Media summary",
      value: formatReportOpsMediaSummary(record),
      helper: "Damage entries, attached photos, splats, and manifest counts are shown together to preserve row isolation.",
    },
    {
      label: "PDF presence",
      value: record.mediaSummary.hasPdf ? "Present" : "Missing",
      helper: record.mediaSummary.finalized ? "Manifest finalized" : "Manifest still open",
    },
    {
      label: "Manifest counts",
      value:
        record.mediaSummary.expectedMedia !== null || record.mediaSummary.receivedMedia !== null
          ? `${record.mediaSummary.receivedMedia ?? 0} / ${record.mediaSummary.expectedMedia ?? 0}`
          : "Unavailable",
      helper: manifest
        ? `pdf_required=${manifest.pdf_required ? "true" : "false"} · checksums_match=${record.mediaSummary.checksumsMatch ? "true" : "false"}`
        : "No manifest row returned by the backend status endpoint.",
    },
    {
      label: "Outbox timestamps",
      value: record.outbox
        ? `${formatReportOpsTimestamp(record.outbox.created_at)} · ${formatReportOpsTimestamp(record.outbox.last_attempt_at)}`
        : "No linked outbox row",
      helper: record.outbox?.sent_at ? `Sent at ${formatReportOpsTimestamp(record.outbox.sent_at)}` : "Not sent yet",
    },
    {
      label: "Retryability",
      value: record.retryable ? "Retryable" : "Not retryable",
      helper: record.outbox?.last_error_message || "No retry signal captured.",
    },
    {
      label: "Quarantine flag",
      value: record.quarantined ? "Quarantined" : "Clear",
      helper: record.quarantined ? "The row is marked for operator investigation." : "No quarantine flag surfaced from the backend.",
    },
  ];
}

function RawBlock({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">{label}</p>
      <div className="mt-2 text-sm leading-6 text-[color:var(--text-primary)]">{value}</div>
    </div>
  );
}

export function ReportOpsDetailDrawer({
  record,
  historyLoading,
  detailLoading,
  pendingAction,
  onRefresh,
  onRetryOutbox,
  onRepair,
  onQuarantine,
  onCopyReportId,
  onCopyVin,
  copiedField,
}: ReportOpsDetailDrawerProps) {
  if (!record) {
    return (
      <ControlDetailPanel
        title="Select a report"
        eyebrow="Report detail"
        subtitle="Pick any row in the isolation table to inspect report metadata, manifest state, outbox status, and the exact blocker."
        emptyLabel="No report selected"
        emptyDescription="Select a row to open the right-side detail panel."
      />
    );
  }

  const lifecycleEvents = buildLifecycleEventRows(record);

  return (
    <ControlDetailPanel
      title={record.reportId}
      eyebrow="Report detail"
      subtitle={`${record.vin} · ${record.location}`}
      fields={detailFields(record)}
      afterFields={
        <ControlTracePanel
          reportId={record.reportId}
          outboxId={record.outbox?.id}
          source={record.outbox?.source_record_type || "report"}
          currentStatus={record.outbox?.status || record.lifecycleState}
          lastAttempt={formatReportOpsTimestamp(record.outbox?.last_attempt_at)}
          lastError={record.outbox?.last_error_message || record.exactBlocker}
          reportHref={`/control/reports?reportId=${encodeURIComponent(record.reportId)}`}
          outboxHref={record.outbox?.id ? `/control/outbox?selected=${encodeURIComponent(record.outbox.id)}` : null}
          auditHref="/control/audit"
          statusChain={["SUBMITTED", "PROCESSED", record.outbox?.sent_at ? "SENT" : "FAILED"]}
        />
      }
      footer={
        <div className="space-y-4">
          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={onRetryOutbox}
              disabled={!record.retryable || pendingAction !== null}
              title={!record.retryable ? "Retry is only available when the linked outbox row is retryable." : undefined}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--metric-warning-fg)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              {pendingAction === "retry" ? "Retrying..." : "Retry outbox row"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={pendingAction !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {pendingAction === "refresh" ? "Refreshing..." : "Refresh state"}
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={onRepair}
              disabled={pendingAction !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              {pendingAction === "repair" ? "Repairing..." : "Repair / reconcile"}
            </button>
            <button
              type="button"
              onClick={onQuarantine}
              disabled={pendingAction !== null}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldBan className="h-4 w-4" />
              {pendingAction === "quarantine" || pendingAction === "unquarantine"
                ? record.quarantined
                  ? "Unquarantining..."
                  : "Quarantining..."
                : record.quarantined
                  ? "Unquarantine"
                  : "Quarantine"}
            </button>
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              onClick={onCopyReportId}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--metric-neutral-border)] bg-[color:var(--metric-neutral-bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--metric-neutral-fg)] transition hover:border-[color:var(--brand)]"
            >
              <ClipboardCopy className="h-4 w-4" />
              {copiedField === "reportId" ? "Report ID copied" : "Copy report ID"}
            </button>
            <button
              type="button"
              onClick={onCopyVin}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--metric-neutral-border)] bg-[color:var(--metric-neutral-bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--metric-neutral-fg)] transition hover:border-[color:var(--brand)]"
            >
              <ClipboardCopy className="h-4 w-4" />
              {copiedField === "vin" ? "VIN copied" : "Copy VIN"}
            </button>
          </div>

          <div className="grid gap-3">
            <RawBlock
              label="Raw report payload"
              value={
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/8 bg-slate-950/80 p-3 text-xs leading-5 text-slate-200">
                  {JSON.stringify(record.report, null, 2)}
                </pre>
              }
            />
            <RawBlock
              label="Manifest / status payload"
              value={
                <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/8 bg-slate-950/80 p-3 text-xs leading-5 text-slate-200">
                  {JSON.stringify(record.status ?? {}, null, 2)}
                </pre>
              }
            />
            <RawBlock
              label="Outbox payload"
              value={
                record.outbox ? (
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-white/8 bg-slate-950/80 p-3 text-xs leading-5 text-slate-200">
                    {JSON.stringify(record.outbox, null, 2)}
                  </pre>
                ) : (
                  <span className="text-slate-400">No linked outbox row was found for this report.</span>
                )
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-slate-400">
                Recent lifecycle events
              </p>
              <StatusBadge
                label={historyLoading ? "Loading" : detailLoading ? "Refreshing" : `${lifecycleEvents.length} event(s)`}
                tone={historyLoading || detailLoading ? "warning" : "neutral"}
              />
            </div>
            <div className="space-y-2">
              {lifecycleEvents.map((event) => (
                <div key={`${event.label}-${event.value}`} className="rounded-[1.2rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <StatusBadge label={event.label} tone={event.tone} />
                    <span className="text-xs text-[color:var(--text-secondary)]">{event.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}
