"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { PortalLayoutShell } from "@/components/PortalLayoutShell";
import { ControlWorkspaceShell } from "@/components/control/ControlWorkspaceShell";
import { isControlRoute } from "@/lib/controlRoutes";

function isLoginRoute(pathname: string) {
  return pathname === "/login" || pathname === "/login/";
}

function isAuthCallbackRoute(pathname: string) {
  return pathname === "/auth/callback" || pathname === "/auth/callback/";
}

export function AppShellRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  if (isLoginRoute(pathname)) {
    return <>{children}</>;
  }
  if (isAuthCallbackRoute(pathname)) {
    return <>{children}</>;
  }
  if (isControlRoute(pathname)) {
    return <ControlWorkspaceShell>{children}</ControlWorkspaceShell>;
  }
  return <PortalLayoutShell>{children}</PortalLayoutShell>;
}
