import type { CSSProperties } from "react";
import type { BrandingSnapshot, PortalSessionResponse } from "./types";
import { getRouteByPath } from "./navigation";
import {
  ACTIVE_PORTAL_BRANDING,
  getPortalBrandingPreset,
  type PortalBrandPreset,
  type PortalBrandingMode,
} from "./brandingPresets";
import { withPortalBasePath } from "./config";


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

function normalizeOrgKey(value: string): string {
  return value.toLowerCase().trim().replace(/[\s_-]+/g, " ");
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
  const rawName = preset.defaultOrganizationName;
  const normalizedKey = normalizeOrgKey(rawName);
  const definition = {
    organizationName: rawName,
    logoUrl: null,
    badgeLabel: preset.defaultBadgeLabel,
    powerBiEmbedUrl: preset.defaultPowerBiEmbedUrl,
    isPaid: preset.defaultIsPaid,
  };
  const powerBiEmbedUrl = definition.powerBiEmbedUrl ?? null;
  const customLogo = preset.allowSnapshotLogoOverride
    ? normalizeLogoUrl(typeof snapshot?.logo_url === "string" ? snapshot.logo_url : null)
    : null;
  const fallbackLogo = normalizeLogoUrl(preset.defaultLogoUrl);
  const logoUrl = customLogo ?? fallbackLogo ?? null;
  const resolvedAppLabel = preset.appNavLabel ?? getAppBranding(pathname).appLabel ?? preset.defaultOrganizationName;
  const resolvedAppLogo = preset.appNavLogoUrl ?? getAppBranding(pathname).brandLogo ?? preset.defaultLogoUrl;
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
    footerLogoUrl: preset.showFooterLogo ? preset.footerLogoUrl : null,
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

/** Returns the active route label without allowing route-level brand overrides. */
export function getAppBranding(pathname: string): AppBranding {
  const route = getRouteByPath(pathname);

  return {
    brandColor: null,
    brandLogo: null,
    appLabel: route?.label ?? null,
  };
}
