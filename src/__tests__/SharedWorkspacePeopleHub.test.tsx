import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharedWorkspacePeopleHub } from "@/components/reports/SharedWorkspacePeopleHub";
import { fetchSharedWorkspacePeople } from "@/lib/services/sharedWorkspaceService";

vi.mock("@/lib/services/sharedWorkspaceService", () => ({
  fetchSharedWorkspacePeople: vi.fn(),
}));

const mockedFetchPeople = vi.mocked(fetchSharedWorkspacePeople);

describe("SharedWorkspacePeopleHub", () => {
  beforeEach(() => {
    mockedFetchPeople.mockReset();
  });

  it("shows people as shared-system context without membership language", async () => {
    mockedFetchPeople.mockResolvedValue({
      shared_workspace: true,
      total: 2,
      people: [
        { person_id: "person-1", display_name: "Alex Morgan", masked_email: "a••••@example.com", is_current_user: true },
        { person_id: "person-2", display_name: "Jordan Lee", masked_email: "j••••@gmail.com", is_current_user: false },
      ],
    });

    render(<SharedWorkspacePeopleHub productLabel="DocuDent" />);

    expect(await screen.findByRole("heading", { name: "People using DocuDent" })).toBeVisible();
    expect(screen.getByText("a••••@example.com")).toBeVisible();
    expect(screen.getByText("You")).toBeVisible();
    expect(screen.queryByText(/member/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /private workspace/i })).toHaveAttribute("href", "/support");
  });

  it("stays absent for normal customer workspaces", async () => {
    mockedFetchPeople.mockResolvedValue({ shared_workspace: false, total: 0, people: [] });
    render(<SharedWorkspacePeopleHub productLabel="DocuDent" />);
    await waitFor(() => expect(mockedFetchPeople).toHaveBeenCalledOnce());
    expect(screen.queryByRole("heading", { name: /people using/i })).not.toBeInTheDocument();
  });

  it("reveals the full people list without exposing an unapproved email field", async () => {
    mockedFetchPeople.mockResolvedValue({
      shared_workspace: true,
      total: 5,
      people: Array.from({ length: 5 }, (_, index) => ({
        person_id: `person-${index}`,
        display_name: `Person ${index}`,
        masked_email: `p••••${index}@example.com`,
        is_current_user: false,
        email: `raw-${index}@example.com`,
      })),
    });
    render(<SharedWorkspacePeopleHub productLabel="DocuDent" />);

    const viewAll = await screen.findByRole("button", { name: "View all 5" });
    expect(screen.queryByText("Person 4")).not.toBeInTheDocument();
    fireEvent.click(viewAll);
    expect(screen.getByText("Person 4")).toBeVisible();
    expect(screen.queryByText("raw-4@example.com")).not.toBeInTheDocument();
  });
});
