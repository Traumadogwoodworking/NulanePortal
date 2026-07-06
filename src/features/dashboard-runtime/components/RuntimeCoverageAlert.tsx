import { AlertTriangle } from "lucide-react";
import type { RuntimeCoverageWarning } from "../types";

export function RuntimeCoverageAlert({ warnings = [] }: { warnings?: RuntimeCoverageWarning[] }) {
  if (!warnings.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-black">Backend coverage required</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-amber-900">
            These visuals are declared, but the current backend must emit explicit fields before they should be treated as complete.
          </p>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {warnings.map((warning, index) => (
              <div key={`${warning.visualId ?? "warning"}-${index}`} className="rounded-md border border-amber-200 bg-white/70 p-3">
                <p className="text-xs font-black text-amber-950">{warning.visualId ?? warning.datasetId ?? "Coverage"}</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-800">{warning.currentBackendStatus ?? warning.message ?? "Missing required fields"}</p>
                {warning.requiredFields?.length ? (
                  <p className="mt-2 font-mono text-[11px] text-amber-900">{warning.requiredFields.join(", ")}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
