"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import type { RuntimeRenderPayload } from "../types";

type DashboardFilterBarProps = {
  payload: RuntimeRenderPayload;
  currentFilters: Record<string, string>;
  onApply: (filters: Record<string, string>) => void;
};

const filterFields = [
  { key: "from", label: "From", type: "date" },
  { key: "to", label: "To", type: "date" },
  { key: "facility_id", label: "Facility", type: "select" },
  { key: "inspector_email", label: "Inspector", type: "select" },
  { key: "status", label: "Status", type: "select" },
  { key: "inspection_type", label: "Inspection Type", type: "select" },
  { key: "search", label: "VIN / Report", type: "text" },
] as const;

export function DashboardFilterBar({ payload, currentFilters, onApply }: DashboardFilterBarProps) {
  const [filters, setFilters] = useState<Record<string, string>>(currentFilters);
  const options = useMemo(() => buildFilterOptions(payload), [payload]);
  const activeEntries = Object.entries(currentFilters).filter(([, value]) => value.trim());

  function update(key: string, value: string) {
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (!value.trim()) delete next[key];
      return next;
    });
  }

  function cleanFilters(value: Record<string, string>) {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry.trim()));
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Shared Filters</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Filters are sent to Spring and mapped to the scoped Node endpoints.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setFilters({});
              onApply({});
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.14em] text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(cleanFilters(filters))}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-4 text-xs font-black uppercase tracking-[0.14em] text-white hover:bg-slate-800"
          >
            <Search className="h-3.5 w-3.5" />
            Apply
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {filterFields.map((field) => (
          <label key={field.key} className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{field.label}</span>
            {field.type === "select" ? (
              <select
                value={filters[field.key] ?? ""}
                onChange={(event) => update(field.key, event.target.value)}
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
              >
                <option value="">All</option>
                {options[field.key]?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={filters[field.key] ?? ""}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.key === "search" ? "VIN or report id" : undefined}
                className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
              />
            )}
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {activeEntries.length ? (
          activeEntries.map(([key, value]) => (
            <span key={key} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
              {filterLabel(key)}: {value}
            </span>
          ))
        ) : (
          <span className="text-xs font-semibold text-slate-500">No active filters.</span>
        )}
      </div>
    </section>
  );
}

function buildFilterOptions(payload: RuntimeRenderPayload): Record<string, Array<{ label: string; value: string }>> {
  const reports = getReportRows(payload);
  const analytics = getAnalyticsPayload(payload);
  return {
    facility_id: uniqueOptions([
      ...reports.map((row) => text(nested(row.location, "facility") || nested(row.location, "location_id"))),
      ...analytics.byFacility.map((row) => text(row.facility_id || row.facility)),
    ]),
    inspector_email: uniqueOptions([
      ...reports.map((row) => text(row.inspector_email)),
      ...analytics.byInspector.map((row) => text(row.inspector_email)),
    ]),
    status: uniqueOptions(reports.map((row) => text(row.status))),
    inspection_type: uniqueOptions(reports.map((row) => text(row.inspection_type_number))),
  };
}

function getReportRows(payload: RuntimeRenderPayload): Array<Record<string, unknown>> {
  const value = payload.data?.report_list;
  if (value && typeof value === "object" && !Array.isArray(value) && Array.isArray((value as { rows?: unknown }).rows)) {
    return (value as { rows: Array<Record<string, unknown>> }).rows;
  }
  return [];
}

function getAnalyticsPayload(payload: RuntimeRenderPayload): {
  byFacility: Array<Record<string, unknown>>;
  byInspector: Array<Record<string, unknown>>;
} {
  const value = payload.data?.dashboard_analytics;
  if (!value || typeof value !== "object" || Array.isArray(value)) return { byFacility: [], byInspector: [] };
  return {
    byFacility: Array.isArray((value as { byFacility?: unknown }).byFacility) ? (value as { byFacility: Array<Record<string, unknown>> }).byFacility : [],
    byInspector: Array.isArray((value as { byInspector?: unknown }).byInspector) ? (value as { byInspector: Array<Record<string, unknown>> }).byInspector : [],
  };
}

function uniqueOptions(values: string[]): Array<{ label: string; value: string }> {
  return Array.from(new Set(values.filter(Boolean)))
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ label: value, value }));
}

function text(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function nested(value: unknown, key: string): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return (value as Record<string, unknown>)[key];
}

function filterLabel(key: string): string {
  return filterFields.find((field) => field.key === key)?.label ?? key;
}
