"use client";

import { type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";
import { AppShellRouter } from "@/components/AppShellRouter";
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

function isPublicBrandedPath(pathname: string | null) {
  const path = normalizePathname(pathname);
  if (path === "/") {
    return true;
  }
  return [
    "/index.html",
    "/privacy",
    "/privacy-policy",
    "/terms",
    "/terms-of-service",
    "/contact",
    "/contact-us",
    "/workflow",
    "/definian-signal",
    "/get-app",
    "/join",
    "/getting-started",
  ].includes(path);
}

export function RootRouteShell({ children }: RootRouteShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasCallbackParams = Boolean(searchParams?.get("code") && searchParams?.get("state"));

  if (hasCallbackParams) {
    return <AuthCallbackClient />;
  }

  if (children) {
    if (isPublicBrandedPath(pathname) || isAuthStartPath(pathname)) {
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
