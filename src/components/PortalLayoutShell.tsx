"use client";

import { useMemo } from "react";
import { PortalSidebar } from "@/components/PortalSidebar";
import { PortalTopBar } from "@/components/PortalTopBar";
import { AlertStack } from "@/components/AlertStack";
import { PortalStatusScreen } from "@/components/PortalStatusScreen";
import { AccessGuardClient } from "@/components/AccessGuardClient";
import { usePortalSession } from "@/lib/portalSession";
import { usePortalBrandingSnapshot } from "@/lib/portalData";
import { usePathname } from "next/navigation";
import { getRouteByPath } from "@/lib/navigation";
import { resolvePortalBranding } from "@/lib/branding";
import { usePortalThemeMode } from "@/lib/portalTheme";

export function PortalLayoutShell({ children }: { children: React.ReactNode }) {
  const { status, error, refetch, session, signInEmbedded } = usePortalSession();
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const { data: brandingSnapshot } = usePortalBrandingSnapshot();
  const branding = useMemo(
    () => resolvePortalBranding({ session, pathname: safePathname, brandingSnapshot: brandingSnapshot ?? null }),
    [brandingSnapshot, safePathname, session]
  );
  const { mode: themeMode } = usePortalThemeMode();

  const pageMetadata = useMemo(() => {
    const route = getRouteByPath(safePathname);
    return {
      title: route?.href === "/docudent" ? branding.appLabel ?? route?.label ?? "Portal" : route?.label ?? "Portal",
      subtitle: route?.description ?? "",
    };
  }, [branding.appLabel, safePathname]);

  const brandingStyles = useMemo(() => {
    const brand = branding.portalBrandColor;
    const hex = brand.replace("#", "").trim();
    const expanded = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
    const red = Number.parseInt(expanded.slice(0, 2), 16);
    const green = Number.parseInt(expanded.slice(2, 4), 16);
    const blue = Number.parseInt(expanded.slice(4, 6), 16);
    const isValidColor = [red, green, blue].every((component) => Number.isFinite(component));
    const glow = isValidColor ? `rgba(${red}, ${green}, ${blue}, 0.16)` : "rgba(37, 99, 235, 0.16)";
    const shadow = isValidColor ? `rgba(${red}, ${green}, ${blue}, 0.22)` : "rgba(15, 23, 42, 0.24)";
    return {
      "--brand": brand,
      "--brand-accent": branding.portalBrandAccentColor,
      "--brand-light": branding.portalBrandLightColor,
      "--brand-shadow": shadow,
      "--brand-glow": glow,
      "--sidebar-bg-enforced": branding.sidebarBgEnforced,
      "--sidebar-text-enforced": branding.sidebarTextEnforced,
      "--sidebar-link-enforced": branding.sidebarLinkEnforced,
      "--sidebar-link-hover-enforced": branding.sidebarLinkHoverEnforced,
      "--portal-theme-mode": themeMode,
      colorScheme: themeMode === "light" ? "light" : "dark",
    } as React.CSSProperties;
  }, [branding, themeMode]);

  if (status === "unauthenticated") {
    const embedded = typeof window !== "undefined" && window.top !== window.self;
    return (
      <PortalStatusScreen
        title={embedded ? "Open secure sign-in" : "Signing you in"}
        description={
          embedded
            ? error?.message || "Sign in securely without leaving Definian Signal."
            : "Redirecting to Auth0 so you can access the portal."
        }
        actions={
          embedded ? (
            <button
              type="button"
              onClick={() => void signInEmbedded()}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white hover:bg-white/20"
            >
              Sign in to Definian
            </button>
          ) : undefined
        }
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
    <div id="portal" data-theme={themeMode} className="flex h-screen overflow-hidden" style={brandingStyles}>
      <PortalSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PortalTopBar pageTitle={pageMetadata.title} pageSubtitle={pageMetadata.subtitle} />
        <AlertStack />
        <main className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.08)_120px,rgba(255,255,255,0)_240px)] p-4">
          <AccessGuardClient>{children}</AccessGuardClient>
        </main>
      </div>
    </div>
  );
}
