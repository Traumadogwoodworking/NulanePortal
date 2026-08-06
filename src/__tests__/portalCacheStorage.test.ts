import { afterEach, describe, expect, it } from "vitest";
import { clearPortalCachedStorage } from "@/lib/portalCacheStorage";

describe("clearPortalCachedStorage", () => {
  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("clears user data caches and organization scope without deleting recoverable drafts", () => {
    window.localStorage.setItem("portalDirectoryCacheV2:user:org:all", "directory");
    window.localStorage.setItem("portalBrandingCache:user:org", "branding");
    window.localStorage.setItem("portalReportsSnapshotCacheV4:user:org", "reports");
    window.localStorage.setItem("docudent_draft", "preserve-me");
    window.sessionStorage.setItem("portalOrganizationScopeV2:user:org", "awct");
    window.sessionStorage.setItem("unrelated-session-value", "preserve-me-too");

    clearPortalCachedStorage();

    expect(window.localStorage.getItem("portalDirectoryCacheV2:user:org:all")).toBeNull();
    expect(window.localStorage.getItem("portalBrandingCache:user:org")).toBeNull();
    expect(window.localStorage.getItem("portalReportsSnapshotCacheV4:user:org")).toBeNull();
    expect(window.sessionStorage.getItem("portalOrganizationScopeV2:user:org")).toBeNull();
    expect(window.localStorage.getItem("docudent_draft")).toBe("preserve-me");
    expect(window.sessionStorage.getItem("unrelated-session-value")).toBe("preserve-me-too");
  });
});
