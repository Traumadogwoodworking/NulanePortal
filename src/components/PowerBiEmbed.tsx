"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { resolvePowerBiEmbedUrl } from "@/lib/branding";

interface PowerBiEmbedProps {
  embedUrl: string | null;
  organizationName: string;
}

export function PowerBiEmbed({ embedUrl, organizationName }: PowerBiEmbedProps) {
  const [frameReady, setFrameReady] = useState(false);
  const [frameErrored, setFrameErrored] = useState(false);
  const resolvedEmbedUrl = resolvePowerBiEmbedUrl(embedUrl);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFrameReady(false);
      setFrameErrored(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [embedUrl]);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5">
      <header className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Analytics Insights</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Power BI dashboard for {organizationName}</p>
          </div>
        </div>
        <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] uppercase font-bold tracking-widest rounded-full border border-emerald-100 dark:border-emerald-800/50">
          Live Data
        </div>
      </header>

      <div className="p-1">
        {frameErrored ? (
          <div className="rounded-2xl bg-white dark:bg-slate-950/20 p-6">
            <EmptyState
              title="Power BI unavailable"
              description="The Power BI dashboard could not be loaded. Check the embed URL and tenant permissions."
              action={
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  The dashboard stays read-only until the embed contract is healthy again.
                </p>
              }
            />
          </div>
        ) : resolvedEmbedUrl ? (
          <div className="relative rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-950" style={{ minHeight: "min(88vh, 1040px)" }}>
            {!frameReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 dark:bg-slate-950/90">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700 dark:border-slate-800 dark:border-t-slate-200" />
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">
                    Loading Power BI embed
                  </p>
                  <p className="max-w-sm text-[11px] leading-5 text-slate-400">
                    Fetching the organization-approved analytics surface.
                  </p>
                </div>
              </div>
            ) : null}
            <iframe
              title="Power BI dashboard"
              src={resolvedEmbedUrl}
              loading="lazy"
              className="w-full border-0"
              style={{ height: "min(88vh, 1040px)" }}
              allowFullScreen
              onLoad={() => setFrameReady(true)}
              onError={() => setFrameErrored(true)}
            />
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-950/20 p-6">
            <EmptyState
              title="Power BI embed not configured"
              description="This organization does not currently return a Power BI embed URL from the branding snapshot. The dashboard stays read-only until that contract is populated."
              action={
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                  No synthetic dashboard content is shown here.
                </p>
              }
            />
          </div>
        )}
      </div>

      {!resolvedEmbedUrl ? (
        <footer className="px-8 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-400 italic">
            Power BI content is only shown when the organization branding snapshot provides an embed URL.
          </p>
        </footer>
      ) : null}
    </section>
  );
}
