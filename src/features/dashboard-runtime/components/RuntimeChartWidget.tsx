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
      <div className="h-full rounded-lg border border-dashed border-slate-300 bg-white p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{widget.title}</p>
        <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
          {widget.emptyState || "The runtime executed this dataset, but no chart rows matched the current filters or declared fields."}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{widget.title}</p>
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Damaged</span>
          {secondaryKey ? <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Clear</span> : null}
        </div>
      </div>
      {chartRows.map((row, index) => {
        const primary = getNumberValue(row, primaryKey);
        const secondary = secondaryKey ? getNumberValue(row, secondaryKey) : 0;
        const label = getStringValue(row, [labelKey, widget.dimensions[0] ?? ""], `Row ${index + 1}`);
        return (
          <div key={`${widget.id}-${label}-${index}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700">
              <span className="truncate">{label}</span>
              <span className="tabular-nums">{formatNumber(primary + secondary)}</span>
            </div>
            <div className="flex h-4 overflow-hidden rounded bg-slate-100 ring-1 ring-slate-200">
              <div className="bg-rose-500" title={`Damaged: ${primary}`} style={{ width: `${Math.max(primary ? 3 : 0, (primary / max) * 100)}%` }} />
              {secondaryKey ? <div className="bg-emerald-500" title={`Clear: ${secondary}`} style={{ width: `${Math.max(secondary ? 3 : 0, (secondary / max) * 100)}%` }} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
