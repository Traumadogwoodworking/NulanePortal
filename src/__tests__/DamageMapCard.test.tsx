import { axe } from "vitest-axe";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DamageMapCard } from "@/components/reports/DamageMapCard";

describe("DamageMapCard", () => {
  const entries = [
    { damage_area: "front", damage_type: "dent", severity: "high" },
    { damage_area: "rear", damage_type: "scratch", severity: "medium" },
    { damage_area: "roof", damage_type: "scuff", severity: "low" },
  ];
  const report = {
    report_id: "report-1",
    damage_entries: entries,
    location: { location_label: "Bay 4", location_id: "bay-4" },
    splat_urls: ["https://example.com/splat.png"],
    overview: { metadata: { navigationText: "Dock A" } },
    metadata: { inspector: "test" },
  };

  it("renders the resolved splat image", async () => {
    const { container } = render(<DamageMapCard report={report} />);
    expect(screen.getByText(/Damage map/i)).toBeInTheDocument();
    expect(screen.getByText("1 item")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /damage splat/i })).toHaveAttribute(
      "src",
      "https://example.com/splat.png",
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders a graceful empty state when no splat is available", async () => {
    const { container } = render(
      <DamageMapCard
        report={{
          report_id: "empty-1",
          damage_entries: [],
        }}
      />
    );
    expect(screen.getByText("0 items")).toBeInTheDocument();
    expect(screen.getByText(/Splat unavailable/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
