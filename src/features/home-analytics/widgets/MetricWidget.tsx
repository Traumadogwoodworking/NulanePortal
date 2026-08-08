import type { MetricWidgetData } from "../dashboardTypes";

export function MetricWidget({ data }: { data: MetricWidgetData }) {
  return (
    <div className="space-y-1">
      <div className="text-3xl font-black text-slate-950">{data.value}</div>
      {data.detail ? <div className="text-sm text-slate-500">{data.detail}</div> : null}
    </div>
  );
}
