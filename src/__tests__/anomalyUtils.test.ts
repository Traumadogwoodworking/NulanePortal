import { test, expect } from "vitest";
import { buildMovingAverageData, detectAnomalies } from "@/lib/docufit/anomalyUtils";
import type { MeasurementPoint } from "@/lib/services/measurementService";

test("detects anomalies that exceed the configured delta threshold", () => {
  const points = Array.from({ length: 35 }, (_, index) => ({
    id: `m-${index + 1}`,
    takenAt: `2026-04-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    dimension: "door-gap",
    measurement: { value: index === 34 ? 92 : 82 },
  })) as MeasurementPoint[];

  const series = buildMovingAverageData(points);
  const anomalies = detectAnomalies(series, 4);

  expect(anomalies.length).toBeGreaterThan(0);
  expect(anomalies.every((point) => point.delta != null && point.delta > 4)).toBe(true);
});
