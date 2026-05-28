import { buildApiUrl, buildDocuFitUrl, portalConfig } from "./config";
import { resolveDevMockResponse, isDevMockEnabled } from "./devMockApi";
import { getPortalAccessToken } from "./portalAuth";

export type ResponseError = Error & { status?: number };

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const details = await response.text().catch(() => "No response body");
    const error = new Error(
      `API request to ${response.url} failed (${response.status} ${response.statusText}): ${details.slice(0, 500)}`
    ) as ResponseError;
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as T;
}

async function fetchJson<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const resolvedUrl = url;
  if (isDevMockEnabled()) {
    const mock = await resolveDevMockResponse(url, options);
    if (mock !== null) {
      console.warn("[reset-password.trace] apiFetch.devMockIntercept", {
        path: url,
        method,
      });
      return mock as T;
    }
  }
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  console.info("[reset-password.trace] apiFetch.realFetch", {
    resolvedUrl,
    method,
    authorizationPresent: Boolean((options.headers as Record<string, string> | undefined)?.Authorization || (options.headers as Record<string, string> | undefined)?.authorization),
  });
  const response = await fetch(url, {
    headers: isFormDataBody
      ? {
          ...(options.headers || {}),
        }
      : {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
    ...options,
  });
  console.info("[reset-password.trace] apiFetch.response", {
    status: response.status,
    ok: response.ok,
  });
  return parseResponse<T>(response);
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  console.info("[reset-password.trace] apiFetch.enter", {
    path,
    method: (options.method || "GET").toUpperCase(),
  });
  const url = buildApiUrl(path);
  console.info("[reset-password.trace] apiFetch.url", {
    path,
    resolvedUrl: url,
    apiBase: portalConfig.apiBase,
  });
  const token = await getPortalAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as Record<string, string>;
  if (!token) {
    console.warn("[reset-password.trace] apiFetch.noToken");
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetchJson(url, { ...options, headers });
}

export async function apiFetchResponse(path: string, options: RequestInit = {}): Promise<Response> {
  console.info("[reset-password.trace] apiFetch.enter", {
    path,
    method: (options.method || "GET").toUpperCase(),
    responseType: "raw",
  });
  const url = buildApiUrl(path);
  console.info("[reset-password.trace] apiFetch.url", {
    path,
    resolvedUrl: url,
    apiBase: portalConfig.apiBase,
    responseType: "raw",
  });
  const token = await getPortalAccessToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  } as Record<string, string>;
  if (!token) {
    console.warn("[reset-password.trace] apiFetch.noToken");
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
  console.info("[reset-password.trace] apiFetch.realFetch", {
    resolvedUrl: url,
    method: (options.method || "GET").toUpperCase(),
    authorizationPresent: Boolean(headers.Authorization || headers.authorization),
    responseType: "raw",
  });
  const response = await fetch(url, {
    headers: isFormDataBody
      ? {
          ...(options.headers || {}),
        }
      : headers,
    ...options,
  });
  console.info("[reset-password.trace] apiFetch.response", {
    status: response.status,
    ok: response.ok,
    responseType: "raw",
  });
  return response;
}

export async function docuFitFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildDocuFitUrl(path);
  return fetchJson(url, options);
}
