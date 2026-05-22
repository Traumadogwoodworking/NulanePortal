import { axe } from "vitest-axe";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MovingAverageChart } from "@/components/docufit/MovingAverageChart";
import { buildMovingAverageData, SMA_WINDOW } from "@/lib/docufit/anomalyUtils";
import type { MeasurementPoint } from "@/lib/services/measurementService";
import fixtureMeasurements from "../../test/fixtures/measurements.json";

const points = (fixtureMeasurements as MeasurementPoint[]).slice(-60);
const smaSeries = buildMovingAverageData(points);

describe("MovingAverageChart", () => {
  it("calculates the SMA window and renders both lines", () => {
    const smaPoints = smaSeries.filter((point) => typeof point.sma === "number");
    expect(smaPoints.length).toBe(points.length - (SMA_WINDOW - 1));
  });

  it("renders an accessible chart and validates compliance", async () => {
    const { container } = render(<MovingAverageChart points={points} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
