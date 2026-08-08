import type { RuntimeDataRow, RuntimeWidgetDefinition } from "../types";
import { getFirstNumericValue } from "../render-adapters";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function RuntimeMetricWidget({ widget, rows }: { widget: RuntimeWidgetDefinition; rows: RuntimeDataRow[] }) {
  const primary = getFirstNumericValue(rows, [widget.measures[0] ?? ""]);
  const secondary = widget.measures[1] ? getFirstNumericValue(rows, [widget.measures[1]]) : null;
  const secondaryLabel = widget.measures[1] ? metricLabel(widget.measures[1]) : "";
  return (
    <div className="h-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="h-1 bg-slate-950" />
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{widget.title}</p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-rose-700">{metricLabel(widget.measures[0] ?? "")}</p>
            <p className="mt-1 text-4xl font-black tracking-tight text-slate-950">{formatNumber(primary)}</p>
          </div>
        {secondary !== null ? (
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">{secondaryLabel}</p>
              <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(secondary)}</p>
            </div>
        ) : null}
        </div>
        {widget.emptyState ? <p className="mt-3 text-xs font-medium leading-5 text-slate-500">{widget.emptyState}</p> : null}
      </div>
    </div>
  );
}

function metricLabel(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("nodamage") || normalized.includes("clear")) return "Clear";
  if (normalized.includes("today")) return "Today";
  if (normalized.includes("rsa")) return "RSA";
  if (normalized.includes("damage")) return "Damaged";
  return "Value";
}
