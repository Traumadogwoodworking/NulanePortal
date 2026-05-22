import { afterEach, describe, expect, it, vi } from "vitest";
import { resetUserPassword, UsersAdapter } from "@/lib/services/usersService";

const apiClientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/apiClient")>(
    "@/lib/apiClient",
  );
  return {
    ...actual,
    apiFetch: apiClientMocks.apiFetch,
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("password reset service", () => {
  it("uses the password reset endpoint and request reason", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      ok: true,
      message: "If the account is eligible, a password reset email has been sent.",
    });

    await expect(resetUserPassword("org-1", "user-1")).resolves.toEqual({
      ok: true,
      message: "If the account is eligible, a password reset email has been sent.",
    });

    expect(apiClientMocks.apiFetch).toHaveBeenCalledWith(
      "/admin/organizations/org-1/users/user-1/password-reset",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "Portal admin requested password reset" }),
      })
    );
  });

  it("prefers backend user_id over auth0-style id when normalizing users", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      users: [
        {
          id: "auth0|68b8cf584f2f7f78e810b9af",
          user_id: "backend-user-123",
          email: "test@example.com",
          display_name: "Test User",
          is_active: true,
        },
      ],
    });

    const users = await UsersAdapter.getUsers("org-1");
    expect(users[0]?.id).toBe("backend-user-123");
  });
});
