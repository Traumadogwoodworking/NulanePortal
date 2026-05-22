import { renderToStaticMarkup } from "react-dom/server";
import { TrendlineChart, getTrendlineWindow } from "../components/docufit/TrendlineChart";

describe("TrendlineChart", () => {
  it("keeps only the last 30 points", () => {
    const points = Array.from({ length: 35 }, (_, index) => ({
      id: `m-${index + 1}`,
      takenAt: `2026-04-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
      dimension: "door-gap",
      measurement: { value: index + 1 },
    }));
    expect(getTrendlineWindow(points).length).toBe(30);
  });

  it("renders chart markup", () => {
    const markup = renderToStaticMarkup(
      <TrendlineChart
        points={[
          {
            id: "m-1",
            takenAt: "2026-04-01T10:00:00.000Z",
            dimension: "door-gap",
            measurement: { value: 2.5 },
          },
        ]}
      />
    );
    expect(markup).toContain("recharts-wrapper");
    expect(markup).toContain("Trendline");
  });
});
