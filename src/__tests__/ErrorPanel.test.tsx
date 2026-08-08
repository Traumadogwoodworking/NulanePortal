import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorPanel } from "@/components/ui/ErrorPanel";

describe("ErrorPanel", () => {
  it("shows a supplied string error instead of replacing it with a generic message", () => {
    render(
      <ErrorPanel
        title="Facility update needs attention"
        error="Chicago was saved, but refresh failed."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Facility update needs attention",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Chicago was saved, but refresh failed.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "Something went wrong. Please retry.",
    );
  });

  it("shows the message from an Error instance", () => {
    render(<ErrorPanel error={new Error("Directory request timed out.")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Directory request timed out.",
    );
  });

  it("uses the generic fallback only when the supplied error has no message", () => {
    render(<ErrorPanel error={new Error("   ")} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Something went wrong. Please retry.",
    );
  });
});
