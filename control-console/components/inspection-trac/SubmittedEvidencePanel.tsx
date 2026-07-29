import Link from "next/link";
import {
  buildSubmittedProofs,
  countSubmittedProofs
} from "@lib/inspection-trac/evidence";
import type {
  InspectionTracQaEvidence,
  InspectionTracVerification
} from "@lib/inspection-trac/types";
import { formatOperationalTimestamp } from "@lib/work/today";

export function SubmittedEvidencePanel({
  qaEvidence,
  verifications
}: {
  qaEvidence: InspectionTracQaEvidence[];
  verifications: InspectionTracVerification[];
}) {
  const proofs = buildSubmittedProofs(qaEvidence, verifications);
  const counts = countSubmittedProofs(proofs);

  return (
    <section
      aria-labelledby="submitted-evidence-title"
      className="overflow-hidden rounded-xl border border-emerald-400/20 bg-[#10131a]"
    >
      <div className="border-b border-white/8 px-4 py-3">
        <h2
          id="submitted-evidence-title"
          className="text-sm font-semibold text-white"
        >
          What is proven / submitted evidence
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {counts.total} durable proof record{counts.total === 1 ? "" : "s"}:
          {" "}{counts.qa} QA evidence and {counts.task} task verification
          {counts.task === 1 ? "" : "s"}. Classification describes the proof
          source; it does not upgrade field readiness.
        </p>
      </div>
      {proofs.length ? (
        <div className="divide-y divide-white/6">
          {proofs.map((proof) => (
            <article
              key={proof.id}
              className="grid gap-2 px-4 py-3 text-xs lg:grid-cols-[minmax(200px,0.9fr)_minmax(280px,1.5fr)_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-100">{proof.label}</p>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-300">
                    {proof.category}
                  </span>
                </div>
                {proof.href ? (
                  <Link
                    href={proof.href}
                    className="mt-1 inline-block font-mono text-[10px] font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    {proof.sourceLabel}
                  </Link>
                ) : (
                  <p className="mt-1 font-mono text-[10px] text-cyan-200">
                    {proof.sourceLabel}
                  </p>
                )}
              </div>
              <p className="leading-relaxed text-slate-300">{proof.summary}</p>
              <time
                dateTime={proof.capturedAt}
                className="whitespace-nowrap text-slate-500"
              >
                {formatOperationalTimestamp(proof.capturedAt)}
              </time>
            </article>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-amber-100">
          No durable verification submission is recorded yet.
        </p>
      )}
    </section>
  );
}
