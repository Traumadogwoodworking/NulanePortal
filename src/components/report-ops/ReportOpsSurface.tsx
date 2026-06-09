"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RefreshCw, SlidersHorizontal } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import { ControlBlockedSurface } from "@/components/control/ControlBlockedSurface";
import { ControlFilterBar } from "@/components/control/ControlFilterBar";
import { ControlMetricTile } from "@/components/control/ControlMetricTile";
import { ControlSection } from "@/components/control/ControlSection";
import { ControlTableShell } from "@/components/control/ControlTableShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  attachReportOutboxHistory,
  buildReportOpsRecord,
  fetchReportOpsOutboxHistory,
  fetchReportOpsReportStatus,
  refreshReportState,
  repairReport,
  isReportBlocked,
  lifecycleLabel,
  loadReportOpsContext,
  quarantineReport,
  outboxStateLabel,
  unquarantineReport,
  type ReportLifecycleState,
  type ReportOpsRecord,
  type ReportOpsMutationResponse,
  type ReportOpsStatusResponse,
} from "@/lib/services/reportOpsService";
import { retryAdminOutbox, normalizeControlTimestamp, type ControlOutboxHistoryItem } from "@/lib/services/controlPlaneService";
import { ReportOpsDetailDrawer } from "./ReportOpsDetailDrawer";
import { ReportLifecycleBadge, ReportOutboxBadge } from "./ReportOpsBadge";

type OutboxMonitorState = "pending" | "retry_pending" | "waiting_for_artifact" | "sent" | "failed_terminal" | "stale";

interface OutboxMonitorRow {
  id: string;
  reportId: string;
  vin: string;
  outboxId: string | null;
  state: OutboxMonitorState;
  queueState: string;
  attempts: number;
  createdAt: string | null;
  updatedAt: string | null;
  reportRecord: ReportOpsRecord | null;
}

type ReportOpsAction = "repair" | "quarantine" | "unquarantine" | "refresh" | "retry";

interface ReportOpsToast {
  id: string;
  tone: "positive" | "warning" | "danger";
  title: string;
  detail?: string;
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

function isStale(value?: string | null, hours = 6): boolean {
  const parsed = safeDate(value);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() > hours * 60 * 60 * 1000;
}

function deriveOutboxMonitorState(
  row: {
    status?: string;
    created_at?: string | null;
    updated_at?: string | null;
    sent_at?: string | null;
    last_error_retryable?: boolean;
    next_retry_at?: string | null;
  },
  record: ReportOpsRecord | null
): OutboxMonitorState {
  const status = (row.status || "").toLowerCase();
  if (status === "sent" || row.sent_at) return "sent";
  if (status === "failed_terminal") return "failed_terminal";
  if (status === "failed_retryable" || row.last_error_retryable || status === "scheduled" || row.next_retry_at) {
    return isStale(row.updated_at || row.created_at) ? "stale" : "retry_pending";
  }
  if (record && (record.outboxState === "waiting_for_artifact" || record.outboxState === "pending")) {
    return record.lifecycleState === "artifact_pending" || record.lifecycleState === "incomplete_capture"
      ? "waiting_for_artifact"
      : "pending";
  }
  if (isStale(row.created_at || row.updated_at, 8)) return "stale";
  return "pending";
}

function outboxMonitorTone(state: OutboxMonitorState): "positive" | "warning" | "danger" | "neutral" {
  switch (state) {
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

function outboxMonitorLabel(state: OutboxMonitorState): string {
  switch (state) {
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
    default:
      return state;
  }
}

function matchesSearch(record: ReportOpsRecord, query: string): boolean {
  if (!query) return true;
  return [record.reportId, record.vin, record.location, record.exactBlocker, record.recommendedAction]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function normalizeDate(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function readOutboxVin(row: {
  id?: string;
  payload_preview?: Record<string, unknown> | null;
  subject?: string | null;
  source_record_id?: string | null;
  source_record_type?: string | null;
  email_type?: string | null;
}): string {
  const preview = row.payload_preview || {};
  const candidate = [
    preview.vin,
    preview.VIN,
    preview.rail_car_number,
    preview.report_id,
    preview.reportId,
    row.subject,
    row.source_record_id,
    row.id,
  ]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .find(Boolean);
  return candidate || "Unknown";
}

function toRecentRecords(records: ReportOpsRecord[], limit = 10) {
  return [...records].sort((left, right) => normalizeDate(right.createdAt) - normalizeDate(left.createdAt)).slice(0, limit);
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function ReportOpsSurface() {
  const { organizationId } = usePortalSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof loadReportOpsContext>>["summary"] | null>(null);
  const [baseReports, setBaseReports] = useState<ReportOpsRecord[]>([]);
  const [reportOpsOutboxRows, setReportOpsOutboxRows] = useState<Awaited<ReturnType<typeof loadReportOpsContext>>["outboxRows"]>([]);
  const [outboxMonitorRows, setOutboxMonitorRows] = useState<OutboxMonitorRow[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedDetailStatus, setSelectedDetailStatus] = useState<ReportOpsStatusResponse | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<ControlOutboxHistoryItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [lifecycleFilter, setLifecycleFilter] = useState<ReportLifecycleState | "all">("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [onlyBlocked, setOnlyBlocked] = useState(false);
  const [onlySent, setOnlySent] = useState(false);
  const [onlyRetryable, setOnlyRetryable] = useState(false);
  const [outboxFilter, setOutboxFilter] = useState<OutboxMonitorState | "all">("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ReportOpsAction | null>(null);
  const [toasts, setToasts] = useState<ReportOpsToast[]>([]);
  const copyTimerRef = useRef<number | null>(null);

  const loadAll = async () => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const context = await loadReportOpsContext(organizationId);
      const reportsById = new Map(context.reports.map((report) => [report.report_id, report] as const));
      const reportsWithHeuristics = context.reports.map((report) => buildReportOpsRecord(report, null, context.outboxRows));

      const outboxMonitor = context.outboxRows.map((row) => {
        const linkedReport = reportsById.get(row.source_record_id || "") ?? null;
        const linkedRecord = linkedReport ? buildReportOpsRecord(linkedReport, null, context.outboxRows) : null;
        return {
          id: row.id,
          reportId: row.source_record_id || linkedRecord?.reportId || row.id,
          vin: linkedRecord?.vin || readOutboxVin(row),
          outboxId: row.id,
          state: deriveOutboxMonitorState(row, linkedRecord),
          queueState: `${row.status} · ${outboxStateLabel(linkedRecord?.outboxState ?? "none")}`,
          attempts: row.attempt_count ?? 0,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          reportRecord: linkedRecord,
        };
      });

      const records = reportsWithHeuristics;

      setSummary(context.summary);
      setBaseReports(records);
      setReportOpsOutboxRows(context.outboxRows);
      setOutboxMonitorRows(outboxMonitor);
      setSelectedReportId((current) => current ?? records[0]?.reportId ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load report operations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    const selected = searchParams?.get("reportId") || searchParams?.get("focus");
    if (selected) {
      setSelectedReportId(selected);
    }
  }, [searchParams]);

  const locationOptions = useMemo(() => {
    const seen = new Set<string>();
    const items: string[] = [];
    for (const record of baseReports) {
      if (!record.location || record.location === "Unattributed" || seen.has(record.location)) {
        continue;
      }
      seen.add(record.location);
      items.push(record.location);
    }
    return items.sort((left, right) => left.localeCompare(right));
  }, [baseReports]);

  const locationCounts = useMemo(() => {
    return baseReports.reduce<Record<string, number>>((acc, record) => {
      if (!record.location || record.location === "Unattributed") {
        return acc;
      }
      acc[record.location] = (acc[record.location] ?? 0) + 1;
      return acc;
    }, {});
  }, [baseReports]);

  const detailedReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return baseReports.filter((record) => {
      if (lifecycleFilter !== "all" && record.lifecycleState !== lifecycleFilter) {
        return false;
      }
      if (locationFilter !== "all" && record.location !== locationFilter) {
        return false;
      }
      if (onlyBlocked && !isReportBlocked(record.lifecycleState)) {
        return false;
      }
      if (onlySent && record.lifecycleState !== "complete_and_sent") {
        return false;
      }
      if (onlyRetryable && !record.retryable) {
        return false;
      }
      if (startDate && normalizeDate(record.createdAt) < normalizeDate(startDate)) {
        return false;
      }
      if (endDate) {
        const upper = normalizeDate(endDate);
        if (normalizeDate(record.createdAt) > upper + 24 * 60 * 60 * 1000 - 1) {
          return false;
        }
      }
      return matchesSearch(record, query);
    });
  }, [baseReports, endDate, lifecycleFilter, locationFilter, onlyBlocked, onlyRetryable, onlySent, search, startDate]);

  const selectedBaseRecord = useMemo(
    () => detailedReports.find((record) => record.reportId === selectedReportId) ?? detailedReports[0] ?? null,
    [detailedReports, selectedReportId]
  );

  useEffect(() => {
    if (selectedBaseRecord && selectedBaseRecord.reportId !== selectedReportId) {
      setSelectedReportId(selectedBaseRecord.reportId);
    }
  }, [selectedBaseRecord, selectedReportId]);

  const selectedRecord = useMemo(() => {
    if (!selectedBaseRecord) {
      return null;
    }
    return attachReportOutboxHistory(
      {
        ...selectedBaseRecord,
        status: selectedDetailStatus ?? selectedBaseRecord.status,
      },
      selectedHistory
    );
  }, [selectedBaseRecord, selectedDetailStatus, selectedHistory]);

  useEffect(() => {
    if (!selectedBaseRecord) {
      setSelectedDetailStatus(null);
      setSelectedHistory([]);
      return;
    }

    let active = true;
    setSelectedDetailStatus(null);
    setSelectedHistory([]);
    setDetailLoading(true);
    void (async () => {
      try {
        const [status, history] = await Promise.all([
          fetchReportOpsReportStatus(selectedBaseRecord.reportId).catch(() => null),
          selectedBaseRecord.outbox?.id
            ? fetchReportOpsOutboxHistory(selectedBaseRecord.outbox.id, organizationId ?? undefined).catch(() => [])
            : Promise.resolve([] as ControlOutboxHistoryItem[]),
        ]);
        if (!active) {
          return;
        }
        setSelectedDetailStatus(status);
        setSelectedHistory(history);
      } finally {
        if (active) {
          setDetailLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [organizationId, selectedBaseRecord]);

  const counts = useMemo(() => {
    const buckets = {
      completeAndSent: 0,
      completeButUnsent: 0,
      artifactPending: 0,
      incompleteCapture: 0,
      unrecoverablePartial: 0,
      retryableOutbox: 0,
      quarantined: 0,
    };
    for (const record of baseReports) {
      if (record.lifecycleState === "complete_and_sent") buckets.completeAndSent += 1;
      if (record.lifecycleState === "complete_but_unsent") buckets.completeButUnsent += 1;
      if (record.lifecycleState === "artifact_pending") buckets.artifactPending += 1;
      if (record.lifecycleState === "incomplete_capture") buckets.incompleteCapture += 1;
      if (record.lifecycleState === "unrecoverable_partial") buckets.unrecoverablePartial += 1;
      if (record.retryable) buckets.retryableOutbox += 1;
      if (record.quarantined) buckets.quarantined += 1;
    }
    return buckets;
  }, [baseReports]);

  const filteredOutbox = useMemo(() => {
    const query = search.trim().toLowerCase();
    return outboxMonitorRows.filter((row) => {
      if (outboxFilter !== "all" && row.state !== outboxFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      return [row.reportId, row.vin, row.outboxId, row.queueState].join(" ").toLowerCase().includes(query);
    });
  }, [outboxFilter, outboxMonitorRows, search]);

  const recentReports = useMemo(() => toRecentRecords(baseReports, 8), [baseReports]);
  const recentBlocked = useMemo(
    () => toRecentRecords(baseReports.filter((record) => isReportBlocked(record.lifecycleState)), 8),
    [baseReports]
  );
  const recentSent = useMemo(
    () => toRecentRecords(baseReports.filter((record) => record.lifecycleState === "complete_and_sent"), 8),
    [baseReports]
  );

  const pushToast = (tone: ReportOpsToast["tone"], title: string, detail?: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((current) => [...current, { id, tone, title, detail }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  };

  const applyMutationResponse = (response: ReportOpsMutationResponse | null) => {
    if (!response?.report) {
      return;
    }
    const currentOutbox = response.outbox;
    const nextOutboxRows = currentOutbox
      ? reportOpsOutboxRows.some((row) => row.id === currentOutbox.id)
        ? reportOpsOutboxRows.map((row) => (row.id === currentOutbox.id ? currentOutbox : row))
        : [...reportOpsOutboxRows, currentOutbox]
      : reportOpsOutboxRows;
    const updatedRecord = buildReportOpsRecord(response.report, response.status, nextOutboxRows);

    setReportOpsOutboxRows(nextOutboxRows);
    setBaseReports((current) =>
      current.some((record) => record.reportId === updatedRecord.reportId)
        ? current.map((record) => (record.reportId === updatedRecord.reportId ? updatedRecord : record))
        : [updatedRecord, ...current],
    );
    setOutboxMonitorRows((current) =>
      current.map((row) => {
        if (row.reportId !== updatedRecord.reportId) {
          return row;
        }
        const sourceOutbox = response.outbox ?? row.reportRecord?.outbox ?? null;
        return {
          ...row,
          reportId: updatedRecord.reportId,
          vin: updatedRecord.vin,
          reportRecord: updatedRecord,
          outboxId: sourceOutbox?.id ?? row.outboxId,
          state: sourceOutbox ? deriveOutboxMonitorState(sourceOutbox, updatedRecord) : row.state,
          queueState: sourceOutbox ? `${sourceOutbox.status} · ${outboxStateLabel(updatedRecord.outboxState)}` : row.queueState,
          attempts: sourceOutbox?.attempt_count ?? row.attempts,
          createdAt: sourceOutbox?.created_at ?? row.createdAt,
          updatedAt: sourceOutbox?.updated_at ?? row.updatedAt,
        };
      }),
    );
    setSelectedDetailStatus(response.status ?? null);
    setSelectedReportId(updatedRecord.reportId);
  };

  const handleReloadSurface = async () => {
    await loadAll();
    if (selectedBaseRecord) {
      setSelectedReportId(selectedBaseRecord.reportId);
    }
  };

  const handleRefreshReportState = async () => {
    if (!organizationId || !selectedRecord) {
      return;
    }
    setPendingAction("refresh");
    setMutationError(null);
    try {
      const response = await refreshReportState(selectedRecord.reportId, organizationId, "Operator refresh from report operations surface");
      applyMutationResponse(response);
      pushToast("positive", "Report state refreshed", `${selectedRecord.reportId} was recomputed from live stored data.`);
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Unable to refresh report state.";
      setMutationError(message);
      pushToast("danger", "Refresh failed", message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleRepairReport = async () => {
    if (!organizationId || !selectedRecord) {
      return;
    }
    setPendingAction("repair");
    setMutationError(null);
    try {
      const response = await repairReport(selectedRecord.reportId, organizationId, "Operator repair from report operations surface");
      applyMutationResponse(response);
      pushToast("positive", "Report repaired", `${selectedRecord.reportId} was reconciled against stored report data.`);
    } catch (repairError) {
      const message = repairError instanceof Error ? repairError.message : "Unable to repair the report.";
      setMutationError(message);
      pushToast("danger", "Repair failed", message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleQuarantine = async () => {
    if (!organizationId || !selectedRecord) {
      return;
    }
    const confirmMessage = selectedRecord.quarantined
      ? `Unquarantine report ${selectedRecord.reportId}? This clears the operator quarantine flag and recomputes the row state.`
      : `Quarantine report ${selectedRecord.reportId}? This isolates the row for operator investigation and keeps it out of normal flow.`;
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }
    const nextAction: ReportOpsAction = selectedRecord.quarantined ? "unquarantine" : "quarantine";
    setPendingAction(nextAction);
    setMutationError(null);
    try {
      const response = selectedRecord.quarantined
        ? await unquarantineReport(selectedRecord.reportId, organizationId, "Operator unquarantine from report operations surface")
        : await quarantineReport(selectedRecord.reportId, organizationId, "Operator quarantine from report operations surface");
      applyMutationResponse(response);
      pushToast(
        "positive",
        selectedRecord.quarantined ? "Report unquarantined" : "Report quarantined",
        `${selectedRecord.reportId} was ${selectedRecord.quarantined ? "restored to normal review" : "marked for investigation"}.`,
      );
    } catch (quarantineError) {
      const message = quarantineError instanceof Error ? quarantineError.message : "Unable to update quarantine state.";
      setMutationError(message);
      pushToast("danger", selectedRecord.quarantined ? "Unquarantine failed" : "Quarantine failed", message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleRetryOutbox = async () => {
    if (!organizationId || !selectedRecord?.outbox?.id || !selectedRecord.retryable) {
      return;
    }
    setPendingAction("retry");
    setMutationError(null);
    try {
      await retryAdminOutbox(selectedRecord.outbox.id, organizationId, "Operator retry from report operations surface");
      await loadAll();
      setSelectedReportId(selectedRecord.reportId);
      pushToast("positive", "Outbox retry queued", `${selectedRecord.reportId} was queued for another delivery attempt.`);
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : "Unable to retry the linked outbox row.";
      setMutationError(message);
      pushToast("danger", "Retry failed", message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleCopy = async (value: string, field: string) => {
    if (!value || typeof navigator === "undefined") {
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    if (copyTimerRef.current) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => setCopiedField(null), 1400);
  };

  const reportRows = detailedReports;

  if (!organizationId) {
    return (
      <ControlBlockedSurface
        title="Report operations"
        description="This surface requires an authenticated organization session and privileged portal access."
        blockers={[
          "No organization session is available to scope report visibility.",
          "Report operations must remain restricted to org admins and super admins.",
        ]}
        liveNotes={[]}
        nextLinks={[
          { href: "/control/overview", label: "Open control overview" },
        ]}
      />
    );
  }

  if (loading) {
    return (
      <div className="rounded-[1.75rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-6 text-[color:var(--text-secondary)]">
        Loading report operations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[1.75rem] border border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] p-6 text-[color:var(--metric-danger-fg)]">
        {error}
      </div>
    );
  }

  const topTabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "isolation", label: "Isolation" },
    { id: "outbox", label: "Outbox" },
  ];

  return (
    <div className="space-y-5">
      {toasts.length ? (
        <div className="fixed right-4 top-4 z-50 flex w-[22rem] flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`rounded-[1.2rem] border p-4 shadow-2xl backdrop-blur ${
                toast.tone === "positive"
                  ? "border-[color:var(--metric-positive-border)] bg-[color:var(--metric-positive-bg)] text-[color:var(--metric-positive-fg)]"
                  : toast.tone === "warning"
                    ? "border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] text-[color:var(--metric-warning-fg)]"
                    : "border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] text-[color:var(--metric-danger-fg)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{toast.title}</p>
                  {toast.detail ? <p className="text-xs leading-5 opacity-90">{toast.detail}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
                  className="rounded-full border border-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:border-white/30 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ControlMetricTile label="Complete and sent" value={counts.completeAndSent} detail="Healthy report rows" tone="positive" />
        <ControlMetricTile label="Complete but unsent" value={counts.completeButUnsent} detail="Finalized, waiting on delivery" tone="warning" />
        <ControlMetricTile label="Artifact pending" value={counts.artifactPending} detail="Manifest or PDF finalization" tone="warning" />
        <ControlMetricTile label="Incomplete capture" value={counts.incompleteCapture} detail="Missing required media" tone="warning" />
        <ControlMetricTile label="Unrecoverable partial" value={counts.unrecoverablePartial} detail="Needs operator investigation" tone="danger" />
        <ControlMetricTile label="Retryable outbox rows" value={counts.retryableOutbox} detail="Safe to retry" tone={counts.retryableOutbox ? "warning" : "neutral"} />
        <ControlMetricTile label="Quarantined rows" value={counts.quarantined} detail="Explicitly isolated" tone={counts.quarantined ? "danger" : "neutral"} />
        <ControlMetricTile label="Total loaded" value={formatCount(baseReports.length)} detail={summary?.recentActivity?.length ? "Fresh from backend APIs" : "Report pull + outbox surface"} />
      </div>

      <div className="sticky top-4 z-20 flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.10)] backdrop-blur">
        {topTabs.map((tab) => (
          <a
            key={tab.id}
            href={`#${tab.id}`}
            className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-secondary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)] hover:text-[color:var(--text-primary)]"
          >
            {tab.label}
          </a>
        ))}
        <button
          type="button"
          onClick={() => void handleReloadSurface()}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <ControlFilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search VIN or report ID"
        filters={
          <>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <select
                value={lifecycleFilter}
                onChange={(event) => setLifecycleFilter(event.target.value as ReportLifecycleState | "all")}
                className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 outline-none"
              >
                <option value="all">All lifecycle states</option>
                {["complete_and_sent", "complete_but_unsent", "artifact_pending", "incomplete_capture", "unrecoverable_partial", "quarantined"].map((state) => (
                  <option key={state} value={state}>
                    {lifecycleLabel(state as ReportLifecycleState)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              <span>Location</span>
              <select
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
                className="bg-transparent text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 outline-none"
              >
                <option value="all">All locations</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location}>
                    {location}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              <span>From</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-100 outline-none"
              />
            </label>
            <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/80 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-300">
              <span>To</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-100 outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setOnlyBlocked((current) => !current)}
              className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] transition ${
                onlyBlocked
                  ? "border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] text-[color:var(--metric-warning-fg)]"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]"
              }`}
            >
              Blocked only
            </button>
            <button
              type="button"
              onClick={() => setOnlySent((current) => !current)}
              className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] transition ${
                onlySent
                  ? "border-[color:var(--metric-positive-border)] bg-[color:var(--metric-positive-bg)] text-[color:var(--metric-positive-fg)]"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]"
              }`}
            >
              Sent only
            </button>
            <button
              type="button"
              onClick={() => setOnlyRetryable((current) => !current)}
              className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] transition ${
                onlyRetryable
                  ? "border-[color:var(--metric-neutral-border)] bg-[color:var(--metric-neutral-bg)] text-[color:var(--metric-neutral-fg)]"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-primary)] hover:border-[color:var(--border-strong)]"
              }`}
            >
              Retryable only
            </button>
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setLifecycleFilter("all");
                setLocationFilter("all");
                setStartDate("");
                setEndDate("");
                setOnlyBlocked(false);
                setOnlySent(false);
                setOnlyRetryable(false);
                setOutboxFilter("all");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)]"
            >
              Clear filters
            </button>
            <Link
              href="/control/outbox"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--metric-neutral-border)] bg-[color:var(--metric-neutral-bg)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--metric-neutral-fg)] transition hover:border-[color:var(--brand)]"
            >
              Open outbox admin
            </Link>
          </>
        }
        summary={<StatusBadge label={`${reportRows.length} matches`} tone="neutral" />}
      />

      {mutationError ? (
        <div className="rounded-[1.35rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-4 text-sm text-[color:var(--metric-warning-fg)]">
          {mutationError}
        </div>
      ) : null}

      <ControlSection
        title="Dashboard"
        description="The counts below are derived from the live report pull and outbox queue. Healthy rows stay visible as independent records so one bad row does not obscure the rest of the flow."
        actions={
          <StatusBadge
            label={
              summary?.scope?.locationFilterApplied
                ? `Scoped to ${summary?.scope?.selectedLocationName || summary?.scope?.selectedLocationId || "current location"}`
                : "Organization scope"
            }
            tone={summary?.scope?.locationFilterApplied ? "warning" : "neutral"}
          />
        }
      >
          <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <ControlTableShell
              title="Recent reports"
              description="Latest rows across the live report pull."
              density="compact"
              rowsCount={recentReports.length}
              columns={["Report", "Lifecycle", "Outbox", "Created"]}
            >
              {recentReports.map((record) => (
                <tr
                  key={record.reportId}
                  data-row-key={record.reportId}
                  className={`cursor-pointer transition ${record.reportId === selectedReportId ? "bg-slate-100" : "hover:bg-[color:var(--surface-panel-muted)]"}`}
                  onClick={() => setSelectedReportId(record.reportId)}
                >
                  <td className="px-3 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-[color:var(--text-primary)]">{record.vin}</p>
                      <p className="text-xs text-[color:var(--text-secondary)]">{record.reportId}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <ReportLifecycleBadge state={record.lifecycleState} />
                  </td>
                  <td className="px-3 py-3">
                    <ReportOutboxBadge state={record.outboxState} />
                  </td>
                  <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{normalizeControlTimestamp(record.createdAt)}</td>
                </tr>
              ))}
            </ControlTableShell>

            <div className="grid gap-4 md:grid-cols-2">
              <ControlTableShell
                title="Recent blocked reports"
                description="Rows with blockers that need operator attention."
                density="compact"
                rowsCount={recentBlocked.length}
                columns={["Report", "Blocker", "Action"]}
              >
                {recentBlocked.map((record) => (
                  <tr
                    key={record.reportId}
                    data-row-key={record.reportId}
                    className={`cursor-pointer transition ${record.reportId === selectedReportId ? "bg-rose-400/10" : "hover:bg-[color:var(--surface-panel-muted)]"}`}
                    onClick={() => setSelectedReportId(record.reportId)}
                  >
                    <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]">{record.vin}</td>
                    <td className="px-3 py-3 text-xs text-[color:var(--text-secondary)]">{record.exactBlocker}</td>
                    <td className="px-3 py-3 text-xs text-[color:var(--text-secondary)]">{record.recommendedAction}</td>
                  </tr>
                ))}
              </ControlTableShell>

              <ControlTableShell
                title="Recent sent reports"
                description="Rows that already reached the sent state."
                density="compact"
                rowsCount={recentSent.length}
                columns={["Report", "Outbox", "Created"]}
              >
                {recentSent.map((record) => (
                  <tr
                    key={record.reportId}
                    data-row-key={record.reportId}
                    className={`cursor-pointer transition ${record.reportId === selectedReportId ? "bg-emerald-400/10" : "hover:bg-[color:var(--surface-panel-muted)]"}`}
                    onClick={() => setSelectedReportId(record.reportId)}
                  >
                    <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]">{record.vin}</td>
                    <td className="px-3 py-3">
                      <ReportOutboxBadge state={record.outboxState} />
                    </td>
                    <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{normalizeControlTimestamp(record.createdAt)}</td>
                  </tr>
                ))}
              </ControlTableShell>
            </div>
          </div>

          <div className="xl:sticky xl:top-4">
            <ReportOpsDetailDrawer
              record={selectedRecord}
              detailLoading={detailLoading}
              historyLoading={detailLoading}
              pendingAction={pendingAction}
              onRefresh={() => void handleRefreshReportState()}
              onRetryOutbox={() => void handleRetryOutbox()}
              onRepair={() => void handleRepairReport()}
              onQuarantine={() => void handleToggleQuarantine()}
              onCopyReportId={() => selectedRecord ? void handleCopy(selectedRecord.reportId, "reportId") : undefined}
              onCopyVin={() => selectedRecord ? void handleCopy(selectedRecord.vin, "vin") : undefined}
              copiedField={copiedField}
            />
          </div>
        </div>
      </ControlSection>

      <ControlSection
        title="Isolation"
        description="Dense, filterable report isolation table. The row-level model keeps healthy rows visible even when one report is blocked."
      >
        <ControlTableShell
          title="Report isolation table"
          description="Search VIN or report ID, filter by lifecycle, and drill into the exact blocker."
          density="compact"
          rowsCount={reportRows.length}
          onRowClick={setSelectedReportId}
          columns={[
            { id: "report_id", label: "Report ID" },
            { id: "vin", label: "VIN" },
            { id: "created_at", label: "Created at" },
            { id: "location", label: "Location" },
            { id: "lifecycle_state", label: "Lifecycle state" },
            { id: "outbox_state", label: "Outbox state" },
            { id: "exact_blocker", label: "Exact blocker" },
            { id: "retryable", label: "Retryable" },
            { id: "quarantined", label: "Quarantined" },
            { id: "recommended_action", label: "Recommended action" },
          ]}
          emptyState={
            <EmptyState
              title="No matching reports"
              description="Try clearing filters or search by a different VIN/report ID."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setLifecycleFilter("all");
                    setLocationFilter("all");
                    setStartDate("");
                    setEndDate("");
                    setOnlyBlocked(false);
                    setOnlySent(false);
                    setOnlyRetryable(false);
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white transition hover:border-white/20 hover:bg-white/10"
                >
                  Reset filters
                </button>
              }
            />
          }
        >
          {reportRows.map((record) => (
            <tr
              key={record.reportId}
              data-row-key={record.reportId}
              className={`cursor-pointer transition ${record.reportId === selectedReportId ? "bg-slate-100" : "hover:bg-white/5"}`}
            >
              <td className="px-3 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">{record.reportId}</p>
                  <p className="text-[11px] text-slate-500">{record.status?.status || record.mediaSummary.finalized ? "Status loaded" : "Derived from live report row"}</p>
                </div>
              </td>
              <td className="px-3 py-3 text-sm text-slate-300">{record.vin}</td>
              <td className="px-3 py-3 text-sm text-slate-300">{normalizeControlTimestamp(record.createdAt)}</td>
              <td className="px-3 py-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <span>{record.location}</span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                    {locationCounts[record.location] ?? 0}
                  </span>
                </div>
              </td>
              <td className="px-3 py-3"><ReportLifecycleBadge state={record.lifecycleState} /></td>
              <td className="px-3 py-3"><ReportOutboxBadge state={record.outboxState} /></td>
              <td className="px-3 py-3 text-xs leading-5 text-slate-300">{record.exactBlocker}</td>
              <td className="px-3 py-3">
                <StatusBadge label={record.retryable ? "Retryable" : "No"} tone={record.retryable ? "warning" : "neutral"} />
              </td>
              <td className="px-3 py-3">
                <StatusBadge label={record.quarantined ? "Yes" : "No"} tone={record.quarantined ? "danger" : "neutral"} />
              </td>
              <td className="px-3 py-3 text-xs leading-5 text-slate-300">{record.recommendedAction}</td>
            </tr>
          ))}
        </ControlTableShell>
      </ControlSection>

      <ControlSection
        title="Outbox"
        description="Email delivery health for report-linked rows. This view stays tied to the live `email_outbox` API so operators can move from queue signal back to the report row."
        actions={<StatusBadge label={`${filteredOutbox.length} matches`} tone="neutral" />}
      >
        <div className="flex flex-wrap items-center gap-2 rounded-[1.25rem] border border-white/10 bg-slate-950/85 p-3">
          {(["all", "pending", "retry_pending", "waiting_for_artifact", "sent", "failed_terminal", "stale"] as const).map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => setOutboxFilter(state)}
              className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] transition ${
                outboxFilter === state
                  ? "border-slate-300 bg-slate-100 text-slate-900"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"
              }`}
            >
              {state === "all" ? "All" : outboxMonitorLabel(state)}
            </button>
          ))}
        </div>

        <ControlTableShell
          title="Outbox monitor"
          description="Pending, retry pending, waiting for artifact, sent, failed terminal, and stale rows."
          density="compact"
          rowsCount={filteredOutbox.length}
          columns={["Outbox", "Report", "VIN", "State", "Queue", "Attempts", "Updated"]}
          emptyState={
            <EmptyState
              title="No matching outbox rows"
              description="Clear the outbox filter or search for another report ID."
            />
          }
        >
          {filteredOutbox.map((row) => (
            <tr
              key={row.id}
              data-row-key={row.reportId}
            className={`transition ${row.reportRecord ? "cursor-pointer" : "cursor-default"} ${row.reportId === selectedReportId ? "bg-slate-100" : "hover:bg-[color:var(--surface-panel-muted)]"}`}
            onClick={() => {
              if (row.reportRecord) {
                setSelectedReportId(row.reportId);
              }
            }}
          >
            <td className="px-3 py-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[color:var(--text-primary)]">{row.outboxId || row.id}</p>
                <p className="text-[11px] text-[color:var(--text-secondary)]">{row.queueState}</p>
              </div>
            </td>
            <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">
              <div className="space-y-1">
                <p>{row.reportId}</p>
                {row.reportRecord ? (
                  <p className="text-[11px] text-[color:var(--text-secondary)]">Linked report row</p>
                ) : (
                  <p className="text-[11px] text-[color:var(--text-secondary)]">Unlinked outbox row</p>
                )}
              </div>
            </td>
            <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{row.vin}</td>
            <td className="px-3 py-3">
              <StatusBadge label={outboxMonitorLabel(row.state)} tone={outboxMonitorTone(row.state)} />
            </td>
            <td className="px-3 py-3 text-xs text-[color:var(--text-secondary)]">{row.queueState}</td>
            <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{row.attempts}</td>
            <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{normalizeControlTimestamp(row.updatedAt)}</td>
          </tr>
        ))}
      </ControlTableShell>
      </ControlSection>

      {summary?.recentActivity?.length ? (
        <ControlSection
          title="Recent backend activity"
          description="Context from the live dashboard summary. Useful for cross-checking the report isolation table against recent writes."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summary.recentActivity.slice(0, 8).map((activity) => (
              <div key={activity.id} className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">{activity.status}</p>
                <p className="mt-2 text-sm font-semibold text-[color:var(--text-primary)]">{activity.title}</p>
                <p className="mt-1 text-xs text-[color:var(--text-secondary)]">{activity.locationName || activity.locationId || "Unattributed"}</p>
              </div>
            ))}
          </div>
        </ControlSection>
      ) : null}

      <div className="rounded-[1.35rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-4 text-sm text-[color:var(--metric-warning-fg)]">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Backend route gaps discovered</p>
            <p className="opacity-90">
              Report repair/reconcile and quarantine mutations are not yet exposed as dedicated admin routes. The UI keeps those actions visible but disabled so operators can see the gap without faking the workflow.
            </p>
            <p className="opacity-80">
              The report detail panel still loads live report status and live outbox history, so the page remains useful for triage and drill-down even without those write paths.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
