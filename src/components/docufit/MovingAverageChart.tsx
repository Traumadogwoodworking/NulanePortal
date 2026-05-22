"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTheme } from "@/lib/chartTheme";
import type { MeasurementPoint } from "@/lib/services/measurementService";
import { getTrendlineWindow } from "./TrendlineChart";
import { buildMovingAverageData } from "@/lib/docufit/anomalyUtils";

const RAW_LINE_COLOR = "#94a3b8";

const tooltipFormatter = (rawValue: number, name: string) => {
  if (!Number.isFinite(rawValue)) {
    return ["—", name === "sma" ? "SMA30" : "Raw"];
  }
  return [`${rawValue.toFixed(1)} mm`, name === "sma" ? "SMA30" : "Raw"];
};

const labelFormatter = (value: string | number) => {
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString([], { month: "short", day: "numeric" });
};

export function MovingAverageChart({ points }: { points: MeasurementPoint[] }) {
  const windowPoints = getTrendlineWindow(points);
  const chartData = buildMovingAverageData(windowPoints);

  return (
    <div className="h-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Moving average</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">SMA30 vs raw values</h3>
        <p className="text-xs text-slate-500">Δ shown when smoothing 30 measurements</p>
      </div>
      <ResponsiveContainer width="100%" height="88%">
        <LineChart data={chartData} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
          <XAxis
            dataKey="takenAt"
            tick={{ fill: chartTheme.colors.text, fontSize: chartTheme.fontSize.axis }}
            tickFormatter={(value) => labelFormatter(value)}
            stroke={chartTheme.colors.grid}
          />
          <YAxis
            tick={{ fill: chartTheme.colors.text, fontSize: chartTheme.fontSize.axis }}
            stroke={chartTheme.colors.grid}
            unit=" mm"
          />
          <Tooltip
            contentStyle={{
              borderRadius: "16px",
              border: `1px solid ${chartTheme.colors.grid}`,
              background: chartTheme.colors.surface,
              fontSize: `${chartTheme.fontSize.label}px`,
            }}
            labelFormatter={(value) => labelFormatter(value)}
            formatter={(value, name) => tooltipFormatter(Number(value), String(name))}
          />
          <Line
            name="Raw"
            type="monotone"
            dataKey="rawValue"
            stroke={RAW_LINE_COLOR}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5, fill: RAW_LINE_COLOR }}
          />
          <Line
            name="SMA30"
            type="monotone"
            dataKey="sma"
            stroke={chartTheme.colors.line}
            strokeWidth={3}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
