import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ChartDatum } from "../dashboardTypes";

function readChartDatum(datum: unknown): ChartDatum {
  const record = datum && typeof datum === "object" ? datum as Record<string, unknown> : {};
  const payload = record.payload && typeof record.payload === "object" ? record.payload as Record<string, unknown> : record;
  return payload as unknown as ChartDatum;
}

export function BarWidget({
  rows,
  onDatumClick,
}: {
  rows: ChartDatum[];
  onDatumClick?: (datum: ChartDatum) => void;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={58} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} onClick={(datum) => onDatumClick?.(readChartDatum(datum))} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
