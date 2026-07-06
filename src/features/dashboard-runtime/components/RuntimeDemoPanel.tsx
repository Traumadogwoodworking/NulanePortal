"use client";

import { getRuntimeDataSourceSummaries } from "../render-adapters";
import { getRuntimeBaseUrl } from "../runtime-client";
import type { RuntimeRenderPayload } from "../types";

export function RuntimeDemoPanel({
  payload,
  status,
}: {
  payload: RuntimeRenderPayload;
  status: string;
}) {
  const sources = getRuntimeDataSourceSummaries(payload);
  const filters = payload.filters ?? {};
  const warningCount = payload.coverageWarnings?.length ?? 0;
  const renderedAt = payload.freshness?.rendered_at ?? payload.freshness?.renderedAt;
  const runtimeBaseUrl = getRuntimeBaseUrl();

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Runtime API Render</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950">{payload.dashboard.title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{status}</p>
        </div>
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
          Spring existing_endpoint execution
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DemoFact label="Dashboard Package" value={payload.dashboard.slug || "home-inspection-overview"} />
        <DemoFact label="Runtime Base URL" value={runtimeBaseUrl} />
        <DemoFact label="Last Refreshed" value={renderedAt ? new Date(renderedAt).toLocaleString() : "local reference"} />
        <DemoFact label="Warnings" value={warningCount ? `${warningCount} coverage warning${warningCount === 1 ? "" : "s"}` : "none"} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Data Source Status</p>
          <div className="mt-3 space-y-2">
            {sources.map((source) => (
              <div key={source.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-700">
                <span>{source.id}</span>
                <span className={source.adapterPlan ? "text-rose-700" : "text-emerald-700"}>
                  {source.status}
                  {source.adapterPlan ? "" : ` / ${source.rows} rows`}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Current Filters</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.keys(filters).length ? (
              Object.entries(filters).map(([key, value]) => (
                <span key={key} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                  {key}: {String(value)}
                </span>
              ))
            ) : (
              <span className="text-xs font-semibold text-slate-500">No filters applied.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-slate-950" title={value}>
        {value}
      </p>
    </div>
  );
}
