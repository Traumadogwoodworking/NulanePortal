import Link from "next/link";
import { PublicFooter, PublicHeader } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

export function PublicLanding() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-16 text-center lg:px-8">
        <div className="flex flex-col items-center gap-5">
          <span className="flex items-center justify-center rounded-[1.75rem] border border-slate-200 bg-white px-8 py-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <img
              src={brand.logoPath}
              alt={brand.appName}
              className="h-32 w-auto object-contain sm:h-40"
            />
          </span>
          <div>
            <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">{brand.landingHeadline}</h1>
            <p className="mt-4 text-xl font-semibold text-slate-700">
              {brand.landingSubheadline}
            </p>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            {brand.landingExplainer}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white no-underline transition hover:bg-slate-800"
            >
              {brand.loginButtonLabel}
            </Link>
            <Link
              href={brand.portalUrl}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 no-underline transition hover:border-slate-400 hover:bg-slate-100"
            >
              {brand.openPortalButtonLabel}
            </Link>
          </div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
