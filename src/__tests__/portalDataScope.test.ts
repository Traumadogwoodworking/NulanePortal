import { describe, expect, it } from "vitest";

import {
  getPortalDirectorySnapshotKey,
  getPortalReportsSnapshotKey,
  getPortalUserOrganizationCacheScope,
} from "@/lib/portalData";

describe("portal user and organization data scopes", () => {
  it("builds persistent cache scopes from both the user and organization", () => {
    expect(getPortalUserOrganizationCacheScope(" org-1 ", " user-1 ")).toBe("user-1:org-1");
    expect(getPortalUserOrganizationCacheScope("org-1", "user-2")).toBe("user-2:org-1");
    expect(getPortalUserOrganizationCacheScope("org-2", "user-1")).toBe("user-1:org-2");
  });

  it("does not create a sensitive cache scope without both identities", () => {
    expect(getPortalUserOrganizationCacheScope("org-1", null)).toBeNull();
    expect(getPortalUserOrganizationCacheScope(null, "user-1")).toBeNull();
    expect(getPortalUserOrganizationCacheScope("org-1", "   ")).toBeNull();
  });

  it("uses distinct directory SWR keys for users in the same organization", () => {
    expect(getPortalDirectorySnapshotKey("org-1", "user-1")).toEqual([
      "portal",
      "user-1",
      "org-1",
      "directory",
      "v2",
    ]);
    expect(getPortalDirectorySnapshotKey("org-1", "user-2")).not.toEqual(
      getPortalDirectorySnapshotKey("org-1", "user-1")
    );
    expect(getPortalDirectorySnapshotKey("org-1", null)).toBeNull();
  });

  it("uses distinct RSA report snapshot SWR keys for users in the same organization", () => {
    expect(getPortalReportsSnapshotKey("org-1", "auth0|user:1")).toEqual([
      "portal",
      "auth0|user:1",
      "org-1",
      "reports",
      "snapshot",
      "v5",
    ]);
    expect(getPortalReportsSnapshotKey("org-1", "user-2")).not.toEqual(
      getPortalReportsSnapshotKey("org-1", "user-1")
    );
    expect(getPortalReportsSnapshotKey("org-1", undefined)).toBeNull();
  });
});
