import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/apiClient";
import { fetchSharedWorkspacePeople } from "@/lib/services/sharedWorkspaceService";

vi.mock("@/lib/apiClient", () => ({ apiFetch: vi.fn() }));

const mockedApiFetch = vi.mocked(apiFetch);

describe("fetchSharedWorkspacePeople", () => {
  beforeEach(() => mockedApiFetch.mockReset());

  it("accepts only the server-owned masked email field", async () => {
    mockedApiFetch.mockResolvedValue({
      shared_workspace: true,
      total: 1,
      people: [{
        person_id: "person-1",
        display_name: "Jordan Lee",
        masked_email: "j***@example.com",
        email: "raw@example.com",
        role: "admin",
      }],
    });

    await expect(fetchSharedWorkspacePeople()).resolves.toEqual({
      shared_workspace: true,
      total: 1,
      people: [{
        person_id: "person-1",
        display_name: "Jordan Lee",
        masked_email: "j***@example.com",
        is_current_user: false,
      }],
    });
    expect(mockedApiFetch).toHaveBeenCalledWith("/shared-workspace/people", expect.any(Object));
  });
});
