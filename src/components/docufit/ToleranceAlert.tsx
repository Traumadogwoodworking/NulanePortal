"use client";

import useSWR from "swr";
import { AlertTriangle } from "lucide-react";
import { fetchLatestMeasurements, type LatestMeasurementAlert } from "@/lib/services/measurementService";

export const DOCUFIT_TOLERANCE_MM = 3;

export function hasToleranceViolation(measurements: LatestMeasurementAlert[]) {
  return measurements.some((measurement) => Math.abs(measurement.value) > DOCUFIT_TOLERANCE_MM);
}

export function ToleranceAlert({ measurements: overrideMeasurements }: { measurements?: LatestMeasurementAlert[] }) {
  const { data } = useSWR("/api/measurements?latest=true", fetchLatestMeasurements, {
    revalidateOnFocus: false,
  });

  const measurements = overrideMeasurements ?? data ?? [];
  const hasAlert = hasToleranceViolation(measurements);
  const worst = measurements.find((measurement) => Math.abs(measurement.value) > DOCUFIT_TOLERANCE_MM);

  if (!hasAlert) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Tolerance check</p>
            <p className="mt-1 text-sm font-semibold text-emerald-950">All latest measurements are within ±{DOCUFIT_TOLERANCE_MM} mm.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-600/10 text-red-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-600">Out of tolerance</p>
          <p className="mt-1 text-sm font-semibold text-red-950">
            {worst?.dimension || "One dimension"} is at {worst?.value ?? "?"} mm, which exceeds ±{DOCUFIT_TOLERANCE_MM} mm.
          </p>
        </div>
      </div>
      <div className="mt-3 rounded-2xl bg-white/80 px-4 py-3 text-xs font-semibold text-red-800">
        Immediate review recommended.
      </div>
    </div>
  );
}
