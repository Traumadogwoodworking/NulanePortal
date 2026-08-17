"use client";

import { useMemo } from "react";
import { resolvePortalBranding } from "@/lib/branding";

interface PortalTopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
}

export function PortalTopBar({ pageTitle, pageSubtitle }: PortalTopBarProps) {
  const branding = useMemo(
    () => resolvePortalBranding({ session: null }),
    []
  );
  const barColor = branding.portalBrandColor;
  return (
    <header
      className="portal-top-bar sticky top-0 z-50 w-full min-h-[72px] border-b border-white/15"
      style={{
        background: `linear-gradient(180deg, ${barColor} 0%, color-mix(in srgb, ${barColor} 82%, white) 100%)`,
        boxShadow: `0 10px 30px -18px var(--brand-shadow, rgba(15,23,42,0.24)), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.22)`,
      }}
    >
      <div className="flex w-full items-center justify-center px-6 py-5">
        <div className="flex min-w-0 max-w-4xl flex-col items-center gap-1 text-center">
          <div className="max-w-full overflow-hidden">
            <h1
              className="truncate text-[30px] font-black leading-tight tracking-tight text-white sm:text-[34px]"
              style={{
                fontFamily: "Inter, var(--font-inter), var(--font-geist-sans), sans-serif",
                textShadow: "0 1px 2px rgba(2,6,23,0.32)",
              }}
            >
              {pageTitle}
            </h1>
            {pageSubtitle ? (
              <p
                className="mt-0.5 truncate text-sm font-semibold leading-5 text-slate-200 sm:text-base"
                style={{
                  textShadow: "0 1px 1px rgba(2,6,23,0.3)",
                }}
              >
                {pageSubtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
