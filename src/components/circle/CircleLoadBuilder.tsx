"use client";

import { useMemo, useState } from "react";
import { FileUp, Plus, Trash2 } from "lucide-react";
import {
  CircleDispatchApiError,
  CircleDispatchDriver,
  addCircleDispatchStop,
  addCircleDispatchVehicles,
  assignCircleDispatchLoad,
  createCircleDispatchLoad,
  fetchCircleDispatchLoad,
  publishCircleDispatchLoad,
  validateCircleDispatchLoad,
} from "@/lib/services/circleLoadService";
import {
  CircleCsvRowError,
  CircleVehicleDraft,
  createCircleVehicleDraft,
  isValidCircleVin,
  normalizeCircleVin,
  parseCircleVehicleCsv,
} from "@/lib/circleLoadCsv";

interface DraftStop {
  key: string;
  destinationName: string;
  dealerCode: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  contactName: string;
  contactPhone: string;
  deliveryInstructions: string;
  vehicles: CircleVehicleDraft[];
  importErrors: CircleCsvRowError[];
}

function newStop(): DraftStop {
  return {
    key: crypto.randomUUID(),
    destinationName: "",
    dealerCode: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    contactName: "",
    contactPhone: "",
    deliveryInstructions: "",
    vehicles: [createCircleVehicleDraft()],
    importErrors: [],
  };
}

function issueLabel(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CircleLoadBuilder({
  drivers,
  onPublished,
}: {
  drivers: CircleDispatchDriver[];
  onPublished: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tripNumber, setTripNumber] = useState("");
  const [externalLoadId, setExternalLoadId] = useState("");
  const [legNumber, setLegNumber] = useState("");
  const [carrierName, setCarrierName] = useState("Circle Logistics");
  const [shipDate, setShipDate] = useState("");
  const [originName, setOriginName] = useState("");
  const [originStreet, setOriginStreet] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [originPostalCode, setOriginPostalCode] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [truckNumber, setTruckNumber] = useState("");
  const [trailerNumber, setTrailerNumber] = useState("");
  const [driverId, setDriverId] = useState("");
  const [stops, setStops] = useState<DraftStop[]>([newStop()]);
  const [serverDraft, setServerDraft] = useState<{
    loadId: string;
    manifestRevision: number;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockingIssues, setBlockingIssues] = useState<string[]>([]);

  const duplicateVins = useMemo(() => {
    const seen = new Set<string>();
    const duplicate = new Set<string>();
    stops.flatMap((stop) => stop.vehicles).forEach((vehicle) => {
      const vin = normalizeCircleVin(vehicle.vin);
      if (!vin) return;
      if (seen.has(vin)) duplicate.add(vin);
      seen.add(vin);
    });
    return duplicate;
  }, [stops]);

  const updateStop = (key: string, patch: Partial<DraftStop>) => {
    setStops((current) =>
      current.map((stop) => (stop.key === key ? { ...stop, ...patch } : stop)),
    );
  };

  const updateVehicle = (
    stopKey: string,
    vehicleKey: string,
    patch: Partial<CircleVehicleDraft>,
  ) => {
    setStops((current) =>
      current.map((stop) =>
        stop.key === stopKey
          ? {
              ...stop,
              vehicles: stop.vehicles.map((vehicle) =>
                vehicle.key === vehicleKey ? { ...vehicle, ...patch } : vehicle,
              ),
            }
          : stop,
      ),
    );
  };

  const importCsv = async (stop: DraftStop, file: File | null) => {
    if (!file) return;
    const preview = parseCircleVehicleCsv(await file.text());
    updateStop(stop.key, {
      vehicles: [
        ...stop.vehicles.filter((vehicle) => vehicle.vin.trim()),
        ...preview.vehicles,
      ],
      importErrors: preview.errors,
    });
  };

  const validateClientDraft = (): string[] => {
    const issues: string[] = [];
    if (!customerName.trim()) issues.push("Customer is required.");
    if (!tripNumber.trim()) issues.push("Trip/load number is required.");
    if (!originName.trim()) issues.push("Origin is required.");
    if (!driverId) issues.push("Select an active registered driver.");
    if (stops.some((stop) => !stop.destinationName.trim())) {
      issues.push("Every stop requires a destination.");
    }
    if (stops.some((stop) => !stop.vehicles.some((vehicle) => vehicle.vin.trim()))) {
      issues.push("Every stop requires at least one VIN.");
    }
    const invalid = stops
      .flatMap((stop) => stop.vehicles)
      .filter((vehicle) => vehicle.vin.trim() && !isValidCircleVin(vehicle.vin));
    if (invalid.length) issues.push(`${invalid.length} VIN row(s) are invalid.`);
    if (duplicateVins.size) {
      issues.push(`Duplicate VINs: ${[...duplicateVins].join(", ")}`);
    }
    const importErrorCount = stops.reduce(
      (total, stop) => total + stop.importErrors.length,
      0,
    );
    if (importErrorCount) {
      issues.push(`Resolve ${importErrorCount} rejected CSV row(s) before publishing.`);
    }
    return issues;
  };

  const reset = () => {
    setCustomerName("");
    setTripNumber("");
    setExternalLoadId("");
    setLegNumber("");
    setShipDate("");
    setOriginName("");
    setOriginStreet("");
    setOriginCity("");
    setOriginState("");
    setOriginPostalCode("");
    setSpecialInstructions("");
    setTruckNumber("");
    setTrailerNumber("");
    setDriverId("");
    setStops([newStop()]);
    setServerDraft(null);
    setBlockingIssues([]);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    const clientIssues = validateClientDraft();
    setBlockingIssues(clientIssues);
    if (clientIssues.length) return;

    setSaving(true);
    try {
      let draft = serverDraft;
      if (!draft) {
        draft = await createCircleDispatchLoad({
          customerName: customerName.trim(),
          tripNumber: tripNumber.trim(),
          externalLoadId: externalLoadId.trim() || undefined,
          legNumber: legNumber.trim() || undefined,
          carrierName: carrierName.trim() || undefined,
          originName: originName.trim(),
          originAddress: {
            street: originStreet.trim(),
            city: originCity.trim(),
            state: originState.trim(),
            postalCode: originPostalCode.trim(),
          },
          specialInstructions: specialInstructions.trim() || undefined,
          truckNumber: truckNumber.trim() || undefined,
          trailerNumber: trailerNumber.trim() || undefined,
          shipDate: shipDate || undefined,
        });
        setServerDraft(draft);
      }

      const detail = await fetchCircleDispatchLoad(draft.loadId);
      for (const [index, stop] of stops.entries()) {
        let persistedStop = detail.stops.find(
          (candidate) => candidate.sequence_number === index + 1,
        );
        if (!persistedStop) {
          const created = await addCircleDispatchStop(
            draft.loadId,
            draft.manifestRevision,
            {
              destinationName: stop.destinationName.trim(),
              dealerCode: stop.dealerCode.trim() || undefined,
              sequenceNumber: index + 1,
              address: {
                street: stop.street.trim(),
                city: stop.city.trim(),
                state: stop.state.trim(),
                postalCode: stop.postalCode.trim(),
              },
              contact: {
                name: stop.contactName.trim(),
                phone: stop.contactPhone.trim(),
              },
              deliveryInstructions: stop.deliveryInstructions.trim() || undefined,
            },
          );
          persistedStop = {
            id: created.stopId,
            sequence_number: index + 1,
            destination_name_snapshot: stop.destinationName.trim(),
            dealer_code_snapshot: stop.dealerCode.trim() || null,
            address_snapshot: {},
            contact_snapshot: {},
            delivery_instructions: null,
            status: "pending",
            actual_arrival_at: null,
          };
        }
        const existingVins = new Set(
          detail.vehicles.map((vehicle) => vehicle.vin.toUpperCase()),
        );
        const vehicles = stop.vehicles
          .filter((vehicle) => vehicle.vin.trim())
          .filter((vehicle) => !existingVins.has(normalizeCircleVin(vehicle.vin)))
          .map((vehicle) => ({
            vin: normalizeCircleVin(vehicle.vin),
            stopId: persistedStop.id,
            year: vehicle.year.trim() || undefined,
            make: vehicle.make.trim() || undefined,
            model: vehicle.model.trim() || undefined,
            submodel: vehicle.submodel.trim() || undefined,
            color: vehicle.color.trim() || undefined,
            bay: vehicle.bay.trim() || undefined,
          }));
        if (vehicles.length) {
          await addCircleDispatchVehicles(
            draft.loadId,
            draft.manifestRevision,
            vehicles,
          );
        }
      }
      await assignCircleDispatchLoad(
        draft.loadId,
        draft.manifestRevision,
        driverId,
      );
      const validation = await validateCircleDispatchLoad(draft.loadId);
      if (!validation.valid) {
        setBlockingIssues(
          validation.issues.map(
            (issue) =>
              `${issueLabel(issue.code)}${issue.vin ? `: ${issue.vin}` : ""}`,
          ),
        );
        throw new Error("The backend kept this load as a draft because validation failed.");
      }
      await publishCircleDispatchLoad(draft.loadId, draft.manifestRevision);
      reset();
      setOpen(false);
      await onPublished();
    } catch (cause) {
      const message =
        cause instanceof CircleDispatchApiError
          ? `${cause.message} (${cause.code})`
          : cause instanceof Error
            ? cause.message
            : "Unable to publish Circle load.";
      setError(message);
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

  const fieldClass = "rounded-xl border border-slate-300 bg-white px-3 py-2";
  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-950">Create Circle load</h2>
          <p className="mt-1 text-sm text-slate-600">
            Build the draft, review every VIN, assign a driver, then publish.
          </p>
          {serverDraft ? (
            <p className="mt-2 text-xs font-bold text-amber-700">
              Backend draft retained: {serverDraft.loadId}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm font-bold text-slate-600"
        >
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input className={fieldClass} placeholder="Customer *" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
        <input className={fieldClass} placeholder="Trip number *" value={tripNumber} onChange={(event) => setTripNumber(event.target.value)} />
        <input className={fieldClass} placeholder="Load number" value={externalLoadId} onChange={(event) => setExternalLoadId(event.target.value)} />
        <input className={fieldClass} placeholder="Leg / split order" value={legNumber} onChange={(event) => setLegNumber(event.target.value)} />
        <input className={fieldClass} placeholder="Carrier" value={carrierName} onChange={(event) => setCarrierName(event.target.value)} />
        <input className={fieldClass} type="date" aria-label="Ship date" value={shipDate} onChange={(event) => setShipDate(event.target.value)} />
        <input className={fieldClass} placeholder="Truck default" value={truckNumber} onChange={(event) => setTruckNumber(event.target.value)} />
        <input className={fieldClass} placeholder="Trailer default" value={trailerNumber} onChange={(event) => setTrailerNumber(event.target.value)} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input className={fieldClass} placeholder="Origin *" value={originName} onChange={(event) => setOriginName(event.target.value)} />
        <input className={fieldClass} placeholder="Origin street" value={originStreet} onChange={(event) => setOriginStreet(event.target.value)} />
        <input className={fieldClass} placeholder="Origin city" value={originCity} onChange={(event) => setOriginCity(event.target.value)} />
        <input className={fieldClass} placeholder="State" value={originState} onChange={(event) => setOriginState(event.target.value)} />
        <input className={fieldClass} placeholder="Postal code" value={originPostalCode} onChange={(event) => setOriginPostalCode(event.target.value)} />
      </div>
      <textarea className={`${fieldClass} mt-3 min-h-20 w-full`} placeholder="Special instructions" value={specialInstructions} onChange={(event) => setSpecialInstructions(event.target.value)} />

      <label className="mt-4 block text-sm font-bold text-slate-700">
        Assigned driver *
        <select className={`${fieldClass} mt-1 w-full`} value={driverId} onChange={(event) => setDriverId(event.target.value)}>
          <option value="">Select active driver</option>
          {drivers.filter((driver) => driver.active).map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.displayName} ({driver.driverNumber})
            </option>
          ))}
        </select>
      </label>

      <div className="mt-5 space-y-5">
        {stops.map((stop, stopIndex) => (
          <article key={stop.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900">Stop {stopIndex + 1}</h3>
              {stops.length > 1 ? (
                <button type="button" onClick={() => setStops((current) => current.filter((item) => item.key !== stop.key))} aria-label={`Remove stop ${stopIndex + 1}`}>
                  <Trash2 className="h-4 w-4 text-rose-600" />
                </button>
              ) : null}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <input className={fieldClass} placeholder="Destination *" value={stop.destinationName} onChange={(event) => updateStop(stop.key, { destinationName: event.target.value })} />
              <input className={fieldClass} placeholder="Dealer code" value={stop.dealerCode} onChange={(event) => updateStop(stop.key, { dealerCode: event.target.value })} />
              <input className={fieldClass} placeholder="Street" value={stop.street} onChange={(event) => updateStop(stop.key, { street: event.target.value })} />
              <input className={fieldClass} placeholder="City" value={stop.city} onChange={(event) => updateStop(stop.key, { city: event.target.value })} />
              <input className={fieldClass} placeholder="State" value={stop.state} onChange={(event) => updateStop(stop.key, { state: event.target.value })} />
              <input className={fieldClass} placeholder="Postal code" value={stop.postalCode} onChange={(event) => updateStop(stop.key, { postalCode: event.target.value })} />
              <input className={fieldClass} placeholder="Contact name" value={stop.contactName} onChange={(event) => updateStop(stop.key, { contactName: event.target.value })} />
              <input className={fieldClass} placeholder="Contact phone" value={stop.contactPhone} onChange={(event) => updateStop(stop.key, { contactPhone: event.target.value })} />
            </div>
            <textarea className={`${fieldClass} mt-3 min-h-16 w-full`} placeholder="Delivery instructions" value={stop.deliveryInstructions} onChange={(event) => updateStop(stop.key, { deliveryInstructions: event.target.value })} />

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    {["VIN *", "Year", "Make", "Model", "Submodel", "Color", "Bay", ""].map((heading) => (
                      <th key={heading} className="px-1 py-2">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stop.vehicles.map((vehicle) => {
                    const invalid = vehicle.vin.trim() && !isValidCircleVin(vehicle.vin);
                    const duplicate = duplicateVins.has(normalizeCircleVin(vehicle.vin));
                    return (
                      <tr key={vehicle.key}>
                        {(["vin", "year", "make", "model", "submodel", "color", "bay"] as const).map((field) => (
                          <td key={field} className="px-1 py-1">
                            <input
                              aria-label={`${field} stop ${stopIndex + 1}`}
                              className={`w-full rounded-lg border px-2 py-1.5 ${field === "vin" && (invalid || duplicate) ? "border-rose-500 bg-rose-50" : "border-slate-300 bg-white"}`}
                              value={vehicle[field]}
                              onChange={(event) => updateVehicle(stop.key, vehicle.key, {
                                [field]: field === "vin" ? normalizeCircleVin(event.target.value) : event.target.value,
                              })}
                            />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <button type="button" aria-label="Remove VIN row" onClick={() => updateStop(stop.key, { vehicles: stop.vehicles.filter((item) => item.key !== vehicle.key) })}>
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap gap-4">
              <button type="button" onClick={() => updateStop(stop.key, { vehicles: [...stop.vehicles, createCircleVehicleDraft()] })} className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
                <Plus className="h-4 w-4" /> Add VIN
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
                <FileUp className="h-4 w-4" /> Import vehicle CSV
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importCsv(stop, event.target.files?.[0] ?? null)} />
              </label>
            </div>
            {stop.importErrors.length ? (
              <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                <p className="font-black">Rejected CSV rows</p>
                <ul className="mt-1 list-disc pl-5">
                  {stop.importErrors.map((item) => (
                    <li key={`${item.row}-${item.value}`}>Row {item.row}: {item.message} {item.value ? `(${item.value})` : ""}</li>
                  ))}
                </ul>
                <button type="button" className="mt-2 font-bold underline" onClick={() => updateStop(stop.key, { importErrors: [] })}>
                  Clear rejected rows after correction
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <button type="button" onClick={() => setStops((current) => [...current, newStop()])} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-700">
        <Plus className="h-4 w-4" /> Add destination stop
      </button>

      {blockingIssues.length ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-black">Blocking validation issues</p>
          <ul className="mt-1 list-disc pl-5">{blockingIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
        </div>
      ) : null}
      {error ? <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <button type="button" disabled={saving} onClick={() => void submit()} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-black text-white disabled:opacity-50">
          {saving ? "Saving and validating…" : "Save, validate, assign, and publish"}
        </button>
        <button type="button" disabled={saving} onClick={reset} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">
          Start new draft
        </button>
      </div>
    </section>
  );
}
