import type { ReactNode } from "react";

export type HomeCountMode = "reports" | "damages";

export type HomeFilterKey =
  | "facility"
  | "report_id"
  | "vin"
  | "inspection_type"
  | "make"
  | "model"
  | "yard"
  | "severity"
  | "damage_area"
  | "damage_type"
  | "inspector_email"
  | "status";

export type HomeAnalyticsFilters = {
  from?: string;
  to?: string;
  facilityKey: string;
  inspectorKey: string;
  status?: string;
  query?: string;
  countMode: HomeCountMode;
  reportId?: string;
  vin?: string;
  inspectionType?: string;
  make?: string;
  model?: string;
  yard?: string;
  severity?: string;
  damageArea?: string;
  damageType?: string;
};

export type ActiveHomeFilterChip = {
  key: string;
  label: string;
  value: string;
};

export type ClearDamageBreakdownItem = {
  label: string;
  count: number;
};

export type TrendSplitPair = {
  damageCount: number;
  clearCount: number;
  hasSplitData: boolean;
};

export type AnalyticsClearDamageCoverage = {
  hasRows: boolean;
  splitRows: number;
  splitRowsMissingDamage: number;
  splitRowsMissingClear: number;
  hasClearDamageSplit: boolean;
  missingSourceFields: string[];
};

export type AnalyticsDailySplitCoverage = {
  facility: AnalyticsClearDamageCoverage;
  inspector: AnalyticsClearDamageCoverage;
  endpoint: string;
  countMode: HomeCountMode;
};

export type AnalyticsCoverageIssue = {
  visualId: string;
  label: string;
  missingFields: string[];
  affectedRows?: number;
  endpoint: string;
};

export type HomeDashboardVisualId =
  | "summary-total-damage-submissions"
  | "summary-damaged-today"
  | "summary-damage-vs-clear"
  | "summary-rsa-reports"
  | "facility-daily-trend"
  | "inspector-daily-trend"
  | "severity"
  | "top-damage-areas"
  | "top-damage-types";

export type HomeDashboardVisualConfig = {
  id: HomeDashboardVisualId;
  title: string;
  description: string;
  endpoint: string;
  requiredFields: string[];
  dataSource: "dashboard-analytics" | "report-list-preview";
  measures: string[];
  dimensions: string[];
  slicers: string[];
  adapter: string;
  component: string;
  exportFile: string;
  emptyState: string;
};

export type HomeDashboardSectionConfig = {
  id: string;
  title: string;
  description: string;
  visualIds: HomeDashboardVisualId[];
};

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  detail?: string;
  icon?: ReactNode;
  accent?: boolean;
};
