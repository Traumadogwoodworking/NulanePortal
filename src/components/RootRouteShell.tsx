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

function isHomePath(pathname: string | null) {
  if (!pathname) return false;
  return pathname === "/" || pathname === "/index.html" || pathname === "/portal" || pathname === "/portal/";
}

export function RootRouteShell({ children }: RootRouteShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hasCallbackParams = Boolean(searchParams?.get("code") && searchParams?.get("state"));

  if (children) {
    if (isHomePath(pathname) && !hasCallbackParams) {
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

  if (hasCallbackParams) {
    return <AuthCallbackClient />;
  }

  return null;
}
