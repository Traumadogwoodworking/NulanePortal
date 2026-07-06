import type { RuntimeDataRow, RuntimeWidgetDefinition } from "../types";
import { getNumberValue, getStringValue } from "../render-adapters";

export function RuntimeChartWidget({ widget, rows }: { widget: RuntimeWidgetDefinition; rows: RuntimeDataRow[] }) {
  const labelKey = widget.dimensions[widget.dimensions.length - 1] ?? widget.dimensions[0] ?? "label";
  const primaryKey = widget.measures[0] ?? "value";
  const secondaryKey = widget.measures[1] ?? "";
  const chartRows = rows
    .filter((row) => getNumberValue(row, primaryKey) > 0 || (secondaryKey ? getNumberValue(row, secondaryKey) > 0 : false))
    .slice(0, 8);
  const max = Math.max(
    1,
    ...chartRows.map((row) => getNumberValue(row, primaryKey) + (secondaryKey ? getNumberValue(row, secondaryKey) : 0)),
  );

  if (!chartRows.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-5 text-sm font-semibold text-slate-500">
        {widget.emptyState || "No chart rows for the current dashboard payload."}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{widget.title}</p>
      {chartRows.map((row, index) => {
        const primary = getNumberValue(row, primaryKey);
        const secondary = secondaryKey ? getNumberValue(row, secondaryKey) : 0;
        const label = getStringValue(row, [labelKey, widget.dimensions[0] ?? ""], `Row ${index + 1}`);
        return (
          <div key={`${widget.id}-${label}-${index}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700">
              <span className="truncate">{label}</span>
              <span>{primary + secondary}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              <div className="bg-rose-500" style={{ width: `${Math.max(secondary ? 3 : 4, (primary / max) * 100)}%` }} />
              {secondaryKey ? <div className="bg-emerald-500" style={{ width: `${Math.max(secondary ? 3 : 0, (secondary / max) * 100)}%` }} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
