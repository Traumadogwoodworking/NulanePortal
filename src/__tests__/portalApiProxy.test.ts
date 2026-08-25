import { describe, expect, test } from "vitest";
import {
  buildPortalUpstreamRequestHeaders,
  buildPortalUpstreamUrl,
} from "@/portal/core/server/portalApiProxy";

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

  test("adds the trusted Definian portal context and replaces client-supplied portal headers", () => {
    const request = new Request("https://vercel-portal-exact.vercel.app/api/portal/user/me", {
      headers: {
        authorization: "Bearer redacted",
        referer: "https://attacker.example/",
        "x-portal-request": "0",
        "x-portal-tenant": "nulane",
      },
    });

    const headers = buildPortalUpstreamRequestHeaders(
      request,
      "portal-request-id",
      "definian",
    );

    expect(headers.get("authorization")).toBe("Bearer redacted");
    expect(headers.get("x-portal-request-id")).toBe("portal-request-id");
    expect(headers.get("x-portal-request")).toBe("1");
    expect(headers.get("x-portal-tenant")).toBe("definian");
    expect(headers.get("referer")).toBe("https://www.definian.com/signal");
  });

  test("does not forward client portal identity headers for other portal tenants", () => {
    const request = new Request("https://example.test/api/portal/user/me", {
      headers: {
        "x-portal-request": "1",
        "x-portal-tenant": "definian",
      },
    });

    const headers = buildPortalUpstreamRequestHeaders(request, "portal-request-id", "nulane");

    expect(headers.has("x-portal-request")).toBe(false);
    expect(headers.has("x-portal-tenant")).toBe(false);
    expect(headers.has("referer")).toBe(false);
  });
});
