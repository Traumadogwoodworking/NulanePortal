import type { DashboardFilterPatch, DashboardWidgetConfig } from "./dashboardTypes";
import type { HomeDashboardFilters } from "./dashboardTypes";
import type { DashboardAnalyticsResponse } from "@/lib/services/reportService";
import { DashboardCard } from "./cards/DashboardCard";
import { WidgetRenderer } from "./widgets/WidgetRenderer";

const sizeClass: Record<string, string> = {
  sm: "xl:col-span-2",
  md: "xl:col-span-3",
  lg: "xl:col-span-4",
  wide: "xl:col-span-6",
};

export function HomeDashboardGrid({
  widgets,
  snapshot,
  filters,
  isLoading,
  error,
  onFilter,
}: {
  widgets: DashboardWidgetConfig[];
  snapshot?: DashboardAnalyticsResponse;
  filters: HomeDashboardFilters;
  isLoading?: boolean;
  error?: string | null;
  onFilter: (patch: DashboardFilterPatch) => void;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-6">
      {widgets.map((widget) => {
        const data = widget.selector({ snapshot, filters });
        const isEmpty = "rows" in data ? data.rows.length === 0 : false;
        return (
          <div key={widget.id} className={sizeClass[widget.size] ?? sizeClass.md}>
            <DashboardCard title={widget.title} isLoading={isLoading} error={error} isEmpty={isEmpty} emptyLabel={widget.emptyLabel}>
              <WidgetRenderer widget={widget} data={data} onFilter={onFilter} />
            </DashboardCard>
          </div>
        );
      })}
    </div>
  );
}
