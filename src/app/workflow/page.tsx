import { PublicFooter, PublicHeader, SectionLabel } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

const steps = [
  ["Inspect", "Walk the vehicle, capture the current condition, and keep the process fast on the ground."],
  ["Capture", "Record the key details and evidence so the portal can surface the right operational context."],
  ["Submit", "Send the record into the backend-backed workflow for reporting, review, and routing."],
  ["Route", "Get the report where it needs to go with facility-aware, permission-aware backend logic."],
];

export default function WorkflowPage() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto w-full max-w-6xl px-6 py-16 lg:px-8">
        <SectionLabel>Workflow</SectionLabel>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
          {brand.appName} workflow
        </h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          A practical inspection flow from the yard to the portal.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map(([title, description], index) => (
            <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="text-xs font-black uppercase tracking-[0.3em] text-amber-700">0{index + 1}</div>
              <h2 className="mt-4 text-lg font-bold text-slate-950">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
