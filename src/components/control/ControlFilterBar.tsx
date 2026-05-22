"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";

interface ControlFilterBarProps {
  search: string;
  onSearch: (value: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  summary?: ReactNode;
}

export function ControlFilterBar({
  search,
  onSearch,
  placeholder = "Search...",
  filters,
  actions,
  summary,
}: ControlFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <label className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-10 py-2.5 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] outline-none ring-0 transition focus:border-slate-300 focus:bg-[color:var(--surface-panel-muted)]"
            />
          </label>
          {summary ? <div className="hidden lg:flex lg:items-center">{summary}</div> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {actions}
        </div>
      </div>
    </div>
  );
}
