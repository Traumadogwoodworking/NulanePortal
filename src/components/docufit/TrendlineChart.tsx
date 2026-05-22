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

export function getTrendlineWindow(points: MeasurementPoint[]) {
  return points.slice(-30);
}

export function TrendlineChart({ points }: { points: MeasurementPoint[] }) {
  const windowPoints = getTrendlineWindow(points);
  const chart = (
    <LineChart data={windowPoints} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
      <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
      <XAxis
        dataKey="takenAt"
        tick={{ fill: chartTheme.colors.text, fontSize: chartTheme.fontSize.axis }}
        tickFormatter={(value) => new Date(value).toLocaleDateString([], { month: "short", day: "numeric" })}
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
        labelFormatter={(value) => new Date(value as string).toLocaleString()}
      />
      <Line
        type="monotone"
        dataKey="measurement.value"
        stroke={chartTheme.colors.line}
        strokeWidth={3}
        dot={false}
        activeDot={{ r: 5, fill: chartTheme.colors.line }}
      />
    </LineChart>
  );

  return (
    <div className="h-80 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Trendline</p>
        <h3 className="mt-1 text-lg font-black text-slate-950">Last 30 measurements</h3>
      </div>
      {typeof window === "undefined" ? (
        <div className="h-[calc(100%-3.5rem)] w-full">
          <LineChart width={760} height={240} data={windowPoints} margin={{ top: 8, right: 18, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
            <XAxis
              dataKey="takenAt"
              tick={{ fill: chartTheme.colors.text, fontSize: chartTheme.fontSize.axis }}
              tickFormatter={(value) => new Date(value).toLocaleDateString([], { month: "short", day: "numeric" })}
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
              labelFormatter={(value) => new Date(value as string).toLocaleString()}
            />
            <Line
              type="monotone"
              dataKey="measurement.value"
              stroke={chartTheme.colors.line}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: chartTheme.colors.line }}
            />
          </LineChart>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="88%">
          {chart}
        </ResponsiveContainer>
      )}
    </div>
  );
}

type TrendlineDataUrlOptions = {
  width?: number;
  height?: number;
};

export async function TrendlineChartToDataURL(
  points: MeasurementPoint[],
  options: TrendlineDataUrlOptions = {}
): Promise<string | null> {
  if (typeof document === "undefined") {
    return null;
  }
  const width = options.width ?? 720;
  const height = options.height ?? 320;
  const padding = { top: 32, right: 32, bottom: 32, left: 42 };
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const windowPoints = getTrendlineWindow(points);
  if (windowPoints.length === 0) {
    return canvas.toDataURL("image/png");
  }

  const values = windowPoints.map((point) => point.measurement?.value ?? 0);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xStep = plotWidth / Math.max(windowPoints.length - 1, 1);

  const coords = windowPoints.map((point, index) => {
    const value = point.measurement?.value ?? 0;
    const normalized = (value - minValue) / range;
    const x = padding.left + index * xStep;
    const y = padding.top + (1 - normalized) * plotHeight;
    return { x, y };
  });

  // grid
  ctx.strokeStyle = chartTheme.colors.grid;
  ctx.lineWidth = 0.5;
  ctx.setLineDash([3, 3]);
  for (let i = 0; i <= 3; i += 1) {
    const y = padding.top + (plotHeight / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // trendline fill
  ctx.beginPath();
  coords.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.lineTo(coords[coords.length - 1].x, height - padding.bottom);
  ctx.lineTo(coords[0].x, height - padding.bottom);
  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, "rgba(16, 185, 129, 0.25)");
  gradient.addColorStop(1, "rgba(16, 185, 129, 0)");
  ctx.fillStyle = gradient;
  ctx.fill();

  // trendline stroke
  ctx.beginPath();
  coords.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.strokeStyle = chartTheme.colors.line;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = chartTheme.colors.text;
  ctx.font = "10px 'Inter', 'Helvetica Neue', sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillText(`${minValue.toFixed(1)} mm`, padding.left - 6, height - padding.bottom + 10);
  ctx.fillText(`${maxValue.toFixed(1)} mm`, padding.left - 6, padding.top + 6);

  return canvas.toDataURL("image/png");
}
