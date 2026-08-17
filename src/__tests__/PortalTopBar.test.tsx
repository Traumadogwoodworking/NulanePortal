import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PortalTopBar } from "@/components/PortalTopBar";

describe("PortalTopBar", () => {
  it("renders the Definian page heading without an organization selector", () => {
    render(<PortalTopBar pageTitle="Home" pageSubtitle="Definian operations" />);

    expect(screen.getByRole("heading", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByText("Definian operations")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /organization view/i })).not.toBeInTheDocument();
  });
});
