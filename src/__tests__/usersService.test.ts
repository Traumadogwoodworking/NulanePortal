import { afterEach, describe, expect, it, vi } from "vitest";
import { resetUserPassword } from "@/lib/services/usersService";

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

describe("resetUserPassword", () => {
  it("posts the reset request with a reason", async () => {
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

  it("maps rate-limited responses to a controlled error", async () => {
    apiClientMocks.apiFetch.mockRejectedValue(Object.assign(new Error("PASSWORD_RESET_RATE_LIMITED"), { status: 429 }));

    await expect(resetUserPassword("org-1", "user-1")).rejects.toThrow(
      "Too many password reset requests. Try again later."
    );
  });

  it("maps forbidden responses to a controlled error", async () => {
    apiClientMocks.apiFetch.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    await expect(resetUserPassword("org-1", "user-1")).rejects.toThrow(
      "You do not have permission to send password reset emails."
    );
  });
});
