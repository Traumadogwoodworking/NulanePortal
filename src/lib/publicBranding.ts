import {
  ACTIVE_PORTAL_BRANDING,
  PORTAL_BRANDING_PRESETS,
  type PortalBrandingMode,
} from "@/lib/brandingPresets";
import { withPortalBasePath } from "@/lib/config";

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
}

const envSupportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
const envReportsEmail = process.env.NEXT_PUBLIC_REPORTS_EMAIL;
const envPortalUrl = process.env.NEXT_PUBLIC_PORTAL_URL;

const baseConfigs: Record<PortalBrandingMode, Omit<PublicBrandingConfig, "mode">> = {
  inspectionTrac: {
    companyName: "Inspection-Trac",
    appName: "Inspection-Trac",
    shortDescription: "Vehicle inspection and condition reporting portal.",
    landingHeadline: "Inspection-Trac",
    landingSubheadline: "Vehicle inspection and condition reporting portal.",
    landingExplainer:
      "Use this portal to access inspection reports, facility records, vehicle condition documentation, and operational review tools.",
    supportEmail: "support@nulanesystems.com",
    reportsEmail: "reports@inspection-trac.com",
    logoPath: "/media/inspection-trac-logo.png",
    footerLegalOwner: "Inspection-Trac",
    primaryColor: PORTAL_BRANDING_PRESETS.inspectionTrac.portalBrandColor,
    accentColor: PORTAL_BRANDING_PRESETS.inspectionTrac.portalBrandAccentColor,
    loginButtonLabel: "Log In",
    openPortalButtonLabel: "Open Portal",
    portalUrl: "/home",
  },
  nulaneSystems: {
    companyName: "Nulane Systems",
    appName: "Nulane Systems Portal",
    shortDescription: "Portal for inspection reporting, facility records, and operational review.",
    landingHeadline: "Nulane Systems",
    landingSubheadline: "Inspection reporting and operational portal.",
    landingExplainer:
      "Use this portal to access reports, facility records, vehicle condition documentation, and operational review tools.",
    supportEmail: "support@nulanesystems.com",
    reportsEmail: "reports@nulanesystems.com",
    logoPath: "/media/Docudent.png",
    footerLegalOwner: "Nulane Systems",
    primaryColor: PORTAL_BRANDING_PRESETS.nulaneSystems.portalBrandColor,
    accentColor: PORTAL_BRANDING_PRESETS.nulaneSystems.portalBrandAccentColor,
    loginButtonLabel: "Log In",
    openPortalButtonLabel: "Open Portal",
    portalUrl: "/home",
  },
  docudent: {
    companyName: "DocuDent",
    appName: "DocuDent",
    shortDescription: "Damage capture and inspection reporting portal.",
    landingHeadline: "DocuDent",
    landingSubheadline: "Damage capture and inspection reporting portal.",
    landingExplainer:
      "Use this portal to access inspection reports, vehicle condition documentation, and operational review tools.",
    supportEmail: "support@nulanesystems.com",
    reportsEmail: "reports@nulanesystems.com",
    logoPath: "/media/Docudent.png",
    footerLegalOwner: "DocuDent",
    primaryColor: PORTAL_BRANDING_PRESETS.docudent.portalBrandColor,
    accentColor: PORTAL_BRANDING_PRESETS.docudent.portalBrandAccentColor,
    loginButtonLabel: "Log In",
    openPortalButtonLabel: "Open Portal",
    portalUrl: "/home",
  },
};

export function getPublicBrandingConfig(mode: PortalBrandingMode = ACTIVE_PORTAL_BRANDING): PublicBrandingConfig {
  const config = baseConfigs[mode] ?? baseConfigs.inspectionTrac;
  return {
    ...config,
    mode,
    supportEmail: envSupportEmail || config.supportEmail,
    reportsEmail: envReportsEmail || config.reportsEmail,
    portalUrl: envPortalUrl || config.portalUrl,
  };
}

export const publicBranding = getPublicBrandingConfig();

export function getPublicBrandLogoUrl(config: PublicBrandingConfig = publicBranding): string {
  return withPortalBasePath(config.logoPath);
}
