import { ExperienceHero } from "@/components/ExperienceHero";
import { GetAppSection } from "@/components/GetAppSection";
import { PublicShowcaseSections } from "@/components/PublicShowcaseSections";
import { PublicFooter, PublicHeader } from "@/components/public-site";

const productPoints = [
  "Capture vehicle condition and damage details through a guided mobile inspection flow.",
  "Organize inspection records, photos, and reports for easy review and follow-up.",
  "Share clear, complete documentation with the portal team once the inspection is complete.",
];

export function PublicLanding() {
  return (
    <main className="min-h-screen bg-[#e9ebf2] p-0 text-slate-900">
      <div className="flex min-h-screen w-full flex-col overflow-y-auto">
        <PublicHeader />

        <ExperienceHero />

        <section id="product" className="flex items-center justify-center bg-[#e9ebf2] px-6 py-6 lg:px-8 lg:py-8">
          <div className="w-full max-w-7xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Overview</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">What DocuDent provides</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {productPoints.map((point) => (
                <p key={point} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                  {point}
                </p>
              ))}
            </div>
          </div>
        </section>

        <div className="bg-[#e9ebf2]">
          <PublicShowcaseSections />
        </div>

        <GetAppSection />

        <section className="flex items-end justify-center bg-[#e9ebf2] px-6 py-6 lg:px-8 lg:py-8">
          <PublicFooter />
        </section>
      </div>
    </main>
  );
}
