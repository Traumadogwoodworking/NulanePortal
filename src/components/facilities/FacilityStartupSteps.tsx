import { CheckCircle2 } from "lucide-react";
import { facilityStartupSteps } from "@/components/facilities/facilityStartupGuide";

export interface RegistrationStartupStep {
  title: string;
  detail: string;
}

export function FacilityStartupSteps({
  steps = facilityStartupSteps,
  numbered = false,
}: {
  steps?: readonly RegistrationStartupStep[];
  numbered?: boolean;
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
          {numbered ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#c8d7f0] bg-[#eef4ff] text-xs font-black text-[#081b3a]" aria-hidden="true">
              {index + 1}
            </span>
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <div>
            <p className="text-sm font-bold text-slate-950">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
