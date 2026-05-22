import { axe } from "vitest-axe";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VinBadge, getVinBadgeClassName, resolveVinBadgeStatus } from "@/components/reports/VinBadge";

describe("VinBadge helpers", () => {
  it("maps verified status to the emerald badge class", () => {
    expect(resolveVinBadgeStatus("verified")).toBe("verified");
    expect(getVinBadgeClassName("verified")).toContain("emerald");
  });

  it("falls back to unknown for unexpected values", () => {
    expect(resolveVinBadgeStatus("something-else")).toBe("unknown");
    expect(getVinBadgeClassName("unknown")).toContain("slate");
  });
});

describe("VinBadge component", () => {
  it("renders a fallback badge when no VIN is provided", async () => {
    const { container } = render(<VinBadge vin="" />);
    expect(screen.getByText("VIN")).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("fetches VIN status and updates the label", async () => {
    render(<VinBadge vin="1HGBH41JXMN109186" />);
    await waitFor(() => {
      expect(screen.getByText(/Verified/)).toBeInTheDocument();
    });
  });

  it("opens with accessible markup", async () => {
    const { container } = render(<VinBadge vin="1HGBH41JXMN109186" />);
    await waitFor(() => screen.getByText(/Verified/));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("retries fetch when re-mounted", async () => {
    const { rerender } = render(<VinBadge vin="1HGBH41JXMN109187" />);
    rerender(<VinBadge vin="1HGBH41JXMN109188" />);
    await waitFor(() => {
      expect(screen.getByText(/Verified/)).toBeInTheDocument();
    });
  });
});
