import type { CSSProperties } from "react";
import { withPortalBasePath } from "./config";

export type PortalBrandingMode = "docudent";

export interface PortalBrandPreset {
  mode: PortalBrandingMode;
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

export const PORTAL_BRANDING_PRESETS: Record<PortalBrandingMode, PortalBrandPreset> = {
  docudent: {
    mode: "docudent",
    defaultOrganizationName: "Nulane Systems",
    defaultLogoUrl: withPortalBasePath("/media/Nulane_Systems-removebg-preview-inv.png"),
    staticLogoUrl: withPortalBasePath("/media/Nulane_Systems-removebg-preview-inv.png"),
    staticLogoNormalizedKeys: ["nulane systems", "nulane"],
    appNavLogoUrl: withPortalBasePath("/media/Docudent.png"),
    allowSnapshotLogoOverride: false,
    footerLogoUrl: null,
    showFooterLogo: false,
    portalBrandColor: "#0d2c71",
    portalBrandAccentColor: "#49b6ff",
    portalBrandLightColor: "rgba(73, 182, 255, 0.16)",
    sidebarBgEnforced: "#0d2c71",
    sidebarTextEnforced: "#f8fbff",
    sidebarLinkEnforced: "#d6e5ff",
    sidebarLinkHoverEnforced: "#ffffff",
    topbarTextClassName: "text-slate-950",
    sidebarLogoShellClassName:
      "relative z-10 flex w-full items-center justify-center px-5 py-4",
    sidebarLogoImageClassName: "h-auto w-full max-w-[190px] object-contain",
    appNavLabel: "DocuDent",
    sidebarShellClassName:
      "flex w-[286px] shrink-0 flex-col overflow-hidden rounded-[2rem] border border-[#173d85] bg-[#0d2c71] shadow-[0_28px_70px_-38px_rgba(4,14,40,0.7)]",
    sidebarHeaderClassName:
      "group relative flex items-center overflow-hidden border-b border-white/10",
    sidebarHeaderStyle: {
      backgroundColor: "#0d2c71",
      backgroundImage:
        "radial-gradient(circle at 50% 0%, rgba(73,182,255,0.2), transparent 62%)",
    },
    sidebarContentClassName: "flex-1 overflow-y-auto px-3 py-4 custom-scrollbar",
    sidebarSectionLabelClassName:
      "px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-200",
    sidebarFooterClassName:
      "relative flex flex-col items-center justify-center gap-3 border-t border-white/10 p-3",
    sidebarProfileToggleClassName:
      "flex w-full items-center justify-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-[12px] font-black uppercase tracking-widest text-blue-100 transition hover:border-white/25 hover:bg-white/10 hover:text-white",
    sidebarProfileAvatarClassName:
      "flex h-9 w-9 items-center justify-center rounded-full bg-[#49b6ff] text-[18px] font-black uppercase tracking-[0.12em] text-[#071b45]",
    sidebarProfileMetaLabelClassName: "text-[10px] text-blue-200",
    sidebarProfileMetaValueClassName:
      "max-w-full truncate text-[12px] normal-case tracking-normal text-white",
    sidebarProfilePopoverClassName:
      "absolute bottom-full left-0 right-0 mb-3 rounded-2xl border border-white/10 bg-[#071b45] p-3 shadow-2xl",
    sidebarProfileLogoutButtonClassName:
      "flex w-full items-center justify-between rounded-xl border border-rose-300/30 px-3 py-2.5 text-sm font-bold text-rose-100 hover:bg-rose-950/35",
    sidebarActiveLinkClassName:
      "bg-white/14 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
    sidebarInactiveLinkClassName: "text-blue-100 hover:bg-white/8 hover:text-white",
    defaultBadgeLabel: "DocuDent",
    defaultPowerBiEmbedUrl: null,
    defaultIsPaid: false,
  },
};

export const ACTIVE_PORTAL_BRANDING: PortalBrandingMode = "docudent";

export function getPortalBrandingMode(_pathname: string): PortalBrandingMode {
  return ACTIVE_PORTAL_BRANDING;
}

export function getPortalBrandingPreset(mode: PortalBrandingMode): PortalBrandPreset {
  return PORTAL_BRANDING_PRESETS[mode];
}
