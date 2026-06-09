import Link from "next/link";
import { withPortalBasePath } from "@/lib/config";

export const dynamic = "force-static";

export default function RootPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center py-8 text-center">
        <div className="flex flex-col items-center gap-5">
          <img
            src={withPortalBasePath("/media/inspection-trac-logo.png")}
            alt="Inspection-Trac"
            className="h-24 w-auto object-contain sm:h-28"
          />
          <div>
            <h1 className="text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Inspection-Trac</h1>
            <p className="mt-4 text-xl font-semibold text-slate-700">
              Vehicle inspection and condition reporting portal.
            </p>
          </div>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Use this portal to access inspection reports, facility records, vehicle condition documentation, and
            operational review tools.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login?returnTo=/portal/home/"
              className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white no-underline transition hover:bg-slate-800"
            >
              Log In
            </Link>
            <Link
              href="/home"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 no-underline transition hover:border-slate-400 hover:bg-slate-100"
            >
              Open Portal
            </Link>
          </div>
        </div>
        <footer className="mt-12 text-sm text-slate-500">
          Need help?{" "}
          <a className="font-semibold text-slate-800 underline-offset-4 hover:underline" href="mailto:support@nulanesystems.com">
            Contact support@nulanesystems.com
          </a>
        </footer>
      </section>
    </main>
  );
}
