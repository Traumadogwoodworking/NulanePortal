"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { filterNavSectionsByAccess, navSections } from "@/lib/navigation";
import { usePortalSession } from "@/lib/portalSession";
import { resolvePortalBranding } from "@/lib/branding";
import { usePortalBrandingSnapshot } from "@/lib/portalData";
import { Clock3, Home, LayoutGrid, Mail } from "lucide-react";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname.startsWith(href);
}

const sharedSidebarIconSize = "w-[30px] h-[30px]";

const HomeIcon = () => <Home className={sharedSidebarIconSize} />;






const ReportsIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path d="M9 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M9 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PeopleIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path
      d="M5 20c0-3.5 2.5-5.5 7-5.5s7 2 7 5.5"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinecap="round"
    />
  </svg>
);

const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 3l7 3v5.5c0 4.5-3 7-7 7s-7-2.5-7-7V6l7-3z"
      stroke="currentColor"
      strokeWidth="1.5"
      fill="none"
      strokeLinejoin="round"
    />
    <path d="M12 11v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const FacilityIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M5 20V9h14v11H5z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinejoin="round"
    />
    <path d="M9 13h2v4H9z" stroke="currentColor" strokeWidth="1.8" fill="none" />
    <path d="M13 13h2v4h-2z" stroke="currentColor" strokeWidth="1.8" fill="none" />
  </svg>
);

const NotificationsIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16 16v-4a4 4 0 0 0-8 0v4l-2 2h12l-2-2z"
      stroke="currentColor"
      strokeWidth="1.8"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10 4h4v3H10z" stroke="currentColor" strokeWidth="1.8" fill="none" />
  </svg>
);

const EmailIcon = () => <Mail className={sharedSidebarIconSize} />;

const TrainIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize + " flex-shrink-0"} xmlns="http://www.w3.org/2000/svg" fill="none">
    <rect x="3" y="15" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 15V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5 10h14" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <path d="M9 4v11" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <path d="M15 4v11" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <circle cx="7" cy="17" r="1" fill="currentColor" />
    <circle cx="17" cy="17" r="1" fill="currentColor" />
    <path d="M2 20h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.2" />
  </svg>
);

const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize + " flex-shrink-0"} xmlns="http://www.w3.org/2000/svg" fill="none">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path
      d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-4.4-4.5-8-10-8Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg" fill="none">
    <path d="M12 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 20.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SupportIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg" fill="none">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const PenIcon = () => (
  <svg viewBox="0 0 24 24" className={sharedSidebarIconSize} xmlns="http://www.w3.org/2000/svg" fill="none">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function PortalSidebar() {
  const pathname = usePathname();
  const safePathname = pathname ?? "/";
  const { session, isAdmin, isOrgAdmin, isFacilityAdmin, isSuperAdmin, isPortalAccessAllowed, isAwct, isShap, isSvl, hasPermission, logout } = usePortalSession();
  const { data: brandingSnapshot } = usePortalBrandingSnapshot();

  const branding = useMemo(() => {
    return resolvePortalBranding({
      session,
      pathname: safePathname,
      brandingSnapshot: brandingSnapshot ?? null,
    });
  }, [brandingSnapshot, safePathname, session]);

  const activeLogo = branding.logoUrl ?? branding.staticLogoUrl;

  const accessInfo = useMemo(
    () => ({ isAdmin, isOrgAdmin, isFacilityAdmin, isSuperAdmin, isPortalAccessAllowed, isAwct, isShap, isSvl, hasPermission }),
    [isAdmin, isOrgAdmin, isFacilityAdmin, isSuperAdmin, isPortalAccessAllowed, isAwct, isShap, isSvl, hasPermission]
  );

  const visibleSections = useMemo(
    () => filterNavSectionsByAccess(navSections, accessInfo),
    [accessInfo]
  );

  const [profileOpen, setProfileOpen] = useState(false);
  const profileLabel =
    session?.user?.display_name ||
    [session?.user?.first_name, session?.user?.last_name].filter(Boolean).join(" ") ||
    session?.user?.email ||
    branding.organizationName ||
    branding.appLabel ||
    "Portal";
  const profileInitial = (profileLabel?.[0] || "N").toUpperCase();
  const sidebarBg = branding.portalBrandColor;
  const sidebarAccent = branding.portalBrandAccentColor;
  const sidebarText = branding.sidebarTextEnforced;
  const sidebarLink = branding.sidebarLinkEnforced;
  return (
    <aside
      id="sidebar"
      className={branding.sidebarShellClassName}
      style={{
        backgroundColor: branding.sidebarBgEnforced || sidebarBg,
        boxShadow: `0 18px 50px -28px var(--brand-shadow, rgba(15,23,42,0.24))`,
        fontFamily: "var(--font-inter), var(--font-geist-sans), sans-serif",
      }}
    >
      <div
        id="sidebar-header"
        className={branding.sidebarHeaderClassName}
        style={{
          ...branding.sidebarHeaderStyle,
          height: "auto",
          minHeight: "176px",
          padding: "18px 14px",
          background: branding.sidebarBgEnforced || sidebarBg,
          borderBottomColor: "rgba(255,255,255,0.12)",
          boxShadow: "none",
        }}
      >
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className={branding.sidebarLogoShellClassName}>
          {activeLogo ? (
            <Image
              src={activeLogo}
              alt={branding.appLabel || branding.organizationName || "Portal"}
              width={340}
              height={120}
              className="h-auto w-full max-w-[220px] object-contain"
              priority
            />
          ) : null}
        </div>
      </div>

      <div id="sidebar-content" className={branding.sidebarContentClassName}>
        {visibleSections.map((section) => (
          <div key={section.key} className="nav-section-container">
            {section.key !== "core" ? (
              <div className={branding.sidebarSectionLabelClassName}>
                {section.title}
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = isActive(safePathname, item.href);
                const isImageIcon = Boolean(item.icon && (item.icon.startsWith("/") || item.icon.startsWith("http")));
                const isDocudentIcon = item.href === "/docudent";
                const iconBoxClass = isDocudentIcon ? "nav-link-icon nav-link-icon--docudent" : "nav-link-icon nav-link-icon--large";
                const imageShellClass =
                  isDocudentIcon && branding.mode === "definianInspection"
                    ? "nav-link-icon nav-link-icon--docudent -my-4 rounded-[0.9rem] bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                    : isDocudentIcon
                      ? "nav-link-icon nav-link-icon--docudent -my-4"
                      : "nav-link-icon nav-link-icon--large -my-4";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                  className={`nav-link group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                    active ? branding.sidebarActiveLinkClassName : branding.sidebarInactiveLinkClassName
                  }`}
                  style={{
                    color: active ? sidebarAccent : sidebarLink,
                    textShadow: active ? `0 0 14px var(--brand-glow, rgba(37,99,235,0.16))` : "none",
                  }}
                >
                    <div className={`flex items-center justify-center ${isImageIcon ? imageShellClass : iconBoxClass}`}>
                      {item.icon === "home" && <HomeIcon />}
                      {item.icon === "dashboard" && <LayoutGrid className={sharedSidebarIconSize} />}
                      {item.icon === "reports" && <ReportsIcon />}
                      {item.icon === "people" && <PeopleIcon />}
                      {item.icon === "shield" && <ShieldIcon />}
                      {item.icon === "facility" && <FacilityIcon />}
                      {item.icon === "notifications" && <NotificationsIcon />}
                      {item.icon === "email" && <EmailIcon />}
                      {item.icon === "clock" && <Clock3 className={sharedSidebarIconSize} />}
                      {item.icon === "palette" && <PaletteIcon />}
                      {item.icon === "rsa" && <TrainIcon />}
                      {item.icon === "support" && <SupportIcon />}
                      {item.icon === "settings" && <SettingsIcon />}
                      {item.icon === "pen" && <PenIcon />}
                      {isImageIcon && typeof item.icon === "string" && (
                        <Image
                          src={
                            item.href === "/docudent"
                              ? branding.appNavLogoUrl ?? item.brandLogo ?? item.icon
                              : item.brandLogo ?? item.icon
                          }
                          alt={item.href === "/docudent" ? branding.appLabel ?? item.label : item.label}
                          width={isDocudentIcon ? 260 : 180}
                          height={isDocudentIcon ? 260 : 180}
                          className={isDocudentIcon ? "object-contain scale-[2.3]" : "object-contain scale-[2.25]"}
                        />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-start ml-[5px]">
                      <span
                        className="truncate text-sm font-semibold leading-tight"
                        style={{ color: active ? sidebarAccent : sidebarText }}
                      >
                        {item.href === "/docudent" ? branding.appLabel ?? item.label : item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className={branding.sidebarFooterClassName}>
        {branding.footerLogoUrl ? (
          <Image
            src={branding.footerLogoUrl}
            alt={branding.organizationName || branding.appLabel || "Portal"}
            width={220}
            height={72}
          />
        ) : null}
        <div className="relative w-full">
          {profileOpen ? (
            <div className={branding.sidebarProfilePopoverClassName}>
              <div className="space-y-2 border-b border-slate-100 pb-3 text-center">
                <p className="text-[10px] uppercase tracking-[0.35em] text-slate-400">Account</p>
                <div className={`mx-auto ${branding.sidebarProfileAvatarClassName}`}>
                  {profileInitial}
                </div>
                <p
                  className={`text-sm font-black ${branding.sidebarProfileMetaValueClassName}`}
                  style={{ color: sidebarAccent }}
                >
                  {profileLabel}
                </p>
              </div>
              <div className="space-y-2 pt-3">
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className={branding.sidebarProfileLogoutButtonClassName}
                >
                  <span>Logout</span>
                  <LogoutIcon />
                </button>
              </div>
            </div>
          ) : null}
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className={branding.sidebarProfileToggleClassName}
          >
            <div className={branding.sidebarProfileAvatarClassName}>
              {profileInitial}
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-start text-left leading-tight overflow-hidden">
              <span className={branding.sidebarProfileMetaLabelClassName} style={{ color: sidebarText }}>Account</span>
              <span className={branding.sidebarProfileMetaValueClassName} style={{ color: sidebarAccent }}>{profileLabel}</span>
            </div>
          </button>
        </div>
      </div>
    </aside>
  );
}
