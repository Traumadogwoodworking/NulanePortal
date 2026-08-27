import { withPortalBasePath } from "@/lib/config";
import type { FacilitySummary, PortalSessionLocation } from "@/lib/types";

export interface FacilityQuickStartContent {
  title: string;
  purpose: string;
  registrationUrl: string;
  steps: string[];
  done: string;
  support: {
    displayName: string;
    email: string;
    instruction: string;
  };
  facility: {
    name: string;
    registrationSlug: string;
    ids: string[];
    codes?: string[];
    yards: Array<{
      yardId: string;
      name: string;
      code: string;
    }>;
  };
}

export interface FacilityQuickStartAsset extends FacilityQuickStartContent {
  url: string;
}

export interface FacilityQuickStartIdentity {
  slug?: string | null;
  id?: string | null;
  code?: string | null;
}

// Published guides must be generated from authoritative DocuDent facility
// records. Inspection-Trac customer packets are intentionally not inherited.
const quickStartContent: FacilityQuickStartContent[] = [];

function normalizeIdentity(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function pdfPath(content: FacilityQuickStartContent) {
  const slug = content.facility.registrationSlug;
  return `/resources/${slug}/${slug}-quick-start.pdf`;
}

function withAssetUrl(
  content: FacilityQuickStartContent,
): FacilityQuickStartAsset {
  return {
    ...content,
    url: withPortalBasePath(pdfPath(content)),
  };
}

function identityForSessionLocation(
  location: PortalSessionLocation,
): FacilityQuickStartIdentity {
  const metadataSlug =
    typeof location.metadata?.slug === "string" ? location.metadata.slug : null;
  return {
    slug: metadataSlug,
    id: location.location_id,
  };
}

export function getFacilityQuickStartAsset(
  identity?: FacilityQuickStartIdentity | string | null,
): FacilityQuickStartAsset | null {
  const resolvedIdentity =
    typeof identity === "string" ? { slug: identity } : (identity ?? {});
  const slug = normalizeIdentity(resolvedIdentity.slug);
  const id = normalizeIdentity(resolvedIdentity.id);
  const code = normalizeIdentity(resolvedIdentity.code);

  const content =
    quickStartContent.find(
      (item) => normalizeIdentity(item.facility.registrationSlug) === slug,
    ) ??
    quickStartContent.find((item) =>
      item.facility.ids.some((itemId) => normalizeIdentity(itemId) === id),
    ) ??
    quickStartContent.find((item) =>
      (item.facility.codes ?? []).some(
        (itemCode) => normalizeIdentity(itemCode) === code,
      ),
    );

  return content ? withAssetUrl(content) : null;
}

function canonicalFacilitySummary(
  content: FacilityQuickStartContent,
): FacilitySummary {
  return {
    id: content.facility.ids[0],
    name: content.facility.name,
    slug: content.facility.registrationSlug,
    active: true,
    locationCount: 1,
    yards: content.facility.yards.map((yard) => ({
      ...yard,
      active: true,
    })) as FacilitySummary["yards"],
  };
}

export function getPublishedQuickStartFacilities(
  directoryFacilities: readonly FacilitySummary[] = [],
  sessionLocations: readonly PortalSessionLocation[] = [],
): FacilitySummary[] {
  return quickStartContent.map((content) => {
    const asset = withAssetUrl(content);
    const directoryFacility = directoryFacilities.find(
      (facility) =>
        getFacilityQuickStartAsset({
          slug: facility.slug,
          id: facility.id,
        })?.facility.registrationSlug === asset.facility.registrationSlug,
    );
    if (directoryFacility) {
      return {
        ...directoryFacility,
        slug: asset.facility.registrationSlug,
        yards: directoryFacility.yards?.length
          ? directoryFacility.yards
          : canonicalFacilitySummary(content).yards,
      };
    }

    const sessionLocation = sessionLocations.find(
      (location) =>
        getFacilityQuickStartAsset(identityForSessionLocation(location))
          ?.facility.registrationSlug === asset.facility.registrationSlug,
    );
    if (sessionLocation) {
      return {
        ...canonicalFacilitySummary(content),
        id: sessionLocation.location_id,
        name:
          sessionLocation.location_name ||
          sessionLocation.location_label ||
          sessionLocation.display_name ||
          content.facility.name,
        active: sessionLocation.is_active !== false,
      };
    }

    return canonicalFacilitySummary(content);
  });
}
