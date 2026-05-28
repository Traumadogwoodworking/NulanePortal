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

  return (
    <header className="portal-top-bar sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/92 backdrop-blur-md">
      <div className="grid w-full grid-cols-[1fr_minmax(0,1.2fr)_1fr] items-center gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 justify-self-start" />

        <div className="flex min-w-0 flex-col items-center gap-1 px-4 text-center justify-self-center">
          <p className={`truncate text-[20px] font-bold uppercase tracking-[0.22em] ${branding.topbarTextClassName}`}>
            {pageSubtitle || "Command Center"}
          </p>
          <h1 className={`truncate text-[12px] font-semibold uppercase tracking-[0.24em] ${branding.topbarTextClassName}`}>
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center justify-end gap-4 justify-self-end" />
      </div>
    </header>
  );
}
