"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileText, X } from "lucide-react";
import {
  CircleDispatchLoadDetail,
  cancelCircleDispatchLoad,
  fetchCircleDispatchLoad,
} from "@/lib/services/circleLoadService";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

export function CircleLoadDetailPanel({
  loadId,
  onClose,
  onChanged,
}: {
  loadId: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [detail, setDetail] = useState<CircleDispatchLoadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let active = true;
    fetchCircleDispatchLoad(loadId)
      .then((value) => {
        if (active) setDetail(value);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Unable to load details.");
        }
      });
    return () => {
      active = false;
    };
  }, [loadId]);

  const vehiclesByStop = useMemo(() => {
    const grouped = new Map<string, NonNullable<typeof detail>["vehicles"]>();
    detail?.vehicles.forEach((vehicle) => {
      grouped.set(vehicle.stop_id, [...(grouped.get(vehicle.stop_id) ?? []), vehicle]);
    });
    return grouped;
  }, [detail]);

  const exceptions =
    detail?.audit.filter((event) =>
      /(reject|exception|fail|conflict|cancel)/i.test(event.event_type),
    ) ?? [];
  const latestActivity = detail?.audit.at(-1);

  const cancel = async () => {
    if (!detail) return;
    const reason = window.prompt("Cancellation reason");
    if (!reason?.trim()) return;
    setCancelling(true);
    setError(null);
    try {
      await cancelCircleDispatchLoad(
        detail.load.id,
        detail.load.manifestRevision,
        reason.trim(),
      );
      await onChanged();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to cancel load.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Load detail and audit
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            {detail?.load.tripNumber ?? "Loading…"}
          </h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close load detail">
          <X className="h-5 w-5 text-slate-600" />
        </button>
      </div>
      {error ? (
        <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">
          {error}
        </p>
      ) : null}
      {!detail && !error ? <p className="mt-4 text-sm text-slate-600">Loading server state…</p> : null}
      {detail ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Status</p>
              <p className="mt-1 font-black text-slate-950">{detail.load.status}</p>
            </article>
            <article className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Delivered</p>
              <p className="mt-1 font-black text-slate-950">
                {detail.load.totalVinCount - detail.load.remainingVinCount} / {detail.load.totalVinCount}
              </p>
            </article>
            <article className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Driver</p>
              <p className="mt-1 font-black text-slate-950">
                {detail.assignments.find((item) => ["assigned", "accepted"].includes(item.status))?.display_name ?? "Unassigned"}
              </p>
            </article>
            <article className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-500">Latest activity</p>
              <p className="mt-1 font-black text-slate-950">{latestActivity?.event_type ?? "None"}</p>
              <p className="text-xs text-slate-500">{formatDate(latestActivity?.created_at)}</p>
            </article>
          </div>

          <div className="mt-5 space-y-3">
            {detail.stops.map((stop) => {
              const vehicles = vehiclesByStop.get(stop.id) ?? [];
              const delivered = vehicles.filter(
                (vehicle) => vehicle.delivery_status === "delivered",
              ).length;
              return (
                <article key={stop.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-950">
                        Stop {stop.sequence_number}: {stop.destination_name_snapshot}
                      </p>
                      <p className="break-words text-sm text-slate-600">
                        {[stop.address_snapshot.street, stop.address_snapshot.city, stop.address_snapshot.state, stop.address_snapshot.postalCode].filter(Boolean).join(", ") || "No address supplied"}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {stop.status} · {delivered}/{vehicles.length} delivered
                    </p>
                  </div>
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr><th className="py-2">VIN</th><th>Vehicle</th><th>Bay</th><th>Status</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {vehicles.map((vehicle) => (
                          <tr key={vehicle.id}>
                            <td className="py-2 font-mono">{vehicle.vin}</td>
                            <td>{[vehicle.year, vehicle.make, vehicle.model, vehicle.submodel].filter(Boolean).join(" ") || "—"}</td>
                            <td>{vehicle.bay || "—"}</td>
                            <td>{vehicle.delivery_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              );
            })}
          </div>

          {exceptions.length ? (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 font-black text-amber-950">
                <AlertTriangle className="h-4 w-4" /> Visible exceptions
              </p>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {exceptions.map((event) => (
                  <li key={event.id}>{event.event_type} · {formatDate(event.created_at)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-5 rounded-xl border border-slate-200 p-4">
            <p className="flex items-center gap-2 font-black text-slate-950">
              <FileText className="h-4 w-4" /> ePOD artifacts
            </p>
            {detail.artifacts.length ? (
              <ul className="mt-2 space-y-2 text-sm">
                {detail.artifacts.map((artifact) => (
                  <li key={artifact.id}>
                    {artifact.url ? (
                      <a className="font-bold text-blue-700 underline" href={artifact.url} target="_blank" rel="noreferrer">
                        {artifact.artifact_type}
                      </a>
                    ) : artifact.artifact_type}
                    {" · "}{artifact.generation_status}
                    {artifact.generation_error ? ` · ${artifact.generation_error}` : ""}
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-slate-600">No delivery artifacts yet.</p>}
          </div>

          {["draft", "ready", "assigned"].includes(detail.load.status) ? (
            <button type="button" disabled={cancelling} onClick={() => void cancel()} className="mt-5 rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50">
              {cancelling ? "Cancelling…" : "Cancel load with reason"}
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
