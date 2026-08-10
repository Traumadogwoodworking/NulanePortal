import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacilityQuickStartActions } from "@/components/facilities/FacilityQuickStartActions";
import { getFacilityQuickStartAsset } from "@/components/facilities/facilityQuickStartAsset";

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
    const quickStart = getFacilityQuickStartAsset({
      id: "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c",
      slug: "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c",
    });
    expect(quickStart).not.toBeNull();

    render(
      <FacilityQuickStartActions
        facilityName="Chicago Heights"
        organizationName="Inspection-Trac"
        registrationUrl="https://inspection-trac.com/join/?facility=incorrect"
        slug="chicago-heights"
        active
        publishedQuickStart={quickStart}
        showProcedure
      />,
    );

    expect(
      screen.getByRole("link", { name: "Open registration link" }),
    ).toHaveAttribute(
      "href",
      "https://inspection-trac.com/join/chicago-heights",
    );
    await waitFor(() => expect(mocks.toDataURL).toHaveBeenCalled());
    expect(mocks.toDataURL.mock.calls[0]?.[0]).toBe(
      "https://inspection-trac.com/join/chicago-heights",
    );
    expect(mocks.toString.mock.calls[0]?.[0]).toBe(
      "https://inspection-trac.com/join/chicago-heights",
    );
  });

  it("makes the direct published PDF the dominant first action", () => {
    const quickStart = getFacilityQuickStartAsset("chicago-heights");
    render(
      <FacilityQuickStartActions
        facilityName="Chicago Heights"
        organizationName="Inspection-Trac"
        registrationUrl="https://inspection-trac.com/join/chicago-heights"
        slug="chicago-heights"
        active
        publishedQuickStart={quickStart}
        showProcedure
      />,
    );

    const pdf = screen.getByRole("link", {
      name: "Open Chicago Heights Quick Start PDF",
    });
    const registration = screen.getByRole("link", {
      name: "Open registration link",
    });
    expect(pdf).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
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
    const quickStart = getFacilityQuickStartAsset("chicago-heights");
    render(
      <FacilityQuickStartActions
        facilityName="Chicago Heights"
        organizationName="Inspection-Trac"
        registrationUrl="https://inspection-trac.com/join/chicago-heights"
        slug="chicago-heights"
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
        "Open Inspection-Trac and select Main when a yard is requested.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Chicago Heights appears as an available facility in Inspection-Trac.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /include your email address, whether you completed email verification/i,
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Auth0|short-lived session/i);
  });

  it("does not expose unusable registration material while disabled", () => {
    render(
      <FacilityQuickStartActions
        facilityName="Chicago Heights"
        organizationName="Inspection-Trac"
        registrationUrl="https://inspection-trac.com/join/chicago-heights"
        slug="chicago-heights"
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
        facilityName="Detroit Terminal"
        organizationName="Inspection-Trac"
        registrationUrl="https://inspection-trac.com/join/detroit-terminal"
        slug="detroit-terminal"
        active
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "QR SVG" })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole("button", { name: "QR SVG" }));
    expect(mocks.saveAs).toHaveBeenCalledWith(
      expect.any(Blob),
      "detroit-terminal-inspection-trac-qr.svg",
    );
    expect(
      screen.queryByRole("button", { name: /PDF/i }),
    ).not.toBeInTheDocument();
  });
});
