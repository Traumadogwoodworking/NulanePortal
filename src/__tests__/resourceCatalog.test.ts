import {
  buildFacilityGuide,
  canAccessResourceGuide,
  generalResourceGuides,
  guideHref,
  rankResourceGuides,
  resourceCategories,
  resourceSearchText,
  visibleResourceGuides,
} from "@/components/resources/resourceCatalog";
import type { FacilitySummary } from "@/lib/types";

const facility = {
  id: "facility-1",
  name: "Test Facility",
  slug: "test-facility",
  active: true,
  locationCount: 1,
  yards: [{ yardId: "main", name: "Main Yard", code: "MAIN", active: true }],
} as FacilitySummary;

const operatorAccess = {
  isFacilityAdmin: false,
  isOrgAdmin: false,
  isSuperAdmin: false,
};

describe("resource catalog", () => {
  it("uses stable general and live-facility guide URLs", () => {
    expect(guideHref({ facility: facility.id, task: "facility-start" })).toBe(
      "/resources/guides?facility=facility-1&task=facility-start",
    );
    expect(guideHref({ guide: "start-an-inspection" })).toBe(
      "/resources/guides?guide=start-an-inspection",
    );
  });

  it("retains the smallest ten-guide set and removes every merged guide id", () => {
    expect(JSON.stringify(generalResourceGuides.map((guide) => guide.id))).toBe(
      JSON.stringify([
        "start-an-inspection",
        "complete-damage-inspection",
        "complete-rail-inspection",
        "use-damage-codes",
        "find-and-export-reports",
        "get-account-or-facility-access",
        "manage-facility-registration",
        "manage-users-and-roles",
        "recover-saved-or-queued-report",
        "fix-vin-scanning",
      ]),
    );
    expect(
      generalResourceGuides.some((guide) =>
        [
          "sign-in-and-select-facility",
          "scan-or-enter-vin",
          "complete-no-damage-inspection",
          "record-jumped-chock-evidence",
          "find-submitted-report",
          "export-facility-reports",
          "get-support",
          "manage-facility-access",
          "scanner-or-camera-not-working",
        ].includes(guide.id),
      ),
    ).toBe(false);
  });

  it("publishes the five task groups in priority order", () => {
    expect(
      JSON.stringify(resourceCategories.map((category) => category.title)),
    ).toBe(
      JSON.stringify([
        "Get Started",
        "Complete Inspections",
        "Review Reports",
        "Manage Access",
        "Fix a Problem",
      ]),
    );
    expect(
      JSON.stringify(
        [
          ...new Set(generalResourceGuides.map((guide) => guide.category)),
        ].sort(),
      ),
    ).toBe(
      JSON.stringify(resourceCategories.map((category) => category.id).sort()),
    );
  });

  it("uses only Where, actions, Done, and Problem in every guide", () => {
    for (const guide of generalResourceGuides) {
      expect(Boolean(guide.where)).toBe(true);
      expect(Boolean(guide.steps.length)).toBe(true);
      expect(Boolean(guide.done)).toBe(true);
      expect(Boolean(guide.problem)).toBe(true);
      expect("sections" in guide).toBe(false);
    }
  });

  it("builds a minimal facility guide from canonical facility data", () => {
    const guide = buildFacilityGuide(facility, {
      organizationId: "org-1",
      organizationName: "Example Organization",
      facilityId: facility.id,
      facilityName: facility.name,
      facilityLabel: facility.name,
      slug: facility.slug,
      enabled: true,
      available: true,
      defaultRoleId: "role-1",
      defaultRoleKey: "user",
      defaultRoleName: "User",
      registrationUrl:
        "https://portal.example/join/?facility=test-facility",
      onboardingDisplayName: facility.name,
      support: { email: "support@nulanesystems.com" },
      stores: {},
      packetRevision: 2,
      packetUpdatedAt: null,
      lastSuccessfulEnrollment: null,
      recentEnrollments: [],
      globalEnabled: true,
      updatedAt: null,
    });

    expect(guide.title).toBe("Test Facility Quick Start");
    expect(guide.where).toBe("Portal → Resources → Test Facility");
    expect(resourceSearchText(guide)).toContain("Main Yard");
    expect(resourceSearchText(guide)).toContain(
      "https://portal.example/join/?facility=test-facility",
    );
    expect(resourceSearchText(guide).includes("Scan the VIN")).toBe(false);
    expect(resourceSearchText(guide).includes("Review Report")).toBe(false);
  });

  it("does not publish an inherited customer packet for an ordinary facility", () => {
    const guide = buildFacilityGuide({
      id: "facility-example",
      name: "Example Facility",
      slug: "example-facility",
      active: true,
      locationCount: 1,
      yards: [
        {
          yardId: "yard-example",
          name: "Main",
          code: "MAIN",
          active: true,
        },
      ],
    } as FacilitySummary);

    expect(guide.quickStart).toBeUndefined();
    expect(guide.registrationUrl).toBeUndefined();
    expect(guide.title).toBe("Example Facility Quick Start");
    expect(resourceSearchText(guide).includes("Auth0")).toBe(false);
    expect(resourceSearchText(guide)).toContain("Main");
    expect(resourceSearchText(guide)).not.toMatch(/Inspection[- ]Trac|Chicago Heights|AWCT|JNAP|SHAP/i);
  });

  it("indexes task titles, terminology, facilities, and troubleshooting topics", () => {
    const guides = [...generalResourceGuides, buildFacilityGuide(facility)];
    expect(rankResourceGuides(guides, "scanner")[0]?.id).toBe(
      "fix-vin-scanning",
    );
    expect(rankResourceGuides(guides, "report")[0]?.id).toBe(
      "find-and-export-reports",
    );
    expect(rankResourceGuides(guides, "rail")[0]?.id).toBe(
      "complete-rail-inspection",
    );
    expect(rankResourceGuides(guides, "offline")[0]?.id).toBe(
      "recover-saved-or-queued-report",
    );
    expect(rankResourceGuides(guides, "Test Facility")[0]?.facilityId).toBe(
      facility.id,
    );
  });

  it("returns an operator guide for representative workflow terms", () => {
    const guides = visibleResourceGuides(operatorAccess);
    for (const query of [
      "VIN",
      "inspection",
      "damage",
      "rail",
      "chock",
      "report",
      "login",
      "facility",
      "registration",
      "scanner",
      "photo",
      "upload",
      "offline",
      "submit",
    ]) {
      expect(Boolean(rankResourceGuides(guides, query).length)).toBe(true);
    }
  });

  it("hides administrator procedures from operators and blocks direct access", () => {
    const adminGuide = generalResourceGuides.find(
      (guide) => guide.id === "manage-facility-registration",
    );
    expect(Boolean(adminGuide)).toBe(true);
    expect(canAccessResourceGuide(adminGuide!, operatorAccess)).toBe(false);
    expect(visibleResourceGuides(operatorAccess).includes(adminGuide!)).toBe(
      false,
    );
    expect(
      canAccessResourceGuide(adminGuide!, {
        ...operatorAccess,
        isFacilityAdmin: true,
      }),
    ).toBe(true);
  });

  it("keeps damage-code provenance explicit without claiming a bundled standard", () => {
    const guide = generalResourceGuides.find(
      (item) => item.id === "use-damage-codes",
    );
    expect(guide?.referenceNote).toContain(
      "not an independently verified reproduction",
    );
    expect(resourceSearchText(guide!)).toContain("AIAG/M-22");
  });

  it("documents the source-backed railcar and chock fields in one guide", () => {
    const text = resourceSearchText(
      generalResourceGuides.find(
        (guide) => guide.id === "complete-rail-inspection",
      )!,
    );
    expect(/railcar number/i.test(text)).toBe(true);
    expect(/deck A or B/i.test(text)).toBe(true);
    expect(/vehicle spot/i.test(text)).toBe(true);
    expect(/chock system\/code/i.test(text)).toBe(true);
    expect(/required chock photograph/i.test(text)).toBe(true);
  });
});
