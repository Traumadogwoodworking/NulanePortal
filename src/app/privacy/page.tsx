import Link from "next/link";
import { PublicFooter, PublicHeader, SectionLabel, PORTAL_URL } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

export default function PrivacyPage() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto w-full max-w-4xl px-6 py-16 lg:px-8">
        <SectionLabel>Legal</SectionLabel>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Privacy</h1>
        <div className="mt-8 space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-8 text-sm leading-7 text-slate-600 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p>
            {brand.appName} keeps protected portal access tied to your account.
          </p>
          <p>
            Access, visibility, downloads, and routing follow your approved role.
          </p>
          <p>
            Support requests are handled through the contact information published on this site.
          </p>
        </div>
        <div className="mt-8">
          <Link href={PORTAL_URL} className="text-sm font-bold text-slate-950 no-underline transition hover:text-slate-700">
            Open Portal
          </Link>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
