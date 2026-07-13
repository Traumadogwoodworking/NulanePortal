import {
  PortalApiHttpError,
  PortalApiNetworkError,
  PortalApiTimeoutError,
} from "@/lib/apiClient";

const RETRYABLE_HTTP_STATUSES = new Set([500, 502, 503, 504]);

export const PORTAL_SWR_ERROR_RETRY_COUNT = 1;
export const PORTAL_SWR_ERROR_RETRY_INTERVAL_MS = 750;

export function isRetryablePortalSWRFailure(error: unknown): boolean {
  if (error instanceof PortalApiNetworkError || error instanceof PortalApiTimeoutError) return true;
  return error instanceof PortalApiHttpError && RETRYABLE_HTTP_STATUSES.has(error.status);
}

export const finitePortalSWRRetryOptions = {
  shouldRetryOnError: isRetryablePortalSWRFailure,
  errorRetryCount: PORTAL_SWR_ERROR_RETRY_COUNT,
  errorRetryInterval: PORTAL_SWR_ERROR_RETRY_INTERVAL_MS,
} as const;
