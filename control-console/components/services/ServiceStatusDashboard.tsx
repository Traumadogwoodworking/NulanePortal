"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ServiceMonitor, ServicesOverviewPayload } from "@lib/services/types";

function time(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not sampled yet";
}

function tone(outcome: string | undefined) {
  if (outcome === "ready") return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (outcome === "degraded") return "border-amber-400/30 bg-amber-400/10 text-amber-100";
  if (outcome === "unavailable") return "border-rose-400/30 bg-rose-400/10 text-rose-100";
  return "border-white/10 bg-white/5 text-slate-300";
}

function StatusPill({ value }: { value: string | undefined }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone(value)}`}>{value ?? "unknown"}</span>;
}

function ServiceCard({ monitor }: { monitor: ServiceMonitor }) {
  return (
    <Link href={`/admin/services/${monitor.slug}`} className="block rounded-2xl border border-white/8 bg-[#10131a] p-5 transition hover:-translate-y-0.5 hover:border-cyan-300/35">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200">{monitor.project_code ?? "Nulane"} · {monitor.service_kind}</p>
          <h2 className="mt-2 text-lg font-semibold text-white">{monitor.name}</h2>
        </div>
        <StatusPill value={monitor.latest?.outcome} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <div><p className="text-xs text-slate-500">HTTP</p><p className="mt-1 font-medium text-slate-200">{monitor.latest?.http_status ?? "—"}</p></div>
        <div><p className="text-xs text-slate-500">Latency</p><p className="mt-1 font-medium text-slate-200">{monitor.latest?.latency_ms != null ? `${monitor.latest.latency_ms}ms` : "—"}</p></div>
        <div><p className="text-xs text-slate-500">24h observed</p><p className="mt-1 font-medium text-slate-200">{monitor.observedUptime24h == null ? "—" : `${monitor.observedUptime24h}%`}</p></div>
      </div>
      <p className="mt-4 line-clamp-2 text-xs text-slate-500">{monitor.latest?.summary ?? "No stored probe yet."}</p>
      <p className="mt-2 text-[11px] text-slate-600">Last sample: {time(monitor.latest?.checked_at)}</p>
    </Link>
  );
}

export function ServiceStatusDashboard({ focusSlug }: { focusSlug?: string }) {
  const [data, setData] = useState<ServicesOverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/services", { cache: "no-store" });
    const payload = await response.json() as ServicesOverviewPayload & { error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Service status unavailable");
    setData(payload);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : "Service status unavailable"));
    }, 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  const monitors = useMemo(() => focusSlug ? (data?.monitors.filter((item) => item.slug === focusSlug) ?? []) : (data?.monitors ?? []), [data, focusSlug]);
  const focused = monitors[0];

  async function checkNow() {
    setChecking(true);
    try {
      const response = await fetch("/api/services/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: focusSlug ? [focusSlug] : undefined })
      });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Probe failed");
      await refresh();
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Probe failed");
    } finally {
      setChecking(false);
    }
  }

  if (focusSlug && data && !focused) {
    return <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-rose-100">Service monitor not found: {focusSlug}</div>;
  }

  return <div className="space-y-7">
    <section className="rounded-[2rem] border border-white/8 bg-[#10131a] p-6 sm:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Production service truth</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{focused ? focused.name : "Services and observed uptime"}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">Each result is an explicit stored probe. Uptime is observed-sample availability, never a fabricated continuous percentage.</p>
        </div>
        <button onClick={() => void checkNow()} disabled={checking} className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-cyan-950 disabled:opacity-50">{checking ? "Checking…" : focused ? "Check this service" : "Check all services"}</button>
      </div>
      {focused ? <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["State", focused.latest?.outcome ?? "unknown"],
          ["24h observed uptime", focused.observedUptime24h == null ? "No samples" : `${focused.observedUptime24h}% (${focused.samples24h})`],
          ["7d observed uptime", focused.observedUptime7d == null ? "No samples" : `${focused.observedUptime7d}% (${focused.samples7d})`],
          ["Latest latency", focused.latest?.latency_ms == null ? "—" : `${focused.latest.latency_ms}ms`]
        ].map(([label, value]) => <div key={label} className="rounded-xl border border-white/8 bg-black/15 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-100">{value}</p></div>)}
      </div> : null}
    </section>
    {error ? <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
    {focused ? <section className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5 sm:p-6">
      <div className="flex items-center justify-between"><h2 className="font-semibold text-white">Latest probe</h2><StatusPill value={focused.latest?.outcome} /></div>
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs text-slate-500">Endpoint</dt><dd className="mt-1 break-all font-mono text-xs text-cyan-100">{focused.endpoint_url}</dd></div>
        <div><dt className="text-xs text-slate-500">Checked</dt><dd className="mt-1 text-sm text-slate-200">{time(focused.latest?.checked_at)}</dd></div>
        <div><dt className="text-xs text-slate-500">Response</dt><dd className="mt-1 text-sm text-slate-200">HTTP {focused.latest?.http_status ?? "—"} · {focused.latest?.latency_ms ?? "—"}ms</dd></div>
        <div><dt className="text-xs text-slate-500">Summary</dt><dd className="mt-1 text-sm text-slate-200">{focused.latest?.summary ?? "No sample"}</dd></div>
        {focused.latest?.error ? <div className="sm:col-span-2"><dt className="text-xs text-slate-500">Error</dt><dd className="mt-1 break-words text-sm text-rose-100">{focused.latest.error}</dd></div> : null}
      </dl>
      <div className="mt-6"><p className="text-xs text-slate-500">Dependency signal</p><pre className="mt-2 max-h-80 overflow-auto rounded-xl border border-white/8 bg-black/25 p-4 text-xs text-slate-300">{JSON.stringify(focused.latest?.details ?? {}, null, 2)}</pre></div>
    </section> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{monitors.map((monitor) => <ServiceCard key={monitor.id} monitor={monitor} />)}</section>}
  </div>;
}
