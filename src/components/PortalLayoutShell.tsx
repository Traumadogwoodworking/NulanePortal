"use client";

import { useEffect, useMemo, useRef } from "react";
import { PortalSidebar } from "@/components/PortalSidebar";
import { PortalTopBar } from "@/components/PortalTopBar";
import { AlertStack } from "@/components/AlertStack";
import { PortalStatusScreen } from "@/components/PortalStatusScreen";
import { AccessGuardClient } from "@/components/AccessGuardClient";
import { usePortalSession } from "@/lib/portalSession";
import { AuthRedirectError, logoutRejectedPortalSession, startAuth0Login } from "@/lib/portalAuth";
import { usePortalBrandingSnapshot } from "@/lib/portalData";
import { usePathname } from "next/navigation";
import { getRouteByPath } from "@/lib/navigation";
import { resolvePortalBranding } from "@/lib/branding";
import { usePortalThemeMode } from "@/lib/portalTheme";

export function PortalLayoutShell({ children }: { children: React.ReactNode }) {
  const { status, error, refetch, session } = usePortalSession();
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const autoLoginKeyRef = useRef<string | null>(null);
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

  useEffect(() => {
    const backendRejectedSession =
      status === "session_error" ||
      status === "forbidden" ||
      (status === "success" && session?.portal_access === false);
    const shouldRedirectToUniversalLogin = status === "unauthenticated" || backendRejectedSession;
    if (!shouldRedirectToUniversalLogin) {
      autoLoginKeyRef.current = null;
      return;
    }
    const redirectKey = `${backendRejectedSession ? "logout" : "login"}:${safePathname}`;
    if (autoLoginKeyRef.current === redirectKey) {
      return;
    }
    autoLoginKeyRef.current = redirectKey;
    const redirect = backendRejectedSession
      ? logoutRejectedPortalSession(safePathname)
      : startAuth0Login(safePathname);
    void redirect.catch((redirectError) => {
      if (redirectError instanceof AuthRedirectError) {
        return;
      }
      autoLoginKeyRef.current = null;
      console.warn("[Auth0] protected portal auto-login failed", {
        errorName: redirectError instanceof Error ? redirectError.name : typeof redirectError,
        message: redirectError instanceof Error ? redirectError.message : "Unknown login redirect error",
      });
    });
  }, [safePathname, session?.portal_access, status]);

  if (
    status === "unauthenticated" ||
    status === "session_error" ||
    status === "forbidden" ||
    (status === "success" && session?.portal_access === false)
  ) {
    return null;
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
    <div id="portal" data-theme={themeMode} className="flex h-screen overflow-hidden bg-[color:var(--bg)] p-4" style={brandingStyles}>
      <PortalSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden pl-4">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[2rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] shadow-[var(--shadow-panel)]">
          <PortalTopBar pageTitle={pageMetadata.title} pageSubtitle={pageMetadata.subtitle} />
          <AlertStack />
          <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.04)_140px,rgba(255,255,255,0)_280px)] p-4">
            <AccessGuardClient>{children}</AccessGuardClient>
          </main>
        </div>
      </div>
    </div>
  );
}
