import { describe, expect, it } from "vitest";

import {
  PortalApiAuthExpiredError,
  PortalApiHttpError,
  PortalApiNetworkError,
  PortalApiParseError,
  PortalApiTimeoutError,
} from "@/lib/apiClient";
import {
  PORTAL_SWR_ERROR_RETRY_COUNT,
  finitePortalSWRRetryOptions,
  isRetryablePortalSWRFailure,
} from "@/lib/swrRetry";

describe("finite portal SWR retries", () => {
  it("retries network, timeout, and selected transient server failures", () => {
    expect(isRetryablePortalSWRFailure(new PortalApiNetworkError({ requestId: "r", path: "/p", message: "offline" }))).toBe(true);
    expect(isRetryablePortalSWRFailure(new PortalApiTimeoutError({ requestId: "r", path: "/p", phase: "fetch_start", elapsedMs: 5, timeoutMs: 5 }))).toBe(true);
    for (const status of [500, 502, 503, 504]) {
      expect(isRetryablePortalSWRFailure(new PortalApiHttpError({ requestId: "r", path: "/p", status, statusText: "server", bodyPreview: "" }))).toBe(true);
    }
  });

  it("keeps authorization, validation, schema, and other HTTP failures terminal", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429, 501]) {
      expect(isRetryablePortalSWRFailure(new PortalApiHttpError({ requestId: "r", path: "/p", status, statusText: "terminal", bodyPreview: "" }))).toBe(false);
    }
    expect(isRetryablePortalSWRFailure(new PortalApiAuthExpiredError({ requestId: "r", path: "/p", status: 401 }))).toBe(false);
    expect(isRetryablePortalSWRFailure(new PortalApiParseError({ requestId: "r", path: "/p", message: "schema" }))).toBe(false);
    expect(isRetryablePortalSWRFailure(new Error("invalid facet contract"))).toBe(false);
  });

  it("sets an explicit finite SWR retry count", () => {
    expect(PORTAL_SWR_ERROR_RETRY_COUNT).toBe(1);
    expect(finitePortalSWRRetryOptions.errorRetryCount).toBe(1);
  });
});
