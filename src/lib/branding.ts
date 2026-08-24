import type { CSSProperties } from "react";
import type { BrandingSnapshot, PortalSessionResponse } from "./types";
import { getRouteByPath } from "./navigation";
import {
  ACTIVE_PORTAL_BRANDING,
  PORTAL_LOGO_FALLBACKS,
  getPortalBrandingPreset,
  type PortalBrandPreset,
  type PortalBrandingMode,
} from "./brandingPresets";
import { withPortalBasePath } from "./config";

type OrgKey = string;

export const INSPECTION_TRAC_POWER_BI_EMBED_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiNTlmMzRjYWYtYzc4MS00Njc2LTk5NDgtMThiZmJjODlmNmU1IiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9";

export const SIGNATURE_VL_POWER_BI_EMBED_URL =
  "https://app.powerbi.com/view?r=eyJrIjoiMDc4ODEwZGYtY2UxYy00ZWY0LWIwMjEtZWQ5ODk5ZDBlZjNlIiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9";

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
  { key: "awct.inc", label: "AWCT" },
  { key: "awc.inc", label: "AWC" },
];

const BRANDING_MAP: Record<OrgKey, OrgBrandingDefinition> = {
  "awct.inc": {
    organizationName: "AWCT",
    logoUrl: withPortalBasePath("/media/inspection-trac-logo.png"),
    powerBiEmbedUrl: INSPECTION_TRAC_POWER_BI_EMBED_URL,
    isPaid: true,
  },
  "awc.inc": {
    organizationName: "AWC",
    logoUrl: withPortalBasePath("/media/inspection-trac-logo.png"),
    badgeLabel: "Paid",
    powerBiEmbedUrl: null,
    isPaid: true,
  },
  "inter-rail.inc": {
    organizationName: "Inter-rail.inc",
    logoUrl: withPortalBasePath("/media/IRT-Navigation-LOGO.png"),
    badgeLabel: "Paid",
    powerBiEmbedUrl: "https://app.powerbi.com/view?r=eyJrIjoiYTg1OTcyYjMtNGRiYy00ODNmLWI3ODctYzU0NmU0ZTg1ODM2IiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9",
    isPaid: true,
  },
  "inter-rail transport": {
    organizationName: "Inter-Rail Transport",
    logoUrl: withPortalBasePath("/media/IRT-Navigation-LOGO.png"),
    badgeLabel: "Paid",
    powerBiEmbedUrl: "https://app.powerbi.com/view?r=eyJrIjoiYTg1OTcyYjMtNGRiYy00ODNmLWI3ODctYzU0NmU0ZTg1ODM2IiwidCI6IjUxZjU3NDU4LTQ5YzQtNDQ1NC1hNDQ1LWFmYTE4OTAxNTUxYyJ9",
    isPaid: true,
  },
  "signature vehicle logistics": {
    organizationName: "Signature Vehicle Logistics",
    logoUrl: withPortalBasePath("/media/inspection-trac-logo.png"),
    badgeLabel: "Paid",
    powerBiEmbedUrl: SIGNATURE_VL_POWER_BI_EMBED_URL,
    isPaid: true,
  },
  "american wheel & car": {
    organizationName: "American Wheel & Car",
    logoUrl: undefined,
    powerBiEmbedUrl: INSPECTION_TRAC_POWER_BI_EMBED_URL,
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
  sidebarLogoShellClassName: string;
  sidebarLogoImageClassName: string;
  appNavLogoUrl: string | null;
  appNavLabel: string;
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
  footerLogoUrl: string | null;
  staticLogoUrl: string | null;
  staticLogoNormalizedKeys: string[];
}

function normalizeOrgKey(value?: string | null): string {
  if (!value) {
    return "";
  }
  return value.toLowerCase().trim().replace(/[\s_-]+/g, " ");
}

function normalizeEmailDomain(value?: string | null): string {
  if (!value) {
    return "";
  }
  const atIndex = value.lastIndexOf("@");
  return atIndex >= 0 ? value.slice(atIndex + 1).trim().toLowerCase() : "";
}

function normalizeEmail(value?: string | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeLogoUrl(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("http") || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/media/") || trimmed.startsWith("media/")) {
    return withPortalBasePath(trimmed.startsWith("/") ? trimmed : `/${trimmed}`);
  }
  return trimmed;
}

interface ResolvePortalBrandingOptions {
  session: PortalSessionResponse | null;
  pathname?: string;
  brandingSnapshot?: BrandingSnapshot | null;
}

function normalizeBrandColor(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const INSPECTION_TRAC_ORG_KEYS = new Set([
  "inspection-trac",
  "inspection trac",
  "inspection_trac",
  "inspection track",
]);

const INSPECTION_TRAC_CUSTOMER_KEYS = new Set([
  "awct.inc",
  "awc.inc",
  "awct_inc",
  "awc_inc",
  "signature vehicle logistics",
  "signature_vehicle_logistics",
]);

function pickSwatchColor(swatch?: Record<string, string> | null): string | null {
  if (!swatch) {
    return null;
  }
  const preferredKeys = [
    "primary",
    "primary_color",
    "accent",
    "accent_color",
    "border",
    "border_color",
    "brand",
    "brand_color",
    "secondary",
    "secondary_color",
    "button",
    "button_color",
  ];
  for (const key of preferredKeys) {
    const candidate = normalizeBrandColor(swatch[key]);
    if (candidate) {
      return candidate;
    }
  }
  for (const candidate of Object.values(swatch)) {
    const normalized = normalizeBrandColor(candidate);
    if (normalized) {
      return normalized;
    }
  }
  return null;
}

export function resolveBrandingAccentColor(snapshot?: BrandingSnapshot | null): string | null {
  return (
    pickSwatchColor(snapshot?.color_swatch ?? null) ??
    normalizeBrandColor(snapshot?.primary_color) ??
    normalizeBrandColor(snapshot?.accent_color) ??
    normalizeBrandColor(snapshot?.border_color) ??
    normalizeBrandColor(snapshot?.secondary_color) ??
    normalizeBrandColor(snapshot?.button_color) ??
    null
  );
}

export function resolveBrandingPrimaryColor(snapshot?: BrandingSnapshot | null): string | null {
  return (
    normalizeBrandColor(snapshot?.primary_color) ??
    pickSwatchColor(snapshot?.color_swatch ?? null) ??
    normalizeBrandColor(snapshot?.accent_color) ??
    normalizeBrandColor(snapshot?.border_color) ??
    normalizeBrandColor(snapshot?.secondary_color) ??
    normalizeBrandColor(snapshot?.button_color) ??
    null
  );
}

export function resolvePowerBiEmbedUrl(rawUrl?: string | null): string | null {
  const normalized = normalizeBrandColor(rawUrl);
  if (!normalized) {
    return null;
  }
  try {
    const url = new URL(normalized);
    url.searchParams.set("pageView", "fitToWidth");
    url.searchParams.set("navContentPaneEnabled", "false");
    url.searchParams.set("filterPaneEnabled", "false");
    url.searchParams.set("toolbarHidden", "true");
    return url.toString();
  } catch {
    return normalized;
  }
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
  const email = normalizeEmail(session?.user?.email);
  const emailDomain = normalizeEmailDomain(email);
  const powerBiEmbedUrl =
    emailDomain === "signaturevl.com" ||
    email === "snidermatthew423@gmail.com" ||
    email === "snidermatthew424@gmail.com"
      ? SIGNATURE_VL_POWER_BI_EMBED_URL
      : definition.powerBiEmbedUrl ?? null;
  const customLogo = preset.allowSnapshotLogoOverride
    ? normalizeLogoUrl(typeof snapshot?.logo_url === "string" ? snapshot.logo_url : null)
    : null;
  const usesInspectionTracPreset = preset.mode === "inspectionTrac";
  const usesInspectionTracIdentity =
    usesInspectionTracPreset &&
    (INSPECTION_TRAC_ORG_KEYS.has(normalizedKey) || INSPECTION_TRAC_CUSTOMER_KEYS.has(normalizedKey));
  const fallbackLogo = normalizeLogoUrl(
    usesInspectionTracPreset
      ? definition.logoUrl ?? PORTAL_LOGO_FALLBACKS[normalizedKey] ?? preset.defaultLogoUrl
      : preset.defaultLogoUrl
  );
  const logoUrl = usesInspectionTracIdentity
    ? withPortalBasePath("/media/inspection-trac-logo.png")
    : customLogo ?? fallbackLogo ?? null;
  const resolvedAppLabel = usesInspectionTracIdentity
    ? "Inspection-Trac"
    : preset.appNavLabel ?? getAppBranding(pathname).appLabel ?? preset.defaultOrganizationName;
  const resolvedAppLogo = usesInspectionTracIdentity
    ? withPortalBasePath("/media/inspection-trac-logo.png")
    : preset.appNavLogoUrl ?? getAppBranding(pathname).brandLogo ?? preset.defaultLogoUrl;
  return {
    mode: preset.mode,
    preset,
    organizationName: definition.organizationName || rawName,
    normalizedKey,
    logoUrl,
    badgeLabel: definition.badgeLabel ?? null,
    powerBiEmbedUrl,
    isPaid: Boolean(definition.isPaid),
    appLabel: resolvedAppLabel,
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
    sidebarLogoShellClassName: preset.sidebarLogoShellClassName,
    sidebarLogoImageClassName: preset.sidebarLogoImageClassName,
    appNavLogoUrl: resolvedAppLogo,
    appNavLabel: resolvedAppLabel,
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
    footerLogoUrl: usesInspectionTracIdentity ? null : preset.showFooterLogo ? preset.footerLogoUrl : null,
    staticLogoUrl: preset.staticLogoUrl,
    staticLogoNormalizedKeys: preset.staticLogoNormalizedKeys,
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
 * This allows the shell to switch identity between branded portal modules.
 */
export function getAppBranding(pathname: string): AppBranding {
  const route = getRouteByPath(pathname);

  return {
    brandColor: route?.brandColor ?? null,
    brandLogo: route?.brandLogo ?? null,
    appLabel: route?.label ?? null,
  };
}
