import { describe, expect, test } from "vitest";
import {
  INSPECTION_TRAC_POWER_BI_EMBED_URL,
  SIGNATURE_VL_POWER_BI_EMBED_URL,
  resolvePortalBranding,
} from "@/lib/branding";
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

describe("Power BI dashboard selection", () => {
  test("uses the Signature Vehicle Logistics dashboard for any signaturevl.com user", () => {
    const branding = resolvePortalBranding({
      session: buildSession("Will.Hicks@signaturevl.com"),
      pathname: "/dashboard",
    });

    expect(branding.powerBiEmbedUrl).toBe(SIGNATURE_VL_POWER_BI_EMBED_URL);
  });

  test("matches the email domain case-insensitively", () => {
    const branding = resolvePortalBranding({
      session: buildSession("another.user@SIGNATUREVL.COM"),
      pathname: "/dashboard",
    });

    expect(branding.powerBiEmbedUrl).toBe(SIGNATURE_VL_POWER_BI_EMBED_URL);
  });

  test.each(["snidermatthew423@gmail.com", "snidermatthew424@gmail.com"])(
    "uses the Signature Vehicle Logistics dashboard for authorized Gmail address %s",
    (email) => {
      const branding = resolvePortalBranding({
        session: buildSession(email),
        pathname: "/dashboard",
      });

      expect(branding.powerBiEmbedUrl).toBe(SIGNATURE_VL_POWER_BI_EMBED_URL);
    }
  );

  test("keeps the organization dashboard for other email domains", () => {
    const branding = resolvePortalBranding({
      session: buildSession("another.user@gmail.com"),
      pathname: "/dashboard",
    });

    expect(branding.powerBiEmbedUrl).toBe(INSPECTION_TRAC_POWER_BI_EMBED_URL);
  });
});
