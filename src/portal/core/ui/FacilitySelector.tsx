"use client";

import { useMemo, useState } from "react";
import { FacilitySummary } from "@/lib/types";
import { facilityFilterLabel } from "@/lib/access";
import { normalizeSearchText } from "@/lib/searchText";

interface FacilitySelectorProps {
  facilities: FacilitySummary[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  includeAllOption?: boolean;
  emptyLabel?: string;
  searchable?: boolean;
  showSlug?: boolean;
}

export function FacilitySelector({
  facilities,
  value,
  onChange,
  label,
  includeAllOption = true,
  emptyLabel = "No facilities available.",
  searchable = false,
  showSlug = true,
}: FacilitySelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const visibleFacilities = useMemo(() => {
    const query = normalizeSearchText(searchTerm);
    if (!query) return facilities;
    return facilities.filter((facility) => normalizeSearchText(facility.name).includes(query));
  }, [facilities, searchTerm]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 ml-1">{label}</span>}
      {searchable ? (
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search facilities by label"
          aria-label="Search facilities by label"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:ring-1 focus:ring-slate-300"
        />
      ) : null}
      <div className="relative group">
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-slate-300 shadow-sm cursor-pointer appearance-none w-full"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setSearchTerm("");
          }}
        >
          {includeAllOption ? <option value="all">All Facility Custom</option> : null}
          {visibleFacilities.length ? (
            visibleFacilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {showSlug ? facilityFilterLabel(facility) : facility.name}
              </option>
            ))
          ) : (
            <option value="">{emptyLabel}</option>
          )}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity">
           <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
              <path d="M5.293 7.293 a1 1 0 011.414 0L10 10.586l3.293-3.293 a1 1 0 111.414 1.414l-4 4 a1 1 0 01-1.414 0l-4-4 a1 1 0 010-1.414z" />
           </svg>
        </div>
      </div>
    </div>
  );
}

