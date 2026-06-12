import { PublicShowcaseSections } from "@/components/PublicShowcaseSections";
import { PublicFooter, PublicHeader } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

const productPoints = [
  "Capture vehicle condition and damage details in a guided mobile flow.",
  "Organize inspection records, photos, and reports for review.",
  "Share clean documentation with the portal team when the inspection is complete.",
];

export function PublicLanding() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center lg:px-8">
        <div className="flex flex-col items-center gap-5">
          <img src={brand.logoPath} alt={brand.appName} className="h-36 w-auto object-contain sm:h-44" />
          <div>
            <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">{brand.landingHeadline}</h1>
            <p className="mt-4 text-xl font-semibold text-slate-700">
              {brand.landingSubheadline}
            </p>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            {brand.landingExplainer}
          </p>
        </div>
      </section>

      <section id="product" className="mx-auto w-full max-w-7xl px-6 pb-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Product</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">What it does</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {productPoints.map((point) => (
              <p key={point} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-700">
                {point}
              </p>
            ))}
          </div>
        </div>
      </section>

      <PublicShowcaseSections />

      <PublicFooter />
    </main>
  );
}
