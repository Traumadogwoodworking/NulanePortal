"use client";

import { usePathname } from "next/navigation";
import { getAccessBarrier, getRouteByPath } from "@/lib/navigation";
import { usePortalSession } from "@/lib/portalSession";
import { PortalStatusScreen } from "./PortalStatusScreen";

export function AccessGuardClient({ children }: { children: React.ReactNode }) {
  const { isPortalAccessAllowed } = usePortalSession();
  const pathname = usePathname();
  const activeRoute = getRouteByPath(pathname ?? "/");
  const isHydrated = typeof window !== "undefined";

  if (!isHydrated) {
    return <>{children}</>;
  }

  const accessInfo = { isPortalAccessAllowed };
  const accessBarrier = getAccessBarrier(activeRoute, accessInfo);

  if (accessBarrier?.type === "org-admin") {
    return (
      <PortalStatusScreen
        title="Super-admin only area"
        description="You do not have the global administrative role needed to view this section."
      />
    );
  }

  if (accessBarrier?.type === "permission") {
    return (
      <PortalStatusScreen
        title="Restricted"
        description="Your permissions currently prevent access to this page."
      />
    );
  }

  return <>{children}</>;
}
