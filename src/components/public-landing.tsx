import { ExperienceHero } from "@/components/ExperienceHero";
import { PublicShowcaseSections } from "@/components/PublicShowcaseSections";
import { PublicFooter, PublicHeader } from "@/components/public-site";

const productPoints = [
  "Capture vehicle condition and damage details through a guided mobile inspection flow.",
  "Organize inspection records, photos, and reports for easy review and follow-up.",
  "Share clear, complete documentation with the portal team once the inspection is complete.",
];

export function PublicLanding() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] p-2 text-slate-900 sm:p-3 lg:p-4">
      <div className="mx-auto flex min-h-[calc(100svh-1rem)] w-full max-w-[1680px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.12)] sm:min-h-[calc(100svh-1.5rem)] lg:min-h-[calc(100svh-2rem)]">
        <div className="flex h-full w-full flex-col overflow-y-auto">
          <PublicHeader />

          <ExperienceHero />

          <section id="product" className="flex items-center justify-center px-6 py-6 lg:py-8 lg:px-8">
            <div className="w-full max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Overview</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">What Inspection Trac provides</h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {productPoints.map((point) => (
                  <p key={point} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                    {point}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <div>
            <PublicShowcaseSections />
          </div>

          <section className="flex items-end justify-center px-6 py-6 lg:py-8 lg:px-8">
            <PublicFooter />
          </section>
        </div>
      </div>
    </main>
  );
}
