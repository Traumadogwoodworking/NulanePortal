import { definePortalBranding } from "@/portal/core/config/sharedBranding";
import type { PortalProductConfig } from "@/portal/core/config/types";

export const definianProduct = {
  id: "definianInspection",
  branding: definePortalBranding("definianInspection", {
    defaultOrganizationName: "Definian Inspection",
    defaultLogoUrl: "/media/definian-sidebar-logo-white.png",
    staticLogoUrl: "/media/definian-sidebar-logo-white.png",
    staticLogoNormalizedKeys: ["definian inspection", "definianinspection"],
    allowSnapshotLogoOverride: false,
    footerLogoUrl: null,
    showFooterLogo: false,
    portalBrandColor: "#0d2c71",
    portalBrandAccentColor: "#00ab63",
    portalBrandLightColor: "rgba(0, 171, 99, 0.12)",
    auth0ClientId: "WkYT29HkNJo5rjDMPGTxAdb04QdKQsPc",
    auth0OrganizationId: "org_GRicZ7Jqg1r3aerr",
    sidebarBgEnforced: "#0d2c71",
    sidebarTextEnforced: "#e5ecf9",
    sidebarLinkEnforced: "#c7d4ea",
    sidebarLinkHoverEnforced: "#ffffff",
    topbarTextClassName: "text-slate-900",
    sidebarLogoShellClassName:
      "relative z-10 flex w-full items-center justify-center rounded-[1.65rem] bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:translate-y-px",
    sidebarLogoImageClassName: "h-auto w-full max-w-[420px] object-contain",
    appNavLogoUrl: "/media/definian-sidebar-logo-white.png",
    appNavLabel: "Definian Inspection",
    sidebarShellClassName: "border-r border-[#081838] bg-[#0d2c71] transition-all duration-300",
    sidebarHeaderClassName:
      "group relative flex items-center overflow-hidden border-b border-white/10 transition-colors duration-500",
    sidebarHeaderStyle: { backgroundColor: "#0d2c71", backgroundImage: "none" },
    sidebarProfileToggleClassName:
      "flex w-full items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[12px] font-black uppercase tracking-widest text-slate-200 hover:border-white/20 hover:text-white transition-all group",
    sidebarProfileAvatarClassName:
      "flex h-9 w-9 items-center justify-center rounded-full bg-[#00ab63] text-[18px] font-black uppercase tracking-[0.12em] text-white",
    sidebarProfileMetaLabelClassName: "text-[10px] text-slate-400",
    sidebarProfileMetaValueClassName:
      "truncate text-[12px] text-slate-100 normal-case tracking-normal max-w-full",
    sidebarProfilePopoverClassName:
      "absolute bottom-full left-0 right-0 mb-3 rounded-2xl border border-white/10 bg-slate-950 p-3 shadow-2xl",
    sidebarProfileLogoutButtonClassName:
      "flex w-full items-center justify-between rounded-xl border border-rose-400/30 px-3 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-950/40",
    sidebarActiveLinkClassName:
      "bg-[color:var(--brand-light)] text-white shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_25%,transparent)]",
    sidebarInactiveLinkClassName: "text-slate-300 hover:bg-white/5 hover:text-white",
  }),
  publicBranding: {
    companyName: "Definian Inspection",
    appName: "Definian Inspection",
    shortDescription: "Vehicle inspection and condition reporting portal.",
    landingHeadline: "THE EXPERIENCE",
    landingSubheadline: "Built for Fast, Clear, and Consistent Inspections",
    landingExplainer:
      "Access inspection reports, facility records, vehicle condition documentation, and operational review tools — all in one place.",
    supportEmail: "support@definian.com",
    reportsEmail: "reports@definian.com",
    logoPath: "/media/definian-sidebar-logo-white.png",
    footerLegalOwner: "Definian Inspection",
    loginButtonLabel: "Log In",
    openPortalButtonLabel: "Open Portal",
    portalUrl: "/login",
    appStoreUrl: "https://apps.apple.com/app/definian-inspection",
    googlePlayUrl: "https://play.google.com/store/apps/details?id=com.definian.inspection",
  },
} satisfies PortalProductConfig;
