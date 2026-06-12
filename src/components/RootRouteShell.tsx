"use client";

import { type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";
import { AppShellRouter } from "@/components/AppShellRouter";
import { publicBranding } from "@/lib/publicBranding";
import { PortalDataProvider } from "@/lib/portalData";
import { PortalSessionProvider } from "@/lib/portalSession";

type RootRouteShellProps = {
  children?: ReactNode;
};

function isAuthStartPath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/login" || pathname === "/login/" || pathname === "/portal/login" || pathname === "/portal/login/";
}

function normalizePathname(pathname: string | null) {
  if (!pathname) return "/";
  return pathname !== "/" ? pathname.replace(/\/+$/, "") || "/" : pathname;
}

function isPublicInspectionTracPath(pathname: string | null) {
  const path = normalizePathname(pathname);
  if (path === "/" && publicBranding.mode === "inspectionTrac") {
    return true;
  }
  return ["/index.html", "/privacy", "/terms", "/support", "/workflow", "/definian-signal"].includes(path);
}

export function RootRouteShell({ children }: RootRouteShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasCallbackParams = Boolean(searchParams?.get("code") && searchParams?.get("state"));

  if (hasCallbackParams) {
    return <AuthCallbackClient />;
  }

  if (children) {
    if (isPublicInspectionTracPath(pathname) || isAuthStartPath(pathname)) {
      return <>{children}</>;
    }

    return (
      <PortalSessionProvider>
        <PortalDataProvider>
          <AppShellRouter>{children}</AppShellRouter>
        </PortalDataProvider>
      </PortalSessionProvider>
    );
  }

  return null;
}
