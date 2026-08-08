import { describe, expect, test } from "vitest";
import { buildPortalUpstreamUrl } from "@/portal/core/server/portalApiProxy";

describe("portal API proxy URL construction", () => {
  test("preserves the upstream API prefix, encoded path, and query", () => {
    const target = buildPortalUpstreamUrl(
      "https://api.nulanesystems.com/api",
      ["organizations", "org id", "locations"],
      "?active=true",
    );

    expect(target.toString()).toBe(
      "https://api.nulanesystems.com/api/organizations/org%20id/locations?active=true",
    );
  });
});
