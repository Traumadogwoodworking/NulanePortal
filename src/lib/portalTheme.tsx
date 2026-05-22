"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type PortalThemeMode = "branded" | "dark" | "light";

export const PORTAL_THEME_KEY = "docudent-theme-mode";

export function getStoredPortalThemeMode(): PortalThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  const stored = window.localStorage.getItem(PORTAL_THEME_KEY) as PortalThemeMode | null;
  if (stored === "branded" || stored === "dark" || stored === "light") {
    return stored;
  }
  return "light";
}

export function usePortalThemeMode() {
  const mode = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") {
        return () => {};
      }
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    getStoredPortalThemeMode,
    () => "light"
  );

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
    const current = getStoredPortalThemeMode();
    const next = current === "branded" ? "dark" : current === "dark" ? "light" : "branded";
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PORTAL_THEME_KEY, next);
      window.dispatchEvent(new StorageEvent("storage", { key: PORTAL_THEME_KEY, newValue: next }));
    }
  }, []);

  return { mode, cycleThemeMode };
}
