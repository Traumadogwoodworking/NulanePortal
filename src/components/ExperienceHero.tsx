import Link from "next/link";
import type { CSSProperties } from "react";
import { publicBranding } from "@/lib/publicBranding";

const TABLET_WEBP = "/media/inspection-trac/device-tablet-cutout.webp";
const TABLET_PNG = "/media/inspection-trac/device-tablet-cutout.png";
const PHONE_WEBP = "/media/inspection-trac/device-phone-cutout.webp";
const PHONE_PNG = "/media/inspection-trac/device-phone-cutout.png";

export function DevicePicture({
  webp,
  png,
  alt,
  width,
  height,
  className,
  style,
}: {
  webp: string;
  png: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <picture className={className} style={style}>
      <source srcSet={webp} type="image/webp" />
      <img
        src={png}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        loading="eager"
        draggable={false}
        className="h-auto w-full select-none"
      />
    </picture>
  );
}

export function RibbonField() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Soft radial glow behind the logo */}
      <div
        className="absolute left-1/2 top-[28%] h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, rgba(37,99,235,0.16) 0%, rgba(13,44,113,0.08) 45%, transparent 72%)",
        }}
      />

      {/* Shield watermark */}
      <img
        src={publicBranding.logoPath}
        alt=""
        className="absolute left-1/2 top-[28%] h-[42%] w-auto -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.045] blur-xl"
        draggable={false}
      />

      {/* Streamer / ribbon layer */}
      <svg
        className="absolute inset-0 h-full w-full animate-sway"
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="navyStream" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0d2c71" stopOpacity="0" />
            <stop offset="35%" stopColor="#0d2c71" stopOpacity="0.55" />
            <stop offset="65%" stopColor="#0d2c71" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0d2c71" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="royalStream" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0" />
            <stop offset="40%" stopColor="#2563eb" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="goldStream" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0" />
            <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Navy arc sweeping behind tablet toward center */}
        <path
          d="M -40 380 Q 260 120 720 280 T 1520 180"
          stroke="url(#navyStream)"
          strokeWidth="28"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Royal/purple arc rising behind phone toward center */}
        <path
          d="M -40 220 Q 320 420 720 260 T 1520 320"
          stroke="url(#royalStream)"
          strokeWidth="24"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Gold accent swoosh below devices */}
        <path
          d="M -40 480 Q 360 360 720 440 T 1520 400"
          stroke="url(#goldStream)"
          strokeWidth="16"
          strokeLinecap="round"
          opacity="0.8"
        />
      </svg>
    </div>
  );
}

export function ExperienceHero() {
  const brand = publicBranding;

  return (
    <section
      id="experience"
      className="relative bg-white px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-28"
    >
      <RibbonField />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Eyebrow */}
        <p className="text-3xl font-black uppercase tracking-[0.22em] text-slate-900 sm:text-4xl lg:text-5xl">
          THE EXPERIENCE
        </p>

        {/* Device + logo composition */}
        <div className="relative mt-8 grid items-center gap-6 md:mt-10 lg:grid-cols-[1fr_minmax(20rem,36rem)_1fr] lg:gap-10">
          {/* Center logo and heading */}
          <div className="relative z-20 order-1 mx-auto flex max-w-xl flex-col items-center lg:order-2">
            <div className="relative rounded-[2rem] border border-slate-200 bg-white/90 px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-sm sm:px-8 sm:py-6">
              <img
                src={brand.logoPath}
                alt={brand.appName}
                className="h-40 w-auto max-w-full object-contain sm:h-52 lg:h-60"
                draggable={false}
              />
            </div>

            <h1 className="mt-7 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Built for Fast, Clear, and Consistent Inspections
            </h1>

            <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-700 sm:text-lg">
              Vehicle inspection and condition reporting for teams that need clean reports, reliable media, and faster review.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={brand.portalUrl}
                className="inline-flex min-w-[10rem] items-center justify-center rounded-full bg-amber-400 px-7 py-3.5 text-base font-extrabold text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:bg-amber-300 hover:shadow-lg no-underline"
              >
                Open Portal
              </Link>
              <Link
                href="/get-app/"
                className="inline-flex min-w-[10rem] items-center justify-center rounded-full border-2 border-slate-200 bg-white px-7 py-3.5 text-base font-extrabold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md no-underline"
              >
                Get the App
              </Link>
            </div>
          </div>

          {/* Phone - right */}
          <div className="relative z-10 order-2 flex justify-center lg:order-3 lg:justify-start">
            <div
              className="w-[64%] max-w-[320px] drop-shadow-2xl sm:w-[58%] lg:w-[78%] lg:max-w-none"
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

          {/* Tablet - left */}
          <div className="relative z-10 order-3 flex justify-center lg:order-1 lg:justify-end">
            <div
              className="w-[88%] max-w-[520px] drop-shadow-2xl lg:w-[115%] lg:max-w-none"
              style={{
                transform: "perspective(1200px) rotateY(14deg) rotateZ(-5deg) scale(1.25)",
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
      </div>
    </section>
  );
}
