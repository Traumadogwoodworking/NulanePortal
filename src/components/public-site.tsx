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
        <Link href="/" className="flex items-center gap-4 text-slate-900 no-underline">
          <img src="/media/inspection-trac-logo.png" alt={brand.appName} className="h-14 w-auto shrink-0 sm:h-16" />
          <div className="hidden md:block">
            <p className="text-[10px] font-black uppercase tracking-[0.38em] text-slate-500">{brand.appName}</p>
            <p className="text-sm font-medium text-slate-600">{brand.shortDescription}</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-700 lg:flex">
          <Link className="transition hover:text-slate-950 no-underline" href="/#product">
            Product
          </Link>
          <Link className="transition hover:text-slate-950 no-underline" href="/workflow">
            Workflow
          </Link>
          <Link className="transition hover:text-slate-950 no-underline" href="/support">
            Support
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href={PORTAL_URL}
            className="rounded-full bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-amber-300 no-underline"
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
              <img src="/media/inspection-trac-logo.png" alt={brand.appName} className="h-11 w-auto" />
              <div>
                <p className="text-sm font-black uppercase tracking-[0.28em] text-white">{brand.appName}</p>
                <p className="text-xs text-slate-400">{brand.shortDescription}</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-400">
              {brand.landingExplainer}
            </p>
            <a className="block text-sm font-semibold text-amber-300 no-underline" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </div>
          <FooterColumn title="Product" links={[["Overview", "/#product"], ["Workflow", "/workflow"]]} />
          <FooterColumn title="Support" links={[["Contact Support", "/support"], ["Open Portal", PORTAL_URL]]} />
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
  title,
  path,
  exists,
  featured = false,
}: {
  title: string;
  path: string;
  exists: boolean;
  featured?: boolean;
}) {
  const imageHeight = featured ? "h-[420px]" : "h-[220px]";
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
          Portal preview
        </span>
      </div>
      {exists ? (
        <div className="bg-slate-950 p-4">
          <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <img src={path} alt={title} className={`w-full object-contain ${imageHeight} bg-white`} />
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-4">
          <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className={`flex ${imageHeight} items-center justify-center p-6`}>
              <div className="w-full max-w-sm rounded-[1.5rem] border border-dashed border-slate-300 bg-white/90 p-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Screenshot pending</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{title}</p>
                <p className="mt-2 text-xs text-slate-500">Add {path.replace("/images/", "")}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
