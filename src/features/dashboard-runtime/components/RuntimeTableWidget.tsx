import type { RuntimeDataRow, RuntimeWidgetDefinition } from "../types";

export function RuntimeTableWidget({ widget, rows }: { widget: RuntimeWidgetDefinition; rows: RuntimeDataRow[] }) {
  const headers = widget.dimensions.length ? widget.dimensions : Object.keys(rows[0] ?? {});
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{widget.title}</p>
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
            {rows.slice(0, 10).map((row, index) => (
              <tr key={`${widget.id}-${index}`}>
                {headers.map((header) => (
                  <td key={header} className="px-3 py-2">
                    {String(row[header] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
