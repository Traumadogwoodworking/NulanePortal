import { describe, expect, it } from "vitest";
import { resolvePortalBranding } from "@/lib/branding";
import { navSections } from "@/lib/navigation";
import type { PortalSessionResponse } from "@/lib/types";
import { definianProduct, inspectionTracProduct } from "@/portal/products";

describe("portal product structure", () => {
  it("keeps Definian identity and verified Auth0 organization in its product config", () => {
    expect(definianProduct.id).toBe("definianInspection");
    expect(definianProduct.branding.auth0ClientId).toBe("WkYT29HkNJo5rjDMPGTxAdb04QdKQsPc");
    expect(definianProduct.branding.auth0OrganizationId).toBe("org_GRicZ7Jqg1r3aerr");
    expect(definianProduct.publicBranding.portalUrl).toBe("/login");
  });

  it("keeps Inspection-Trac configuration independent from Definian", () => {
    expect(inspectionTracProduct.id).toBe("inspectionTrac");
    expect(inspectionTracProduct.branding.auth0ClientId).not.toBe(
      definianProduct.branding.auth0ClientId,
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
