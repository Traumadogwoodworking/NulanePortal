import type { MeasurementPoint } from "@/lib/services/measurementService";

export const SMA_WINDOW = 30;

export interface MovingAveragePoint {
  id: string;
  takenAt: string;
  dimension: string;
  rawValue: number;
  sma?: number;
  delta?: number;
}

export interface MeasurementAnomalyPayload {
  id: string;
  dimension: string;
  value: number;
  sma: number;
  delta: number;
}

export function buildMovingAverageData(
  points: MeasurementPoint[],
  windowSize = SMA_WINDOW
): MovingAveragePoint[] {
  const values = points.map((point) => point.measurement?.value ?? NaN);
  return points.map((point, index) => {
    const rawValue = values[index];
    let sma: number | undefined;
    let delta: number | undefined;
    if (Number.isFinite(rawValue) && index >= windowSize - 1) {
      const windowSlice = values.slice(index - windowSize + 1, index + 1);
      if (windowSlice.every(Number.isFinite)) {
        const sum = windowSlice.reduce((acc, value) => acc + value, 0);
        sma = sum / windowSize;
        delta = Math.abs(rawValue - sma);
      }
    }
    return {
      id: point.id,
      takenAt: point.takenAt,
      dimension: point.dimension,
      rawValue: Number.isFinite(rawValue) ? rawValue : 0,
      sma,
      delta,
    };
  });
}

export function detectAnomalies(
  series: MovingAveragePoint[],
  threshold = 4
): MovingAveragePoint[] {
  return series.filter((point) => point.sma != null && point.delta != null && point.delta > threshold);
}
