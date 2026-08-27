import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";

describe("DocuDent portal product contract", () => {
  test("defaults to DocuDent and retains the Nulane company mark", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PORTAL_BRANDING", "");

    const { ACTIVE_PORTAL_BRANDING, getPortalBrandingPreset } = await import("@/lib/brandingPresets");
    const preset = getPortalBrandingPreset(ACTIVE_PORTAL_BRANDING);

    expect(ACTIVE_PORTAL_BRANDING).toBe("docudent");
    expect(preset.appNavLabel).toBe("DocuDent");
    expect(preset.defaultLogoUrl).toBe("/media/Docudent.png");
    expect(preset.footerLogoUrl).toBe("/media/powered_by_colorful.png");
  });

  test("does not let Inspection-Trac customer names override DocuDent identity", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_PORTAL_BRANDING", "docudent");
    const { resolvePortalBranding } = await import("@/lib/branding");
    const branding = resolvePortalBranding({
      pathname: "/home",
      session: {
        user: { user_id: "user-1", email: "person@example.com", organization_id: "org-legacy" },
        organization: { organization_id: "org-legacy", name: "AWCT.inc" },
      },
    });

    expect(branding.mode).toBe("docudent");
    expect(branding.appLabel).toBe("DocuDent");
    expect(branding.appNavLogoUrl).toBe("/media/Docudent.png");
    expect(branding.logoUrl).not.toContain("inspection-trac");
  });

  test("contains no Inspection-Trac endpoint or identity default in active configuration seams", () => {
    const files = [
      "src/lib/config.ts",
      "src/lib/portalAuth.ts",
    ];
    const forbidden = [
      /inspection-trac\.us\.auth0\.com/i,
      /nulanesystems\.com\/inspection-trac/i,
      /NEXT_PUBLIC_INSPECTION_TRAC_API/i,
      /com\.nulanesystems\.inspectiontrac/i,
      /\b(?:AWCT|JNAP|SHAP)\b/i,
      /\/reports\/rsa/i,
      /\/inspection\/24-hour/i,
      /inspectiontrac:\/\//i,
    ];

    const violations = files.flatMap((file) => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      return forbidden
        .filter((pattern) => pattern.test(source))
        .map((pattern) => `${file}: ${pattern.source}`);
    });

    const navigation = readFileSync(join(process.cwd(), "src/lib/navigation.ts"), "utf8");
    const activeRoutes = navigation.slice(
      navigation.indexOf("const portalRoutes"),
      navigation.indexOf("const sectionOrder"),
    );
    for (const pattern of forbidden) {
      if (pattern.test(activeRoutes)) violations.push(`src/lib/navigation.ts: ${pattern.source}`);
    }

    expect(violations).toEqual([]);
  });

  test("keeps facility onboarding generic and DocuDent branded", () => {
    const files = [
      "src/app/join/FacilityJoinClient.tsx",
      "src/components/facilities/FacilityQuickStartActions.tsx",
      "src/components/facilities/facilityStartupGuideContent.json",
    ];
    const source = files.map((file) => readFileSync(join(process.cwd(), file), "utf8")).join("\n");

    expect(source).toContain("DocuDent");
    expect(source).toContain("docudent://");
    expect(source).not.toMatch(/Inspection[- ]Trac/i);
    expect(source).not.toMatch(/\b(?:AWCT|JNAP|SHAP|Chicago Heights)\b/i);
  });

  test("keeps facility registration disabled until target API proof explicitly enables it", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_DOCUDENT_FACILITY_ONBOARDING_ENABLED", "false");
    const onboarding = await import("@/lib/services/facilityOnboardingService");

    expect(onboarding.isDocuDentFacilityOnboardingEnabled()).toBe(false);
    await expect(onboarding.fetchPublicFacilityRegistration("example-facility")).rejects.toMatchObject({
      code: "DOCUDENT_REGISTRATION_UNVERIFIED",
    });
  });
});
