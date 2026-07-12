import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { ChartDatum } from "../dashboardTypes";

const COLORS = ["#2563eb", "#dc2626", "#0f766e", "#7c3aed", "#ea580c", "#16a34a"];

function readChartDatum(datum: unknown): ChartDatum {
  const record = datum && typeof datum === "object" ? datum as Record<string, unknown> : {};
  const payload = record.payload && typeof record.payload === "object" ? record.payload as Record<string, unknown> : record;
  return payload as unknown as ChartDatum;
}

export function PieWidget({
  rows,
  onDatumClick,
}: {
  rows: ChartDatum[];
  onDatumClick?: (datum: ChartDatum) => void;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <PieChart>
          <Tooltip />
          <Pie
            data={rows}
            dataKey="value"
            nameKey="label"
            innerRadius={48}
            outerRadius={86}
            paddingAngle={2}
            onClick={(datum) => onDatumClick?.(readChartDatum(datum))}
          >
            {rows.map((row, index) => (
              <Cell key={row.label} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
