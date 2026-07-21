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

async function fetchCircleApi<T>(path: string): Promise<T> {
  const token = await getPortalAccessToken();
  if (!token) {
    throw new Error("Sign in again to access Circle dispatch.");
  }
  const response = await fetch(
    `${circleApiBase()}/${path.replace(/^\/+/, "")}`,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
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
