"use client";

import { usePathname } from "next/navigation";
import { getAccessBarrier, getRouteByPath } from "@/lib/navigation";
import { usePortalSession } from "@/lib/portalSession";
import { PortalStatusScreen } from "./PortalStatusScreen";

export function AccessGuardClient({ children }: { children: React.ReactNode }) {
  const { hasPermission, isAdmin, isOrgAdmin, isFacilityAdmin, isSuperAdmin, isPortalAccessAllowed, isAwct, isShap, isSvl } = usePortalSession();
  const pathname = usePathname();
  const activeRoute = getRouteByPath(pathname ?? "/");
  const isHydrated = typeof window !== "undefined";
  const isLocalDev = process.env.NODE_ENV !== "production";

  if (!isHydrated) {
    return <>{children}</>;
  }

  const accessInfo = { isPortalAccessAllowed, isAdmin, isOrgAdmin, isFacilityAdmin, isSuperAdmin, isAwct, isShap, isSvl, hasPermission };
  const accessBarrier = isLocalDev ? null : getAccessBarrier(activeRoute, accessInfo);

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
        description={
          accessBarrier.requiredPermission
            ? `Permission "${accessBarrier.requiredPermission}" is required to view this page.`
            : "Your permissions currently prevent access to this page."
        }
      />
    );
  }

  return <>{children}</>;
}
