import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PortalSessionResponse } from "@/lib/types";
import {
  clearStoredWorkspaceSelection,
  getWorkspaceDisplayName,
  readStoredWorkspaceOrganizationId,
  selectBackendWorkspace,
} from "@/lib/workspaceSelection";

const sessionMocks = vi.hoisted(() => ({
  switchOrganization: vi.fn(),
  session: null as PortalSessionResponse | null,
}));

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({
    user: sessionMocks.session?.user ?? null,
    session: sessionMocks.session,
    organizationId: sessionMocks.session?.organization?.organization_id ?? null,
    switchOrganization: sessionMocks.switchOrganization,
  }),
}));

import SettingsPage from "@/app/settings/page";
import { PortalTopBar } from "@/components/PortalTopBar";

const organizations = [
  { organization_id: "shared-org", name: "Internal free tenant", type: "free", role: "user", is_primary: true },
  { organization_id: "customer-org", name: "Customer workspace", type: "paid", role: "user", is_primary: false },
];

beforeEach(() => {
  window.localStorage.clear();
  sessionMocks.switchOrganization.mockReset();
  sessionMocks.session = {
    user: {
      user_id: "user-1",
      email: "owner@example.com",
      role: "user",
      organization_id: "shared-org",
    },
    organization: organizations[0],
    organizations,
  };
});

describe("workspace selection", () => {
  it("persists only choices returned by the authenticated backend", () => {
    expect(() => selectBackendWorkspace(organizations, "invented-org")).toThrow(
      "Workspace is not available"
    );
    expect(readStoredWorkspaceOrganizationId()).toBeNull();

    expect(selectBackendWorkspace(organizations, "customer-org")).toBe("customer-org");
    expect(readStoredWorkspaceOrganizationId()).toBe("customer-org");
    clearStoredWorkspaceSelection();
    expect(readStoredWorkspaceOrganizationId()).toBeNull();
  });

  it("uses the general DocuDent label only for the free workspace", () => {
    expect(getWorkspaceDisplayName(organizations[0])).toBe("DocuDent workspace");
    expect(getWorkspaceDisplayName(organizations[1])).toBe("Customer workspace");
  });

  it("renders a chooser for multiple backend choices and delegates a valid selection", () => {
    render(<PortalTopBar pageTitle="Home" />);

    const chooser = screen.getByRole("combobox", { name: "Workspace" });
    expect(chooser).toHaveValue("shared-org");
    expect(screen.getByRole("option", { name: "DocuDent workspace" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Customer workspace" })).toBeInTheDocument();

    fireEvent.change(chooser, { target: { value: "customer-org" } });
    expect(sessionMocks.switchOrganization).toHaveBeenCalledWith("customer-org");
  });

  it("does not mask the authenticated user's raw account email in React", () => {
    render(<SettingsPage />);
    expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    expect(screen.queryByText("o***@example.com")).not.toBeInTheDocument();
  });
});
