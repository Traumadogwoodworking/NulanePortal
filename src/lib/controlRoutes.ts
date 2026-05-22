import type { PermissionKey } from "./access";

export type ControlRouteGroup = "tenant-admin" | "operations";

export interface ControlRouteDefinition {
  href: string;
  label: string;
  description: string;
  live?: boolean;
  connectionStatus?: "real" | "mixed" | "mocked" | "placeholder" | "scaffold";
  hideFromNav?: boolean;
  group?: ControlRouteGroup;
  requiresOrgAdmin?: boolean;
  requiresSuperAdmin?: boolean;
  requiredPermission?: PermissionKey;
}

export const controlRoutes: ControlRouteDefinition[] = [

  {
    href: "/delivery-rules",
    label: "Delivery Rules",
    description: "Submission and trigger protocol",
    live: true,
    connectionStatus: "mixed",
    group: "tenant-admin",
    requiredPermission: "portal.notifications.manage",
  },
  {
    href: "/control",
    label: "Control",
    description: "Command center",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/overview",
    label: "Overview",
    description: "Health and attention",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/reports",
    label: "Reports",
    description: "Submission command center",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/email",
    label: "Email",
    description: "Outbox and routing",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/organizations",
    label: "Organizations",
    description: "Global tenant inventory",
    live: true,
    connectionStatus: "real",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/users",
    label: "Control Users",
    description: "Global roles and memberships",
    live: true,
    connectionStatus: "real",
    group: "operations",
    hideFromNav: true,
    requiresSuperAdmin: true,
  },
  {
    href: "/control/audit",
    label: "Audit",
    description: "Operator traceability",
    live: true,
    connectionStatus: "real",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/backup",
    label: "Backup Health",
    description: "Config and state persistence",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/operations",
    label: "Operations",
    description: "Release posture and system jobs",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/report-ops",
    label: "Report Ops",
    description: "Report isolation and delivery",
    connectionStatus: "mixed",
    group: "operations",
    hideFromNav: true,
    requiresSuperAdmin: true,
  },
  {
    href: "/control/templates",
    label: "Templates",
    description: "Template catalog and usage",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/integrations",
    label: "Integrations",
    description: "Trust boundaries and status",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/entities",
    label: "Entities",
    description: "Cross-surface operational explorer",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/exceptions",
    label: "Exceptions",
    description: "Diagnostic rollups and anomalies",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/map",
    label: "Map",
    description: "Yard and facility map state",
    live: true,
    connectionStatus: "real",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/vehicles",
    label: "Vehicles",
    description: "YMS vehicle state",
    live: true,
    connectionStatus: "real",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/flags",
    label: "Flags",
    description: "Global feature flags",
    live: true,
    connectionStatus: "scaffold",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/settings",
    label: "Control Settings",
    description: "Layout and safe prefs",
    live: true,
    connectionStatus: "mixed",
    group: "operations",
    requiresSuperAdmin: true,
  },
  {
    href: "/control/orgs",
    label: "Org Aliases",
    description: "Backward-compatible org inventory entry",
    connectionStatus: "real",
    group: "operations",
    hideFromNav: true,
    requiresSuperAdmin: true,
  },
];

export function isControlRoute(pathname: string): boolean {
  return controlRoutes.some((route) => pathname === route.href || pathname.startsWith(`${route.href}/`));
}

export function getControlRouteByPath(pathname: string): ControlRouteDefinition {
  const route = controlRoutes
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return route ?? controlRoutes[0];
}

export function canAccessControlRoute(
  route: ControlRouteDefinition | null,
  accessInfo: {
    isAdmin: boolean;
    isOrgAdmin: boolean;
    isSuperAdmin: boolean;
    hasPermission: (key: PermissionKey) => boolean;
  }
): boolean {
  if (!route) {
    return true;
  }
  if (route.requiresSuperAdmin && !accessInfo.isSuperAdmin) {
    return false;
  }
  if (route.requiresOrgAdmin && !accessInfo.isOrgAdmin && !accessInfo.isAdmin && !accessInfo.isSuperAdmin) {
    return false;
  }
  if (route.requiredPermission && !accessInfo.hasPermission(route.requiredPermission)) {
    return false;
  }
  return true;
}
