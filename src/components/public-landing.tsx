import { PublicShowcaseSections } from "@/components/PublicShowcaseSections";
import { PublicFooter, PublicHeader } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

const productPoints = [
  "Capture vehicle condition and damage details through a guided mobile inspection flow.",
  "Organize inspection records, photos, and reports for easy review and follow-up.",
  "Share clear, complete documentation with the portal team once the inspection is complete.",
];

export function PublicLanding() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] p-2 text-slate-900 sm:p-3 lg:p-4">
      <div className="mx-auto flex min-h-[calc(100svh-1rem)] w-full max-w-[1680px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.12)] sm:min-h-[calc(100svh-1.5rem)] lg:min-h-[calc(100svh-2rem)]">
        <div className="flex h-full w-full flex-col overflow-y-auto">
          <PublicHeader />
          <section className="flex items-center justify-center px-6 py-12 text-center lg:py-16 lg:px-8">
            <div className="flex flex-col items-center gap-5">
              <p className="text-2xl font-black uppercase tracking-[0.42em] text-slate-500 sm:text-3xl lg:text-4xl">THE EXPERIENCE</p>
              <div className="rounded-[2rem] border border-slate-200 bg-white/90 px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-8 sm:py-6">
                <img
                  src={brand.logoPath}
                  alt={brand.appName}
                  className="h-56 w-auto max-w-full object-contain sm:h-72 lg:h-80"
                  draggable={false}
                />
              </div>
              <div className="w-full max-w-5xl px-2">
                <h1 className="mt-2 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                  Built for Fast, Clear, and Consistent Inspections
                </h1>
                <p className="mx-auto mt-5 max-w-3xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
                  Vehicle inspection and condition reporting portal.
                </p>
              </div>
            </div>
          </section>

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

          <section id="get-app" className="flex items-center justify-center px-6 py-12 text-center lg:py-16 lg:px-8">
            <div className="w-full max-w-4xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:p-12">
              <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Mobile app</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Get the app</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600">
                Download Inspection-Trac for iOS to capture inspections, photos, and reports from the field.
              </p>
              <div className="mt-8 flex justify-center">
                <a
                  href={brand.appStoreUrl}
                  className="group flex items-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-white shadow-[0_16px_48px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-900 no-underline"
                >
                  <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Download on the</p>
                    <p className="text-lg font-black leading-none">App Store</p>
                  </div>
                </a>
              </div>
            </div>
          </section>

          <section className="flex items-end justify-center px-6 py-6 lg:py-8 lg:px-8">
            <PublicFooter />
          </section>
        </div>
      </div>
    </main>
  );
}
