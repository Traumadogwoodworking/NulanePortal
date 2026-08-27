import { describe, expect, test } from "vitest";
import { resolvePortalBranding } from "@/lib/branding";
import type { PortalSessionResponse } from "@/lib/types";

function buildSession(email: string): PortalSessionResponse {
  return {
    user: {
      user_id: "test-user",
      email,
      organization_id: "org-awct",
    },
    organization: {
      organization_id: "org-awct",
      name: "AWCT.inc",
    },
  };
}

describe("DocuDent Power BI dashboard selection", () => {
  test("does not inherit a dashboard from an email domain", () => {
    const branding = resolvePortalBranding({
      session: buildSession("Will.Hicks@signaturevl.com"),
      pathname: "/dashboard",
    });

    expect(branding.powerBiEmbedUrl).toBeNull();
  });
});
