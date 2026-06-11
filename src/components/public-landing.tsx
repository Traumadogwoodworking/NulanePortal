import Link from "next/link";
import { PublicFooter, PublicHeader, ScreenshotCard } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

const appShots = [
  { path: "/images/app-showcase-01.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-02.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-03.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-04.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-05.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-06.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-07.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-08.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-09.jpg", exists: true, kind: "portrait" as const },
  { path: "/images/app-showcase-10.jpg", exists: true, kind: "portrait" as const },
];

const portalShots = [
  { path: "/images/portal-report-pdf-example.png", exists: true, featured: true },
  { path: "/images/portal-report-list.png", exists: true, kind: "landscape" as const },
  { path: "/images/portal-dashboard.png", exists: true, kind: "landscape" as const },
  { path: "/images/portal-inspection.png", exists: true, kind: "landscape" as const },
];

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

      <section id="screenshots" className="mx-auto w-full max-w-7xl px-6 pb-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">App photos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">App screenshots</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Each screen is shown in a tall framed card so the app flow stays visible and readable.
          </p>
          <div className="mt-6 grid gap-5">
            {appShots.map((shot) => (
              <div key={shot.path} className="mx-auto w-full max-w-3xl">
                <ScreenshotCard {...shot} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-[0_18px_54px_rgba(15,23,42,0.16)]">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-400">Portal screenshots</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Portal screenshots</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            The PDF example gets its own oversized row at the top, and the portal captures below are widened so the details stay readable.
          </p>
          <div className="mt-6 space-y-5">
            {portalShots.filter((shot) => shot.featured).map((shot) => (
              <div key={shot.path}>
                <ScreenshotCard {...shot} />
              </div>
            ))}
            <div className="grid gap-5 lg:grid-cols-2">
              {portalShots.filter((shot) => !shot.featured).map((shot) => (
                <div key={shot.path} className="lg:col-span-1">
                  <ScreenshotCard {...shot} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
