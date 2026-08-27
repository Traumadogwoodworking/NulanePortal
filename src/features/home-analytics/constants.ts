import type { HomeFilterKey } from "./types";

export const DASHBOARD_ANALYTICS_ENDPOINT = "/api/dashboard/analytics";

export const HOME_DEFAULT_TREND_DAYS = 30;

export const HOME_ANALYTICS_FILTER_KEYS: HomeFilterKey[] = [
  "report_id",
  "vin",
  "inspection_type",
  "make",
  "model",
  "yard",
  "severity",
  "damage_area",
  "inspector_email",
  "status",
];

export const ANALYTICS_SPLIT_DAMAGE_KEYS_REPORTS = [
  "damageReports",
  "damage_reports",
  "reportsDamage",
  "damages",
  "damage_count",
];

export const ANALYTICS_SPLIT_CLEAR_KEYS_REPORTS = [
  "noDamageReports",
  "noDamageCount",
  "noDamageScans",
  "clearReports",
  "clearCount",
  "clearScans",
  "clear_count",
  "clear_reports",
];

export const ANALYTICS_SPLIT_DAMAGE_KEYS_ENTRIES = [
  "damageEntries",
  "totalDamages",
  "damage_count",
  "damageEntriesCount",
];

export const ANALYTICS_SPLIT_CLEAR_KEYS_ENTRIES = [
  "clearEntries",
  "clearCount",
  "noDamageCount",
  "noDamageScans",
  "clearScans",
  "clear_count",
  "clear_entries",
];

export const ANALYTICS_TOTAL_KEYS_REPORTS = [
  "totalReports",
  "reportCount",
  "reports",
  "submissions",
  "totalSubmissions",
  "count",
];

export const ANALYTICS_TOTAL_KEYS_ENTRIES = [
  "entries",
  "totalEntries",
  "damageEntries",
  "totalDamages",
  "count",
];

export const ANALYTICS_DAILY_FACILITY_REQUIREMENTS = [
  "date (or day / created_date)",
  "facility label (label, facility, name, navigation, location_label, or location_name)",
  "damageReports (or damage_count)",
  "noDamageReports (or clearReports)",
];

export const ANALYTICS_DAILY_INSPECTOR_REQUIREMENTS = [
  "date (or day / created_date)",
  "label / email (label, email)",
  "damageReports (or damage_count)",
  "noDamageReports (or clearReports)",
];
