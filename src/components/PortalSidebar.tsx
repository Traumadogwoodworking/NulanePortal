"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FileText, Headset, Home, LogOut, Settings } from "lucide-react";
import { resolvePortalBranding } from "@/lib/branding";
import { filterNavSectionsByAccess, navSections, type PortalRoute } from "@/lib/navigation";
import { usePortalBrandingSnapshot } from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function routeIcon(icon: PortalRoute["icon"]): ReactNode {
  const className = "h-5 w-5";
  if (icon === "home") return <Home className={className} />;
  if (icon === "reports") return <FileText className={className} />;
  if (icon === "support") return <Headset className={className} />;
  return <Settings className={className} />;
}

export function PortalSidebar() {
  const pathname = usePathname() ?? "/home";
  const {
    session,
    isPortalAccessAllowed,
    logout,
  } = usePortalSession();
  const { data: brandingSnapshot } = usePortalBrandingSnapshot();
  const [profileOpen, setProfileOpen] = useState(false);

  const branding = useMemo(
    () =>
      resolvePortalBranding({
        session,
        pathname,
        brandingSnapshot: brandingSnapshot ?? null,
      }),
    [brandingSnapshot, pathname, session],
  );

  const visibleSections = useMemo(
    () =>
      filterNavSectionsByAccess(navSections, {
        isPortalAccessAllowed,
      }),
    [isPortalAccessAllowed],
  );

  const profileLabel =
    session?.user?.display_name ||
    [session?.user?.first_name, session?.user?.last_name].filter(Boolean).join(" ") ||
    session?.user?.email ||
    "Nulane account";
  const profileInitial = (profileLabel[0] || "N").toUpperCase();

  return (
    <aside id="sidebar" className={branding.sidebarShellClassName}>
      <div
        id="sidebar-header"
        className={branding.sidebarHeaderClassName}
        style={{ ...branding.sidebarHeaderStyle, minHeight: 148, padding: "16px 24px" }}
      >
        <Image
          src={branding.staticLogoUrl ?? "/media/Nulane_Systems-removebg-preview-inv.png"}
          alt="Nulane Systems"
          width={190}
          height={190}
          className={branding.sidebarLogoImageClassName}
          priority
        />
      </div>

      <div className="mx-3 mt-4 rounded-2xl border border-white/15 bg-white/10 p-3" aria-label="Current product">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-sm">
            <Image
              src={branding.appNavLogoUrl ?? "/media/Docudent.png"}
              alt="DocuDent"
              width={54}
              height={54}
              className="h-full w-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Product</p>
            <p className="truncate text-base font-black text-white">DocuDent</p>
          </div>
        </div>
      </div>

      <nav id="sidebar-content" aria-label="Portal navigation" className={branding.sidebarContentClassName}>
        {visibleSections.flatMap((section) =>
          section.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${
                  active ? branding.sidebarActiveLinkClassName : branding.sidebarInactiveLinkClassName
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/8">
                  {routeIcon(item.icon)}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          }),
        )}
      </nav>

      <div className={branding.sidebarFooterClassName}>
        <div className="relative w-full">
          {profileOpen ? (
            <div className={branding.sidebarProfilePopoverClassName}>
              <p className="truncate text-sm font-bold text-white">{profileLabel}</p>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  logout();
                }}
                className={`${branding.sidebarProfileLogoutButtonClassName} mt-3`}
              >
                <span>Logout</span>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            className={branding.sidebarProfileToggleClassName}
          >
            <span className={branding.sidebarProfileAvatarClassName}>{profileInitial}</span>
            <span className="min-w-0 text-left">
              <span className={`block ${branding.sidebarProfileMetaLabelClassName}`}>Account</span>
              <span className={`block ${branding.sidebarProfileMetaValueClassName}`}>{profileLabel}</span>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
