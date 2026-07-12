import type { ChartWidgetData, DashboardFilterPatch, DashboardWidgetConfig, DashboardWidgetData, MetricWidgetData } from "../dashboardTypes";
import { BarWidget } from "./BarWidget";
import { LineWidget } from "./LineWidget";
import { MetricWidget } from "./MetricWidget";
import { PieWidget } from "./PieWidget";

function isChartData(data: DashboardWidgetData): data is ChartWidgetData {
  return "rows" in data;
}

export function WidgetRenderer({
  widget,
  data,
  onFilter,
}: {
  widget: DashboardWidgetConfig;
  data: DashboardWidgetData;
  onFilter?: (patch: DashboardFilterPatch) => void;
}) {
  if (widget.type === "metric") {
    return <MetricWidget data={data as MetricWidgetData} />;
  }
  const rows = isChartData(data) ? data.rows : [];
  const onDatumClick = widget.clickFilter
    ? (datum: { label: string; value: number; filterValue?: string }) => {
        const patch = widget.clickFilter?.(datum);
        if (patch) onFilter?.(patch);
      }
    : undefined;
  if (widget.type === "pie") return <PieWidget rows={rows} onDatumClick={onDatumClick} />;
  if (widget.type === "line") return <LineWidget rows={rows} />;
  return <BarWidget rows={rows} onDatumClick={onDatumClick} />;
}
