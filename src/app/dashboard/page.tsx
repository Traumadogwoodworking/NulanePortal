"use client";

import { usePortalSession } from "@/lib/portalSession";
import { getPortalBranding } from "@/lib/branding";
import { PowerBiEmbed } from "@/components/PowerBiEmbed";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";

export default function DashboardPage() {
  const { session, status } = usePortalSession();
  const branding = session ? getPortalBranding(session) : null;
  const powerBiUrl = branding?.powerBiEmbedUrl ?? null;

  if (status === "unauthenticated") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          title="Sign in to open dashboards"
          description="This page needs an authenticated portal session before it can load the embedded analytics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-6 py-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Dashboard</p>
          </div>
        </div>
        <CardContent className="!p-0">
          <div className="relative min-h-[calc(100vh-200px)]">
            {powerBiUrl ? (
              <PowerBiEmbed
                embedUrl={powerBiUrl}
                organizationName={branding?.organizationName || "Unknown"}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <EmptyState
                  title={status === "loading" ? "Opening dashboard" : "Dashboard embed not configured"}
                  description={
                    status === "loading"
                      ? "Loading your session and workspace details."
                      : "This organization does not currently expose an approved Power BI embed URL to the portal."
                  }
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
