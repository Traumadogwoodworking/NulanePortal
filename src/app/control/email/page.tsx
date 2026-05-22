"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Mail, RefreshCw, Route, Send, ShieldCheck, Workflow } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import { usePortalBrandingSnapshot, usePortalDirectorySnapshot } from "@/lib/portalData";
import {
  fetchAdminOutbox,
  fetchAdminOutboxHistory,
  fetchAdminOutboxItem,
  fetchAdminSettings,
  normalizeControlTimestamp,
  repairAdminOutbox,
  retryAdminOutbox,
  type ControlOutboxHistoryItem,
  type ControlOutboxItem,
  type ControlSettingRecord,
} from "@/lib/services/controlPlaneService";
import { ControlDetailPanel, type ControlDetailField } from "@/components/control/ControlDetailPanel";
import { ControlFilterBar } from "@/components/control/ControlFilterBar";
import { ControlMetricTile } from "@/components/control/ControlMetricTile";
import { ControlSection } from "@/components/control/ControlSection";
import { ControlTableShell } from "@/components/control/ControlTableShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { selectedRowStrokeClass } from "@/lib/severityTheme";

type LoadState = "idle" | "loading" | "ready" | "degraded";

function statusTone(status: string): "positive" | "warning" | "danger" | "neutral" {
  if (status === "sent") return "positive";
  if (status === "failed_terminal") return "danger";
  if (status === "failed_retryable") return "warning";
  if (status === "scheduled") return "neutral";
  return "neutral";
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

function statusCause(row: ControlOutboxItem | null): string {
  if (!row) return "No row selected";
  if (row.last_error_message) return row.last_error_message;
  if (row.last_error_code) return row.last_error_code;
  if (row.next_retry_at) return "Waiting for the next retry window.";
  if (row.sent_at) return "Delivered successfully.";
  return "No failure recorded.";
}

function payloadPrereq(row: ControlOutboxItem | null): string {
  if (!row) return "Unavailable";
  if (row.source_record_type === "report" && row.payload_preview?.pdf_url === undefined) {
    return "PDF/attachment prerequisite not surfaced in the preview.";
  }
  if (!row.payload_preview || Object.keys(row.payload_preview).length === 0) {
    return "Payload preview unavailable.";
  }
  return "Payload preview present.";
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

function buildDetailFields(row: ControlOutboxItem | null, settingsCount: number): ControlDetailField[] {
  if (!row) return [];
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
    { label: "Root cause", value: statusCause(row), helper: row.last_error_retryable ? "Marked retryable by backend." : undefined },
    { label: "Prerequisites", value: payloadPrereq(row) },
    { label: "Settings rows", value: settingsCount },
    {
      label: "Source record",
      value: row.source_record_type && row.source_record_id ? `${row.source_record_type}:${row.source_record_id}` : "Not captured",
    },
    {
      label: "Payload preview",
      value: row.payload_preview ? (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3 text-xs leading-5 text-[color:var(--text-primary)]">
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

export default function ControlEmailPage() {
  const { organizationId } = usePortalSession();
  const { data: branding } = usePortalBrandingSnapshot();
  const { data: directory } = usePortalDirectorySnapshot();
  const [rows, setRows] = useState<ControlOutboxItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<ControlOutboxItem | null>(null);
  const [history, setHistory] = useState<ControlOutboxHistoryItem[]>([]);
  const [settings, setSettings] = useState<ControlSettingRecord[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [listError, setListError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<"retry" | "repair" | null>(null);

  const load = async () => {
    if (!organizationId) return;
    setState("loading");
    setListError(null);
    setDetailError(null);
    setActionError(null);
    const [outboxResult, settingsResult] = await Promise.allSettled([
      fetchAdminOutbox(organizationId, {
        status: statusFilter,
        failedOnly: statusFilter === "failed",
        search: search.trim() || undefined,
        limit: 40,
      }),
      fetchAdminSettings(),
    ]);
    const nextRows = outboxResult.status === "fulfilled" ? outboxResult.value.items || [] : [];
    setRows(nextRows);
    setSettings(settingsResult.status === "fulfilled" ? settingsResult.value.settings : []);
    setListError(outboxResult.status === "rejected" ? (outboxResult.reason instanceof Error ? outboxResult.reason.message : "Unable to load email operations.") : null);
    setState(outboxResult.status === "rejected" || settingsResult.status === "rejected" ? "degraded" : "ready");
    setSelectedId((current) => current ?? nextRows[0]?.id ?? null);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, statusFilter, search]);

  useEffect(() => {
    if (!organizationId || !selectedId) {
      setSelectedRow(null);
      setHistory([]);
      return;
    }
    let active = true;
    setDetailError(null);
    void (async () => {
      const [itemResult, historyResult] = await Promise.allSettled([
        fetchAdminOutboxItem(selectedId, organizationId),
        fetchAdminOutboxHistory(selectedId, organizationId),
      ]);
      if (!active) return;
      setSelectedRow(itemResult.status === "fulfilled" ? itemResult.value : null);
      setHistory(historyResult.status === "fulfilled" ? historyResult.value : []);
      if (itemResult.status === "rejected" || historyResult.status === "rejected") {
        setDetailError("One or more outbox detail panels could not refresh.");
      }
    })();
    return () => {
      active = false;
    };
  }, [organizationId, selectedId]);

  const selected = selectedRow ?? rows.find((row) => row.id === selectedId) ?? null;
  const failed = rows.filter((row) => row.status.startsWith("failed_"));
  const sent = rows.filter((row) => row.status === "sent");
  const queued = rows.filter((row) => row.status === "queued" || row.status === "scheduled");
  const retryable = rows.filter((row) => row.status === "failed_retryable");
  const recentFailures = failed.slice(0, 8);
  const visibleRows = rows.filter((row) => {
    if (statusFilter !== "all" && row.status !== statusFilter && !(statusFilter === "failed" && row.status.startsWith("failed_"))) {
      return false;
    }
    if (!search.trim()) {
      return true;
    }
    const query = search.trim().toLowerCase();
    return [row.id, row.subject, row.template_key, row.email_type, row.source_record_type, row.source_record_id, row.last_error_code, row.last_error_message]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query));
  });

  const settingsSummary = useMemo(() => {
    const orgName = branding?.organization_name || branding?.brand_name || "Unknown organization";
    return `${orgName} · ${directory?.emailLists.length || 0} email lists · ${settings.length} admin settings rows`;
  }, [branding?.brand_name, branding?.organization_name, directory?.emailLists.length, settings.length]);
  const listProvenance = "Live backend snapshot";

  if (!organizationId) {
    return <EmptyState title="Email ops unavailable" description="Organization session required." />;
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ControlMetricTile label="Outbox rows" value={rows.length} detail="Live queue items" icon={<Mail className="h-4 w-4" />} />
        <ControlMetricTile label="Retryable" value={retryable.length} detail="Can be retried" tone={retryable.length ? "warning" : "neutral"} icon={<RefreshCw className="h-4 w-4" />} />
        <ControlMetricTile label="Queued" value={queued.length} detail="Waiting delivery" tone={queued.length ? "warning" : "neutral"} icon={<Workflow className="h-4 w-4" />} />
        <ControlMetricTile label="Sent" value={sent.length} detail="Delivered items" tone={sent.length ? "positive" : "neutral"} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">Email lists</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">{directory?.emailLists.length || 0} lists</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-secondary)]">{listProvenance}</p>
        </div>
        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">Routing context</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">Read-only summary</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-primary)]/82">Update endpoints exist, and list reads come from the live backend snapshot.</p>
        </div>
        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">Back-end settings</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">{settings.length} rows</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-primary)]/82">Loaded through the live admin settings API.</p>
        </div>
        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">Action safety</p>
          <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">Retry / resend real</p>
          <p className="mt-1 text-xs leading-5 text-[color:var(--text-primary)]/82">Actions call the live outbox mutation endpoints.</p>
        </div>
      </div>

      {listError ? <div className="rounded-[1.5rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] px-4 py-3 text-sm text-[color:var(--metric-warning-fg)]">{listError}</div> : null}
      {detailError ? <div className="rounded-[1.5rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] px-4 py-3 text-sm text-[color:var(--metric-warning-fg)]">{detailError}</div> : null}
      {actionError ? <div className="rounded-[1.5rem] border border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] px-4 py-3 text-sm text-[color:var(--metric-danger-fg)]">{actionError}</div> : null}

      <ControlSection title="Outbound delivery" description="Queue rows, failure visibility, retry/resend controls, routing summary, and links back to reports.">
        <ControlFilterBar
          search={search}
          onSearch={setSearch}
          placeholder="Search outbox ID, subject, source record, or error"
          filters={
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "queued", "scheduled", "failed", "sent"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] transition ${
                    statusFilter === status
                      ? "border-slate-300 bg-slate-100 text-slate-900"
                      : "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          }
          actions={
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          }
          summary={<StatusBadge label={`${visibleRows.length} visible`} tone="neutral" />}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.55fr)]">
          <ControlTableShell
            title="Outbox"
            description={state === "degraded" ? "Some supporting data failed, but the queue remains available." : "Link the email surface back to submission/report flow."}
            density="compact"
            loading={state === "loading" && rows.length === 0}
            columns={[{ id: "subject", label: "Subject" }, { id: "status", label: "Status" }, { id: "source", label: "Source" }, { id: "updated", label: "Updated" }]}
            rowsCount={visibleRows.length}
            emptyState={<EmptyState title="No outbox rows" description="The current queue is empty." />}
          >
            {visibleRows.map((row) => (
              <tr
                key={row.id}
                className={`cursor-pointer border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-panel-muted)] ${selectedRowStrokeClass(selected?.id === row.id)}`}
                onClick={() => setSelectedId(row.id)}
              >
                <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]">{row.subject || row.template_key || row.email_type || row.id}</td>
                <td className="px-3 py-3">
                  <StatusBadge label={row.status} tone={row.status === "sent" ? "positive" : row.status.startsWith("failed") ? "danger" : "warning"} />
                </td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{row.source_record_type || "outbox"} {row.source_record_id ? `· ${row.source_record_id}` : ""}</td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{row.updated_at || row.created_at || "Unknown"}</td>
              </tr>
            ))}
          </ControlTableShell>

          <ControlDetailPanel
            title={selected?.subject || "Outbox detail"}
            eyebrow="Email ops"
            subtitle={selected ? "Selected row is linked back to the submission/report flow when possible." : "Select a row to inspect delivery and retry state."}
            fields={buildDetailFields(selected, settings.length)}
            footer={
              <div className="space-y-3">
                <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-secondary)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">Brand and email context</p>
                  <p className="mt-2">{settingsSummary}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.28em] text-[color:var(--text-muted)]">{listProvenance}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)]" onClick={() => void load()}>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </button>
                  <button
                    type="button"
                    disabled={actionPending !== null || !selected?.id}
                    onClick={async () => {
                      if (!selected?.id) return;
                      if (!window.confirm(`Retry outbox item ${selected.id}?`)) return;
                      setActionPending("retry");
                      setActionError(null);
                      try {
                        await retryAdminOutbox(selected.id, organizationId, "Operator retry from control console");
                        await load();
                      } catch (error) {
                        setActionError(error instanceof Error ? error.message : "Retry failed.");
                      } finally {
                        setActionPending(null);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] disabled:opacity-50"
                  >
                    Retry
                  </button>
                  <button
                    type="button"
                    disabled={actionPending !== null || !selected?.id}
                    onClick={async () => {
                      if (!selected?.id) return;
                    if (!window.confirm(`Repair outbox item ${selected.id}? This reconciles the queue row.`)) return;
                      setActionPending("repair");
                      setActionError(null);
                      try {
                        await repairAdminOutbox(selected.id, organizationId, "Operator repair from control console");
                        await load();
                      } catch (error) {
                        setActionError(error instanceof Error ? error.message : "Repair failed.");
                      } finally {
                        setActionPending(null);
                      }
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    Repair
                  </button>
                  <Link href="/control/reports" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)]">
                    Open linked report
                  </Link>
                  <Link href="/control/integrations" className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)]">
                    <Route className="h-4 w-4" />
                    Routing
                  </Link>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">Recent delivery attempts</p>
                  {history.length ? (
                    <div className="space-y-2">
                      {history.slice(0, 4).map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge label={entry.action} tone={buildHistoryTone(entry.status)} />
                              <StatusBadge label={`Attempt ${entry.attempt_number}`} tone="neutral" />
                            </div>
                            <span className="text-xs text-[color:var(--text-muted)]">{normalizeControlTimestamp(entry.created_at)}</span>
                          </div>
                          <p className="mt-2 text-sm text-[color:var(--text-secondary)]">{entry.error_message || entry.error_code || "No attempt error"}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3 text-sm text-[color:var(--text-secondary)]">
                      No attempt history recorded yet.
                    </div>
                  )}
                </div>
              </div>
            }
          />
        </div>
      </ControlSection>

      <ControlSection title="Recent failures" description="Operator drilldown for the most recent failed or blocked messages, with the backend error surfaced directly.">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <ControlTableShell
            title="Failure list"
            description="Recent failed or blocked rows surfaced from the live queue."
            density="compact"
            rowsCount={recentFailures.length}
            columns={[{ id: "subject", label: "Subject" }, { id: "status", label: "Status" }, { id: "error", label: "Root cause" }, { id: "updated", label: "Updated" }]}
            emptyState={<EmptyState title="No failed rows" description="The queue currently has no failed or blocked emails." />}
          >
            {recentFailures.map((row) => (
              <tr key={row.id} className="border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-panel-muted)]">
                <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]">{row.subject || row.template_key || row.id}</td>
                <td className="px-3 py-3"><StatusBadge label={humanizeStatus(row.status)} tone={statusTone(row.status)} /></td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{row.last_error_message || row.last_error_code || "No error string"}</td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{normalizeControlTimestamp(row.updated_at)}</td>
              </tr>
            ))}
          </ControlTableShell>

          <ControlDetailPanel
            title="Email control notes"
            eyebrow="Operator summary"
            subtitle="This surface is intentionally wired to live queue rows, the admin settings read API, and the linked report flow."
            fields={[
              { label: "Total rows", value: rows.length },
              { label: "Failures", value: failed.length, helper: "Rows with retryable or terminal failure states." },
              { label: "Linked report surface", value: <Link href="/control/reports" className="text-[color:var(--brand)] underline">Open report ops</Link> },
              { label: "Org lists", value: directory?.emailLists.length || 0 },
              { label: "Settings rows", value: settings.length },
            ]}
          />
        </div>
      </ControlSection>
    </div>
  );
}
