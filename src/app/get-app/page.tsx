import type { Metadata } from "next";
import Link from "next/link";
import { DevicePicture, RibbonField } from "@/components/ExperienceHero";
import { PublicFooter, PublicHeader, SectionLabel } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

export const metadata: Metadata = {
  title: `Get the ${publicBranding.appName} App`,
  description: `Download the ${publicBranding.appName} mobile app for iPhone, iPad, and Android.`,
};

const TABLET_WEBP = "/media/inspection-trac/device-tablet-cutout.webp";
const TABLET_PNG = "/media/inspection-trac/device-tablet-cutout.png";
const PHONE_WEBP = "/media/inspection-trac/device-phone-cutout.webp";
const PHONE_PNG = "/media/inspection-trac/device-phone-cutout.png";

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

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0225 3.503C15.5902 8.4792 13.853 7.9642 12 7.9642c-1.853 0-3.5902.515-5.1367 1.386L4.8408 5.8471a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589.3432 18.6617h23.3136c0-4.0028-2.3457-7.475-5.7753-9.3403" />
    </svg>
  );
}

export default function GetTheAppPage() {
  const brand = publicBranding;
  const hasGooglePlay = Boolean(brand.googlePlayUrl);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] p-2 text-slate-900 sm:p-3 lg:p-4">
      <div className="mx-auto flex min-h-[calc(100svh-1rem)] w-full max-w-[1680px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.12)] sm:min-h-[calc(100svh-1.5rem)] lg:min-h-[calc(100svh-2rem)]">
        <PublicHeader />
        <section className="relative flex flex-1 flex-col items-center overflow-hidden px-6 py-12 text-center lg:py-16 lg:px-8">
          <RibbonField />

          <div className="relative z-10 w-full max-w-6xl">
            {/* Device composition */}
            <div className="grid items-center gap-6 md:mt-2 lg:grid-cols-[1fr_minmax(18rem,30rem)_1fr] lg:gap-8">
              <div className="order-1 mx-auto flex max-w-lg flex-col items-center lg:order-2">
                <img
                  src={brand.logoPath}
                  alt={brand.appName}
                  className="h-24 w-auto max-w-full object-contain sm:h-28"
                  draggable={false}
                />
                <SectionLabel>Get the App</SectionLabel>
                <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Get the {brand.appName} App
                </h1>
                <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                  Download {brand.appName} on your iPhone, iPad, or Android device. Capture condition reports, photos, and
                  signatures from the field and submit them directly to the portal team.
                </p>
              </div>

              <div className="order-2 flex justify-center lg:order-3 lg:justify-start">
                <div
                  className="w-[52%] max-w-[240px] drop-shadow-2xl sm:w-[46%] lg:w-[72%] lg:max-w-none"
                  style={{
                    transform: "perspective(1200px) rotateY(-14deg) rotateZ(5deg)",
                    transformOrigin: "center center",
                  }}
                >
                  <DevicePicture
                    webp={PHONE_WEBP}
                    png={PHONE_PNG}
                    alt="Inspection-Trac phone app showing inspection options"
                    width={1122}
                    height={1402}
                    className="animate-float"
                    style={{ animationDelay: "1.2s" }}
                  />
                </div>
              </div>

              <div className="order-3 flex justify-center lg:order-1 lg:justify-end">
                <div
                  className="w-[80%] max-w-[420px] drop-shadow-2xl lg:w-[120%] lg:max-w-none"
                  style={{
                    transform: "perspective(1200px) rotateY(14deg) rotateZ(-5deg)",
                    transformOrigin: "center center",
                  }}
                >
                  <DevicePicture
                    webp={TABLET_WEBP}
                    png={TABLET_PNG}
                    alt="Inspection-Trac tablet app showing vehicle damage reports"
                    width={1448}
                    height={1086}
                    className="animate-float"
                  />
                </div>
              </div>
            </div>

            <div className="mx-auto mt-8 flex w-full max-w-xl flex-col gap-4 sm:flex-row sm:justify-center lg:mt-10">
              <a
                href={brand.appStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-1 items-center justify-center gap-4 rounded-2xl bg-slate-950 px-6 py-5 text-white shadow-[0_16px_48px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-[0_20px_56px_rgba(15,23,42,0.24)] no-underline"
              >
                <AppleIcon className="h-9 w-9 shrink-0" />
                <div className="text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Download on the</p>
                  <p className="text-xl font-black leading-none">App Store</p>
                </div>
              </a>

              {hasGooglePlay ? (
                <a
                  href={brand.googlePlayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-1 items-center justify-center gap-4 rounded-2xl bg-amber-400 px-6 py-5 text-slate-950 shadow-[0_16px_48px_rgba(245,158,11,0.22)] transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-[0_20px_56px_rgba(245,158,11,0.28)] no-underline"
                >
                  <GooglePlayIcon className="h-9 w-9 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900/70">Get it on</p>
                    <p className="text-xl font-black leading-none">Google Play</p>
                  </div>
                </a>
              ) : (
                <div className="group flex flex-1 cursor-not-allowed items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-5 text-slate-500 no-underline">
                  <AndroidIcon className="h-9 w-9 shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Coming soon to</p>
                    <p className="text-xl font-black leading-none">Google Play</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mx-auto mt-12 grid w-full max-w-4xl gap-5 md:grid-cols-3">
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

            <p className="mx-auto mt-12 max-w-lg text-sm leading-7 text-slate-500">
              Need help installing the app or have questions about supported devices?{" "}
              <Link href="/contact-us/" className="font-semibold text-amber-600 no-underline hover:text-amber-700">
                Contact us
              </Link>{" "}
              or email{" "}
              <a href={`mailto:${brand.supportEmail}`} className="font-semibold text-amber-600 no-underline hover:text-amber-700">
                {brand.supportEmail}
              </a>
              .
            </p>
          </div>
        </section>
        <PublicFooter />
      </div>
    </main>
  );
}
