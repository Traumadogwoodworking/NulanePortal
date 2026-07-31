import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteDeliveryRule, fetchDeliveryRules } from "@/lib/services/deliveryRulesService";

const apiClientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  apiFetch: apiClientMocks.apiFetch,
}));

describe("deliveryRulesService", () => {
  beforeEach(() => {
    apiClientMocks.apiFetch.mockReset();
  });

  it("normalizes missing and legacy recipient actions at the service boundary", async () => {
    apiClientMocks.apiFetch.mockResolvedValue({
      rules: [
        { id: "missing-actions", name: "Legacy rule" },
        {
          id: "nested-actions",
          name: "Nested recipients",
          actions: {
            cc: { emails: [" Claims@Example.com ", "claims@example.com"] },
            bcc: "audit@example.com; manager@example.com",
          },
        },
      ],
    });

    const response = await fetchDeliveryRules();

    expect(response.delivery_rules[0]?.actions).toEqual({ cc: [], bcc: [] });
    expect(response.delivery_rules[1]?.actions).toEqual({
      cc: ["claims@example.com"],
      bcc: ["audit@example.com", "manager@example.com"],
    });
  });

  it("verifies a deleted rule is absent from a fresh server list", async () => {
    apiClientMocks.apiFetch
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        rules: [{ id: "remaining-rule", name: "Remaining rule" }],
      });

    await expect(deleteDeliveryRule("deleted-rule")).resolves.toMatchObject({
      delivery_rules: [{ id: "remaining-rule" }],
    });
    expect(apiClientMocks.apiFetch).toHaveBeenNthCalledWith(
      1,
      "/delivery-rules/deleted-rule",
      { method: "DELETE" }
    );
    expect(apiClientMocks.apiFetch).toHaveBeenNthCalledWith(2, "/delivery-rules");
  });

  it("does not report success when the server keeps returning the rule", async () => {
    apiClientMocks.apiFetch
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({
        rules: [{ id: "undeleted-rule", name: "Still here" }],
      });

    await expect(deleteDeliveryRule("undeleted-rule")).rejects.toThrow(
      "The server did not delete this delivery rule"
    );
  });
});
