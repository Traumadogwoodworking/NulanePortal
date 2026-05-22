import { FacilitySummary } from "@/lib/types";
import { facilityFilterLabel } from "@/lib/access";

interface FacilitySelectorProps {
  facilities: FacilitySummary[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  includeAllOption?: boolean;
  emptyLabel?: string;
}

export function FacilitySelector({ facilities, value, onChange, label, includeAllOption = true, emptyLabel = "No facilities available." }: FacilitySelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-60 ml-1">{label}</span>}
      <div className="relative group">
        <select
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:ring-1 focus:ring-slate-300 shadow-sm cursor-pointer appearance-none w-full"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {includeAllOption ? <option value="all">All Facility Custom</option> : null}
          {facilities.length ? (
            facilities.map((facility) => (
              <option key={facility.id} value={facility.id}>
                {facilityFilterLabel(facility)}
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
