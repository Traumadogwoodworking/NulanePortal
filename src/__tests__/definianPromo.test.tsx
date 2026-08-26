import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromoCodeClient } from "@/app/promo/[[...campaign]]/PromoCodeClient";
import { navSections } from "@/lib/navigation";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  usePortalSession: vi.fn(),
}));

vi.mock("@/portal/core/data/apiClient", () => ({
  apiFetch: mocks.apiFetch,
  PortalApiHttpError: class PortalApiHttpError extends Error {
    userMessage = "";
  },
}));

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: mocks.usePortalSession,
}));

describe("Definian promo codes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    mocks.usePortalSession.mockReturnValue({
      session: {
        user: {
          user_id: "auth0|promo-user",
          email: "promo.user@example.com",
        },
      },
    });
    mocks.apiFetch.mockImplementation(async (_path: string, options?: RequestInit) => {
      if (options?.method === "POST") {
        return { code: "WELCOME", message: "Promo applied successfully." };
      }
      return [];
    });
  });

  it("exposes the promo route to every authenticated navigation profile", () => {
    const promoRoute = navSections.flatMap((section) => section.items).find((item) => item.href === "/promo");

    expect(promoRoute?.label).toBe("Promo Codes");
    expect(promoRoute).not.toHaveProperty("requiresOrgAdmin");
    expect(promoRoute).not.toHaveProperty("requiresFacilityAdmin");
    expect(promoRoute).not.toHaveProperty("requiresSuperAdmin");
    expect(promoRoute).not.toHaveProperty("requiredPermission");
  });

  it("records a QR scan without redeeming a code", async () => {
    render(<PromoCodeClient campaign="definian-launch" />);

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    const [path, options] = mocks.apiFetch.mock.calls[0];
    expect(path).toContain("/coupons?");
    expect(path).toContain("code=__DEFINIAN_EVENT__");
    expect(path).toContain("event=scan");
    expect(path).toContain("campaign=definian-launch");
    expect(path).not.toContain("email=");
    expect(path).not.toContain("user=");
    expect(options?.method).toBeUndefined();
    expect(screen.getByText(/normal access whether or not a code is entered/i)).toBeInTheDocument();
  });

  it("submits a typed promo code through the existing discounts API", async () => {
    const user = userEvent.setup();
    render(<PromoCodeClient campaign="" />);

    await user.type(screen.getByLabelText("Promo code"), "welcome");
    await user.click(screen.getByRole("button", { name: "Apply promo code" }));

    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledTimes(1));
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/discounts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          code: "WELCOME",
          user: "auth0|promo-user",
          email: "promo.user@example.com",
          metadata: { source: "definian_portal" },
        }),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Promo applied successfully.");
  });
});
