import { ANALYTICS_DAILY_FACILITY_REQUIREMENTS, ANALYTICS_DAILY_INSPECTOR_REQUIREMENTS, DASHBOARD_ANALYTICS_ENDPOINT } from "./constants";
import type { HomeDashboardVisualConfig } from "./types";

export const HOME_DASHBOARD_VISUALS: HomeDashboardVisualConfig[] = [
  {
    id: "summary-total-damage-submissions",
    title: "Total Damage Submissions",
    description: "Damage workflow submissions, with clear/no-damage kept visible and RSA excluded.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ["totals.damageReports", "totals.noDamageReports"],
  },
  {
    id: "summary-damaged-today",
    title: "Damaged Submissions Today",
    description: "Daily damaged submission count from explicit backend damaged fields.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ["totals.damageReportsToday or currentPeriod.damageToday"],
  },
  {
    id: "summary-damage-vs-clear",
    title: "Damage vs Clear",
    description: "Side-by-side split when backend sends damaged and clear fields.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ["totals.damageReports", "totals.noDamageReports or totals.clearReports"],
  },
  {
    id: "summary-rsa-reports",
    title: "RSA Reports",
    description: "RSA kept as a separate report family, not mixed into damage submissions.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ["totals.rsaReports"],
  },
  {
    id: "facility-daily-trend",
    title: "Facility Daily Trend",
    description: "Per-day facility clear and damaged breakdown.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ANALYTICS_DAILY_FACILITY_REQUIREMENTS,
  },
  {
    id: "inspector-daily-trend",
    title: "Inspector Daily Trend",
    description: "Per-day inspector clear and damaged breakdown.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ANALYTICS_DAILY_INSPECTOR_REQUIREMENTS,
  },
  {
    id: "severity",
    title: "Severity",
    description: "Damage severity distribution.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ["severity.level", "severity.count"],
  },
  {
    id: "top-damage-areas",
    title: "Top Damage Areas",
    description: "Highest-volume damaged vehicle areas.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ["topAreas.name", "topAreas.count"],
  },
  {
    id: "top-damage-types",
    title: "Top Damage Types",
    description: "Highest-volume damage type labels.",
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    requiredFields: ["topTypes.name", "topTypes.count"],
  },
];

export function getHomeDashboardVisual(id: HomeDashboardVisualConfig["id"]): HomeDashboardVisualConfig {
  return HOME_DASHBOARD_VISUALS.find((visual) => visual.id === id) ?? HOME_DASHBOARD_VISUALS[0];
}
