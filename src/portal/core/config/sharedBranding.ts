import type { PortalBrandPreset, PortalProductId } from "@/portal/core/config/types";

const COMMON_SIDEBAR = {
  sidebarContentClassName: "flex-1 overflow-y-auto px-3 space-y-4 py-4 custom-scrollbar",
  sidebarSectionLabelClassName: "px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400",
  sidebarFooterClassName:
    "sidebar-footer relative p-3 flex flex-col items-center justify-center gap-3 bg-transparent mt-2",
  sidebarProfileMetaLabelClassName: "text-[10px] text-slate-400",
  sidebarProfileMetaValueClassName:
    "truncate text-[12px] text-slate-800 normal-case tracking-normal max-w-full",
  defaultBadgeLabel: "Portal",
  defaultPowerBiEmbedUrl: null,
  defaultIsPaid: false,
} satisfies Partial<PortalBrandPreset>;

export function definePortalBranding(
  mode: PortalProductId,
  product: Omit<PortalBrandPreset, keyof typeof COMMON_SIDEBAR | "mode"> &
    Partial<Pick<PortalBrandPreset, keyof typeof COMMON_SIDEBAR>>,
): PortalBrandPreset {
  return { ...COMMON_SIDEBAR, ...product, mode } as PortalBrandPreset;
}
