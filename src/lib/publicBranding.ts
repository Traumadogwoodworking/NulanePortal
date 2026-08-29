import {
  ACTIVE_PORTAL_BRANDING,
  PORTAL_BRANDING_PRESETS,
  type PortalBrandingMode,
} from "@/lib/brandingPresets";

export interface PublicBrandingConfig {
  mode: PortalBrandingMode;
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
  primaryColor: string;
  accentColor: string;
  loginButtonLabel: string;
  openPortalButtonLabel: string;
  portalUrl: string;
  appStoreUrl: string;
  googlePlayUrl: string;
}

const preset = PORTAL_BRANDING_PRESETS.docudent;

export const publicBranding: PublicBrandingConfig = {
  mode: ACTIVE_PORTAL_BRANDING,
  companyName: "Nulane Systems",
  appName: "DocuDent",
  shortDescription: "Authenticated damage submission and review workspace.",
  landingHeadline: "DocuDent",
  landingSubheadline: "Damage operations",
  landingExplainer: "Authenticated damage submission and review workspace.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@nulanesystems.com",
  reportsEmail: "",
  logoPath: "/media/Docudent.png",
  footerLegalOwner: "Nulane Systems",
  primaryColor: preset.portalBrandColor,
  accentColor: preset.portalBrandAccentColor,
  loginButtonLabel: "Continue to secure login",
  openPortalButtonLabel: "Open Portal",
  portalUrl: "/home",
  appStoreUrl: "",
  googlePlayUrl: "",
};

export function getPublicBrandingConfig(
  _mode: PortalBrandingMode = ACTIVE_PORTAL_BRANDING,
): PublicBrandingConfig {
  return publicBranding;
}

export function getPublicBrandLogoUrl(
  config: PublicBrandingConfig = publicBranding,
): string {
  if (!config.logoPath) return "";
  if (config.logoPath.startsWith("http")) return config.logoPath;
  return config.logoPath.startsWith("/") ? config.logoPath : `/${config.logoPath}`;
}
