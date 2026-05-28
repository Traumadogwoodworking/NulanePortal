import type { CSSProperties } from "react";

export type PortalBrandingMode = "definianInspection" | "docudent";

export interface PortalBrandPreset {
  mode: PortalBrandingMode;
  defaultOrganizationName: string;
  defaultLogoUrl: string | null;
  allowSnapshotLogoOverride: boolean;
  footerLogoUrl: string;
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
  defaultBadgeLabel: string;
  defaultPowerBiEmbedUrl: string | null;
  defaultIsPaid: boolean;
}

export const BASE_MEDIA_URL = "https://nulanesystems.com/media";

export const PORTAL_LOGO_FALLBACKS: Record<string, string> = {
  "awct.inc": `${BASE_MEDIA_URL}/AWCT.png`,
  "awc.inc": `${BASE_MEDIA_URL}/AWCLogo.png`,
  "inter-rail.inc": `${BASE_MEDIA_URL}/IRT-Navigation-LOGO.png`,
  "inter-rail transport": `${BASE_MEDIA_URL}/IRT-Navigation-LOGO.png`,
  "signature vehicle logistics": `${BASE_MEDIA_URL}/svl-dark.png`,
};

export const PORTAL_BRANDING_PRESETS: Record<PortalBrandingMode, PortalBrandPreset> = {
  definianInspection: {
    mode: "definianInspection",
    defaultOrganizationName: "Definian Inspection",
    defaultLogoUrl: "/media/definian-sidebar-logo-white.png",
    allowSnapshotLogoOverride: false,
    footerLogoUrl: "/media/definian-logo-inverted-rgb.svg",
    portalBrandColor: "#06af68",
    portalBrandAccentColor: "#048c57",
    portalBrandLightColor: "rgba(6, 175, 104, 0.12)",
    sidebarBgEnforced: "#0b1624",
    sidebarTextEnforced: "#f8fafc",
    sidebarLinkEnforced: "#cbd5e1",
    sidebarLinkHoverEnforced: "#ffffff",
    topbarTextClassName: "text-slate-900",
    sidebarShellClassName: "border-r border-slate-800/70 bg-[#0b1624] transition-all duration-300",
    sidebarHeaderClassName:
      "group relative flex items-center overflow-hidden border-b border-white/10 transition-colors duration-500",
    sidebarHeaderStyle: {
      backgroundColor: "#101b2d",
      backgroundImage: "linear-gradient(135deg, rgba(16,24,39,0.98), rgba(12,18,31,0.94))",
    },
    sidebarContentClassName: "flex-1 overflow-y-auto px-3 space-y-4 py-4 custom-scrollbar",
    sidebarSectionLabelClassName: "px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400",
    sidebarFooterClassName: "sidebar-footer relative p-3 flex flex-col items-center justify-center gap-3 bg-transparent mt-2",
    sidebarProfileToggleClassName:
      "flex w-full items-center justify-start gap-3 rounded-xl border border-white/10 bg-[#0f1b2c] px-3 py-3 text-[12px] font-black uppercase tracking-widest text-white hover:border-white/20 hover:bg-[#162538] transition-all group",
    sidebarProfileAvatarClassName:
      "flex h-9 w-9 items-center justify-center rounded-full bg-white text-[18px] font-black uppercase tracking-[0.12em] text-[#0b1624]",
    sidebarProfileMetaLabelClassName: "text-[10px] text-slate-400",
    sidebarProfileMetaValueClassName: "truncate text-[12px] text-white normal-case tracking-normal max-w-full",
    sidebarProfilePopoverClassName:
      "absolute bottom-full left-0 right-0 mb-3 rounded-2xl border border-white/10 bg-[#0f1b2c] p-3 shadow-2xl",
    sidebarProfileLogoutButtonClassName:
      "flex w-full items-center justify-between rounded-xl border border-rose-400/20 px-3 py-2.5 text-sm font-bold text-rose-300 hover:bg-rose-500/10",
    sidebarActiveLinkClassName:
      "bg-emerald-500/10 text-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.24)]",
    sidebarInactiveLinkClassName: "text-slate-300 hover:bg-white/5 hover:text-white",
    defaultBadgeLabel: "Portal",
    defaultPowerBiEmbedUrl: null,
    defaultIsPaid: false,
  },
  docudent: {
    mode: "docudent",
    defaultOrganizationName: "DocuDent",
    defaultLogoUrl: "/media/Docudent.png",
    allowSnapshotLogoOverride: true,
    footerLogoUrl: "/media/powered_by_colorful.png",
    portalBrandColor: "#2563eb",
    portalBrandAccentColor: "#1d4ed8",
    portalBrandLightColor: "rgba(37, 99, 235, 0.08)",
    sidebarBgEnforced: "#ffffff",
    sidebarTextEnforced: "#020617",
    sidebarLinkEnforced: "#1e293b",
    sidebarLinkHoverEnforced: "#020617",
    topbarTextClassName: "text-[color:var(--brand)]",
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
  process.env.NEXT_PUBLIC_PORTAL_BRANDING === "definianInspection" ? "definianInspection" : "docudent";

export function getPortalBrandingMode(_pathname: string): PortalBrandingMode {
  return ACTIVE_PORTAL_BRANDING;
}

export function getPortalBrandingPreset(mode: PortalBrandingMode): PortalBrandPreset {
  return PORTAL_BRANDING_PRESETS[mode];
}
