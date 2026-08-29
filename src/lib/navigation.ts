import { isModuleEnabled, type ModuleToggleKey } from "@/lib/modules";

export type RouteSectionKey = "core";

export interface PortalRoute {
  label: string;
  href: string;
  description: string;
  section: RouteSectionKey;
  icon: "home" | "reports" | "support" | "settings";
  moduleKey?: ModuleToggleKey;
}

export interface PortalNavSection {
  key: RouteSectionKey;
  title: string;
  items: PortalRoute[];
}

const portalRoutes: PortalRoute[] = [
  {
    label: "Home",
    href: "/home",
    description: "DocuDent operational overview",
    section: "core",
    icon: "home",
  },
  {
    label: "Damage Submissions",
    href: "/reports/damage",
    description: "Review DocuDent damage submissions",
    section: "core",
    icon: "reports",
    moduleKey: "reports",
  },
  {
    label: "Support Tickets",
    href: "/support",
    description: "Request Nulane Systems support",
    section: "core",
    icon: "support",
  },
  {
    label: "Settings",
    href: "/settings",
    description: "Account and workspace settings",
    section: "core",
    icon: "settings",
  },
];

export const navSections: PortalNavSection[] = [
  { key: "core", title: "Navigation", items: portalRoutes },
];

const routeLookup = portalRoutes.reduce<Record<string, PortalRoute>>((routes, route) => {
  routes[route.href] = route;
  return routes;
}, {});

export function getRouteByPath(pathname: string): PortalRoute | null {
  if (pathname === "/") return routeLookup["/home"];
  if (routeLookup[pathname]) return routeLookup[pathname];
  return (
    portalRoutes
      .slice()
      .sort((a, b) => b.href.length - a.href.length)
      .find((route) => pathname.startsWith(route.href)) ?? null
  );
}

export interface SessionAccessInfo {
  isPortalAccessAllowed: boolean;
}

export type AccessBarrierType = "org-admin" | "permission";

export interface AccessBarrier {
  type: AccessBarrierType;
}

export function getAccessBarrier(
  route: PortalRoute | null,
  accessInfo: SessionAccessInfo,
): AccessBarrier | null {
  if (!route) return null;
  if (!accessInfo.isPortalAccessAllowed) return { type: "permission" };
  return null;
}

export function canAccessRoute(
  route: PortalRoute | null,
  accessInfo: SessionAccessInfo,
): boolean {
  return getAccessBarrier(route, accessInfo) === null;
}

export function filterNavSectionsByAccess(
  sections: PortalNavSection[],
  accessInfo: SessionAccessInfo,
): PortalNavSection[] {
  return sections.map((section) => ({
    ...section,
    items: section.items.filter(
      (route) => canAccessRoute(route, accessInfo) && (!route.moduleKey || isModuleEnabled(route.moduleKey)),
    ),
  }));
}

export const routeMap = routeLookup;
