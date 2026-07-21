"use client";

import { useState } from "react";
import { FileUp, Plus, Trash2 } from "lucide-react";
import {
  CircleDispatchDriver,
  addCircleDispatchStop,
  addCircleDispatchVehicles,
  assignCircleDispatchLoad,
  createCircleDispatchLoad,
  publishCircleDispatchLoad,
} from "@/lib/services/circleLoadService";

interface DraftStop {
  key: string;
  destinationName: string;
  dealerCode: string;
  vins: string;
}

function newStop(): DraftStop {
  return {
    key: crypto.randomUUID(),
    destinationName: "",
    dealerCode: "",
    vins: "",
  };
}

function parseVins(value: string): string[] {
  const vins = value
    .split(/\r?\n/)
    .map((line) => line.split(",")[0]?.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase())
    .filter((vin) => vin && vin !== "VIN");
  return [...new Set(vins)];
}

export function CircleLoadBuilder({
  drivers,
  onPublished,
}: {
  drivers: CircleDispatchDriver[];
  onPublished: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [tripNumber, setTripNumber] = useState("");
  const [externalLoadId, setExternalLoadId] = useState("");
  const [carrierName, setCarrierName] = useState("Circle Logistics");
  const [shipDate, setShipDate] = useState("");
  const [driverId, setDriverId] = useState("");
  const [stops, setStops] = useState<DraftStop[]>([newStop()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateStop = (key: string, patch: Partial<DraftStop>) => {
    setStops((current) => current.map((stop) => (stop.key === key ? { ...stop, ...patch } : stop)));
  };

  const importCsv = async (stop: DraftStop, file: File | null) => {
    if (!file) return;
    const text = await file.text();
    updateStop(stop.key, { vins: [stop.vins, ...parseVins(text)].filter(Boolean).join("\n") });
  };

  const submit = async () => {
    setError(null);
    const preparedStops = stops.map((stop) => ({ ...stop, parsedVins: parseVins(stop.vins) }));
    const allVins = preparedStops.flatMap((stop) => stop.parsedVins);
    if (!tripNumber.trim()) return setError("Trip/load number is required.");
    if (!driverId) return setError("Select an active registered driver.");
    if (!preparedStops.length || preparedStops.some((stop) => !stop.destinationName.trim())) {
      return setError("Every stop requires a destination name.");
    }
    if (preparedStops.some((stop) => stop.parsedVins.length === 0)) {
      return setError("Every stop requires at least one VIN.");
    }
    if (new Set(allVins).size !== allVins.length) {
      return setError("A VIN appears more than once in this manifest.");
    }

    setSaving(true);
    try {
      const load = await createCircleDispatchLoad({
        tripNumber: tripNumber.trim(),
        externalLoadId: externalLoadId.trim() || undefined,
        carrierName: carrierName.trim() || undefined,
        shipDate: shipDate || undefined,
      });
      for (const [index, stop] of preparedStops.entries()) {
        const createdStop = await addCircleDispatchStop(load.loadId, load.manifestRevision, {
          destinationName: stop.destinationName.trim(),
          dealerCode: stop.dealerCode.trim() || undefined,
          sequenceNumber: index + 1,
        });
        await addCircleDispatchVehicles(
          load.loadId,
          load.manifestRevision,
          stop.parsedVins.map((vin) => ({ vin, stopId: createdStop.stopId })),
        );
      }
      await assignCircleDispatchLoad(load.loadId, load.manifestRevision, driverId);
      await publishCircleDispatchLoad(load.loadId, load.manifestRevision);
      setTripNumber("");
      setExternalLoadId("");
      setShipDate("");
      setDriverId("");
      setStops([newStop()]);
      setOpen(false);
      await onPublished();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to publish Circle load.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
      >
        <Plus className="h-4 w-4" />
        Create load
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">Create and publish a load</h2>
          <p className="mt-1 text-sm text-slate-600">Every VIN must belong to exactly one destination stop.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="text-sm font-bold text-slate-600">
          Cancel
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Trip/load number" value={tripNumber} onChange={(event) => setTripNumber(event.target.value)} />
        <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="External load ID" value={externalLoadId} onChange={(event) => setExternalLoadId(event.target.value)} />
        <input className="rounded-xl border border-slate-300 px-3 py-2" placeholder="Carrier" value={carrierName} onChange={(event) => setCarrierName(event.target.value)} />
        <input className="rounded-xl border border-slate-300 px-3 py-2" type="date" value={shipDate} onChange={(event) => setShipDate(event.target.value)} />
      </div>

      <label className="mt-4 block text-sm font-bold text-slate-700">
        Assigned driver
        <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
          <option value="">Select active driver</option>
          {drivers.filter((driver) => driver.active).map((driver) => (
            <option key={driver.id} value={driver.id}>{driver.displayName} ({driver.driverNumber})</option>
          ))}
        </select>
      </label>

      <div className="mt-5 space-y-4">
        {stops.map((stop, index) => (
          <article key={stop.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">Stop {index + 1}</h3>
              {stops.length > 1 ? (
                <button type="button" onClick={() => setStops((current) => current.filter((item) => item.key !== stop.key))} aria-label={`Remove stop ${index + 1}`}>
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <input className="rounded-xl border border-slate-300 bg-white px-3 py-2" placeholder="Destination / dealership" value={stop.destinationName} onChange={(event) => updateStop(stop.key, { destinationName: event.target.value })} />
              <input className="rounded-xl border border-slate-300 bg-white px-3 py-2" placeholder="Dealer code" value={stop.dealerCode} onChange={(event) => updateStop(stop.key, { dealerCode: event.target.value })} />
            </div>
            <textarea className="mt-3 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm" placeholder="VINs — one per line, or paste CSV first column" value={stop.vins} onChange={(event) => updateStop(stop.key, { vins: event.target.value })} />
            <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
              <FileUp className="h-4 w-4" />
              Import VIN CSV for this stop
              <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importCsv(stop, event.target.files?.[0] ?? null)} />
            </label>
          </article>
        ))}
      </div>

      <button type="button" onClick={() => setStops((current) => [...current, newStop()])} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        <Plus className="h-4 w-4" /> Add destination stop
      </button>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      <button type="button" disabled={saving} onClick={() => void submit()} className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:opacity-50">
        {saving ? "Validating and publishing…" : "Validate, assign, and publish load"}
      </button>
    </section>
  );
}
