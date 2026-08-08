import { afterEach, describe, expect, it, vi } from "vitest";
import { createUser, resetUserPassword } from "@/lib/services/usersService";

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

describe("createUser invitation status", () => {
  it("preserves Auth0 acceptance separately from inbox delivery", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      user: {
        user_id: "user-2",
        email: "invitee@example.com",
        display_name: "Invitee",
        role: "user",
        is_active: true,
      },
      invitation: {
        id: "invite-1",
        email_requested: true,
        created_at: "2026-08-06T16:19:38.527Z",
        expires_at: "2026-08-13T16:19:38.527Z",
      },
    });

    const result = await createUser("org-1", {
      email: "invitee@example.com",
      role: "user",
      facility_ids: ["location-shap"],
      invite: true,
      send_email: true,
    });

    expect(result.user.email).toBe("invitee@example.com");
    expect(result.invitation).toEqual({
      id: "invite-1",
      status: "requested",
      emailRequested: true,
      createdAt: "2026-08-06T16:19:38.527Z",
      expiresAt: "2026-08-13T16:19:38.527Z",
      reason: null,
    });
  });
});
