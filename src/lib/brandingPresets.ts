import { withPortalBasePath } from "./config";
import { definianProduct } from "@/portal/products/definian/config";
import { inspectionTracProduct } from "@/portal/products/inspection-trac/config";
import type { PortalBrandPreset, PortalProductId } from "@/portal/core/config/types";

export type PortalBrandingMode = PortalProductId;
export type { PortalBrandPreset } from "@/portal/core/config/types";

export const PORTAL_LOGO_FALLBACKS: Record<string, string> = {
  "awct.inc": withPortalBasePath("/media/inspection-trac-logo.png"),
  "awc.inc": withPortalBasePath("/media/inspection-trac-logo.png"),
  "inter-rail.inc": withPortalBasePath("/media/IRT-Navigation-LOGO.png"),
  "inter-rail transport": withPortalBasePath("/media/IRT-Navigation-LOGO.png"),
  "signature vehicle logistics": withPortalBasePath("/media/svl-dark.png"),
};

export const PORTAL_BRANDING_PRESETS: Record<PortalBrandingMode, PortalBrandPreset> = {
  definianInspection: definianProduct.branding,
  inspectionTrac: inspectionTracProduct.branding,
  nulaneSystems: {
    mode: "nulaneSystems",
    defaultOrganizationName: "Nulane Systems",
    defaultLogoUrl: withPortalBasePath("/media/Docudent.png"),
    staticLogoUrl: withPortalBasePath("/media/Docudent.png"),
    staticLogoNormalizedKeys: ["nulane systems", "nulane systems portal", "nulane"],
    appNavLogoUrl: withPortalBasePath("/media/Docudent.png"),
    allowSnapshotLogoOverride: true,
    footerLogoUrl: withPortalBasePath("/media/powered_by_colorful.png"),
    showFooterLogo: true,
    portalBrandColor: "#2563eb",
    portalBrandAccentColor: "#1d4ed8",
    portalBrandLightColor: "rgba(37, 99, 235, 0.08)",
    auth0ClientId: "WkYT29HkNJo5rjDMPGTxAdb04QdKQsPc",
    auth0OrganizationId: "org_cmCOV936fSunCIJB",
    sidebarBgEnforced: "#ffffff",
    sidebarTextEnforced: "#020617",
    sidebarLinkEnforced: "#1e293b",
    sidebarLinkHoverEnforced: "#020617",
    topbarTextClassName: "text-[color:var(--brand)]",
    sidebarLogoShellClassName:
      "relative z-10 flex w-full items-center justify-center px-4 py-3 transition-transform duration-300 group-hover:translate-y-px",
    sidebarLogoImageClassName: "h-auto w-full max-w-[260px] object-contain",
    appNavLabel: "DocuDent",
    sidebarShellClassName: "border-r border-slate-200 bg-white transition-all duration-300",
    sidebarHeaderClassName:
      "group relative flex items-center overflow-hidden border-b border-slate-200 transition-colors duration-500",
    sidebarHeaderStyle: {
      backgroundColor: "var(--surface-panel-muted)",
      backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))",
    },
    sidebarContentClassName: "flex-1 overflow-y-auto px-3 space-y-4 py-4 custom-scrollbar",
    sidebarSectionLabelClassName: "px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400",
    sidebarFooterClassName: "sidebar-footer relative p-3 flex flex-col items-center justify-center gap-3 bg-transparent mt-2",
    sidebarProfileToggleClassName:
      "flex w-full items-center justify-start gap-3 rounded-xl border-2 border-slate-100 bg-white px-3 py-3 text-[12px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-200 hover:text-slate-900 transition-all group",
    sidebarProfileAvatarClassName:
      "flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[18px] font-black uppercase tracking-[0.12em] text-white",
    sidebarProfileMetaLabelClassName: "text-[10px] text-slate-400",
    sidebarProfileMetaValueClassName: "truncate text-[12px] text-slate-800 normal-case tracking-normal max-w-full",
    sidebarProfilePopoverClassName:
      "absolute bottom-full left-0 right-0 mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl",
    sidebarProfileLogoutButtonClassName:
      "flex w-full items-center justify-between rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50",
    sidebarActiveLinkClassName:
      "bg-[color:var(--brand-light)] text-[color:var(--brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_25%,transparent)]",
    sidebarInactiveLinkClassName: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    defaultBadgeLabel: "Portal",
    defaultPowerBiEmbedUrl: null,
    defaultIsPaid: false,
  },
  docudent: {
    mode: "docudent",
    defaultOrganizationName: "DocuDent",
    defaultLogoUrl: withPortalBasePath("/media/Docudent.png"),
    staticLogoUrl: withPortalBasePath("/media/Docudent.png"),
    staticLogoNormalizedKeys: ["docudent"],
    appNavLogoUrl: withPortalBasePath("/media/Docudent.png"),
    allowSnapshotLogoOverride: true,
    footerLogoUrl: null,
    showFooterLogo: false,
    portalBrandColor: "#2563eb",
    portalBrandAccentColor: "#1d4ed8",
    portalBrandLightColor: "rgba(37, 99, 235, 0.08)",
    auth0ClientId: "WkYT29HkNJo5rjDMPGTxAdb04QdKQsPc",
    auth0OrganizationId: "org_cmCOV936fSunCIJB",
    sidebarBgEnforced: "#ffffff",
    sidebarTextEnforced: "#020617",
    sidebarLinkEnforced: "#1e293b",
    sidebarLinkHoverEnforced: "#020617",
    topbarTextClassName: "text-[color:var(--brand)]",
    sidebarLogoShellClassName:
      "relative z-10 flex w-full items-center justify-center px-4 py-3 transition-transform duration-300 group-hover:translate-y-px",
    sidebarLogoImageClassName: "h-auto w-full max-w-[260px] object-contain",
    appNavLabel: "DocuDent",
    sidebarShellClassName: "border-r border-slate-200 bg-white transition-all duration-300",
    sidebarHeaderClassName:
      "group relative flex items-center overflow-hidden border-b border-slate-200 transition-colors duration-500",
    sidebarHeaderStyle: {
      backgroundColor: "var(--surface-panel-muted)",
      backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))",
    },
    sidebarContentClassName: "flex-1 overflow-y-auto px-3 space-y-4 py-4 custom-scrollbar",
    sidebarSectionLabelClassName: "px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400",
    sidebarFooterClassName: "sidebar-footer relative p-3 flex flex-col items-center justify-center gap-3 bg-transparent mt-2",
    sidebarProfileToggleClassName:
      "flex w-full items-center justify-start gap-3 rounded-xl border-2 border-slate-100 bg-white px-3 py-3 text-[12px] font-black uppercase tracking-widest text-slate-600 hover:border-slate-200 hover:text-slate-900 transition-all group",
    sidebarProfileAvatarClassName:
      "flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[18px] font-black uppercase tracking-[0.12em] text-white",
    sidebarProfileMetaLabelClassName: "text-[10px] text-slate-400",
    sidebarProfileMetaValueClassName: "truncate text-[12px] text-slate-800 normal-case tracking-normal max-w-full",
    sidebarProfilePopoverClassName:
      "absolute bottom-full left-0 right-0 mb-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl",
    sidebarProfileLogoutButtonClassName:
      "flex w-full items-center justify-between rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50",
    sidebarActiveLinkClassName:
      "bg-[color:var(--brand-light)] text-[color:var(--brand)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--brand)_25%,transparent)]",
    sidebarInactiveLinkClassName: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
    defaultBadgeLabel: "Portal",
    defaultPowerBiEmbedUrl: null,
    defaultIsPaid: false,
  },
};

export const ACTIVE_PORTAL_BRANDING: PortalBrandingMode =
  process.env.NEXT_PUBLIC_PORTAL_BRANDING === "definianInspection"
    ? "definianInspection"
    : process.env.NEXT_PUBLIC_PORTAL_BRANDING === "docudent"
      ? "docudent"
      : process.env.NEXT_PUBLIC_PORTAL_BRANDING === "nulaneSystems"
        ? "nulaneSystems"
        : process.env.NEXT_PUBLIC_PORTAL_BRANDING === "inspectionTrac"
          ? "inspectionTrac"
          : "definianInspection";

export function getPortalBrandingMode(_pathname: string): PortalBrandingMode {
  return ACTIVE_PORTAL_BRANDING;
}

export function getPortalBrandingPreset(mode: PortalBrandingMode): PortalBrandPreset {
  return PORTAL_BRANDING_PRESETS[mode];
}
