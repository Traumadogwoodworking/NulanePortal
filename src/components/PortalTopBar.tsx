"use client";

import { useMemo } from "react";
import { resolvePortalBranding } from "@/lib/branding";

interface PortalTopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
}

const PORTAL_VERSION_LABEL = process.env.NEXT_PUBLIC_PORTAL_VERSION_LABEL || "inspection-trac-t";

export function PortalTopBar({ pageTitle, pageSubtitle }: PortalTopBarProps) {
  const branding = useMemo(
    () => resolvePortalBranding({ session: null }),
    []
  );
  const barColor = branding.portalBrandColor;
  return (
    <header
      className="portal-top-bar sticky top-0 z-50 w-full min-h-[72px] border-2 border-white backdrop-blur-md"
      style={{
        background: `linear-gradient(180deg, ${barColor} 0%, color-mix(in srgb, ${barColor} 82%, white) 100%)`,
        boxShadow: `0 10px 30px -18px var(--brand-shadow, rgba(15,23,42,0.24)), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.22)`,
      }}
    >
      <div className="grid w-full grid-cols-[1fr_minmax(0,1.2fr)_1fr] items-center gap-3 px-4 py-[22px]">
        <div className="flex min-w-0 items-center gap-2 justify-self-start" />

        <div className="flex min-w-0 flex-col items-center gap-0.5 px-4 text-center justify-self-center">
          <div className="max-w-full overflow-hidden">
            <p
              className="truncate leading-none text-[40px] font-black uppercase tracking-[0.18em] text-slate-900"
              style={{
                fontFamily: "Inter, var(--font-inter), var(--font-geist-sans), sans-serif",
                WebkitTextStroke: "1.9px rgba(255,255,255,0.98)",
                paintOrder: "stroke fill",
                textShadow: "0 0 1.5px rgba(255,255,255,0.85)",
              }}
            >
              {pageSubtitle || "Command Center"}
            </p>
            <h1
              className="truncate leading-none text-[24px] font-black uppercase tracking-[0.2em] text-slate-900"
              style={{
                fontFamily: "Inter, var(--font-inter), var(--font-geist-sans), sans-serif",
                WebkitTextStroke: "1.75px rgba(255,255,255,0.98)",
                paintOrder: "stroke fill",
                textShadow: "0 0 1.5px rgba(255,255,255,0.78)",
              }}
            >
              {pageTitle}
            </h1>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 justify-self-end">
          <span className="max-w-[180px] truncate rounded-full border border-white/70 bg-white/35 px-3 py-1 text-[11px] font-black uppercase text-slate-900 shadow-sm">
            {PORTAL_VERSION_LABEL}
          </span>
        </div>
      </div>
    </header>
  );
}
