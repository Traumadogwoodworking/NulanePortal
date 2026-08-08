"use client";

import { Check, Clipboard, Download, FileText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { getRuntimeBaseUrl, getRuntimeCatalog, getRuntimeDocs } from "../runtime-client";
import type { RuntimeCatalog, RuntimeCatalogDataset, RuntimeDocs } from "../types";

type LoadState = {
  catalog?: RuntimeCatalog;
  docs?: RuntimeDocs;
  error?: string;
};

export function RuntimeDataCatalog() {
  const [state, setState] = useState<LoadState>({});
  const [copied, setCopied] = useState<string>("");
  const runtimeBaseUrl = getRuntimeBaseUrl();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [catalogResult, docsResult] = await Promise.all([getRuntimeCatalog(), getRuntimeDocs()]);
        if (!cancelled) {
          setState({
            catalog: catalogResult.catalog,
            docs: docsResult.docs,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({ error: error instanceof Error ? error.message : "Runtime catalog failed to load." });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogJson = useMemo(() => JSON.stringify(state.catalog ?? {}, null, 2), [state.catalog]);
  const docsMarkdown = state.docs?.markdown ?? "";

  async function copyText(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1600);
  }

  function downloadText(filename: string, text: string, type: string) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  if (state.error) {
    return (
      <section className="rounded-lg border border-rose-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-600">Catalog unavailable</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">{state.error}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Runtime base URL: {runtimeBaseUrl}</p>
      </section>
    );
  }

  if (!state.catalog) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-600">Loading runtime data catalog...</p>
      </section>
    );
  }

  const dashboards = state.catalog.dashboards ?? [];
  const datasets = state.catalog.datasets ?? [];
  const endpoints = state.catalog.supportedExistingEndpoints ?? [];

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Runtime Data Catalog</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">What data can dashboards use?</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
              This is the business-facing contract for the analytics engine: dashboards, datasets, fields, backend source endpoints, and safe rules.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton label={copied === "catalog" ? "Copied" : "Copy JSON"} icon={copied === "catalog" ? Check : Clipboard} onClick={() => copyText("catalog", catalogJson)} />
            <ActionButton label="Download JSON" icon={Download} onClick={() => downloadText("analytics-runtime-catalog.json", catalogJson, "application/json")} />
            <ActionButton label={copied === "docs" ? "Copied" : "Copy Docs"} icon={copied === "docs" ? Check : FileText} onClick={() => copyText("docs", docsMarkdown)} />
            <ActionButton label="Download Docs" icon={Download} onClick={() => downloadText("analytics-runtime-docs.md", docsMarkdown, "text/markdown")} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="Dashboards" value={String(state.catalog.dashboardCount ?? dashboards.length)} />
        <SummaryCard label="Datasets" value={String(state.catalog.datasetCount ?? datasets.length)} />
        <SummaryCard label="Adapter Mode" value={String(state.catalog.adapterMode ?? "unknown")} />
        <SummaryCard label="Runtime Base" value={runtimeBaseUrl} small />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Approved Backend Pulls</p>
        <div className="mt-3 grid gap-2">
          {endpoints.map((endpoint, index) => (
            <div key={`${endpoint.id ?? index}`} className="rounded-md border border-slate-200 p-3">
              <p className="text-sm font-black text-slate-950">{String(endpoint.id ?? "endpoint")}</p>
              <p className="mt-1 font-mono text-xs font-bold text-slate-700">{String(endpoint.path ?? "")}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{String(endpoint.description ?? "")}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {datasets.map((dataset) => (
          <DatasetCard key={dataset.id} dataset={dataset} copied={copied} onCopy={copyText} />
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Dashboards</p>
        <div className="mt-4 space-y-3">
          {dashboards.map((dashboard) => (
            <div key={dashboard.slug} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-lg font-black text-slate-950">{dashboard.title}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">{dashboard.description}</p>
                </div>
                <p className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-700">{dashboard.slug}</p>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                <MiniStat label="Datasets" value={(dashboard.datasets ?? []).join(", ")} />
                <MiniStat label="Widgets" value={String(dashboard.widgets?.length ?? 0)} />
                <MiniStat label="Coverage Warnings" value={String(dashboard.coverageRequirements?.length ?? 0)} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DatasetCard({ dataset, copied, onCopy }: { dataset: RuntimeCatalogDataset; copied: string; onCopy: (key: string, text: string) => void }) {
  const payload = JSON.stringify(dataset, null, 2);
  const copyKey = `dataset:${dataset.id}`;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{dataset.sourceType}</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">{dataset.title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">{dataset.description}</p>
        </div>
        <button
          type="button"
          onClick={() => onCopy(copyKey, payload)}
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
        >
          {copied === copyKey ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
          {copied === copyKey ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <MiniStat label="Dataset ID" value={dataset.id} />
        <MiniStat label="Source" value={dataset.source ?? ""} />
        <MiniStat label="Preview" value={dataset.previewEndpoint ?? ""} />
        <MiniStat label="Fields" value={String(dataset.fieldCount ?? dataset.fields?.length ?? 0)} />
      </div>
      <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-[0.14em] text-slate-500">
            <tr>
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Meaning</th>
              <th className="px-3 py-2">Required</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(dataset.fields ?? []).map((field) => (
              <tr key={field.key}>
                <td className="px-3 py-2 font-mono font-bold text-slate-800">{field.key}</td>
                <td className="px-3 py-2 font-semibold text-slate-600">{field.fieldType}</td>
                <td className="px-3 py-2 font-semibold text-slate-600">{field.semanticType}</td>
                <td className="px-3 py-2 font-semibold text-slate-600">{field.required ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SummaryCard({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`${small ? "break-all text-sm" : "text-2xl"} mt-2 font-black text-slate-950`}>{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-xs font-bold text-slate-700">{value || "-"}</p>
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick }: { label: string; icon: ComponentType<{ className?: string }>; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-700 shadow-sm hover:bg-slate-50"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}
