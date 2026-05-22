"use client";

import { useMemo } from "react";
import { PortalSidebar } from "@/components/PortalSidebar";
import { PortalTopBar } from "@/components/PortalTopBar";
import { AlertStack } from "@/components/AlertStack";
import { PortalStatusScreen } from "@/components/PortalStatusScreen";
import { AccessGuardClient } from "@/components/AccessGuardClient";
import { usePortalSession } from "@/lib/portalSession";
import { usePathname } from "next/navigation";
import { getRouteByPath } from "@/lib/navigation";
import { getAppBranding } from "@/lib/branding";
import { usePortalThemeMode } from "@/lib/portalTheme";

export function PortalLayoutShell({ children }: { children: React.ReactNode }) {
  const { status, error, refetch } = usePortalSession();
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const appBranding = useMemo(() => getAppBranding(safePathname), [safePathname]);
  const { mode: themeMode } = usePortalThemeMode();

  const pageMetadata = useMemo(() => {
    const route = getRouteByPath(safePathname);
    return {
      title: route?.label ?? "Portal",
      subtitle: route?.description ?? "",
    };
  }, [safePathname]);

  // Dynamic branding tokens injected as CSS variables for Tailwind 4 @theme consumption
  const brandingStyles = useMemo(() => {
    const color = appBranding.brandColor || "#2563eb";
    return {
      "--brand": color,
      "--brand-accent": color,
      "--brand-light": `${color}1a`,
      "--portal-theme-mode": themeMode,
      colorScheme: themeMode === "light" ? "light" : "dark",
    } as React.CSSProperties;
  }, [appBranding, themeMode]);

  if (status === "unauthenticated") {
    return (
      <PortalStatusScreen
        title="Signing you in"
        description="Redirecting to Auth0 so you can access the portal."
      />
    );
  }
  if (status === "transient-error") {
    return (
      <PortalStatusScreen
        title="Connection interrupted"
        description={
          error?.message || "Unable to reach the portal API. Please try again in a moment."
        }
        actions={
          <button
            type="button"
            onClick={refetch}
            className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/20"
          >
            Retry
          </button>
        }
      />
    );
  }
  if (status === "forbidden") {
    return (
      <PortalStatusScreen
        title="Access denied"
        description={
          error?.message ||
          "Your account is not authorized to use the portal. Contact support for assistance."
        }
      />
    );
  }
  if (status === "fatal") {
    return (
      <PortalStatusScreen
        title="Unable to initialize portal"
        description={
          error?.message ||
          "Double-check the portal configuration and environment variables in your deployment."
        }
      />
    );
  }

  return (
    <div id="portal" data-theme={themeMode} style={brandingStyles}>
      <PortalSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PortalTopBar pageTitle={pageMetadata.title} pageSubtitle={pageMetadata.subtitle} />
        <AlertStack />
        <main className="flex-1 overflow-y-auto">
          <AccessGuardClient>{children}</AccessGuardClient>
        </main>
      </div>
    </div>
  );
}
