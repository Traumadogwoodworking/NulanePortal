"use client";

import { useEffect, useState } from "react";
import { listRuntimeRuns } from "../runtime-client";

export function RuntimeRunStatus() {
  const [runs, setRuns] = useState<unknown[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listRuntimeRuns()
      .then((result) => {
        if (!cancelled) setRuns(Array.isArray(result.runs) ? result.runs : []);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Runtime runs are not available.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">{error}</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
        <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          <tr>
            <th className="px-3 py-2">Run</th>
            <th className="px-3 py-2">Dataset</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Started</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
          {runs.length ? runs.map((run, index) => {
            const record = run && typeof run === "object" ? run as Record<string, unknown> : {};
            return (
              <tr key={String(record.id ?? index)}>
                <td className="px-3 py-2">{String(record.id ?? "run")}</td>
                <td className="px-3 py-2">{String(record.datasetId ?? record.dataset_id ?? "")}</td>
                <td className="px-3 py-2">{String(record.status ?? "")}</td>
                <td className="px-3 py-2">{String(record.startedAt ?? record.started_at ?? "")}</td>
              </tr>
            );
          }) : (
            <tr>
              <td className="px-3 py-6 text-slate-500" colSpan={4}>No runtime runs yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
