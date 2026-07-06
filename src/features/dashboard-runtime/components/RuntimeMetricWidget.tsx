import type { RuntimeDataRow, RuntimeWidgetDefinition } from "../types";
import { getFirstNumericValue } from "../render-adapters";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function RuntimeMetricWidget({ widget, rows }: { widget: RuntimeWidgetDefinition; rows: RuntimeDataRow[] }) {
  const primary = getFirstNumericValue(rows, [widget.measures[0] ?? ""]);
  const secondary = widget.measures[1] ? getFirstNumericValue(rows, [widget.measures[1]]) : null;
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{widget.title}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-black tracking-tight text-slate-950">{formatNumber(primary)}</p>
        {secondary !== null ? (
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-700">Clear</p>
            <p className="text-lg font-black text-slate-950">{formatNumber(secondary)}</p>
          </div>
        ) : null}
      </div>
      {widget.emptyState ? <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{widget.emptyState}</p> : null}
    </div>
  );
}
