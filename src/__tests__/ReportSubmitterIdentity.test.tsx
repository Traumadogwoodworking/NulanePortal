import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ReportSubmitterIdentity,
} from "@/portal/core/ui/ReportSubmitterIdentity";
import { getReportSubmitterIdentity } from "@/portal/core/data/reportSubmitterIdentity";

describe("ReportSubmitterIdentity", () => {
  it("renders the backend-provided name and masked email without remasking it", () => {
    render(
      <ReportSubmitterIdentity
        source={{
          inspector_name: "Account A Inspector",
          inspector_email: "a***@example.com",
        }}
      />
    );

    expect(screen.getByLabelText("Submitted by")).toHaveTextContent("Account A Inspector");
    expect(screen.getByLabelText("Submitted by")).toHaveTextContent("a***@example.com");
  });

  it("ignores nested raw identity fields instead of pulling peer email into browser UI", () => {
    const source = {
      inspector_name: "Account A Inspector",
      inspector_email: "a***@example.com",
      payload: {
        inspector_email: "account.a@example.com",
      },
    };

    render(<ReportSubmitterIdentity source={source} />);

    expect(screen.queryByText("account.a@example.com")).not.toBeInTheDocument();
    expect(getReportSubmitterIdentity(source)).toEqual({
      name: "Account A Inspector",
      email: "a***@example.com",
    });
  });

  it("does not client-mask the server projection for customer-scoped reports", () => {
    expect(
      getReportSubmitterIdentity({
        inspector_name: "Customer Inspector",
        inspector_email: "customer.inspector@example.com",
      })
    ).toEqual({
      name: "Customer Inspector",
      email: "customer.inspector@example.com",
    });
  });

  it("does not invent identity when the safe backend projection is absent", () => {
    render(<ReportSubmitterIdentity source={{}} />);

    expect(screen.getByText("Submitter unavailable")).toBeInTheDocument();
    expect(screen.getByText("Email unavailable")).toBeInTheDocument();
  });
});
