"use client";

import Link from "next/link";

type TraceStatus = "submitted" | "processed" | "sent" | "failed" | "unknown";

export interface ControlTracePanelProps {
  reportId?: string | null;
  outboxId?: string | null;
  source?: string | null;
  currentStatus?: string | null;
  lastAttempt?: string | null;
  lastError?: string | null;
  statusChain?: string[];
  reportHref?: string | null;
  outboxHref?: string | null;
  auditHref?: string | null;
}

function normalizeStatus(value?: string | null): TraceStatus {
  const status = (value || "").toLowerCase();
  if (!status) return "unknown";
  if (status.includes("fail")) return "failed";
  if (status === "sent" || status.includes("sent")) return "sent";
  if (status.includes("process") || status.includes("retry") || status.includes("queue")) return "processed";
  if (status.includes("submit")) return "submitted";
  return "unknown";
}

function toneForStatus(status: TraceStatus): string {
  switch (status) {
    case "failed":
      return "border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] text-[color:var(--metric-danger-fg)]";
    case "sent":
      return "border-[color:var(--metric-positive-border)] bg-[color:var(--metric-positive-bg)] text-[color:var(--metric-positive-fg)]";
    case "processed":
      return "border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] text-[color:var(--metric-warning-fg)]";
    case "submitted":
      return "border-[color:var(--metric-neutral-border)] bg-[color:var(--metric-neutral-bg)] text-[color:var(--metric-neutral-fg)]";
    default:
      return "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-primary)]";
  }
}

function TraceLink({ href, label, disabledReason }: { href?: string | null; label: string; disabledReason: string }) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        title={disabledReason}
        className="rounded-full border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-secondary)]"
      >
        {disabledReason}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--text-primary)] transition hover:border-[color:var(--brand)] hover:bg-[color:var(--surface-panel)] focus:outline-none focus:ring-2 focus:ring-[color:var(--brand)]/25"
    >
      {label}
    </Link>
  );
}

export function ControlTracePanel({
  reportId,
  outboxId,
  source,
  currentStatus,
  lastAttempt,
  lastError,
  statusChain,
  reportHref,
  outboxHref,
  auditHref,
}: ControlTracePanelProps) {
  const normalized = normalizeStatus(currentStatus);
  const chain = statusChain && statusChain.length ? statusChain : ["SUBMITTED", "PROCESSED", "SENT", "FAILED"];

  return (
    <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">Trace Context</p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">Cross-surface linkage</p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${toneForStatus(normalized)}`}>
          {normalized}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-[color:var(--text-primary)]/84">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 ${reportId ? "border-[color:var(--metric-positive-border)] bg-[color:var(--metric-positive-bg)] text-[color:var(--metric-positive-fg)]" : "border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-secondary)]"}`}>Report ID: {reportId || "Not linked"}</span>
          <span className={`rounded-full border px-3 py-1 ${outboxId ? "border-[color:var(--metric-positive-border)] bg-[color:var(--metric-positive-bg)] text-[color:var(--metric-positive-fg)]" : "border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-secondary)]"}`}>Outbox ID: {outboxId || "Not linked"}</span>
          <span className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-3 py-1">Source: {source || "Unknown"}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {chain.map((step) => (
            <span key={step} className="rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)]">
              {step}
            </span>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">Last attempt</p>
            <p className="mt-1 text-sm text-[color:var(--text-primary)]">{lastAttempt || "No attempt recorded"}</p>
          </div>
          <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">Last error</p>
            <p className="mt-1 text-sm text-[color:var(--text-primary)]">{lastError || "No error recorded"}</p>
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <TraceLink href={reportHref} label="Open report" disabledReason="Report link unavailable" />
        <TraceLink href={outboxHref} label="Open outbox row" disabledReason="Outbox link unavailable" />
        <TraceLink href={auditHref} label="Open audit" disabledReason="Audit link unavailable" />
      </div>
    </div>
  );
}
