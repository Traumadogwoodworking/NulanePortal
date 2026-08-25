import type { CSSProperties } from "react";

export type PortalProductId =
  | "definianInspection"
  | "inspectionTrac"
  | "nulaneSystems"
  | "docudent";

export interface PortalBrandPreset {
  mode: PortalProductId;
  defaultOrganizationName: string;
  defaultLogoUrl: string | null;
  staticLogoUrl: string | null;
  staticLogoNormalizedKeys: string[];
  allowSnapshotLogoOverride: boolean;
  footerLogoUrl: string | null;
  showFooterLogo: boolean;
  portalBrandColor: string;
  portalBrandAccentColor: string;
  portalBrandLightColor: string;
  auth0Domain?: string;
  auth0ClientId: string;
  auth0OrganizationId: string;
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
  defaultBadgeLabel: string;
  defaultPowerBiEmbedUrl: string | null;
  defaultIsPaid: boolean;
}

export interface PortalPublicBranding {
  companyName: string;
  appName: string;
  shortDescription: string;
  landingHeadline: string;
  landingSubheadline: string;
  landingExplainer: string;
  supportEmail: string;
  reportsEmail: string;
  logoPath: string;
  footerLegalOwner: string;
  loginButtonLabel: string;
  openPortalButtonLabel: string;
  portalUrl: string;
  appStoreUrl: string;
  googlePlayUrl: string;
}

export interface PortalProductConfig {
  id: PortalProductId;
  branding: PortalBrandPreset;
  publicBranding: PortalPublicBranding;
}
