import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharedWorkspacePeopleHub } from "@/portal/core/features/damage/SharedWorkspacePeopleHub";
import { fetchSharedWorkspacePeople } from "@/lib/services/sharedWorkspaceService";

vi.mock("@/lib/services/sharedWorkspaceService", () => ({
  fetchSharedWorkspacePeople: vi.fn(),
}));

const mockedFetchPeople = vi.mocked(fetchSharedWorkspacePeople);

describe("SharedWorkspacePeopleHub", () => {
  beforeEach(() => mockedFetchPeople.mockReset());

  it("shows shared-system people without membership language", async () => {
    mockedFetchPeople.mockResolvedValue({
      shared_workspace: true,
      total: 2,
      people: [
        { person_id: "person-1", display_name: "Alex Morgan", masked_email: "a••••@example.com", is_current_user: true },
        { person_id: "person-2", display_name: "Jordan Lee", masked_email: "j••••@gmail.com", is_current_user: false },
      ],
    });
    render(<SharedWorkspacePeopleHub productLabel="Definian" />);

    expect(await screen.findByRole("heading", { name: "People using Definian" })).toBeVisible();
    expect(screen.getByText("a••••@example.com")).toBeVisible();
    expect(screen.queryByText(/member/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /private workspace/i })).toHaveAttribute("href", "/support");
  });

  it("stays absent for normal customer workspaces", async () => {
    mockedFetchPeople.mockResolvedValue({ shared_workspace: false, total: 0, people: [] });
    render(<SharedWorkspacePeopleHub productLabel="Definian" />);
    await waitFor(() => expect(mockedFetchPeople).toHaveBeenCalledOnce());
    expect(screen.queryByRole("heading", { name: /people using/i })).not.toBeInTheDocument();
  });

  it("expands the people list", async () => {
    mockedFetchPeople.mockResolvedValue({
      shared_workspace: true,
      total: 5,
      people: Array.from({ length: 5 }, (_, index) => ({
        person_id: `person-${index}`,
        display_name: `Person ${index}`,
        masked_email: `p••••${index}@example.com`,
        is_current_user: false,
      })),
    });
    render(<SharedWorkspacePeopleHub productLabel="Definian" />);
    const viewAll = await screen.findByRole("button", { name: "View all 5" });
    fireEvent.click(viewAll);
    expect(screen.getByText("Person 4")).toBeVisible();
  });
});
