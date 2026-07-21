import { normalizeBaseUrl } from "@/lib/config";
import { getPortalAccessToken } from "@/lib/portalAuth";

const DEFAULT_CIRCLE_API_BASE = "https://api.nulanesystems.com/circle/api";

export interface CircleDispatchLoad {
  id: string;
  externalLoadId: string;
  tripNumber: string;
  carrierName: string;
  status: string;
  manifestRevision: number;
  primaryDriverId: string | null;
  shipDate: string | null;
  totalVinCount: number;
  remainingVinCount: number;
  destinationCount: number;
  nextStopName: string;
  updatedAt: string | null;
}

export interface CircleDispatchDriver {
  id: string;
  driverNumber: string;
  displayName: string;
  phone: string;
  carrierName: string;
  active: boolean;
}

function circleApiBase(): string {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_CIRCLE_API_BASE) ??
    DEFAULT_CIRCLE_API_BASE
  );
}

async function fetchCircleApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getPortalAccessToken();
  if (!token) {
    throw new Error("Sign in again to access Circle dispatch.");
  }
  const response = await fetch(
    `${circleApiBase()}/${path.replace(/^\/+/, "")}`,
    {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error || `Circle dispatch request failed (${response.status}).`);
  }
  return payload as T;
}

function commandHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Idempotency-Key": crypto.randomUUID(),
  };
}

export async function fetchCircleDispatchLoads(): Promise<CircleDispatchLoad[]> {
  const payload = await fetchCircleApi<{ loads?: CircleDispatchLoad[] }>(
    "/portal/v1/loads",
  );
  return Array.isArray(payload.loads) ? payload.loads : [];
}

export async function fetchCircleDispatchDrivers(): Promise<CircleDispatchDriver[]> {
  const payload = await fetchCircleApi<{ drivers?: CircleDispatchDriver[] }>(
    "/portal/v1/drivers",
  );
  return Array.isArray(payload.drivers) ? payload.drivers : [];
}

export async function createCircleDispatchLoad(input: {
  externalLoadId?: string;
  tripNumber: string;
  carrierName?: string;
  shipDate?: string;
}): Promise<{ loadId: string; manifestRevision: number }> {
  return fetchCircleApi("/portal/v1/loads", {
    method: "POST",
    headers: commandHeaders(),
    body: JSON.stringify(input),
  });
}

export async function addCircleDispatchStop(
  loadId: string,
  manifestRevision: number,
  input: { destinationName: string; dealerCode?: string; sequenceNumber: number },
): Promise<{ stopId: string }> {
  return fetchCircleApi(`/portal/v1/loads/${loadId}/stops`, {
    method: "POST",
    headers: commandHeaders(),
    body: JSON.stringify({ ...input, manifestRevision }),
  });
}

export async function addCircleDispatchVehicles(
  loadId: string,
  manifestRevision: number,
  vehicles: Array<{ vin: string; stopId: string }>,
): Promise<{ addedCount: number }> {
  return fetchCircleApi(`/portal/v1/loads/${loadId}/vehicles`, {
    method: "POST",
    headers: commandHeaders(),
    body: JSON.stringify({ manifestRevision, vehicles }),
  });
}

export async function assignCircleDispatchLoad(
  loadId: string,
  manifestRevision: number,
  driverId: string,
): Promise<void> {
  await fetchCircleApi(`/portal/v1/loads/${loadId}/assign`, {
    method: "POST",
    headers: commandHeaders(),
    body: JSON.stringify({ manifestRevision, driverId }),
  });
}

export async function publishCircleDispatchLoad(
  loadId: string,
  manifestRevision: number,
): Promise<void> {
  await fetchCircleApi(`/portal/v1/loads/${loadId}/publish`, {
    method: "POST",
    headers: commandHeaders(),
    body: JSON.stringify({ manifestRevision }),
  });
}
