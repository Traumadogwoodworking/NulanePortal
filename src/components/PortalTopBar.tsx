"use client";

import { useMemo } from "react";
import { resolvePortalBranding } from "@/lib/branding";
import { usePortalSession } from "@/lib/portalSession";
import type { PortalOrganizationScopeKey } from "@/lib/portalOrganizations";

interface PortalTopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
  showOrganizationScope?: boolean;
}

export function PortalTopBar({ pageTitle, pageSubtitle, showOrganizationScope = true }: PortalTopBarProps) {
  const {
    organizationScopes,
    selectedOrganizationScopeKey,
    switchOrganizationScope,
  } = usePortalSession();
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

        <div className="flex min-w-0 flex-col items-center gap-1 px-4 text-center justify-self-center">
          <div className="max-w-full overflow-hidden">
            <h1
              className="truncate text-[32px] font-black leading-tight tracking-tight text-slate-950 sm:text-[36px]"
              style={{
                fontFamily: "Inter, var(--font-inter), var(--font-geist-sans), sans-serif",
                WebkitTextStroke: "1.5px rgba(255,255,255,0.98)",
                paintOrder: "stroke fill",
                textShadow: "0 0 1.5px rgba(255,255,255,0.78)",
              }}
            >
              {pageTitle}
            </h1>
            {pageSubtitle ? (
              <p
                className="mt-0.5 truncate text-sm font-semibold leading-5 text-slate-800 sm:text-base"
                style={{
                  WebkitTextStroke: "1px rgba(255,255,255,0.98)",
                  paintOrder: "stroke fill",
                  textShadow: "0 0 1px rgba(255,255,255,0.72)",
                }}
              >
                {pageSubtitle}
              </p>
            ) : null}
          </div>
        </div>

        {showOrganizationScope ? (
          <label className="flex min-w-0 max-w-56 flex-col gap-1 justify-self-end text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-800">
              Organization view
            </span>
            <select
              aria-label="Organization view"
              value={selectedOrganizationScopeKey}
              onChange={(event) =>
                switchOrganizationScope(event.target.value as PortalOrganizationScopeKey)
              }
              className="h-9 max-w-full rounded-lg border border-white/80 bg-white px-2 text-xs font-bold text-slate-950 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80"
              style={{ colorScheme: "light" }}
            >
              {organizationScopes.map((scope) => (
                <option key={scope.key} value={scope.key} className="bg-white text-slate-950">
                  {scope.label}
                </option>
              ))}
            </select>
          </label>
        ) : <div aria-hidden="true" className="min-h-9" />}
      </div>
    </header>
  );
}
