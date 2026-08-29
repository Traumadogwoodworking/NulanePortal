import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { resolvePortalBranding } from "@/lib/branding";
import {
  ACTIVE_PORTAL_BRANDING,
  getPortalBrandingPreset,
} from "@/lib/brandingPresets";

describe("DocuDent portal product contract", () => {
  test("uses the Nulane Systems shell and the real DocuDent product mark", () => {
    const preset = getPortalBrandingPreset(ACTIVE_PORTAL_BRANDING);

    expect(ACTIVE_PORTAL_BRANDING).toBe("docudent");
    expect(preset.defaultOrganizationName).toBe("Nulane Systems");
    expect(preset.defaultLogoUrl).toBe("/media/Nulane_Systems-removebg-preview-inv.png");
    expect(preset.appNavLabel).toBe("DocuDent");
    expect(preset.appNavLogoUrl).toBe("/media/Docudent.png");
    expect(preset.allowSnapshotLogoOverride).toBe(false);
  });

  test("does not let session tenant branding override product identity", () => {
    const branding = resolvePortalBranding({
      pathname: "/home",
      session: {
        user: { user_id: "review-user", organization_id: "external-org" },
        organization: { organization_id: "external-org", name: "External organization" },
      },
    });

    expect(branding.organizationName).toBe("Nulane Systems");
    expect(branding.appLabel).toBe("DocuDent");
    expect(branding.appNavLogoUrl).toBe("/media/Docudent.png");
  });

  test("root enters the authenticated portal flow", () => {
    const rootPage = readFileSync(join(process.cwd(), "src/app/page.tsx"), "utf8");
    const routeShell = readFileSync(
      join(process.cwd(), "src/components/RootRouteShell.tsx"),
      "utf8",
    );

    expect(rootPage).toContain('redirect("/home")');
    expect(rootPage).not.toContain("PublicLanding");
    expect(routeShell).not.toMatch(/path === ["']\/["']/);
  });

  test("uses the edge-aligned, single-theme operational shell", () => {
    const layout = readFileSync(
      join(process.cwd(), "src/components/PortalLayoutShell.tsx"),
      "utf8",
    );
    const sidebar = readFileSync(
      join(process.cwd(), "src/components/PortalSidebar.tsx"),
      "utf8",
    );
    const topBar = readFileSync(
      join(process.cwd(), "src/components/PortalTopBar.tsx"),
      "utf8",
    );
    const home = readFileSync(join(process.cwd(), "src/app/home/page.tsx"), "utf8");
    const visualSources = [
      layout,
      sidebar,
      topBar,
      home,
      readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8"),
      readFileSync(join(process.cwd(), "src/components/ui/Card.tsx"), "utf8"),
    ].join("\n");

    expect(layout).not.toContain('className="flex h-screen overflow-hidden bg-[color:var(--bg)] p-4"');
    expect(sidebar).not.toContain('aria-label="Current product"');
    expect(topBar).not.toContain("Nulane Systems");
    expect(home).toContain("<HomeDashboard />");
    expect(visualSources).not.toMatch(/brand-glow|radial-gradient|backdrop-blur|blur-3xl/);
  });

  test("active configuration has only DocuDent and Nulane service defaults", () => {
    const source = [
      "src/lib/config.ts",
      "src/lib/portalAuth.ts",
      "src/lib/brandingPresets.ts",
      "src/lib/publicBranding.ts",
      "src/lib/navigation.ts",
      ".env.docudent.example",
    ]
      .map((file) => readFileSync(join(process.cwd(), file), "utf8"))
      .join("\n");

    expect(source).toContain("DocuDent");
    expect(source).toContain("Nulane Systems");
    expect(source).not.toMatch(/Inspection[- ]Trac/i);
    expect(source).not.toMatch(/\b(?:AWCT|JNAP|SHAP|Definian)\b/i);
    expect(source).not.toMatch(/Circle Logistics/i);
    expect(source).toContain(
      "NEXT_PUBLIC_AUTH0_CLIENT_ID=eijyn4526jk7DKPnAYVh6fjKOJ3DVvSX",
    );
    expect(source).not.toMatch(/^NEXT_PUBLIC_AUTH0_ORGANIZATION_ID=/m);
  });
});
