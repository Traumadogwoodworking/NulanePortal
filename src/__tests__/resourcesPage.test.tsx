import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { axe } from "vitest-axe";
import ResourcesPage from "@/app/resources/page";
import ResourceGuidePageClient from "@/components/resources/ResourceGuidePageClient";

const mocks = vi.hoisted(() => ({
  query: "",
  session: {
    session: { organization: { name: "Inspection-Trac" } },
    organizationId: "org-1" as string | null,
    selectedLocationLabel: null as string | null,
    isFacilityAdmin: false,
    isOrgAdmin: false,
    isSuperAdmin: false,
    locations: [] as Array<Record<string, unknown>>,
  },
  directory: { facilities: [] as Array<Record<string, unknown>> },
  isLoading: false,
  error: null as Error | null,
  fetchFacilityRegistration: vi.fn(),
  toDataURL: vi.fn(async () => "data:image/png;base64,cXI="),
  toString: vi.fn(async () => "<svg></svg>"),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: mocks.toDataURL,
    toString: mocks.toString,
  },
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.query),
}));

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => mocks.session,
}));

vi.mock("@/lib/portalData", () => ({
  usePortalDirectorySnapshot: () => ({
    data: mocks.directory,
    isLoading: mocks.isLoading,
    error: mocks.error,
  }),
}));

vi.mock("@/lib/services/facilityOnboardingService", () => ({
  fetchFacilityRegistration: mocks.fetchFacilityRegistration,
}));

beforeEach(() => {
  mocks.query = "";
  mocks.session.organizationId = "org-1";
  mocks.session.selectedLocationLabel = null;
  mocks.session.isFacilityAdmin = false;
  mocks.session.isOrgAdmin = false;
  mocks.session.isSuperAdmin = false;
  mocks.session.locations = [];
  mocks.directory = { facilities: [] };
  mocks.isLoading = false;
  mocks.error = null;
  mocks.fetchFacilityRegistration.mockReset();
  mocks.fetchFacilityRegistration.mockResolvedValue(null);
});

describe("Resources & Training", () => {
  it("shows the task-oriented handbook and hides administration from an operator", () => {
    render(<ResourcesPage />);

    expect(
      screen.getByRole("heading", { name: "Resources & Training" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Complete Inspections" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Start an Inspection/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Manage Facility Registration/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Chicago Heights Quick Start" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No facility-specific guides are available"),
    ).not.toBeInTheDocument();
  });

  it("has no automated accessibility violations in the operator landing state", async () => {
    const { container } = render(<ResourcesPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a clear no-results state", () => {
    render(<ResourcesPage />);
    fireEvent.change(screen.getByLabelText("Search the handbook"), {
      target: { value: "zzzxxyyqqq" },
    });

    expect(screen.getByText("No handbook results")).toBeInTheDocument();
    expect(screen.getByText(/Try a broader term/)).toBeInTheDocument();
  });

  it("keeps the published Chicago quick start usable while directory data loads or fails", () => {
    mocks.isLoading = true;
    const loadingView = render(<ResourcesPage />);
    expect(
      screen.getByRole("link", {
        name: "Open Chicago Heights Quick Start PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
    loadingView.unmount();

    mocks.isLoading = false;
    mocks.error = new Error("directory unavailable");
    render(<ResourcesPage />);
    expect(
      screen.getByRole("heading", { name: "Chicago Heights Quick Start" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open registration link" }),
    ).toHaveAttribute(
      "href",
      "https://inspection-trac.com/join/chicago-heights",
    );
  });

  it("uses facility overlays without requesting admin registration data for an operator", () => {
    mocks.directory = {
      facilities: [
        {
          id: "facility-1",
          name: "Chicago Heights",
          slug: "chicago-heights",
          active: true,
          locationCount: 1,
          yards: [
            { yardId: "yard-1", name: "Main Yard", code: "MAIN", active: true },
          ],
        },
        {
          id: "facility-2",
          name: "SHAP",
          slug: "shap",
          active: true,
          locationCount: 1,
          yards: [],
        },
      ],
    };
    render(<ResourcesPage />);

    expect(
      screen.getByRole("heading", { name: "Chicago Heights Quick Start" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "SHAP" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Facility quick reference/ }),
    ).toHaveAttribute(
      "href",
      "/resources/guides?facility=facility-1&task=facility-start",
    );
    expect(
      screen.queryByRole("link", { name: /Facility settings/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Scan to register")).toBeInTheDocument();
    expect(
      screen.getByText(/receive access to Chicago Heights/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open Chicago Heights Quick Start PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
    const quickStartHeading = screen.getByRole("heading", {
      name: "Chicago Heights Quick Start",
    });
    const handbookSearch = screen.getByLabelText("Search the handbook");
    expect(
      quickStartHeading.compareDocumentPosition(handbookSearch) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(mocks.fetchFacilityRegistration).not.toHaveBeenCalled();
  });

  it("matches the authenticated live Chicago Heights record by stable facility ID", async () => {
    mocks.session.organizationId = null;
    mocks.session.isSuperAdmin = true;
    mocks.session.locations = [
      {
        location_id: "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c",
        organization_id: "org-awct",
        location_name: "Chicago Heights",
        location_label: "Chicago Heights",
        display_name: "Chicago Heights",
        is_active: true,
        metadata: {
          yards: [
            {
              yard_id: "yard-ff39eedd-4630-467a-97f6-2149b4c6a6d3",
              yard_name: "Main",
              yard_code: "MAIN",
              is_active: true,
            },
          ],
        },
      },
    ];
    mocks.directory = { facilities: [] };

    render(<ResourcesPage />);

    const quickStartHeading = screen.getByRole("heading", {
      name: "Chicago Heights Quick Start",
    });
    const handbookSearch = screen.getByLabelText("Search the handbook");
    expect(
      quickStartHeading.compareDocumentPosition(handbookSearch) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByText("No facility-specific guides are available"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open Chicago Heights Quick Start PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
    expect(
      screen.getByRole("link", { name: "Open registration link" }),
    ).toHaveAttribute(
      "href",
      "https://inspection-trac.com/join/chicago-heights",
    );
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
    expect(document.body.textContent).not.toMatch(
      /Auth0|short-lived session|metadata|registration slug/i,
    );
    await waitFor(() =>
      expect(mocks.toDataURL).toHaveBeenCalledWith(
        "https://inspection-trac.com/join/chicago-heights",
        expect.any(Object),
      ),
    );
  });

  it("shows administrative access tasks to a facility administrator", () => {
    mocks.session.isFacilityAdmin = true;
    render(<ResourcesPage />);

    expect(
      screen.getByRole("heading", { name: "Manage Access" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: /Manage Facility Registration/,
      }),
    ).toBeInTheDocument();
  });

  it("labels an organization administrator according to the strongest real role", () => {
    mocks.session.isFacilityAdmin = true;
    mocks.session.isOrgAdmin = true;
    render(<ResourcesPage />);

    expect(screen.getByText("Organization admin")).toBeInTheDocument();
    expect(screen.queryByText("Facility admin")).not.toBeInTheDocument();
  });

  it("shows registration lookup failure only for an administrator who can request it", async () => {
    mocks.session.isFacilityAdmin = true;
    mocks.directory = {
      facilities: [
        {
          id: "facility-1",
          name: "Chicago Heights",
          slug: "chicago-heights",
          active: true,
          locationCount: 1,
          yards: [],
        },
      ],
    };
    mocks.fetchFacilityRegistration.mockRejectedValue(
      new Error("registration unavailable"),
    );
    render(<ResourcesPage />);

    await waitFor(() =>
      expect(mocks.fetchFacilityRegistration).toHaveBeenCalledWith(
        "org-1",
        "facility-1",
      ),
    );
    expect(
      await screen.findByText(
        /Registration details are temporarily unavailable/,
      ),
    ).toBeInTheDocument();
  });

  it("shows one canonical registration link, QR, and quick-start action to an administrator", async () => {
    mocks.session.isFacilityAdmin = true;
    mocks.directory = {
      facilities: [
        {
          id: "facility-1",
          name: "Chicago Heights",
          slug: "chicago-heights",
          active: true,
          locationCount: 1,
          yards: [],
        },
      ],
    };
    mocks.fetchFacilityRegistration.mockResolvedValue({
      organizationId: "org-1",
      organizationName: "Inspection-Trac",
      facilityId: "facility-1",
      facilityName: "Chicago Heights",
      facilityLabel: "Chicago Heights",
      slug: "chicago-heights",
      enabled: true,
      available: true,
      defaultRoleId: "role-1",
      defaultRoleKey: "user",
      defaultRoleName: "User",
      registrationUrl:
        "https://inspection-trac.com/join/?facility=chicago-heights",
      onboardingDisplayName: "Chicago Heights",
      support: { email: "support@inspection-trac.com" },
      stores: {},
      packetRevision: 4,
      packetUpdatedAt: null,
      lastSuccessfulEnrollment: null,
      recentEnrollments: [],
      globalEnabled: true,
      updatedAt: null,
    });

    render(<ResourcesPage />);

    expect(await screen.findByText("Registration enabled")).toBeInTheDocument();
    expect(
      await screen.findByRole("img", {
        name: "Registration QR code for Chicago Heights",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open registration link" }),
    ).toHaveAttribute(
      "href",
      "https://inspection-trac.com/join/chicago-heights",
    );
    expect(
      screen.getByRole("link", {
        name: "Open Chicago Heights Quick Start PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
  });
});

describe("Resource guide states", () => {
  it("distinguishes an invalid guide link", () => {
    mocks.query = "guide=not-a-guide";
    render(<ResourceGuidePageClient />);

    expect(screen.getByText("Guide not found")).toBeInTheDocument();
    expect(
      screen.getByText(/invalid or no longer published/),
    ).toBeInTheDocument();
  });

  it("blocks a direct administrator-guide link for an operator", () => {
    mocks.query = "guide=manage-facility-registration";
    render(<ResourceGuidePageClient />);

    expect(
      screen.getByRole("heading", { name: "Administrator access required" }),
    ).toBeInTheDocument();
  });

  it("distinguishes missing facility context", () => {
    mocks.query = "facility=missing-facility&task=facility-start";
    render(<ResourceGuidePageClient />);

    expect(
      screen.getByText("Facility context is unavailable"),
    ).toBeInTheDocument();
  });

  it("puts the approved PDF first in the Chicago Heights quick reference", () => {
    mocks.query = "facility=facility-1&task=facility-start";
    mocks.directory = {
      facilities: [
        {
          id: "facility-1",
          name: "Chicago Heights",
          slug: "chicago-heights",
          active: true,
          locationCount: 1,
          yards: [
            { yardId: "yard-1", name: "Main", code: "MAIN", active: true },
          ],
        },
      ],
    };

    render(<ResourceGuidePageClient />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Chicago Heights Quick Start",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Scan to register")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open Chicago Heights Quick Start PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
    expect(
      screen.getByText("Scan the QR or open the registration link."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Open Inspection-Trac and select Main when a yard is requested.",
      ),
    ).toBeInTheDocument();
  });

  it("opens the Chicago quick reference from the live session record when the directory is empty", () => {
    mocks.query =
      "facility=6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c&task=facility-start";
    mocks.session.locations = [
      {
        location_id: "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c",
        organization_id: "org-awct",
        location_name: "Chicago Heights",
        location_label: "Chicago Heights",
        display_name: "Chicago Heights",
        is_active: true,
      },
    ];
    mocks.directory = { facilities: [] };

    render(<ResourceGuidePageClient />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Chicago Heights Quick Start",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "Open Chicago Heights Quick Start PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
  });

  it("does not expose a facility quick reference without an approved asset", () => {
    mocks.query = "facility=facility-2&task=facility-start";
    mocks.directory = {
      facilities: [
        {
          id: "facility-2",
          name: "SHAP",
          slug: "shap",
          active: true,
          locationCount: 1,
          yards: [],
        },
      ],
    };

    render(<ResourceGuidePageClient />);

    expect(
      screen.getByText("Facility context is unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("SHAP Quick Start")).not.toBeInTheDocument();
  });

  it("renders the concise task procedure and reference boundary", () => {
    mocks.query = "guide=use-damage-codes";
    render(<ResourceGuidePageClient />);

    expect(
      screen.getByRole("heading", { name: "Use Damage Codes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Reference boundary")).toBeInTheDocument();
    expect(screen.getByText(/Where:/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Done" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Problem" }),
    ).toBeInTheDocument();
  });

  it("has no automated accessibility violations in a reference guide", async () => {
    mocks.query = "guide=use-damage-codes";
    const { container } = render(
      <main>
        <ResourceGuidePageClient />
      </main>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
