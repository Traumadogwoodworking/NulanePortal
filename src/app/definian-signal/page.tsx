import type { Metadata } from "next";

const DEFINIAN_LOGO = "/media/definian-sidebar-logo-white.png";

const statusCards = [
  { label: "Signals reviewed", value: "128", detail: "Demo workload", tone: "blue" },
  { label: "Ready for follow-up", value: "18", detail: "Prioritized items", tone: "green" },
  { label: "Average review time", value: "4m", detail: "Per signal", tone: "slate" },
];

const workflowSteps = [
  "Collect inspection signals from field activity.",
  "Prioritize items that need review or follow-up.",
  "Track resolution status in a focused portal view.",
];

const signalRows = [
  { id: "SIG-1048", asset: "Fleet asset 214", type: "Condition review", priority: "High", status: "Ready" },
  { id: "SIG-1047", asset: "Fleet asset 188", type: "Photo verification", priority: "Medium", status: "In review" },
  { id: "SIG-1046", asset: "Fleet asset 071", type: "Documentation check", priority: "Low", status: "Logged" },
  { id: "SIG-1045", asset: "Fleet asset 032", type: "Follow-up note", priority: "Medium", status: "Ready" },
];

export const metadata: Metadata = {
  title: "Definian Signal Demo Portal",
  description: "Iframe-ready Definian Signal demo portal page.",
};

function statusTone(tone: string) {
  if (tone === "green") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (tone === "blue") return "border-blue-200 bg-blue-50 text-[#0d2c71]";
  return "border-slate-200 bg-slate-50 text-slate-900";
}

function priorityTone(priority: string) {
  if (priority === "High") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (priority === "Medium") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export default function DefinianSignalPage() {
  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-2xl border border-[#d9e2f0] bg-[#0d2c71] shadow-[0_18px_48px_rgba(13,44,113,0.18)]">
          <div className="grid gap-6 p-5 text-white md:grid-cols-[1.15fr_0.85fr] md:items-center lg:p-7">
            <div>
              <div className="inline-flex rounded-2xl bg-white px-4 py-3 shadow-[0_16px_36px_rgba(4,14,40,0.2)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={DEFINIAN_LOGO} alt="Definian Inspection" className="h-14 w-auto object-contain sm:h-16" />
              </div>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.32em] text-emerald-200">Demo portal</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Definian Signal</h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-blue-50 sm:text-base">
                A focused, iframe-ready demo portal for reviewing inspection signals, priority items, and resolution status.
              </p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">Embed ready</p>
              <p className="mt-3 text-2xl font-black">No live customer data</p>
              <p className="mt-2 text-sm leading-6 text-blue-50">
                This page uses static demo values and Definian branding only. It does not call production-only APIs or require portal sign-in.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {statusCards.map((card) => (
            <article key={card.label} className={`rounded-2xl border p-5 shadow-sm ${statusTone(card.tone)}`}>
              <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">{card.label}</p>
              <p className="mt-3 text-4xl font-black tracking-tight">{card.value}</p>
              <p className="mt-2 text-sm font-semibold opacity-75">{card.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0d2c71]">What it does</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Signal review workflow</h2>
            <div className="mt-5 space-y-3">
              {workflowSteps.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#00ab63] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <p className="text-sm font-semibold leading-6 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0d2c71]">Signals</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Demo queue</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                    <th className="px-5 py-3">Signal</th>
                    <th className="px-5 py-3">Asset</th>
                    <th className="px-5 py-3">Type</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {signalRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-5 py-4 font-black text-[#0d2c71]">{row.id}</td>
                      <td className="px-5 py-4">{row.asset}</td>
                      <td className="px-5 py-4">{row.type}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${priorityTone(row.priority)}`}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-5 py-4">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0d2c71]">Trend</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Signal volume</h2>
            <div className="mt-5 flex h-48 items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {[46, 64, 52, 78, 69, 88, 74].map((height, index) => (
                <div key={height + index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg bg-[#0d2c71]" style={{ height: `${height}%` }} />
                  <span className="text-[10px] font-black uppercase text-slate-500">D{index + 1}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#0d2c71]">Resolution</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Demo status mix</h2>
            <div className="mt-5 space-y-4">
              {[
                ["Ready", "42%"],
                ["In review", "36%"],
                ["Logged", "22%"],
              ].map(([label, width]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm font-black text-slate-700">
                    <span>{label}</span>
                    <span>{width}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#00ab63]" style={{ width }} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}
