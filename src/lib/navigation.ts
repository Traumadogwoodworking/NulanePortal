import type { PermissionKey } from "./access";
import { isModuleEnabled, ModuleToggleKey } from "@/lib/modules";
import { publicBranding } from "@/lib/publicBranding";

export type RouteSectionKey = "core" | "apps" | "administration" | "support";

export interface PortalRoute {
  label: string;
  href: string;
  description: string;
  section: RouteSectionKey;
  icon?: string; // SVG key or Emoji
  badge?: string;
  brandColor?: string;
  brandLogo?: string;
  connectionStatus?: "real" | "mixed" | "mocked" | "placeholder" | "scaffold";
  requiresOrgAdmin?: boolean;
  requiresFacilityAdmin?: boolean;
  requiresSuperAdmin?: boolean;
  requiredPermission?: PermissionKey;
  requiresAwct?: boolean;
  requiresShap?: boolean;
  hiddenForSvl?: boolean;
  hideFromNav?: boolean;
  moduleKey?: ModuleToggleKey;
}

export interface PortalNavSection {
  key: RouteSectionKey;
  title: string;
  items: PortalRoute[];
}

const portalRoutes: PortalRoute[] = [
  // Core
  {
    label: "Home",
    href: "/home",
    description: "Portal overview",
    section: "core",
    icon: "home",
  },
  {
    label: "Dashboard",
    href: "/dashboard",
    description: "Key metrics and system status",
    section: "core",
    icon: "dashboard",
    hiddenForSvl: true,
  },
  {
    label: "Damage Reports",
    href: "/reports/damage",
    description: "Vehicle inspection results",
    section: "core",
    icon: "reports",
    moduleKey: "reports",
  },
  {
    label: "RSA Reports",
    href: "/reports/rsa",
    description: "Railcar security audits",
    section: "core",
    icon: "rsa",
    moduleKey: "reports",
  },
  {
    label: "24 Hour",
    href: "/inspection/24-hour",
    description: "SHAP 24-hour inventory inspection queue",
    section: "core",
    icon: "clock",
    moduleKey: "reports",
    requiresShap: true,
  },

  // Apps
  {
    label: publicBranding.appName,
    href: "/docudent",
    description: publicBranding.shortDescription,
    section: "apps",
    icon: publicBranding.logoPath,
    brandColor: "#064e3b",
    brandLogo: publicBranding.logoPath,
    moduleKey: "docudent",
  },
  {
    label: "Organizations", // Added Organizations
    href: "/organizations",
    description: "Manage tenant and subscription data",
    section: "administration",
    icon: "shield", // Using shield icon for now, can be changed later
    requiresOrgAdmin: true,
  },
  {
    label: "Facilities",
    href: "/facilities",
    description: "Manage operational locations",
    section: "administration",
    icon: "facility",
    requiresFacilityAdmin: true,
  },
  {
    label: "Users", // Renamed from "People"
    href: "/users", // Changed href from /people to /users
    description: "User and role management",
    section: "administration",
    icon: "people",
    requiresFacilityAdmin: true,
  },
  {
    label: "Branding",
    href: "/branding",
    description: "Customize portal appearance",
    section: "administration",
    icon: "palette",
    requiresSuperAdmin: true,
  },
  {
    label: "Email",
    href: "/email",
    description: "Notifications",
    section: "administration",
    icon: "email",
    requiresFacilityAdmin: true,
    badge: "black-label",
  },

  // Support
  {
    label: "Support Tickets",
    href: "/support",
    description: "Contact platform support",
    section: "support",
    icon: "support",
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Workspace and session settings",
    section: "support",
    icon: "settings",
  },
];

const sectionOrder: Array<{ key: RouteSectionKey; title: string }> = [
  { key: "core", title: "Core" },
  { key: "apps", title: "Apps" },
  { key: "administration", title: "Administration" },
  { key: "support", title: "Support" },
];

export const navSections: PortalNavSection[] = sectionOrder.map((section) => ({
  ...section,
  items: portalRoutes.filter((route) => route.section === section.key),
}));

const routeLookup = portalRoutes.reduce<Record<string, PortalRoute>>((acc, route) => {
  acc[route.href] = route;
  return acc;
}, {});

export function getRouteByPath(pathname: string): PortalRoute | null {
  if (routeLookup[pathname]) {
    return routeLookup[pathname];
  }

  const match = portalRoutes
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find((route) => route.href !== "/" && pathname.startsWith(route.href));

  return match ?? routeLookup["/"] ?? null;
}

export interface SessionAccessInfo {
  isPortalAccessAllowed: boolean;
  isAdmin: boolean;
  isOrgAdmin: boolean;
  isFacilityAdmin: boolean;
  isSuperAdmin: boolean;
  isAwct: boolean;
  isShap: boolean;
  isSvl: boolean;
  hasPermission: (key: PermissionKey) => boolean;
}

export type AccessBarrierType = "org-admin" | "permission";

export interface AccessBarrier {
  type: AccessBarrierType;
  requiredPermission?: PermissionKey;
}

export function getAccessBarrier(route: PortalRoute | null, accessInfo: SessionAccessInfo): AccessBarrier | null {
  if (!route) {
    return null;
  }
  if (route.requiresShap && !accessInfo.isShap) {
    return { type: "permission" };
  }
  if (route.hiddenForSvl && accessInfo.isSvl) {
    return { type: "permission" };
  }
  if (accessInfo.isSuperAdmin) {
    return null;
  }
  if (route.requiresOrgAdmin && !accessInfo.isOrgAdmin) {
    return { type: "org-admin" };
  }
  if (route.requiresFacilityAdmin && !accessInfo.isFacilityAdmin) {
    return { type: "org-admin" };
  }
  if (route.requiresSuperAdmin && !accessInfo.isSuperAdmin) {
    return { type: "org-admin" };
  }
  if (route.requiresAwct && !accessInfo.isAwct) {
    return { type: "permission" }; // Generic barrier for now
  }
  if (route.requiredPermission && !accessInfo.hasPermission(route.requiredPermission)) {
    return { type: "permission", requiredPermission: route.requiredPermission };
  }
  return null;
}

export function canAccessRoute(route: PortalRoute | null, accessInfo: SessionAccessInfo): boolean {
  return getAccessBarrier(route, accessInfo) === null;
}

export function filterNavSectionsByAccess(
  sections: PortalNavSection[],
  accessInfo: SessionAccessInfo
): PortalNavSection[] {
  return sections
    .map((section) => {
      const visibleItems = section.items.filter(
        (route) =>
          !route.hideFromNav &&
          canAccessRoute(route, accessInfo) &&
          isRouteModuleEnabled(route)
      );
      return {
        ...section,
        items: visibleItems,
      };
    })
    .filter((section) => section.items.length > 0);
}

function isRouteModuleEnabled(route: PortalRoute) {
  if (!route.moduleKey) return true;
  return isModuleEnabled(route.moduleKey);
}

export const routeMap = routeLookup;
