"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { fetchPortalSession } from "@/lib/services/sessionService";
import type {
  PortalSessionLocation,
  PortalSessionResponse,
  PortalUserRecord,
} from "@/lib/types";
import type { PermissionKey } from "@/lib/access";
import { portalConfig } from "@/lib/config";
import {
  AuthConfigError,
  AuthRedirectError,
  clearPortalAuthStorage,
  logoutPortal,
  persistPortalUser,
  redirectToAuth0Login,
} from "@/lib/portalAuth";

type PortalSessionStatus =
  | "loading"
  | "success"
  | "unauthenticated"
  | "transient-error"
  | "forbidden"
  | "fatal";

type SessionFetchError = Error & { status?: number };

function isSessionFetchError(value: unknown): value is SessionFetchError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as SessionFetchError).status === "number"
  );
}

function normalizeHostname(hostname: string) {
  return hostname.split(":")[0].toLowerCase();
}

function isLocalhostHost(value: string) {
  const normalized = normalizeHostname(value);
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0.0.0.0"
  );
}

function isBrowser() {
  return typeof window !== "undefined";
}

function isDevSessionBypassEnabled() {
  return (
    process.env.NEXT_PUBLIC_PORTAL_DEV_AUTH_BYPASS === "1" ||
    (isBrowser() && (window as DevSessionWindow).__PORTAL_DEV_SESSION_BYPASS__ === true)
  );
}

const LOCAL_DEV_ERROR =
  "Local portal builds must override NEXT_PUBLIC_API_BASE_URL (for example http://localhost:4000/api) before reaching the production API.";
const DEV_SESSION_BYPASS_WARNING =
  "DEV SESSION BYPASS ACTIVE";
let devSessionBypassWarningEmitted = false;

type DevSessionWindow = Window & {
  __PORTAL_DEV_SESSION_BYPASS__?: boolean;
};

function normalizeRoleKey(value: string | undefined | null): string {
  return value?.toString().trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

function buildDevSession(): PortalSessionResponse {
  const roleOverride = typeof window !== "undefined" ? window.localStorage.getItem("portalDevSessionRole") : null;
  const isLimited = roleOverride === "limited";
  return {
    user: {
      user_id: "dev-guest-user",
      display_name: "Guest Operator",
      first_name: "Guest",
      last_name: "Operator",
      email: "guest@nulanesystems.com",
      role: isLimited ? "member" : "super_admin",
      organization_id: "org-awct",
      is_active: true,
      is_free_user: false,
      show_ads: false,
      permissions: isLimited
        ? ["portal.dashboard.view", "portal.reports.view"]
        : [
            "portal.admin",
            "portal.dashboard.view",
            "portal.reports.view",
            "portal.facilities.manage",
            "portal.people.view",
            "portal.notifications.manage",
          ],
      organization_membership: {
        membership_id: "dev-membership",
        user_id: "dev-guest-user",
        organization_id: "org-awct",
        role: isLimited ? "member" : "super_admin",
        is_primary: true,
        is_active: true,
      },
      location_memberships: [
        {
          location_membership_id: "dev-location-membership-west",
          location_id: "loc-001",
          organization_id: "org-awct",
          user_id: "dev-guest-user",
          role: isLimited ? "member" : "super_admin",
          is_active: true,
          is_primary: true,
        },
      ],
      updated_at: new Date().toISOString(),
    },
    organization: {
      organization_id: "org-awct",
      name: "American Wheel & Car",
      type: "admin",
    },
    plan_tier: "enterprise",
    portal_access: true,
    organization_type: "admin",
    requires_ads: false,
    locations: [
      {
        location_id: "loc-001",
        organization_id: "org-awct",
        location_name: "Western Hub",
        location_label: "A-Peak",
        display_name: "Western Hub",
        is_active: true,
      },
      {
        location_id: "loc-002",
        organization_id: "org-awct",
        location_name: "Eastern Yard",
        location_label: "B-Zone",
        display_name: "Eastern Yard",
        is_active: true,
      },
    ],
    selected_location: {
      location_id: "loc-001",
      organization_id: "org-awct",
      location_name: "Western Hub",
      location_label: "A-Peak",
      display_name: "Western Hub",
      is_active: true,
    },
    location_locked: false,
    branding_snapshot: {
      organization_name: "American Wheel & Car",
      logo_url: "/media/Nulane_Systems-removebg-preview-inv.png",
    },
    is_admin: !isLimited,
    timestamp: new Date().toISOString(),
  };
}

const PortalSessionContext = createContext<PortalSessionContextValue | undefined>(undefined);

interface PortalSessionContextValue {
  status: PortalSessionStatus;
  session: PortalSessionResponse | null;
  user: PortalUserRecord | null;
  error: Error | null;
  refetch: () => void;
  logout: () => Promise<void>;
  hasPermission: (key: PermissionKey) => boolean;
  isAdmin: boolean;
  isOrgAdmin: boolean;
  isSuperAdmin: boolean;
  organizationId: string | null;
  isPortalAccessAllowed: boolean;
  portalAccess: boolean;
  isAwct: boolean;
  planTier: string | null;
  requiresAds: boolean;
  locations: PortalSessionLocation[];
  selectedLocation: PortalSessionLocation | null;
  selectedLocationId: string | null;
  selectedLocationLabel: string | null;
  locationLocked: boolean;
  switchOrganization: (orgId: string, orgName: string) => void;
}

export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PortalSessionStatus>("loading");
  const [session, setSession] = useState<PortalSessionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const pathname = usePathname() ?? "/";

  const loadSession = useCallback(async () => {
    if (typeof window === "undefined") return;

    const sessionMode = new URLSearchParams(window.location.search).get("portalDevSession");
    if (
      isDevSessionBypassEnabled() &&
      isLocalhostHost(window.location.hostname) &&
      sessionMode === "unauthenticated"
    ) {
      clearPortalAuthStorage();
      setSession(null);
      setError(null);
      setStatus("unauthenticated");
      return;
    }

    if (isDevSessionBypassEnabled() && !devSessionBypassWarningEmitted) {
      console.warn(DEV_SESSION_BYPASS_WARNING);
      devSessionBypassWarningEmitted = true;
    }

    if (isDevSessionBypassEnabled() && isLocalhostHost(window.location.hostname)) {
      const roleOverride = sessionMode ?? window.localStorage.getItem("portalDevSessionRole");
      if (roleOverride === "unauthenticated") {
        clearPortalAuthStorage();
        setSession(null);
        setError(null);
        setStatus("unauthenticated");
        return;
      }
      const mockSession = buildDevSession();
      persistPortalUser(mockSession.user);
      localStorage.removeItem("portalMockOrgId");
      localStorage.removeItem("portalMockOrgName");
      setSession(mockSession);
      setError(null);
      setStatus("success");
      return;
    }

    if (
      portalConfig.environment !== "production" &&
      portalConfig.usesDefaultApiBase &&
      isLocalhostHost(window.location.hostname)
    ) {
      setError(new Error(LOCAL_DEV_ERROR));
      setStatus("fatal");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const payload = await fetchPortalSession();
      persistPortalUser(payload.user);
      localStorage.removeItem("portalMockOrgId");
      localStorage.removeItem("portalMockOrgName");
      setSession(payload);
      setStatus("success");
    } catch (err: unknown) {
      if (err instanceof AuthRedirectError) {
        setStatus("unauthenticated");
        return;
      }
      if (err instanceof AuthConfigError) {
        setError(err);
        setStatus("fatal");
        return;
      }
      const statusCode = isSessionFetchError(err) ? err.status : undefined;
      if (statusCode === 403) {
        const forbiddenError =
          err instanceof Error
            ? err
            : new Error("Your account is not authorized for this portal.");
        setError(forbiddenError);
        setStatus("forbidden");
        return;
      }
      if (statusCode === 401) {
        clearPortalAuthStorage();
        if (pathname === "/") {
          setSession(null);
          setError(null);
          setStatus("unauthenticated");
          return;
        }
        await redirectToAuth0Login();
        return;
      }
      const normalizedError =
        err instanceof Error ? err : new Error("Unable to load your session.");
      setError(normalizedError);
      setStatus("transient-error");
    }
  }, [pathname]);

  const switchOrganization = useCallback(() => {
    // Dev session bypass uses a fixed tenant snapshot; switching is intentionally inert.
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadSession();
    }, 0);
    return () => clearTimeout(t);
  }, [loadSession]);

  const value = useMemo(() => {
    const userRole = normalizeRoleKey(session?.user?.role);
    const isSuperAdmin = userRole === "super_admin" || userRole === "superadmin";
    const isAdmin = session?.is_admin === true || userRole === "admin" || isSuperAdmin;
    const isOrgAdmin = userRole === "org_admin" || isSuperAdmin;
    const permissions: string[] = Array.isArray(session?.user?.permissions)
      ? session.user.permissions.map((permission) => permission.toString())
      : [];
    const organizationId =
      session?.organization?.organization_id ||
      session?.user?.organization_id ||
      null;
    const sessionLocations = Array.isArray(session?.locations) ? session.locations : [];
    const selectedLocation = session?.selected_location ?? null;
    const selectedLocationId = selectedLocation?.location_id
      ? selectedLocation.location_id.toString()
      : null;
    const selectedLocationLabel =
      selectedLocation?.location_label ||
      selectedLocation?.display_name ||
      selectedLocation?.location_name ||
      null;
    const locationLocked = Boolean(session?.location_locked);
    const planTier = session?.plan_tier ?? null;
    const requiresAds = Boolean(session?.requires_ads);
    const portalAccess = session?.portal_access ?? true;

    const isAwct =
      organizationId === "org-awct" ||
      organizationId === "awct" ||
      session?.organization?.name?.toLowerCase().includes("american wheel") ===
        true;

    const hasPermission = (key: PermissionKey) => {
      if (isAdmin || isOrgAdmin) {
        return true;
      }
      return permissions.includes(key);
    };

    return {
      status,
      session,
      user: session?.user ?? null,
      error,
      refetch: loadSession,
      logout: logoutPortal,
      hasPermission,
      isAdmin,
      isOrgAdmin,
      isSuperAdmin,
      organizationId,
      isPortalAccessAllowed: portalAccess,
      portalAccess,
      isAwct,
      planTier,
      requiresAds,
      locations: sessionLocations,
      selectedLocation,
      selectedLocationId,
      selectedLocationLabel,
      locationLocked,
      switchOrganization,
    };
  }, [status, session, error, loadSession, switchOrganization]);

  return (
    <PortalSessionContext.Provider value={value}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function usePortalSession() {
  const context = useContext(PortalSessionContext);
  if (!context) {
    throw new Error("usePortalSession must be used within a PortalSessionProvider");
  }
  return context;
}
