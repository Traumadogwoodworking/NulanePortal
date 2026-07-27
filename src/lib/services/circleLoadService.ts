import { normalizeBaseUrl } from "@/lib/config";
import { getPortalAccessToken } from "@/lib/portalAuth";

const DEFAULT_CIRCLE_API_BASE = "https://api.nulanesystems.com/circle/api";

export interface CircleDispatchLoad {
  id: string;
  externalLoadId: string;
  customerName: string;
  tripNumber: string;
  legNumber: string;
  carrierName: string;
  originName: string;
  originAddress: Record<string, string>;
  specialInstructions: string;
  status: string;
  manifestRevision: number;
  primaryDriverId: string | null;
  shipDate: string | null;
  totalVinCount: number;
  remainingVinCount: number;
  destinationCount: number;
  nextStopName: string;
  publishedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
}

export interface CircleDispatchDriver {
  id: string;
  driverNumber: string;
  displayName: string;
  email: string;
  phone: string;
  carrierName: string;
  active: boolean;
  requirePodConditionPhotos: boolean;
  podPdfLayout: "standard" | "compact";
}

export interface CircleDispatchStop {
  id: string;
  sequence_number: number;
  destination_name_snapshot: string;
  dealer_code_snapshot: string | null;
  address_snapshot: Record<string, string>;
  contact_snapshot: Record<string, string>;
  delivery_instructions: string | null;
  status: string;
  actual_arrival_at: string | null;
}

export interface CircleDispatchVehicle {
  id: string;
  stop_id: string;
  vin: string;
  year: string | null;
  make: string | null;
  model: string | null;
  submodel: string | null;
  color: string | null;
  bay: string | null;
  delivery_status: string;
  delivered_at: string | null;
}

export interface CircleDispatchAuditEvent {
  id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  created_at: string;
}

export interface CircleDispatchLoadDetail {
  load: CircleDispatchLoad;
  stops: CircleDispatchStop[];
  vehicles: CircleDispatchVehicle[];
  assignments: Array<{
    driver_id: string;
    driver_number: string;
    display_name: string;
    status: string;
    assigned_at: string;
  }>;
  audit: CircleDispatchAuditEvent[];
  artifacts: Array<{
    id: string;
    artifact_type: string;
    url: string | null;
    generation_status: string;
    generation_error: string | null;
  }>;
}

export interface CircleLoadValidationIssue {
  field: string;
  code: string;
  vin?: string;
}

export class CircleDispatchApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: Record<string, unknown>,
  ) {
    super(message);
  }
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
    code?: string;
    issues?: CircleLoadValidationIssue[];
    [key: string]: unknown;
  };
  if (!response.ok) {
    throw new CircleDispatchApiError(
      payload.error || `Circle dispatch request failed (${response.status}).`,
      response.status,
      payload.code || "CIRCLE_DISPATCH_ERROR",
      payload,
    );
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

export async function createCircleDispatchDriver(input: {
  email: string;
  driverNumber: string;
  displayName: string;
  phone?: string;
  carrierName?: string;
  requirePodConditionPhotos: boolean;
  podPdfLayout: "standard" | "compact";
}): Promise<CircleDispatchDriver> {
  const payload = await fetchCircleApi<{ driver: CircleDispatchDriver }>(
    "/portal/v1/drivers",
    {
      method: "POST",
      headers: commandHeaders(),
      body: JSON.stringify(input),
    },
  );
  return payload.driver;
}

export async function updateCircleDispatchDriverSettings(
  driverId: string,
  input: {
    requirePodConditionPhotos: boolean;
    podPdfLayout: "standard" | "compact";
  },
): Promise<CircleDispatchDriver> {
  const payload = await fetchCircleApi<{ driver: CircleDispatchDriver }>(
    `/portal/v1/drivers/${driverId}/settings`,
    {
      method: "PATCH",
      headers: commandHeaders(),
      body: JSON.stringify(input),
    },
  );
  return payload.driver;
}

export async function createCircleDispatchLoad(input: {
  externalLoadId?: string;
  customerName: string;
  tripNumber: string;
  legNumber?: string;
  carrierName?: string;
  originName: string;
  originAddress?: Record<string, string>;
  specialInstructions?: string;
  truckNumber?: string;
  trailerNumber?: string;
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
  input: {
    destinationName: string;
    dealerCode?: string;
    sequenceNumber: number;
    address?: Record<string, string>;
    contact?: Record<string, string>;
    deliveryInstructions?: string;
  },
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
  vehicles: Array<{
    vin: string;
    stopId: string;
    year?: string;
    make?: string;
    model?: string;
    submodel?: string;
    color?: string;
    bay?: string;
  }>,
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

export async function fetchCircleDispatchLoad(
  loadId: string,
): Promise<CircleDispatchLoadDetail> {
  return fetchCircleApi(`/portal/v1/loads/${loadId}`);
}

export async function validateCircleDispatchLoad(
  loadId: string,
): Promise<{ valid: boolean; issues: CircleLoadValidationIssue[] }> {
  try {
    return await fetchCircleApi(`/portal/v1/loads/${loadId}/validate`, {
      method: "POST",
      headers: commandHeaders(),
      body: JSON.stringify({}),
    });
  } catch (error) {
    if (error instanceof CircleDispatchApiError && error.status === 422) {
      return {
        valid: false,
        issues: Array.isArray(error.details.issues)
          ? (error.details.issues as CircleLoadValidationIssue[])
          : [],
      };
    }
    throw error;
  }
}

export async function cancelCircleDispatchLoad(
  loadId: string,
  manifestRevision: number,
  reason: string,
): Promise<void> {
  await fetchCircleApi(`/portal/v1/loads/${loadId}/cancel`, {
    method: "POST",
    headers: commandHeaders(),
    body: JSON.stringify({ manifestRevision, reason }),
  });
}
