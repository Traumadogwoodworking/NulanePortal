import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacilityQuickStartActions } from "@/components/facilities/FacilityQuickStartActions";
import type { FacilityQuickStartAsset } from "@/components/facilities/facilityQuickStartAsset";

const quickStart: FacilityQuickStartAsset = {
  title: "Example Facility Quick Start",
  purpose: "Register for Example Facility access.",
  registrationUrl: "https://portal.example/join/example-facility",
  url: "/resources/example-facility/example-facility-quick-start.pdf",
  steps: ["Scan the QR or open the registration link.", "Open DocuDent and sign in."],
  done: "Example Facility appears as an available facility in DocuDent.",
  support: {
    displayName: "DocuDent Support",
    email: "support@nulanesystems.com",
    instruction: "Include your verified email address when contacting support.",
  },
  facility: {
    name: "Example Facility",
    registrationSlug: "example-facility",
    ids: ["facility-example"],
    yards: [],
  },
};

const mocks = vi.hoisted(() => ({
  toDataURL: vi.fn(),
  toString: vi.fn(),
  saveAs: vi.fn(),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: mocks.toDataURL,
    toString: mocks.toString,
  },
}));

vi.mock("file-saver", () => ({ saveAs: mocks.saveAs }));

beforeEach(() => {
  mocks.toDataURL.mockReset();
  mocks.toString.mockReset();
  mocks.saveAs.mockReset();
  mocks.toDataURL.mockResolvedValue("data:image/png;base64,cXI=");
  mocks.toString.mockResolvedValue("<svg></svg>");
});

describe("FacilityQuickStartActions", () => {
  it("uses the canonical join URL for the visible link and QR", async () => {
    render(
      <FacilityQuickStartActions
        facilityName="Example Facility"
        organizationName="Example Organization"
        registrationUrl="https://portal.example/join/?facility=incorrect"
        slug="example-facility"
        active
        publishedQuickStart={quickStart}
        showProcedure
      />,
    );

    expect(
      screen.getByRole("link", { name: "Open registration link" }),
    ).toHaveAttribute(
      "href",
      "https://portal.example/join/example-facility",
    );
    await waitFor(() => expect(mocks.toDataURL).toHaveBeenCalled());
    expect(mocks.toDataURL.mock.calls[0]?.[0]).toBe(
      "https://portal.example/join/example-facility",
    );
    expect(mocks.toString.mock.calls[0]?.[0]).toBe(
      "https://portal.example/join/example-facility",
    );
  });

  it("makes the direct published PDF the dominant first action", () => {
    render(
      <FacilityQuickStartActions
        facilityName="Example Facility"
        organizationName="Example Organization"
        registrationUrl="https://portal.example/join/example-facility"
        slug="example-facility"
        active
        publishedQuickStart={quickStart}
        showProcedure
      />,
    );

    const pdf = screen.getByRole("link", {
      name: "Open Example Facility Quick Start PDF",
    });
    const registration = screen.getByRole("link", {
      name: "Open registration link",
    });
    expect(pdf).toHaveAttribute(
      "href",
      "/resources/example-facility/example-facility-quick-start.pdf",
    );
    expect(pdf).toHaveAttribute("target", "_blank");
    expect(
      pdf.compareDocumentPosition(registration) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /PDF/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the canonical procedure, completion state, and support request", () => {
    render(
      <FacilityQuickStartActions
        facilityName="Example Facility"
        organizationName="Example Organization"
        registrationUrl="https://portal.example/join/example-facility"
        slug="example-facility"
        active
        publishedQuickStart={quickStart}
        showProcedure
      />,
    );

    expect(screen.getByText("Scan to register")).toBeInTheDocument();
    expect(
      screen.getByText("Scan the QR or open the registration link."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Open DocuDent and sign in.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Example Facility appears as an available facility in DocuDent.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /include your verified email address/i,
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Auth0|short-lived session/i);
  });

  it("does not expose unusable registration material while disabled", () => {
    render(
      <FacilityQuickStartActions
        facilityName="Example Facility"
        organizationName="Example Organization"
        registrationUrl="https://portal.example/join/example-facility"
        slug="example-facility"
        active={false}
      />,
    );

    expect(screen.getByText("Registration disabled")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Open registration link" }),
    ).not.toBeInTheDocument();
    expect(mocks.toDataURL).not.toHaveBeenCalled();
  });

  it("downloads only the QR SVG from the generic action set", async () => {
    render(
      <FacilityQuickStartActions
        facilityName="Example Facility"
        organizationName="Example Organization"
        registrationUrl="https://portal.example/join/example-facility"
        slug="example-facility"
        active
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "QR SVG" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "QR SVG" }));
    expect(mocks.saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "example-facility-docudent-qr.svg",
    );
    expect(
      screen.queryByRole("button", { name: /PDF/i }),
    ).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Inspection[- ]Trac|AWCT|JNAP|SHAP/i);
  });
});
