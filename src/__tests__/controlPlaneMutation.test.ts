import { describe, expect, it, vi } from "vitest";
import { withControlPlaneBootstrapRefresh } from "@/lib/portalData";

describe("withControlPlaneBootstrapRefresh", () => {
  it("refreshes the bootstrap after a successful mutation", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const result = await withControlPlaneBootstrapRefresh("org-123", async () => "ok", refresh);

    expect(result).toBe("ok");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledWith("org-123");
  });

  it("does not refresh when the mutation fails", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);

    await expect(
      withControlPlaneBootstrapRefresh("org-123", async () => {
        throw new Error("backend write failed");
      }, refresh)
    ).rejects.toThrow("backend write failed");

    expect(refresh).not.toHaveBeenCalled();
  });
});
