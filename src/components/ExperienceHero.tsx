import Link from "next/link";
import Image from "next/image";
import type { CSSProperties } from "react";
import { publicBranding } from "@/lib/publicBranding";

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
  return null;
}

export function ExperienceHero() {
  const brand = publicBranding;
  const heroLogo = brand.mode === "definianInspection"
    ? "/media/definian-logo-chatgpt.png"
    : "/media/inspection-trac-center-logo.png";

  return (
    <section
      id="experience"
      className="relative bg-[#e9ebf2] px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8 lg:py-28"
    >
      <RibbonField />

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* Eyebrow */}
        <p className="text-3xl font-black uppercase tracking-[0.22em] text-slate-900 sm:text-4xl lg:text-5xl">
          THE EXPERIENCE
        </p>

        <div className="relative mx-auto mt-8 flex max-w-[84rem] flex-col items-center gap-10 md:mt-10">
          <div className="relative w-full max-w-[82rem]">
            <div className="absolute inset-0 -z-10 rounded-[3rem] bg-[radial-gradient(circle_at_center,rgba(37,99,235,0.12),rgba(233,235,242,0.96)_45%),radial-gradient(circle_at_left,rgba(59,130,246,0.12),rgba(233,235,242,0.96)_28%),radial-gradient(circle_at_right,rgba(245,158,11,0.1),rgba(233,235,242,0.96)_28%)] blur-2xl" />
            <Image
              src={heroLogo}
              alt={`${brand.appName} logo`}
              width={1000}
              height={250}
              draggable={false}
              className="mx-auto w-full max-w-[1760px] select-none object-contain"
            />
          </div>

          <div className="relative z-20 flex max-w-4xl flex-col items-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
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
                href="/#get-app"
                className="inline-flex min-w-[10rem] items-center justify-center rounded-full border-2 border-slate-200 bg-white px-7 py-3.5 text-base font-extrabold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md no-underline"
              >
                Get the App
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
