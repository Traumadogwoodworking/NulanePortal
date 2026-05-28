import type { CSSProperties } from "react";
import type { BrandingSnapshot, PortalSessionResponse } from "./types";
import { getRouteByPath } from "./navigation";
import {
  BASE_MEDIA_URL,
  ACTIVE_PORTAL_BRANDING,
  PORTAL_LOGO_FALLBACKS,
  getPortalBrandingPreset,
  type PortalBrandPreset,
  type PortalBrandingMode,
} from "./brandingPresets";

type OrgKey = string;

interface OrgBrandingDefinition {
  organizationName: string;
  logoUrl?: string;
  badgeLabel?: string | null;
  powerBiEmbedUrl?: string | null;
  isPaid?: boolean;
}

export interface RSAOrgOption {
  key: OrgKey;
  label: string;
}

export const RSA_ORG_OPTIONS: RSAOrgOption[] = [
  { key: "awct.inc", label: "AWCT.inc" },
  { key: "awc.inc", label: "AWC.inc" },
];

const BRANDING_MAP: Record<OrgKey, OrgBrandingDefinition> = {
  "awct.inc": {
    organizationName: "AWCT.inc",
    logoUrl: `${BASE_MEDIA_URL}/AWCT.png`,
    powerBiEmbedUrl: "https://app.powerbi.com/view?r=eyJrIjoiMmRkNjcxMGMtOWRjNy00ODdhLWJjMzktNjFhOTBhNjE5YjNiIiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9",
    isPaid: true,
  },
  "awc.inc": {
    organizationName: "AWC.inc",
    logoUrl: `${BASE_MEDIA_URL}/AWCLogo.png`,
    badgeLabel: "Paid",
    powerBiEmbedUrl: null,
    isPaid: true,
  },
  "inter-rail.inc": {
    organizationName: "Inter-rail.inc",
    logoUrl: `${BASE_MEDIA_URL}/IRT-Navigation-LOGO.png`,
    badgeLabel: "Paid",
    powerBiEmbedUrl: "https://app.powerbi.com/view?r=eyJrIjoiYTg1OTcyYjMtNGRiYy00ODNmLWI3ODctYzU0NmU0ZTg1ODM2IiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9",
    isPaid: true,
  },
  "inter-rail transport": {
    organizationName: "Inter-Rail Transport",
    logoUrl: `${BASE_MEDIA_URL}/IRT-Navigation-LOGO.png`,
    badgeLabel: "Paid",
    powerBiEmbedUrl: "https://app.powerbi.com/view?r=eyJrIjoiYTg1OTcyYjMtNGRiYy00ODNmLWI3ODctYzU0NmU0ZTg1ODM2IiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9",
    isPaid: true,
  },
  "signature vehicle logistics": {
    organizationName: "Signature Vehicle Logistics",
    logoUrl: `${BASE_MEDIA_URL}/svl-dark.png`,
    badgeLabel: "Paid",
    powerBiEmbedUrl: "https://app.powerbi.com/view?r=eyJrIjoiMDc4ODEwZGYtY2UxYy00ZWY0LWIwMjEtZWQ5ODk5ZDBlZjNlIiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9",
    isPaid: true,
  },
  "american wheel & car": {
    organizationName: "American Wheel & Car",
    logoUrl: undefined,
    powerBiEmbedUrl: "https://app.powerbi.com/view?r=eyJrIjoiMmRkNjcxMGMtOWRjNy00ODdhLWJjMzktNjFhOTBhNjE5YjNiIiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9",
    isPaid: true,
  },
};

interface PortalBrandingPartial {
  organizationName: string;
  normalizedKey: string;
  logoUrl: string | null;
  badgeLabel: string | null;
  powerBiEmbedUrl: string | null;
  isPaid: boolean;
}

export interface ResolvedPortalBranding extends PortalBrandingPartial {
  mode: PortalBrandingMode;
  preset: PortalBrandPreset;
  appLabel: string | null;
  customLogoUrl: string | null;
  hasCustomLogo: boolean;
  portalBrandColor: string;
  portalBrandAccentColor: string;
  portalBrandLightColor: string;
  sidebarBgEnforced: string;
  sidebarTextEnforced: string;
  sidebarLinkEnforced: string;
  sidebarLinkHoverEnforced: string;
  topbarTextClassName: string;
  sidebarShellClassName: string;
  sidebarHeaderClassName: string;
  sidebarHeaderStyle: CSSProperties;
  sidebarContentClassName: string;
  sidebarSectionLabelClassName: string;
  sidebarFooterClassName: string;
  sidebarProfileToggleClassName: string;
  sidebarProfileAvatarClassName: string;
  sidebarProfileMetaLabelClassName: string;
  sidebarProfileMetaValueClassName: string;
  sidebarProfilePopoverClassName: string;
  sidebarProfileLogoutButtonClassName: string;
  sidebarActiveLinkClassName: string;
  sidebarInactiveLinkClassName: string;
  footerLogoUrl: string;
}

function normalizeOrgKey(value?: string | null): string {
  if (!value) {
    return "";
  }
  return value.toLowerCase().trim();
}

function normalizeLogoUrl(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

interface ResolvePortalBrandingOptions {
  session: PortalSessionResponse | null;
  pathname?: string;
  brandingSnapshot?: BrandingSnapshot | null;
}

export function resolvePortalBranding({
  session,
  pathname = "/",
  brandingSnapshot,
}: ResolvePortalBrandingOptions): ResolvedPortalBranding {
  const preset = getPortalBrandingPreset(ACTIVE_PORTAL_BRANDING);
  const snapshot = (brandingSnapshot ?? (session?.branding_snapshot as BrandingSnapshot | undefined)) ?? null;
  const fallbackOrgName = typeof snapshot?.organization_name === "string" ? snapshot.organization_name : undefined;
  const fallbackBrandName = typeof snapshot?.brand_name === "string" ? snapshot.brand_name : undefined;
  const rawName =
    fallbackOrgName ??
    fallbackBrandName ??
    session?.organization?.name ??
    session?.user?.organization_id ??
    preset.defaultOrganizationName;
  const normalizedKey = normalizeOrgKey(rawName);
  const definition = BRANDING_MAP[normalizedKey] ?? {
    organizationName: rawName,
    logoUrl: null,
    badgeLabel: preset.defaultBadgeLabel,
    powerBiEmbedUrl: preset.defaultPowerBiEmbedUrl,
    isPaid: preset.defaultIsPaid,
  };
  const customLogo = preset.allowSnapshotLogoOverride
    ? normalizeLogoUrl(typeof snapshot?.logo_url === "string" ? snapshot.logo_url : null)
    : null;
  const fallbackLogo = normalizeLogoUrl(
    PORTAL_LOGO_FALLBACKS[normalizedKey] ??
      definition.logoUrl ??
      preset.defaultLogoUrl
  );
  const logoUrl =
    preset.mode === "definianInspection"
      ? preset.defaultLogoUrl ?? null
      : customLogo ?? fallbackLogo ?? null;
  return {
    mode: preset.mode,
    preset,
    organizationName: definition.organizationName || rawName,
    normalizedKey,
    logoUrl,
    badgeLabel: definition.badgeLabel ?? null,
    powerBiEmbedUrl: definition.powerBiEmbedUrl ?? null,
    isPaid: Boolean(definition.isPaid),
    appLabel: getAppBranding(pathname).appLabel ?? preset.defaultOrganizationName,
    customLogoUrl: customLogo,
    hasCustomLogo: Boolean(customLogo),
    portalBrandColor: preset.portalBrandColor,
    portalBrandAccentColor: preset.portalBrandAccentColor,
    portalBrandLightColor: preset.portalBrandLightColor,
    sidebarBgEnforced: preset.sidebarBgEnforced,
    sidebarTextEnforced: preset.sidebarTextEnforced,
    sidebarLinkEnforced: preset.sidebarLinkEnforced,
    sidebarLinkHoverEnforced: preset.sidebarLinkHoverEnforced,
    topbarTextClassName: preset.topbarTextClassName,
    sidebarShellClassName: preset.sidebarShellClassName,
    sidebarHeaderClassName: preset.sidebarHeaderClassName,
    sidebarHeaderStyle: preset.sidebarHeaderStyle,
    sidebarContentClassName: preset.sidebarContentClassName,
    sidebarSectionLabelClassName: preset.sidebarSectionLabelClassName,
    sidebarFooterClassName: preset.sidebarFooterClassName,
    sidebarProfileToggleClassName: preset.sidebarProfileToggleClassName,
    sidebarProfileAvatarClassName: preset.sidebarProfileAvatarClassName,
    sidebarProfileMetaLabelClassName: preset.sidebarProfileMetaLabelClassName,
    sidebarProfileMetaValueClassName: preset.sidebarProfileMetaValueClassName,
    sidebarProfilePopoverClassName: preset.sidebarProfilePopoverClassName,
    sidebarProfileLogoutButtonClassName: preset.sidebarProfileLogoutButtonClassName,
    sidebarActiveLinkClassName: preset.sidebarActiveLinkClassName,
    sidebarInactiveLinkClassName: preset.sidebarInactiveLinkClassName,
    footerLogoUrl: preset.footerLogoUrl,
  };
}

export function getPortalBranding(session: PortalSessionResponse | null): PortalBrandingPartial {
  const resolved = resolvePortalBranding({ session, pathname: "/docudent" });
  return {
    organizationName: resolved.organizationName,
    normalizedKey: resolved.normalizedKey,
    logoUrl: resolved.logoUrl,
    badgeLabel: resolved.badgeLabel,
    powerBiEmbedUrl: resolved.powerBiEmbedUrl,
    isPaid: resolved.isPaid,
  };
}

export interface AppBranding {
  brandColor: string | null;
  brandLogo: string | null;
  appLabel: string | null;
}

/**
 * Returns app-specific branding based on the current route.
 * This allows the shell to switch identity between DocuDent, DocuFit, etc.
 */
export function getAppBranding(pathname: string): AppBranding {
  const route = getRouteByPath(pathname);

  return {
    brandColor: route?.brandColor ?? null,
    brandLogo: route?.brandLogo ?? null,
    appLabel: route?.label ?? null,
  };
}
