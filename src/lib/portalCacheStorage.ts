export const DIRECTORY_CACHE_KEY_PREFIX = "portalDirectoryCacheV2";
export const BRANDING_CACHE_KEY_PREFIX = "portalBrandingCache";
export const REPORTS_CACHE_KEY_PREFIX = "portalReportsSnapshotCacheV4";
export const DASHBOARD_ANALYTICS_CACHE_KEY_PREFIX = "portalDashboardAnalyticsCacheV2";
export const HOME_ANALYTICS_SNAPSHOT_CACHE_KEY_PREFIX = "portalHomeAnalyticsSnapshotCacheV1";
export const CONTROL_CACHE_KEY_PREFIX = "portalControlCache";
export const EMAIL_MEMBERS_CACHE_KEY_PREFIX = "portalEmailMembersCache";

const LEGACY_CACHE_KEY_PREFIXES = ["portalDirectoryCache"];
const SESSION_SCOPE_STORAGE_KEY = "portalOrganizationScopeV2";

const PORTAL_CACHE_KEY_PREFIXES = [
  DIRECTORY_CACHE_KEY_PREFIX,
  BRANDING_CACHE_KEY_PREFIX,
  REPORTS_CACHE_KEY_PREFIX,
  DASHBOARD_ANALYTICS_CACHE_KEY_PREFIX,
  HOME_ANALYTICS_SNAPSHOT_CACHE_KEY_PREFIX,
  CONTROL_CACHE_KEY_PREFIX,
  EMAIL_MEMBERS_CACHE_KEY_PREFIX,
  ...LEGACY_CACHE_KEY_PREFIXES,
];

function isPortalCacheKey(key: string) {
  return PORTAL_CACHE_KEY_PREFIXES.some(
    (prefix) => key === prefix || key.startsWith(`${prefix}:`)
  );
}

export function clearPortalCachedStorage() {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (
          key &&
          (key === SESSION_SCOPE_STORAGE_KEY ||
            key.startsWith(`${SESSION_SCOPE_STORAGE_KEY}:`) ||
            isPortalCacheKey(key))
        ) {
          storage.removeItem(key);
        }
      }
    } catch {
      // Storage may be unavailable in private or hardened browser contexts.
    }
  }
}
