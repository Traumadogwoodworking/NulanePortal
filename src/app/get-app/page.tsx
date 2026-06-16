import { PublicFooter, PublicHeader, SectionLabel } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}

function GooglePlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3.609 1.814 13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893 2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198 2.807 1.626a1.001 1.001 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658 16.8 8.99l-2.302 2.302-8.634-8.634z" />
    </svg>
  );
}

export default function GetTheAppPage() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-6 py-16 text-center lg:px-8">
        <SectionLabel>Get the App</SectionLabel>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
          Inspections on the go
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Download the {brand.appName} mobile app to capture condition reports, photos, and signatures from the field.
        </p>

        <div className="mt-10 flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
          <a
            href={brand.appStoreUrl}
            className="group flex items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-white shadow-[0_16px_48px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_20px_56px_rgba(15,23,42,0.24)] no-underline"
          >
            <AppleIcon className="h-8 w-8" />
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Download on the</p>
              <p className="text-lg font-black leading-none">App Store</p>
            </div>
          </a>
          <a
            href={brand.googlePlayUrl}
            className="group flex items-center justify-center gap-3 rounded-2xl bg-amber-400 px-6 py-4 text-slate-950 shadow-[0_16px_48px_rgba(245,158,11,0.22)] transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_20px_56px_rgba(245,158,11,0.28)] no-underline"
          >
            <GooglePlayIcon className="h-8 w-8" />
            <div className="text-left">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900/70">Get it on</p>
              <p className="text-lg font-black leading-none">Google Play</p>
            </div>
          </a>
        </div>

        <div className="mt-12 grid w-full max-w-4xl gap-5 md:grid-cols-3">
          {[
            ["Guided capture", "Step-by-step vehicle inspection workflows with required photo fields."],
            ["Offline ready", "Start inspections in the field and sync when you are back online."],
            ["Instant reports", "Submit damage and condition reports directly to the portal team."],
          ].map(([title, desc]) => (
            <div
              key={title}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-left shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
            >
              <h3 className="text-lg font-bold text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
