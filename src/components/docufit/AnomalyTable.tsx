"use client";

import { MovingAveragePoint } from "@/lib/docufit/anomalyUtils";

const formatDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const badgeClass = (delta: number) => {
  if (delta > 6) {
    return "border-red-200 bg-red-50 text-red-600";
  }
  return "border-amber-200 bg-amber-50 text-amber-600";
};

export function AnomalyTable({ anomalies }: { anomalies: MovingAveragePoint[] }) {
  const count = anomalies.length;

  return (
    <details className="group rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-black uppercase tracking-[0.28em] text-slate-500">
          <span className="flex items-center justify-between">
            <span>Anomalies</span>
            <span className="text-slate-400">{count} Δ &gt; 4 mm</span>
          </span>
      </summary>
      <div className="mt-3">
        {count === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
            No recent anomalies detected (Δ ≤ 4 mm).
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="min-w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.3em] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Dimension</th>
                  <th className="px-4 py-3 font-semibold text-right">Raw</th>
                  <th className="px-4 py-3 font-semibold text-right">SMA30</th>
                  <th className="px-4 py-3 font-semibold text-right">Δ</th>
                </tr>
              </thead>
              <tbody>
                {anomalies.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(row.takenAt)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.dimension || "—"}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {Number.isFinite(row.rawValue) ? `${row.rawValue.toFixed(1)} mm` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {row.sma != null ? `${row.sma.toFixed(1)} mm` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] ${badgeClass(
                          row.delta ?? 0
                        )}`}
                      >
                        Δ {row.delta?.toFixed(1) ?? "0.0"} mm
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}
