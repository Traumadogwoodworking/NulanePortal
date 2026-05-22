import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ResetPasswordDialog, canSendPasswordReset } from "@/components/users/ResetPasswordDialog";

const usersServiceMocks = vi.hoisted(() => ({
  resetUserPassword: vi.fn(),
}));

vi.mock("@/lib/services/usersService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/usersService")>(
    "@/lib/services/usersService",
  );
  return {
    ...actual,
    resetUserPassword: usersServiceMocks.resetUserPassword,
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("ResetPasswordDialog", () => {
  it("hides the action when the user is not eligible", () => {
    expect(
      canSendPasswordReset({
        id: "user-1",
        name: "Guest",
        email: "",
        role: "user",
        isActive: true,
        facilityIds: [],
        permissions: [],
        lastUpdated: "2026-04-14T12:00:00Z",
      })
    ).toBe(false);

    render(
      <ResetPasswordDialog
        organizationId="org-1"
        user={{
          id: "user-1",
          name: "Guest",
          email: "",
          role: "user",
          isActive: true,
          facilityIds: [],
          permissions: [],
          lastUpdated: "2026-04-14T12:00:00Z",
        }}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Send reset email" })).toBeNull();
  });

  it("opens a confirmation modal and sends the reset request", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    usersServiceMocks.resetUserPassword.mockResolvedValue({
      ok: true,
      message: "If the account is eligible, a password reset email has been sent.",
    });

    render(
      <ResetPasswordDialog
        organizationId="org-1"
        user={{
          id: "user-1",
          name: "Jane Doe",
          email: "jane@example.com",
          role: "user",
          isActive: true,
          facilityIds: [],
          permissions: [],
          lastUpdated: "2026-04-14T12:00:00Z",
        }}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    await user.click(screen.getByRole("button", { name: "Send reset email" }));
    expect(screen.getByText("Send password reset email?")).toBeVisible();
    expect(screen.getByText("jane@example.com")).toBeVisible();

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send reset email" }));

    await waitFor(() =>
      expect(usersServiceMocks.resetUserPassword).toHaveBeenCalledWith("org-1", "user-1", "Portal admin requested password reset")
    );
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith("Password reset email request sent."));
    expect(onError).not.toHaveBeenCalled();
  });

  it("shows a safe rate-limit message on 429", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onError = vi.fn();
    usersServiceMocks.resetUserPassword.mockRejectedValue(new Error("Too many password reset requests. Try again later."));

    render(
      <ResetPasswordDialog
        organizationId="org-1"
        user={{
          id: "user-1",
          name: "Jane Doe",
          email: "jane@example.com",
          role: "user",
          isActive: true,
          facilityIds: [],
          permissions: [],
          lastUpdated: "2026-04-14T12:00:00Z",
        }}
        onSuccess={onSuccess}
        onError={onError}
      />
    );

    await user.click(screen.getByRole("button", { name: "Send reset email" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Send reset email" }));

    await waitFor(() => expect(screen.getByText("Too many password reset requests. Try again later.")).toBeVisible());
    expect(onError).toHaveBeenCalledWith("Too many password reset requests. Try again later.");
  });
});
