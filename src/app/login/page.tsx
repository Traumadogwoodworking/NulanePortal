import Link from "next/link";
import { PublicShowcaseSections } from "@/components/PublicShowcaseSections";
import { PublicFooter, PublicHeader } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";
import { LoginCta } from "./LoginCta";

export default function LoginPage() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.34em] text-slate-500 shadow-sm">
              Portal sign-in
            </span>
            <div className="space-y-4">
              <h1 className="max-w-2xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
                {brand.landingHeadline}
              </h1>
              <p className="max-w-2xl text-xl font-semibold text-slate-700">
                {brand.landingSubheadline}
              </p>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                {brand.landingExplainer}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <LoginCta />
              <Link
                href={brand.portalUrl}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 no-underline transition hover:border-slate-400 hover:bg-slate-100"
              >
                {brand.openPortalButtonLabel}
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <span className="flex w-full max-w-xl items-center justify-center rounded-[2rem] border border-slate-200 bg-white px-8 py-8 shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
              <img src={brand.logoPath} alt={brand.appName} className="h-28 w-auto object-contain sm:h-36" />
            </span>
          </div>
        </div>
      </section>

      <PublicShowcaseSections />

      <PublicFooter />
    </main>
  );
}
