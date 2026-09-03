import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SubmitterIdentity } from "@/components/reports/SubmitterIdentity";

describe("SubmitterIdentity", () => {
  it("renders the server-provided name and masked email without transforming either value", () => {
    render(<SubmitterIdentity name="Matthew Snider" email="m***@example.com" />);

    expect(screen.getByText("Matthew Snider")).toBeInTheDocument();
    expect(screen.getByText("m***@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("Submitted by Matthew Snider, m***@example.com")).toBeInTheDocument();
  });

  it("uses compact fallbacks when identity fields are absent", () => {
    render(<SubmitterIdentity />);

    expect(screen.getByText("Submitter")).toBeInTheDocument();
    expect(screen.getByText("Email unavailable")).toBeInTheDocument();
  });
});
