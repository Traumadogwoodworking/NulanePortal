"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Truck, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  CircleDispatchDriver,
  CircleDispatchLoad,
  fetchCircleDispatchDrivers,
  fetchCircleDispatchLoads,
} from "@/lib/services/circleLoadService";

const BOARD_STATES = [
  "draft",
  "ready",
  "assigned",
  "accepted",
  "in_transit",
  "partially_delivered",
  "completed",
  "exception",
  "closed",
] as const;

function label(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string): "positive" | "warning" | "danger" | "neutral" {
  if (["completed", "closed"].includes(status)) return "positive";
  if (status === "exception") return "danger";
  if (["assigned", "accepted", "in_transit", "partially_delivered"].includes(status)) {
    return "warning";
  }
  return "neutral";
}

export default function CircleDispatchLoadsPage() {
  const [loads, setLoads] = useState<CircleDispatchLoad[]>([]);
  const [drivers, setDrivers] = useState<CircleDispatchDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextLoads, nextDrivers] = await Promise.all([
        fetchCircleDispatchLoads(),
        fetchCircleDispatchDrivers(),
      ]);
      setLoads(nextLoads);
      setDrivers(nextDrivers);
    } catch (cause) {
      setError(cause instanceof Error ? cause : new Error("Unable to load Circle dispatch."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchCircleDispatchLoads(), fetchCircleDispatchDrivers()])
      .then(([nextLoads, nextDrivers]) => {
        if (cancelled) return;
        setLoads(nextLoads);
        setDrivers(nextDrivers);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(cause instanceof Error ? cause : new Error("Unable to load Circle dispatch."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    return BOARD_STATES.reduce<Record<string, number>>((result, state) => {
      result[state] = loads.filter((load) => load.status === state).length;
      return result;
    }, {});
  }, [loads]);

  const activeDriverCount = drivers.filter((driver) => driver.active).length;
  const driverById = useMemo(
    () => new Map(drivers.map((driver) => [driver.id, driver])),
    [drivers],
  );

  return (
    <main className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Circle Logistics</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950">Dispatch / Loads</h1>
          <p className="mt-2 text-sm text-slate-600">
            Server-owned manifests, driver assignments, stops, VIN progress, and completion state.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {BOARD_STATES.map((state) => (
          <article key={state} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label(state)}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{counts[state] ?? 0}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Truck className="h-8 w-8 text-slate-700" />
          <div>
            <p className="text-sm text-slate-500">Active loads</p>
            <p className="text-2xl font-black text-slate-950">
              {loads.filter((load) => !["draft", "closed", "cancelled"].includes(load.status)).length}
            </p>
          </div>
        </article>
        <article className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <Users className="h-8 w-8 text-slate-700" />
          <div>
            <p className="text-sm text-slate-500">Active drivers</p>
            <p className="text-2xl font-black text-slate-950">{activeDriverCount}</p>
          </div>
        </article>
      </section>

      {error ? (
        <ErrorPanel
          error={error}
          title="Unable to load Circle dispatch"
          action={
            <button className="text-sm font-bold underline" onClick={() => void refresh()}>
              Retry
            </button>
          }
        />
      ) : null}

      {!error && !loading && loads.length === 0 ? (
        <EmptyState
          title="No Circle loads yet"
          description="Create/import and publish actions arrive in the next backend slice. Published loads will appear here."
        />
      ) : null}

      {loads.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Load / Trip</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">VIN progress</th>
                  <th className="px-4 py-3">Stops</th>
                  <th className="px-4 py-3">Manifest</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loads.map((load) => {
                  const driver = load.primaryDriverId
                    ? driverById.get(load.primaryDriverId)
                    : null;
                  return (
                    <tr key={load.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-950">{load.tripNumber}</p>
                        <p className="text-xs text-slate-500">{load.externalLoadId || "No external ID"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge label={label(load.status)} tone={statusTone(load.status)} />
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {driver ? `${driver.displayName} (${driver.driverNumber})` : "Unassigned"}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {load.remainingVinCount} remaining / {load.totalVinCount} total
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        <p>{load.destinationCount} destinations</p>
                        <p className="text-xs text-slate-500">{load.nextStopName || "No next stop"}</p>
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-slate-600">
                        r{load.manifestRevision}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}
