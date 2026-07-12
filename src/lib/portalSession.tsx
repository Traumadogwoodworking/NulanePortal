"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { fetchPortalSession } from "@/lib/services/sessionService";
import type {
  PortalSessionLocation,
  PortalSessionResponse,
  PortalUserRecord,
} from "@/lib/types";
import type { PermissionKey } from "@/lib/access";
import {
  AuthConfigError,
  AuthRedirectError,
  clearFreshAuthCallbackMarker,
  clearStalePortalSession,
  clearPortalAuthStorage,
  hasPersistedPortalToken,
  isFreshAuthCallback,
  isEmbeddedPortalContext,
  logAuthFlow,
  logoutPortal,
  persistPortalUser,
} from "@/lib/portalAuth";
import { publicBranding } from "@/lib/publicBranding";

type PortalSessionStatus =
  | "loading"
  | "authenticating"
  | "success"
  | "unauthenticated"
  | "session_error"
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

const DEV_SESSION_BYPASS_WARNING =
  "DEV SESSION BYPASS ACTIVE";
let devSessionBypassWarningEmitted = false;
const FRESH_CALLBACK_SESSION_RETRY_DELAY_MS = 750;

type DevSessionWindow = Window & {
  __PORTAL_DEV_SESSION_BYPASS__?: boolean;
};

function normalizeRoleKey(value: string | undefined | null): string {
  return value?.toString().trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

function normalizeOrganizationKey(value: string | undefined | null): string {
  return value?.toString().trim().toLowerCase().replace(/[\s_-]+/g, " ") ?? "";
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
      logo_url: publicBranding.logoPath,
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
  isFacilityAdmin: boolean;
  isSuperAdmin: boolean;
  organizationId: string | null;
  isPortalAccessAllowed: boolean;
  portalAccess: boolean;
  isAwct: boolean;
  isShap: boolean;
  isSvl: boolean;
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
  const freshCallbackRetryCountRef = useRef(0);
  const pathname = usePathname() ?? "/";

  const loadSession = useCallback(async () => {
    if (typeof window === "undefined") return;
    logAuthFlow("PortalSessionProvider.loadSession", {
      reason: "start",
      status,
      tokenExists: hasPersistedPortalToken(),
    });

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

    setStatus("loading");
    setError(null);

    try {
      const payload = await fetchPortalSession();
      persistPortalUser(payload.user);
      localStorage.removeItem("portalMockOrgId");
      localStorage.removeItem("portalMockOrgName");
      const organizationResolved = Boolean(
        payload.organization?.organization_id || payload.user?.organization_id
      );
      if (!organizationResolved) {
        setSession(payload);
        setError(new Error("Signed in, but no portal organization was resolved for this account."));
        setStatus("session_error");
        logAuthFlow("PortalSessionProvider.loadSession", {
          reason: "missing_organization",
          status: "session_error",
          tokenExists: hasPersistedPortalToken(),
          organizationResolved: false,
        });
        return;
      }
      setSession(payload);
      clearFreshAuthCallbackMarker();
      freshCallbackRetryCountRef.current = 0;
      setStatus("success");
      logAuthFlow("PortalSessionProvider.loadSession", {
        reason: "success",
        status: "success",
        tokenExists: hasPersistedPortalToken(),
        organizationResolved,
      });
    } catch (err: unknown) {
      if (err instanceof AuthRedirectError) {
        logAuthFlow("PortalSessionProvider.loadSession", {
          reason: "auth_redirect_error",
          status: "unauthenticated",
          tokenExists: hasPersistedPortalToken(),
        });
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
        const tokenExists = hasPersistedPortalToken();
        if (tokenExists && isFreshAuthCallback() && freshCallbackRetryCountRef.current < 2) {
          freshCallbackRetryCountRef.current += 1;
          logAuthFlow("PortalSessionProvider.loadSession", {
            reason: "fresh_callback_session_401_retry",
            httpStatus: 401,
            status,
            tokenExists,
            redirectTarget: pathname,
            retryCount: freshCallbackRetryCountRef.current,
          });
          setStatus("authenticating");
          await new Promise((resolve) => {
            window.setTimeout(resolve, FRESH_CALLBACK_SESSION_RETRY_DELAY_MS);
          });
          return loadSession();
        }
        freshCallbackRetryCountRef.current = 0;
        if (!tokenExists) {
          clearStalePortalSession("session_401");
        }
        clearFreshAuthCallbackMarker();
        logAuthFlow("PortalSessionProvider.loadSession", {
          reason: "session_401",
          httpStatus: 401,
          status,
          tokenExists,
          redirectTarget: pathname,
        });
        setSession(null);
        setError(
          new Error(
            tokenExists
              ? "Signed in, but the portal API rejected this account session."
              : "No active portal session was found."
          )
        );
        if (isEmbeddedPortalContext()) {
          setStatus("unauthenticated");
          return;
        }
        if (tokenExists) {
          setStatus("session_error");
          return;
        }
        if (pathname === "/") {
          setStatus("unauthenticated");
          return;
        }
        setStatus("unauthenticated");
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
    const sessionRoles = [
      normalizeRoleKey(session?.user?.role),
      normalizeRoleKey(session?.user?.organization_membership?.role),
    ].filter(Boolean);
    const hasSessionRole = (role: string) => sessionRoles.includes(role);
    const isSuperAdmin = hasSessionRole("super_admin") || hasSessionRole("superadmin");
    const isOrgAdmin = hasSessionRole("org_admin") || hasSessionRole("orgadmin") || isSuperAdmin;
    const isFacilityAdmin = hasSessionRole("facility_admin") || hasSessionRole("facilityadmin") || isOrgAdmin;
    const isAdmin = session?.is_admin === true || hasSessionRole("admin") || isSuperAdmin;
    const permissions: string[] = Array.isArray(session?.user?.permissions)
      ? session.user.permissions.map((permission) => permission.toString())
      : [];
    const organizationId =
      session?.organization?.organization_id ||
      session?.user?.organization_id ||
      null;
    const sessionLocations = Array.isArray(session?.locations) ? session.locations : [];
    const assignedLocations = [
      session?.locations,
      session?.facilities,
      session?.available_locations,
      session?.availableLocations,
      session?.available_facilities,
      session?.availableFacilities,
    ].flatMap((locations) => (Array.isArray(locations) ? locations : []));
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

    const normalizedOrganizationName = normalizeOrganizationKey(session?.organization?.name ?? null);
    const isAwct =
      normalizedOrganizationName === "american wheel & car" ||
      normalizedOrganizationName === "awct.inc" ||
      normalizedOrganizationName === "awc.inc" ||
      normalizedOrganizationName === "inspection trac" ||
      normalizedOrganizationName === "inspection track" ||
      normalizedOrganizationName === "inspection_trac" ||
      normalizedOrganizationName === "inspection-track" ||
      normalizedOrganizationName === "signature vehicle logistics";
    const locationLabels = [
      selectedLocationLabel,
      ...assignedLocations.flatMap((location) => [
        location.location_label,
        location.display_name,
        location.location_name,
      ]),
    ]
      .filter(Boolean)
      .map((value) => normalizeOrganizationKey(value?.toString() ?? ""));
    const isShap =
      normalizedOrganizationName === "shap" ||
      normalizedOrganizationName.includes("shap") ||
      locationLabels.some((label) => label === "shap" || label.includes("shap"));
    const isSvl =
      normalizedOrganizationName === "signature vehicle logistics" ||
      normalizedOrganizationName === "svl" ||
      locationLabels.some(
        (label) =>
          label === "svl" ||
          label.includes("signature vehicle logistics") ||
          /(^|\s)svl($|\s)/.test(label)
      );

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
      isFacilityAdmin,
      isSuperAdmin,
      organizationId,
      isPortalAccessAllowed: portalAccess,
      portalAccess,
      isAwct,
      isShap,
      isSvl,
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
