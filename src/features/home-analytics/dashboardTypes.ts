import type { DashboardAnalyticsResponse } from "@/lib/services/reportService";
import type { HomeAnalyticsFilters, HomeFilterKey } from "./types";

export type HomeDashboardFilters = HomeAnalyticsFilters;

export type DashboardWidgetSize = "sm" | "md" | "lg" | "wide";

export type DashboardWidgetType = "metric" | "bar" | "pie" | "line";

export type DashboardFilterPatch = {
  key: HomeFilterKey;
  value: string;
};

export type MetricWidgetData = {
  value: string | number;
  detail?: string;
};

export type ChartDatum = {
  label: string;
  value: number;
  filterValue?: string;
  secondaryValue?: number;
  secondaryLabel?: string;
};

export type ChartWidgetData = {
  rows: ChartDatum[];
};

export type DashboardWidgetData = MetricWidgetData | ChartWidgetData;

export type DashboardSelectorContext = {
  snapshot?: DashboardAnalyticsResponse;
  filters: HomeDashboardFilters;
};

export type DashboardWidgetConfig = {
  id: string;
  title: string;
  type: DashboardWidgetType;
  selector: (context: DashboardSelectorContext) => DashboardWidgetData;
  size: DashboardWidgetSize;
  clickFilter?: (datum: ChartDatum) => DashboardFilterPatch | null;
  exportKey?: string;
  emptyLabel?: string;
};
