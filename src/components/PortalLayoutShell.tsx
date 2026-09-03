"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PortalSidebar } from "@/components/PortalSidebar";
import { PortalTopBar } from "@/components/PortalTopBar";
import { AlertStack } from "@/components/AlertStack";
import { PortalStatusScreen } from "@/components/PortalStatusScreen";
import { AccessGuardClient } from "@/components/AccessGuardClient";
import { usePortalSession } from "@/lib/portalSession";
import {
  authenticateEmbeddedPortal,
  canAutoRedirectEmbeddedPortalAuth,
  clearStalePortalSession,
  isEmbeddedPortalContext,
  openPortalLogin,
} from "@/lib/portalAuth";
import { usePortalBrandingSnapshot } from "@/lib/portalData";
import { usePathname } from "next/navigation";
import { getRouteByPath } from "@/lib/navigation";
import { resolvePortalBranding } from "@/lib/branding";
import { usePortalThemeMode } from "@/lib/portalTheme";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export function PortalLayoutShell({ children }: { children: React.ReactNode }) {
  const { status, error, refetch, session } = usePortalSession();
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const embedded = isEmbeddedPortalContext();
  const canAutoRedirectEmbeddedAuth = canAutoRedirectEmbeddedPortalAuth();
  const autoLoginKeyRef = useRef<string | null>(null);
  const [embeddedAuthAction, setEmbeddedAuthAction] = useState<"login" | "signup" | null>(null);
  const [embeddedAuthError, setEmbeddedAuthError] = useState<string | null>(null);
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
    const shouldOpenEmbeddedLogin = status === "unauthenticated" || backendRejectedSession;
    if (!shouldOpenEmbeddedLogin || (embedded && !canAutoRedirectEmbeddedAuth)) {
      autoLoginKeyRef.current = null;
      if (backendRejectedSession) {
        clearStalePortalSession("definian_backend_rejected_session");
      }
      return;
    }
    const redirectKey = `${backendRejectedSession ? "logout" : "login"}:${safePathname}`;
    if (autoLoginKeyRef.current === redirectKey) {
      return;
    }
    autoLoginKeyRef.current = redirectKey;
    if (backendRejectedSession) {
      clearStalePortalSession("definian_backend_rejected_session");
    }
    openPortalLogin(safePathname);
  }, [canAutoRedirectEmbeddedAuth, embedded, safePathname, session?.portal_access, status]);

  const startEmbeddedAuth = async (signup: boolean) => {
    if (embeddedAuthAction) return;
    setEmbeddedAuthAction(signup ? "signup" : "login");
    setEmbeddedAuthError(null);
    try {
      await authenticateEmbeddedPortal({ signup });
      await refetch();
    } catch (authError) {
      setEmbeddedAuthError(
        authError instanceof Error
          ? authError.message
          : "Secure authentication did not complete. Please try again.",
      );
    } finally {
      setEmbeddedAuthAction(null);
    }
  };

  if (
    status === "unauthenticated" ||
    status === "session_error" ||
    status === "forbidden" ||
    (status === "success" && session?.portal_access === false)
  ) {
    if (!embedded) return null;
    if (canAutoRedirectEmbeddedAuth) return null;
    return (
      <PortalStatusScreen
        title="Welcome to Definian Signal"
        description={
          embeddedAuthError ??
          "Sign in or create an account using Auth0. Secure authentication opens in a separate window, then this portal unlocks automatically."
        }
        actions={
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void startEmbeddedAuth(false)}
              disabled={embeddedAuthAction !== null}
              className="rounded-full bg-[#0d2c71] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#123b91]"
            >
              {embeddedAuthAction === "login" ? "Signing in..." : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => void startEmbeddedAuth(true)}
              disabled={embeddedAuthAction !== null}
              className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              {embeddedAuthAction === "signup" ? "Opening signup..." : "Create account"}
            </button>
          </div>
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
          {branding.mode !== "definianInspection" && session?.onboardingStatus && session.onboardingStatus !== "ready" ? (
            <div className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950" role="status">
              <div className="flex min-w-0 gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-black">Your account setup needs attention.</p>
                  <p className="mt-0.5 text-xs font-semibold">
                    {session.onboardingStatus === "facility_unassigned"
                      ? "A facility assignment is required before operational pages can show the correct data. An administrator can review the onboarding issue."
                      : session.onboardingStatus === "role_unassigned"
                        ? "An operational role is required before you can use facility workflows."
                        : `Missing: ${(session.missingFields || []).map((field) => field.replace(/_/g, " ")).join(", ") || session.onboardingStatus.replace(/_/g, " ")}.`}
                    {session.issues?.[0]?.reference_code ? ` Support reference: ${session.issues[0].reference_code}.` : ""}
                  </p>
                </div>
              </div>
              {session.onboardingStatus === "profile_incomplete" ? (
                <Link href="/settings" className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-black uppercase tracking-wider text-amber-950">Complete profile</Link>
              ) : null}
            </div>
          ) : null}
          <main className="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.04)_140px,rgba(255,255,255,0)_280px)] p-4">
            <AccessGuardClient>{children}</AccessGuardClient>
          </main>
        </div>
      </div>
    </div>
  );
}
