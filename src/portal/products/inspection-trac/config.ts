import { withPortalBasePath } from "@/lib/config";
import { definePortalBranding } from "@/portal/core/config/sharedBranding";
import type { PortalProductConfig } from "@/portal/core/config/types";

const logo = withPortalBasePath("/media/inspection-trac-logo.png");

export const inspectionTracProduct = {
  id: "inspectionTrac",
  branding: definePortalBranding("inspectionTrac", {
    defaultOrganizationName: "Inspection-Trac",
    defaultLogoUrl: logo,
    staticLogoUrl: logo,
    staticLogoNormalizedKeys: ["inspection-trac", "inspection trac", "inspection track"],
    allowSnapshotLogoOverride: false,
    footerLogoUrl: null,
    showFooterLogo: false,
    portalBrandColor: "#0d2c71",
    portalBrandAccentColor: "#2563eb",
    portalBrandLightColor: "rgba(37, 99, 235, 0.08)",
    auth0ClientId: "ihhAweXL47d5FlKOL9UsS87Ld18wZKxD",
    auth0OrganizationId: "org_cmCOV936fSunCIJB",
    sidebarBgEnforced: "#ffffff",
    sidebarTextEnforced: "#020617",
    sidebarLinkEnforced: "#1e293b",
    sidebarLinkHoverEnforced: "#020617",
    topbarTextClassName: "text-[color:var(--brand)]",
    sidebarLogoShellClassName:
      "relative z-10 flex w-full items-center justify-center px-4 py-3 transition-transform duration-300 group-hover:translate-y-px",
    sidebarLogoImageClassName: "h-auto w-full max-w-[260px] object-contain",
    appNavLogoUrl: logo,
    appNavLabel: "Inspection-Trac",
    sidebarShellClassName: "border-r border-slate-200 bg-white transition-all duration-300",
    sidebarHeaderClassName:
      "group relative flex items-center overflow-hidden border-b border-slate-200 transition-colors duration-500",
    sidebarHeaderStyle: {
      backgroundColor: "var(--surface-panel-muted)",
      backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))",
    },
    sidebarProfileToggleClassName:
      "flex w-full items-center justify-start gap-3 rounded-xl border-2 border-slate-100 bg-white px-3 py-3 text-[12px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-200 hover:text-slate-900 transition-all group",
    sidebarProfileAvatarClassName:
      "flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[18px] font-black uppercase tracking-[0.12em] text-white",
    sidebarProfilePopoverClassName:
      "absolute bottom-full left-0 right-0 mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl",
    sidebarProfileLogoutButtonClassName:
      "flex w-full items-center justify-between rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50",
    sidebarActiveLinkClassName:
      "bg-[color:var(--brand-light)] text-[color:var(--brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_25%,transparent)]",
    sidebarInactiveLinkClassName: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
  }),
  publicBranding: {
    companyName: "Inspection-Trac",
    appName: "Inspection-Trac",
    shortDescription: "Vehicle inspection and condition reporting portal.",
    landingHeadline: "THE EXPERIENCE",
    landingSubheadline: "Built for Fast, Clear, and Consistent Inspections",
    landingExplainer:
      "Access inspection reports, facility records, vehicle condition documentation, and operational review tools — all in one place.",
    supportEmail: "support@inspection-trac.com",
    reportsEmail: "reports@inspection-trac.com",
    logoPath: "/media/inspection-trac-logo.png",
    footerLegalOwner: "Inspection-Trac",
    loginButtonLabel: "Log In",
    openPortalButtonLabel: "Open Portal",
    portalUrl: "/home",
    appStoreUrl: "https://apps.apple.com/us/app/inspection-trac/id6774376762",
    googlePlayUrl: "#",
  },
} satisfies PortalProductConfig;
