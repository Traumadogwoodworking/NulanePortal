"use client";

import { FormEvent, useState } from "react";
import { UserPlus } from "lucide-react";
import {
  CircleDispatchDriver,
  createCircleDispatchDriver,
  updateCircleDispatchDriverSettings,
} from "@/lib/services/circleLoadService";

export function CircleDriverManager({
  drivers,
  onChanged,
}: {
  drivers: CircleDispatchDriver[];
  onChanged: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [driverNumber, setDriverNumber] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [carrierName, setCarrierName] = useState("Circle Logistics");
  const [requirePhotos, setRequirePhotos] = useState(false);
  const [layout, setLayout] = useState<"standard" | "compact">("standard");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDriver = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createCircleDispatchDriver({
        email: email.trim(),
        driverNumber: driverNumber.trim(),
        displayName: displayName.trim(),
        phone: phone.trim(),
        carrierName: carrierName.trim(),
        requirePodConditionPhotos: requirePhotos,
        podPdfLayout: layout,
      });
      await onChanged();
      setOpen(false);
      setEmail("");
      setDriverNumber("");
      setDisplayName("");
      setPhone("");
      setRequirePhotos(false);
      setLayout("standard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save driver.");
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = async (
    driver: CircleDispatchDriver,
    input: Partial<Pick<CircleDispatchDriver, "requirePodConditionPhotos" | "podPdfLayout">>,
  ) => {
    setSaving(true);
    setError(null);
    try {
      await updateCircleDispatchDriverSettings(driver.id, {
        requirePodConditionPhotos:
          input.requirePodConditionPhotos ?? driver.requirePodConditionPhotos,
        podPdfLayout: input.podPdfLayout ?? driver.podPdfLayout,
      });
      await onChanged();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update driver settings.",
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldClass =
    "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-950">Circle drivers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Link an existing Circle user by email, then assign their ePOD policy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white"
        >
          <UserPlus className="h-4 w-4" />
          {open ? "Close" : "Add driver"}
        </button>
      </div>

      {open ? (
        <form
          onSubmit={(event) => void saveDriver(event)}
          className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4"
        >
          <input
            required
            type="email"
            className={fieldClass}
            placeholder="Circle account email *"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            required
            className={fieldClass}
            placeholder="Driver number *"
            value={driverNumber}
            onChange={(event) => setDriverNumber(event.target.value)}
          />
          <input
            required
            className={fieldClass}
            placeholder="Printed driver name *"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          <input
            className={fieldClass}
            placeholder="Phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <input
            className={fieldClass}
            placeholder="Carrier"
            value={carrierName}
            onChange={(event) => setCarrierName(event.target.value)}
          />
          <select
            className={fieldClass}
            aria-label="POD PDF layout"
            value={layout}
            onChange={(event) =>
              setLayout(event.target.value as "standard" | "compact")
            }
          >
            <option value="standard">Standard ePOD</option>
            <option value="compact">Compact no-damage ePOD</option>
          </select>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={requirePhotos}
              onChange={(event) => setRequirePhotos(event.target.checked)}
            />
            Require exactly two condition photos
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-emerald-600 px-4 py-2 font-black text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save driver"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">
          {error}
        </p>
      ) : null}

      {drivers.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-3">Driver</th>
                <th className="py-2 pr-3">Account</th>
                <th className="py-2 pr-3">Condition photos</th>
                <th className="py-2">ePOD layout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td className="py-3 pr-3">
                    <p className="font-bold text-slate-950">{driver.displayName}</p>
                    <p className="text-xs text-slate-500">{driver.driverNumber}</p>
                  </td>
                  <td className="py-3 pr-3 text-slate-700">
                    {driver.email || "Not linked"}
                  </td>
                  <td className="py-3 pr-3">
                    <select
                      disabled={saving}
                      className={fieldClass}
                      value={driver.requirePodConditionPhotos ? "required" : "optional"}
                      onChange={(event) =>
                        void updateSettings(driver, {
                          requirePodConditionPhotos: event.target.value === "required",
                        })
                      }
                    >
                      <option value="optional">Optional, up to two</option>
                      <option value="required">Exactly two required</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <select
                      disabled={saving}
                      className={fieldClass}
                      value={driver.podPdfLayout}
                      onChange={(event) =>
                        void updateSettings(driver, {
                          podPdfLayout: event.target.value as "standard" | "compact",
                        })
                      }
                    >
                      <option value="standard">Standard</option>
                      <option value="compact">Compact clear / Standard damaged</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">No Circle drivers configured.</p>
      )}
    </section>
  );
}
