import type { RuntimeDataRow, RuntimeWidgetDefinition } from "../types";

export function RuntimeTableWidget({ widget, rows }: { widget: RuntimeWidgetDefinition; rows: RuntimeDataRow[] }) {
  const headers = widget.dimensions.length ? widget.dimensions : Object.keys(rows[0] ?? {});
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{widget.title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">{rows.length ? `${rows.length} runtime rows returned` : "No rows returned"}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-3 py-2">
                  {header.replace(/^rows\./, "")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
            {rows.length ? (
              rows.slice(0, 10).map((row, index) => (
                <tr key={`${widget.id}-${index}`}>
                  {headers.map((header) => (
                  <td key={header} className="px-3 py-2">
                      {formatCell(row[header])}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={Math.max(headers.length, 1)}>
                  {widget.emptyState || "The runtime executed this dataset, but no preview rows are available for the current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value).toLocaleString();
  }
  return String(value);
}
