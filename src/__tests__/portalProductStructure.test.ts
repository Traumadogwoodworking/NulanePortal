import { describe, expect, it } from "vitest";
import { definianProduct, inspectionTracProduct } from "@/portal/products";

describe("portal product structure", () => {
  it("keeps Definian identity and embedded Auth0 organization in its product config", () => {
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
});
