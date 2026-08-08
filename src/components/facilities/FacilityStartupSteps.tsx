import { CheckCircle2 } from "lucide-react";
import { facilityStartupSteps } from "@/components/facilities/facilityStartupGuide";

export function FacilityStartupSteps() {
  return (
    <ol className="space-y-3">
      {facilityStartupSteps.map((step) => (
        <li key={step.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-bold text-slate-950">{step.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
