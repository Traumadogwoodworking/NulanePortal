"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { INSPECTION_TRAC_SHAP_MODULES, SHAP_MODULE_EVIDENCE_STATES } from "@lib/inspection-trac/catalog";
import type { InspectionTracOperationsPayload, ReadinessState } from "@lib/inspection-trac/types";


function stateTone(state: string | undefined) {
  if (["VERIFIED", "ready", "passed", "released"].includes(state ?? "")) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (["DEGRADED", "degraded", "testing", "needs_review", "retest_required"].includes(state ?? "")) return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (["BLOCKED", "blocked", "failed", "unavailable"].includes(state ?? "")) return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-white/10 bg-white/5 text-slate-300";
}

function StatePill({ state }: { state: string | undefined }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${stateTone(state)}`}>{state?.replaceAll("_", " ") ?? "UNKNOWN"}</span>;
}

function displayTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function eventSummary(event: InspectionTracOperationsPayload["verifications"][number]) {
  if (typeof event.payload.message === "string") return event.payload.message;
  if (typeof event.payload.blocker === "string") return event.payload.blocker;
  return event.event_type.replaceAll("_", " ");
}

export function InspectionTracOperations() {
  const [data, setData] = useState<InspectionTracOperationsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [qaFilter, setQaFilter] = useState<"all" | "open" | "evidence">("all");

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/inspection-trac", { cache: "no-store" });
      const payload = (await response.json()) as InspectionTracOperationsPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Inspection Trac operations unavailable");
      setData(payload);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Inspection Trac operations unavailable");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const mobile = data?.components.find((component) => component.code === "mobile");
  const api = data?.components.find((component) => component.code === "api");
  const portal = data?.components.find((component) => component.code === "portal");
  const p0Blockers = data?.notifications.filter((item) => item.severity === "critical").length ?? 0;
  const qaItems = useMemo(() => (data?.qaItems ?? []).filter((item) => {
    if (qaFilter === "open") return !["passed", "not_applicable"].includes(item.status);
    if (qaFilter === "evidence") return item.evidence_count === 0;
    return true;
  }), [data, qaFilter]);
  const qaMissingEvidence = (data?.qaItems ?? []).filter((item) => item.evidence_count === 0).length;

  const strip: Array<{ label: string; state: ReadinessState | string; detail: string; href?: string }> = [
    { label: "Overall readiness", state: data?.overall ?? "UNKNOWN", detail: "Mobile field acceptance remains separate from API health", href: "/tasks/INS-001" },
    { label: "Production API", state: api?.snapshot?.production_status === "ready" ? "VERIFIED" : "UNKNOWN", detail: api?.snapshot?.commit_sha?.slice(0, 10) ?? "Identity unavailable", href: "/admin/services/inspection-trac-api" },
    { label: "Portal", state: portal?.snapshot?.production_status === "ready" ? "VERIFIED" : "UNKNOWN", detail: portal?.snapshot?.commit_sha?.slice(0, 10) ?? "Identity unavailable", href: "/admin/services/inspection-trac-portal" },
    { label: "Android", state: "BLOCKED", detail: mobile?.snapshot?.version ? `Source ${mobile.snapshot.version}; no approved installed build` : "No approved installed/tested build", href: "/tasks/INS-001" },
    { label: "iOS", state: "BLOCKED", detail: "No approved installed/tested build", href: "/tasks/INS-001" },
    { label: "SHAP modules", state: "BLOCKED", detail: "Authenticated runtime configuration not captured", href: "/tasks/INS-001" },
    { label: "Open P0 blockers", state: p0Blockers ? "BLOCKED" : "UNKNOWN", detail: `${p0Blockers} release blocker${p0Blockers === 1 ? "" : "s"}`, href: "/tasks/INS-001" },
    { label: "Last verified", state: data ? "UNKNOWN" : "UNKNOWN", detail: data ? displayTime(data.generatedAt) : "Loading" }
  ];

  return <div className="space-y-4">
    <section className="flex flex-col gap-3 border-b border-white/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-200">Production and field readiness</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Inspection Trac</h1>
        <p className="mt-1 text-sm text-slate-500">Operational truth from stored releases, QA, evidence, tasks and service samples. API health is not mobile readiness.</p>
      </div>
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>{data ? `Updated ${relativeTime(data.generatedAt)} ago` : "Loading operations…"}</span>
        <button type="button" onClick={() => void refresh()} disabled={refreshing} className="rounded-lg border border-white/10 px-3 py-1.5 font-medium text-slate-300 hover:border-cyan-300/40 disabled:opacity-50">{refreshing ? "Refreshing…" : "Refresh"}</button>
      </div>
    </section>

    {error ? <div role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">Refresh failed. Showing last known data when available. {error} <button type="button" onClick={() => void refresh()} className="ml-2 font-semibold underline">Retry</button></div> : null}
    {!data && !error ? <div className="rounded-xl border border-white/8 bg-[#10131a] p-5 text-sm text-slate-500">Loading Inspection Trac operations and QA evidence…</div> : null}

    {data ? <>
      <section aria-label="Inspection Trac readiness status" className="grid overflow-hidden rounded-xl border border-white/8 bg-[#10131a] sm:grid-cols-2 xl:grid-cols-4">
        {strip.map((item) => {
          const body = <><StatePill state={item.state} /><p className="mt-1 truncate text-[11px] text-slate-500">{item.detail}</p></>;
          return item.href ? <Link key={item.label} href={item.href} className="border-b border-r border-white/8 px-3 py-2.5 hover:bg-white/5"><p className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</p>{body}</Link> : <div key={item.label} className="border-b border-r border-white/8 px-3 py-2.5"><p className="text-[10px] uppercase tracking-wider text-slate-500">{item.label}</p>{body}</div>;
        })}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#10131a]">
        <div className="flex items-center justify-between border-b border-white/8 px-3 py-2"><div><h2 className="text-sm font-semibold text-white">Release identities and mismatches</h2><p className="text-xs text-slate-500">Known source, artifact and deployment evidence in one place.</p></div><StatePill state={data.releases[0]?.status?.toUpperCase() ?? "UNKNOWN"} /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-black/15 text-[10px] uppercase tracking-wider text-slate-500"><tr>{["Component", "Source / branch", "Commit", "Version / build", "Runtime", "Release verification"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/6">
          {data.components.map((component) => {
            const release = data.releases[0]?.components.find((item) => item.component_code === component.code);
            return <tr key={component.id}><td className="px-3 py-2 font-medium text-slate-100">{component.name}</td><td className="px-3 py-2 font-mono text-[10px] text-slate-400">{component.authoritative_branch ?? "UNKNOWN"}</td><td className="px-3 py-2 font-mono text-[10px] text-slate-400">{release?.commit_sha?.slice(0, 12) ?? component.snapshot?.commit_sha?.slice(0, 12) ?? "UNKNOWN"}</td><td className="px-3 py-2 text-slate-300">{release?.version ?? component.snapshot?.version ?? "—"}{release?.build_identifier || component.snapshot?.build_identifier ? ` +${release?.build_identifier ?? component.snapshot?.build_identifier}` : ""}</td><td className="px-3 py-2"><StatePill state={component.snapshot?.production_status ?? "UNKNOWN"} /></td><td className="px-3 py-2"><StatePill state={release?.verification_status ?? "UNKNOWN"} /></td></tr>;
          })}
        </tbody></table></div>
        <p className="border-t border-white/8 px-3 py-2 text-xs text-amber-100">Mobile source/artifact/device identities conflict and remain unverified. A ready API or portal does not change Android, iOS or SHAP readiness.</p>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#10131a]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-3 py-2"><div><h2 className="text-sm font-semibold text-white">SHAP module readiness</h2><p className="text-xs text-slate-500">No module is marked verified from tile rendering or API health alone.</p></div><Link href="/tasks/INS-001" className="text-xs font-semibold text-emerald-300 hover:text-emerald-200">Open field evidence task</Link></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-xs"><thead className="bg-black/15 text-[10px] uppercase tracking-wider text-slate-500"><tr>{["Module", "Configured", "Android", "iOS", "Draft / resume", "Scanner", "Submission", "Backend", "Portal", "Blocker"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/6">{INSPECTION_TRAC_SHAP_MODULES.map((module) => <tr key={module}><td className="px-3 py-2 font-medium text-slate-100">{module}</td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.configured} /></td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.android} /></td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.ios} /></td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.draftResume} /></td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.scanner} /></td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.submission} /></td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.backend} /></td><td className="px-3 py-2"><StatePill state={SHAP_MODULE_EVIDENCE_STATES.portal} /></td><td className="max-w-[260px] px-3 py-2 leading-snug text-rose-100">No authenticated SHAP runtime configuration, installed build, device execution, or exact acknowledgement evidence.</td></tr>)}</tbody></table></div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="overflow-hidden rounded-xl border border-white/8 bg-[#10131a]"><div className="flex items-center justify-between border-b border-white/8 px-3 py-2"><div><h2 className="text-sm font-semibold text-white">Continuing QA</h2><p className="text-xs text-slate-500">All {data.qaItems.length} durable Inspection Trac QA items for tomorrow and continuing field readiness.</p></div><div className="flex gap-1"><button type="button" onClick={() => setQaFilter("all")} className={`rounded px-2 py-1 text-xs ${qaFilter === "all" ? "bg-white/10 text-white" : "text-slate-500"}`}>All</button><button type="button" onClick={() => setQaFilter("open")} className={`rounded px-2 py-1 text-xs ${qaFilter === "open" ? "bg-white/10 text-white" : "text-slate-500"}`}>Open</button><button type="button" onClick={() => setQaFilter("evidence")} className={`rounded px-2 py-1 text-xs ${qaFilter === "evidence" ? "bg-white/10 text-white" : "text-slate-500"}`}>Missing evidence {qaMissingEvidence}</button></div></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[920px] text-left text-xs"><thead className="sticky top-0 bg-[#10131a] text-[10px] uppercase tracking-wider text-slate-500"><tr>{["QA area", "State", "Owner", "Evidence", "Last tested", "Blocker / latest evidence"].map((label) => <th key={label} className="border-b border-white/8 px-3 py-2">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/6">{qaItems.map((item) => <tr key={item.id}><td className="px-3 py-2 font-medium text-slate-100">{item.title}<p className="font-mono text-[10px] text-slate-600">{item.slug}</p></td><td className="px-3 py-2"><StatePill state={item.status} /></td><td className="px-3 py-2 text-slate-400">{item.owner ?? "Unassigned"}</td><td className="px-3 py-2">{item.evidence_count ? <span className="text-emerald-300">{item.evidence_count} record{item.evidence_count === 1 ? "" : "s"}</span> : <span className="text-amber-200">Missing</span>}</td><td className="px-3 py-2 text-slate-400">{displayTime(item.last_tested_at)}</td><td className="max-w-[340px] px-3 py-2 leading-snug text-slate-400">{item.blocker ?? item.latest_evidence ?? "No evidence or blocker recorded."}</td></tr>)}</tbody></table></div>
        </div>
        <div className="space-y-4"><section className="rounded-xl border border-white/8 bg-[#10131a]"><div className="border-b border-white/8 px-3 py-2"><h2 className="text-sm font-semibold text-white">Current incidents and blockers</h2></div><div className="divide-y divide-white/6">{data.notifications.length ? data.notifications.map((item) => <Link key={item.id} href={item.action_url ?? "/tasks/INS-001"} className="block px-3 py-2 hover:bg-white/[0.035]"><StatePill state={item.severity === "critical" ? "BLOCKED" : "DEGRADED"} /><p className="mt-1 text-xs font-semibold text-slate-100">{item.title}</p><p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{item.body}</p></Link>) : <p className="p-3 text-xs text-slate-500">No open incidents recorded.</p>}</div></section>
          <section className="rounded-xl border border-white/8 bg-[#10131a]"><div className="border-b border-white/8 px-3 py-2"><h2 className="text-sm font-semibold text-white">Linked execution work</h2></div><div className="divide-y divide-white/6">{data.tasks.map((task) => <Link key={task.public_id} href={`/tasks/${task.public_id}`} className="block px-3 py-2 hover:bg-white/[0.035]"><div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-emerald-300">{task.public_id}</span><StatePill state={task.status} /></div><p className="mt-1 text-xs font-medium text-slate-100">{task.title}</p><p className="mt-1 line-clamp-2 text-xs text-slate-400">{task.blocker ?? task.latest_action ?? "No next action recorded."}</p></Link>)}</div></section></div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#10131a]"><div className="border-b border-white/8 px-3 py-2"><h2 className="text-sm font-semibold text-white">Runtime service health</h2><p className="text-xs text-slate-500">Explicit stored probes; raw diagnostics are retained on the focused service detail.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-xs"><thead className="bg-black/15 text-[10px] uppercase tracking-wider text-slate-500"><tr>{["Service", "Environment", "State", "Commit", "Endpoint", "Latency", "Last success", "Failure / logs"].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead><tbody className="divide-y divide-white/6">{data.services.map((service) => <tr key={service.id}><td className="px-3 py-2"><Link href={`/admin/services/${service.slug}`} className="font-medium text-cyan-100 hover:text-cyan-50">{service.name}</Link></td><td className="px-3 py-2 text-slate-400">{service.environment}</td><td className="px-3 py-2"><StatePill state={service.latest?.outcome} /></td><td className="px-3 py-2 font-mono text-[10px] text-slate-400">{data.components.find((component) => component.code === service.component_code)?.snapshot?.commit_sha?.slice(0, 12) ?? "UNKNOWN"}</td><td className="max-w-[280px] truncate px-3 py-2 font-mono text-[10px] text-slate-400">{service.endpoint_url}</td><td className="px-3 py-2 text-slate-300">{service.latest?.latency_ms == null ? "—" : `${service.latest.latency_ms}ms`}</td><td className="px-3 py-2 text-slate-400">{displayTime(service.latest?.checked_at)}</td><td className="px-3 py-2 text-slate-400">{service.latest?.error ?? "No stored failure"}</td></tr>)}</tbody></table></div></section>

      <details className="rounded-xl border border-white/8 bg-[#10131a]"><summary className="cursor-pointer list-none px-3 py-2 text-sm font-semibold text-slate-300">Recent verification evidence <span className="ml-2 text-xs font-normal text-slate-600">{data.verifications.length} records loaded</span></summary><div className="divide-y divide-white/6 border-t border-white/8">{data.verifications.map((event) => <div key={event.id} className="grid gap-1 px-3 py-2 text-xs sm:grid-cols-[74px_1fr_120px]"><Link href={`/tasks/${event.task_public_id}`} className="font-mono font-semibold text-emerald-300">{event.task_public_id}</Link><span className="line-clamp-2 text-slate-300">{eventSummary(event)}</span><span className="text-right text-slate-600">{event.actor_type} · {relativeTime(event.created_at)} ago</span></div>)}</div></details>
    </> : null}
  </div>;
}
