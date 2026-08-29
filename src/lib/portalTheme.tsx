"use client";

import { useCallback, useEffect } from "react";

export type PortalThemeMode = "light";

export const PORTAL_THEME_KEY = "docudent-theme-mode";

export function getStoredPortalThemeMode(): PortalThemeMode {
  return "light";
}

export function usePortalThemeMode() {
  const mode: PortalThemeMode = "light";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", mode);
      document.documentElement.dataset.portalTheme = mode;
      document.body.dataset.portalTheme = mode;
    }
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PORTAL_THEME_KEY, mode);
    }
  }, [mode]);

  const cycleThemeMode = useCallback(() => {
    // The DocuDent review portal intentionally uses one consistent light theme.
  }, []);

  return { mode, cycleThemeMode };
}
