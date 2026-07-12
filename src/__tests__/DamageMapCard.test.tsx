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
    splatImageUrl: "https://example.com/canonical-splat.png",
    overview: { metadata: { navigationText: "Dock A" } },
    metadata: { inspector: "test" },
  };

  it("renders the canonical splat image", async () => {
    const { container } = render(<DamageMapCard report={report} />);
    expect(screen.getByText(/Damage map/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Damage splat" })).toHaveAttribute(
      "src",
      "https://example.com/canonical-splat.png"
    );
    expect(screen.getByText("1 item")).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("renders graceful empty state when no entries", async () => {
    const { container } = render(
      <DamageMapCard
        report={{
          report_id: "empty-1",
          damage_entries: [],
        }}
      />
    );
    expect(screen.getByText(/Splat unavailable/i)).toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
