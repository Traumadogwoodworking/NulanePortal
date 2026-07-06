import type { RuntimeRenderPayload, RuntimeWidgetDefinition } from "../types";
import { getWidgetRows } from "../render-adapters";
import { RuntimeChartWidget } from "./RuntimeChartWidget";
import { RuntimeMetricWidget } from "./RuntimeMetricWidget";
import { RuntimeTableWidget } from "./RuntimeTableWidget";

export function DashboardWidgetRenderer({ payload, widget }: { payload: RuntimeRenderPayload; widget: RuntimeWidgetDefinition }) {
  const rows = getWidgetRows(payload, widget);
  if (widget.kind === "table") {
    return <RuntimeTableWidget widget={widget} rows={rows} />;
  }
  if (widget.kind === "metric") {
    return <RuntimeMetricWidget widget={widget} rows={rows} />;
  }
  return <RuntimeChartWidget widget={widget} rows={rows} />;
}
