"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { usePortalBrandingSnapshot } from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import { resolvePortalBranding, resolvePowerBiEmbedUrl } from "@/lib/branding";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DashboardPage() {
  const { session, status } = usePortalSession();
  const { data: brandingSnapshot } = usePortalBrandingSnapshot();
  const [frameReady, setFrameReady] = useState(false);
  const [frameErrored, setFrameErrored] = useState(false);

  const branding = useMemo(
    () =>
      resolvePortalBranding({
        session,
        pathname: "/dashboard",
        brandingSnapshot: brandingSnapshot ?? null,
      }),
    [brandingSnapshot, session]
  );
  const rawEmbedUrl = branding.powerBiEmbedUrl;
  const embedUrl = resolvePowerBiEmbedUrl(rawEmbedUrl);

  useEffect(() => {
    setFrameReady(false);
    setFrameErrored(false);
  }, [embedUrl]);

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-[calc(100vh-120px)] items-center justify-center">
        <EmptyState
          title="Sign in to open dashboards"
          description="This page needs an authenticated portal session before it can load the embedded analytics."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-96px)] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">Dashboard</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-slate-950">DocuDent Analytics</h1>
        </div>
        {embedUrl ? (
          <a
            href={embedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-950"
          >
            <ExternalLink className="h-4 w-4" />
            Open
          </a>
        ) : null}
      </div>

      <div className="relative min-h-[720px] flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
        {frameErrored || !embedUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <EmptyState
              title="Power BI unavailable"
              description="No DocuDent Power BI report is configured for this organization."
              tone="danger"
            />
          </div>
        ) : (
          <>
            {!frameReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-800" />
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Loading Power BI</p>
                </div>
              </div>
            ) : null}
            <iframe
              title="DocuDent Power BI dashboard"
              src={embedUrl}
              className="h-full min-h-[720px] w-full border-0"
              allowFullScreen
              onLoad={() => setFrameReady(true)}
              onError={() => setFrameErrored(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
