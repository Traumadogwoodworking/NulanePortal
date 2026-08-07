import Image from "next/image";
import { FacilityStartupSteps } from "@/components/facilities/FacilityStartupSteps";
import { publicBranding } from "@/lib/publicBranding";

export default function GettingStartedPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
      <div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
        <Image
          src={publicBranding.logoPath}
          alt={publicBranding.appName}
          width={160}
          height={40}
          className="h-10 w-auto"
          priority
        />
        <p className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Getting Started</p>
        <h1 className="mt-2 text-3xl font-black">Start using {publicBranding.appName}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">If your facility provided a QR code, scan it first so your account receives the correct facility and role.</p>
        <div className="mt-7"><FacilityStartupSteps /></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <a href={publicBranding.appStoreUrl} className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">Install for iPhone</a>
          <a href={publicBranding.googlePlayUrl} className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">Install for Android</a>
        </div>
        <p className="mt-6 text-sm text-slate-600">Need help? <a className="font-bold text-slate-950 underline" href={`mailto:${publicBranding.supportEmail}`}>{publicBranding.supportEmail}</a></p>
      </div>
    </main>
  );
}
