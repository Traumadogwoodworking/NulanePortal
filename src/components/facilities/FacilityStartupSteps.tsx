import { CheckCircle2 } from "lucide-react";
import { facilityStartupSteps } from "@/components/facilities/facilityStartupGuide";

export function FacilityStartupSteps({
  facilityName = "this facility",
  steps,
}: {
  facilityName?: string;
  steps?: readonly string[];
}) {
  const personalize = (value: string) =>
    value.replaceAll("{facilityName}", facilityName);
  return (
    <ol className="space-y-3">
      {steps?.length
        ? steps.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-950 text-[11px] font-black text-white">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-slate-700">{step}</p>
            </li>
          ))
        : facilityStartupSteps.map((step) => (
            <li
              key={step.title}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold text-slate-950">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {personalize(step.detail)}
                </p>
              </div>
            </li>
          ))}
    </ol>
  );
}
