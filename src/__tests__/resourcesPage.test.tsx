import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import ResourcesPage from "@/app/resources/page";
import ResourceGuidePageClient from "@/components/resources/ResourceGuidePageClient";

const mocks = vi.hoisted(() => ({
  query: "",
  session: {
    session: { organization: { name: "Example Organization" } },
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
    expect(screen.getByLabelText("Facility quick starts").querySelector("article")).toBeNull();
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

  it("does not inherit directory facilities as published Quick Starts", () => {
    mocks.directory = {
      facilities: [
        {
          id: "facility-1",
          name: "Example Facility",
          slug: "example-facility",
          active: true,
          locationCount: 1,
          yards: [
            { yardId: "yard-1", name: "Main Yard", code: "MAIN", active: true },
          ],
        },
      ],
    };
    render(<ResourcesPage />);

    expect(screen.getByLabelText("Facility quick starts").querySelector("article")).toBeNull();
    expect(mocks.fetchFacilityRegistration).not.toHaveBeenCalled();
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

  it("does not request registration details without an authoritative published DocuDent packet", () => {
    mocks.session.isFacilityAdmin = true;
    mocks.directory = {
      facilities: [
        {
          id: "facility-1",
          name: "Example Facility",
          slug: "example-facility",
          active: true,
          locationCount: 1,
          yards: [],
        },
      ],
    };

    render(<ResourcesPage />);

    expect(screen.getByLabelText("Facility quick starts").querySelector("article")).toBeNull();
    expect(mocks.fetchFacilityRegistration).not.toHaveBeenCalled();
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

  it("does not expose an unapproved facility quick reference", () => {
    mocks.query = "facility=facility-1&task=facility-start";
    mocks.directory = {
      facilities: [
        {
          id: "facility-1",
          name: "Example Facility",
          slug: "example-facility",
          active: true,
          locationCount: 1,
          yards: [
            { yardId: "yard-1", name: "Main", code: "MAIN", active: true },
          ],
        },
      ],
    };

    render(<ResourceGuidePageClient />);

    expect(screen.getByText("Facility context is unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Example Facility Quick Start/)).not.toBeInTheDocument();
  });

  it("does not expose a facility quick reference without an approved asset", () => {
    mocks.query = "facility=facility-2&task=facility-start";
    mocks.directory = {
      facilities: [
        {
          id: "facility-2",
          name: "Example Facility",
          slug: "example-facility",
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
    expect(screen.queryByText("Example Facility Quick Start")).not.toBeInTheDocument();
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
