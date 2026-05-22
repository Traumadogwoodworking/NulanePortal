import { axe } from "vitest-axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MovingAveragePoint } from "@/lib/docufit/anomalyUtils";
import { AnomalyTable } from "@/components/docufit/AnomalyTable";

const anomalies: MovingAveragePoint[] = [
  { id: "a-1", takenAt: "2026-04-01T09:00:00Z", dimension: "door-gap", rawValue: 10, sma: 3, delta: 7 },
  { id: "a-2", takenAt: "2026-04-01T10:00:00Z", dimension: "roof", rawValue: 12, sma: 4, delta: 8 },
];

describe("AnomalyTable", () => {
  it("renders table rows when anomalies exist", async () => {
    const { container } = render(<AnomalyTable anomalies={anomalies} />);
    expect(screen.getByText(/Anomalies/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Δ/i).length).toBeGreaterThanOrEqual(anomalies.length);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("shows empty state explanation when there are no anomalies", async () => {
    const { container } = render(<AnomalyTable anomalies={[]} />);
    expect(screen.getByText(/No recent anomalies detected/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
