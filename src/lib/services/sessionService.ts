import { apiFetch, PortalApiHttpError, PortalApiAuthExpiredError } from "@/lib/apiClient";
import { hasPersistedPortalToken, logAuthFlow } from "@/lib/portalAuth";
import { PortalSessionResponse } from "@/lib/types";

const SESSION_ENDPOINT = "/user/me";

type SessionFetchError = Error & { status?: number };

function describeBodyShape(payload: unknown): string {
  if (Array.isArray(payload)) {
    return "array";
  }
  if (payload && typeof payload === "object") {
    const keys = Object.keys(payload as Record<string, unknown>).slice(0, 12);
    return keys.length ? keys.join(",") : "object";
  }
  return payload === null ? "null" : typeof payload;
}

export async function fetchPortalSession(): Promise<PortalSessionResponse> {
  logAuthFlow("fetchPortalSession", {
    reason: "start",
    tokenExists: hasPersistedPortalToken(),
  });
  try {
    const payload = await apiFetch<PortalSessionResponse>(SESSION_ENDPOINT, {
      portal: {
        callerLabel: "session.fetchPortalSession",
        timeoutMs: 15000,
        skipAuthRedirect: true,
      },
    });
    logAuthFlow("fetchPortalSession", {
      reason: "end",
      httpStatus: 200,
      ok: true,
      tokenExists: hasPersistedPortalToken(),
      bodyShape: describeBodyShape(payload),
    });
    return payload;
  } catch (error) {
    const status =
      error instanceof PortalApiHttpError || error instanceof PortalApiAuthExpiredError ? error.status : undefined;
    logAuthFlow("fetchPortalSession", {
      reason: "error",
      httpStatus: status,
      ok: false,
      tokenExists: hasPersistedPortalToken(),
    });
    if (status) {
      const sessionError = new Error(`Portal session request failed (${status})`) as SessionFetchError;
      sessionError.status = status;
      throw sessionError;
    }
    throw error;
  }
}
