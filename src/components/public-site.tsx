import Link from "next/link";
import type { ReactNode } from "react";
import { publicBranding } from "@/lib/publicBranding";

export const PORTAL_URL = publicBranding.portalUrl;
export const SUPPORT_EMAIL = publicBranding.supportEmail;
export const REPORTS_EMAIL = publicBranding.reportsEmail;

export function PublicHeader() {
  const brand = publicBranding;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-5 lg:px-8">
        <Link
          href="/"
          className="flex items-center rounded-[1.35rem] border border-slate-200 bg-white px-4 py-2 text-slate-900 no-underline shadow-[0_12px_34px_rgba(15,23,42,0.08)] transition hover:border-slate-300 hover:shadow-[0_16px_42px_rgba(15,23,42,0.11)]"
        >
          <img src={brand.logoPath} alt={brand.appName} className="h-16 w-auto max-w-full shrink-0 object-contain sm:h-[4.5rem] lg:h-20" draggable={false} />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 lg:flex">
          <Link className="transition hover:text-slate-950 no-underline" href="/">
            Home
          </Link>
          <Link className="transition hover:text-slate-950 no-underline" href="/#experience">
            Experience
          </Link>
          <Link className="transition hover:text-slate-950 no-underline" href="/#get-app">
            Get the App
          </Link>
          <Link className="transition hover:text-slate-950 no-underline" href="/contact-us">
            Contact Us
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={PORTAL_URL}
            className="rounded-full bg-amber-400 px-6 py-3.5 text-base font-extrabold text-slate-950 shadow-md transition hover:bg-amber-300 hover:shadow-lg no-underline"
          >
            {brand.openPortalButtonLabel}
          </Link>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const brand = publicBranding;

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-200">
      <div className="mx-auto w-full max-w-7xl px-6 py-14 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-3">
              <img src={brand.logoPath} alt={brand.appName} className="h-16 w-auto max-w-full sm:h-20" draggable={false} />
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-400">
              {brand.landingExplainer}
            </p>
            <a className="block text-sm font-semibold text-amber-300 no-underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </div>
          <FooterColumn title="Home" links={[["Overview", "/#product"], ["Experience", "/#experience"], ["Get the App", "/#get-app"]]} />
          <FooterColumn title="Support" links={[["Contact Us", "/contact-us"], ["Open Portal", PORTAL_URL]]} />
          <FooterColumn title="Legal" links={[["Privacy", "/privacy"], ["Terms", "/terms"]]} />
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-500">
          © {new Date().getFullYear()} {brand.footerLegalOwner}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-400">{title}</p>
      <div className="space-y-3">
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="block text-sm text-slate-300 no-underline transition hover:text-white">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">{children}</p>
  );
}

export function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-amber-300">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>
    </div>
  );
}

export function SupportCard({
  title,
  description,
  link,
}: {
  title: string;
  description: string;
  link: string;
}) {
  return (
    <a
      href={link}
      className="group block rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)] no-underline transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_48px_rgba(15,23,42,0.09)]"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-bold text-slate-950">{title}</h3>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
          Support
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
    </a>
  );
}

export function ScreenshotCard({
  path,
  exists,
  caption,
  kind = "landscape",
}: {
  path: string;
  exists: boolean;
  featured?: boolean;
  kind?: "portrait" | "landscape";
  caption?: string;
}) {
  const imageHeight =
    kind === "portrait"
      ? "h-[360px] md:h-[480px]"
      : "h-[420px] md:h-[520px] xl:h-[620px]";
  const imageFit = "object-contain";
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-700 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] shadow-[0_26px_70px_rgba(15,23,42,0.18)]">
      {exists ? (
        <div className="bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.1),_transparent_44%),linear-gradient(180deg,#ffffff_0%,#eef2f7_100%)] p-2.5 sm:p-3">
          <div className="overflow-hidden rounded-[1.65rem] border border-slate-200 bg-white p-2.5 shadow-[0_20px_48px_rgba(15,23,42,0.12)] sm:p-3">
            <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white">
              <img src={path} alt="" aria-hidden draggable={false} className={`w-full ${imageFit} ${imageHeight} bg-white`} />
              <span className="sr-only">Screenshot</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.05),_transparent_46%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] p-4">
          <div className="overflow-hidden rounded-[1.35rem] border border-dashed border-slate-300 bg-white/92 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className={`flex ${imageHeight} items-center justify-center p-6`}>
              <div className="w-full max-w-sm rounded-[1.35rem] border border-slate-200 bg-white p-8 text-center shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Portal shot pending</p>
                <p className="mt-2 text-xs text-slate-500">Add {path.replace("/images/", "")}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {caption ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{caption}</p>
        </div>
      ) : null}
    </div>
  );
}
