"use client";

import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";

export function DashboardFilterBar({ onApply }: { onApply: (filters: Record<string, string>) => void }) {
  const [filters, setFilters] = useState<Record<string, string>>({});

  function update(key: string, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-slate-500" />
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Shared Filters</p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {[
          ["from", "From"],
          ["to", "To"],
          ["facility_id", "Facility"],
          ["inspector_email", "Inspector"],
        ].map(([key, label]) => (
          <label key={key} className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span>
            <input
              value={filters[key] ?? ""}
              onChange={(event) => update(key, event.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none focus:border-slate-400"
            />
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onApply(filters)}
        className="mt-4 inline-flex h-9 items-center rounded-lg bg-slate-950 px-4 text-xs font-black uppercase tracking-[0.16em] text-white"
      >
        Apply
      </button>
    </div>
  );
}
