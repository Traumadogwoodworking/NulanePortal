import { describe, expect, it } from "vitest";
import { resolvePortalBranding } from "@/lib/branding";
import { navSections } from "@/lib/navigation";
import type { PortalSessionResponse } from "@/lib/types";
import { definianProduct, inspectionTracProduct } from "@/portal/products";

describe("portal product structure", () => {
  it("keeps Definian identity and verified Auth0 organization in its product config", () => {
    expect(definianProduct.id).toBe("definianInspection");
    expect(definianProduct.branding.auth0Domain).toBe("definian-inspection.us.auth0.com");
    expect(definianProduct.branding.auth0ClientId).toBe("YRnnNwl2hEYbYIe4jSIYNiE457nEWek4");
    expect(definianProduct.branding.auth0OrganizationId).toBe("org_Da9cTbhrMc9e5tdw");
    expect(definianProduct.branding.sidebarSectionLabelClassName).toContain("text-white");
    expect(definianProduct.publicBranding.portalUrl).toBe("/login");
  });

  it("keeps Inspection-Trac configuration independent from Definian", () => {
    expect(inspectionTracProduct.id).toBe("inspectionTrac");
    expect(inspectionTracProduct.branding.auth0ClientId).not.toBe(
      definianProduct.branding.auth0ClientId,
    );
    expect(inspectionTracProduct.branding.auth0Domain).not.toBe(
      definianProduct.branding.auth0Domain,
    );
    expect(inspectionTracProduct.branding.auth0OrganizationId).not.toBe(
      definianProduct.branding.auth0OrganizationId,
    );
  });

  it("never renders Inspection-Trac identity inside the Definian preset", () => {
    const staleInspectionSession = {
      user: {
        user_id: "test-user",
        email: "inspector@example.com",
        organization_id: "org-stale",
      },
      organization: {
        organization_id: "org-stale",
        name: "Inspection Trac",
      },
    } satisfies PortalSessionResponse;

    const branding = resolvePortalBranding({
      session: staleInspectionSession,
      pathname: "/home",
    });

    expect(branding.mode).toBe("definianInspection");
    expect(branding.appLabel).toBe("Definian Inspection");
    expect(branding.logoUrl).toBe("/media/definian-sidebar-logo-white.png");
  });

  it("exposes the Definian quick start from the signed-in portal navigation", () => {
    const quickStart = navSections.flatMap((section) => section.items).find((item) => item.href === "/quick-start");

    expect(quickStart).toMatchObject({
      label: "Quick Start",
      section: "support",
      icon: "quick-start",
    });
  });
});
