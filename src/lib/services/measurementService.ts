import { buildApiUrl } from "@/lib/config";
import { getPortalAccessToken } from "@/lib/portalAuth";

export interface MeasurementRecord {
  id: string;
  customerName?: string;
  vin?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  imageCount?: number;
  fitScore?: number;
  dimension?: string;
  measurement?: {
    value?: number;
    notes?: string;
    reducer?: string;
  };
  notes?: string;
  metadata?: Record<string, unknown> & { notes?: string };
}

export interface MeasurementPoint {
  id: string;
  takenAt: string;
  dimension: string;
  measurement: {
    value: number;
    notes?: string;
  };
  notes?: string;
  metadata?: {
    notes?: string;
  };
}

export interface LatestMeasurementAlert {
  dimension: string;
  value: number;
  tolerance?: number;
}

export interface DocuFitUploadMetadata {
  takenAt: string;
  notes: string;
}

export interface DocuFitUploadRequest {
  organizationId: string;
  locationId: string;
  imageUrl: string;
  metadata: DocuFitUploadMetadata;
}

async function fetchAuthorized(path: string, init: RequestInit = {}) {
  const token = await getPortalAccessToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(buildApiUrl(path), { ...init, headers });
}

export async function fetchMeasurements(): Promise<MeasurementRecord[]> {
  const response = await fetchAuthorized("/measurements");
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) {
    return payload;
  }
  if (typeof payload === "object" && payload !== null) {
    const record = payload as {
      data?: MeasurementRecord[];
      measurements?: MeasurementRecord[];
      rows?: MeasurementRecord[];
    };
    return record.data ?? record.measurements ?? record.rows ?? [];
  }
  return [];
}

export async function getMeasurements(
  organizationId?: string | null,
  locationId?: string | null
): Promise<MeasurementPoint[]> {
  const query = new URLSearchParams();
  if (organizationId) query.set("organizationId", organizationId);
  if (locationId) query.set("locationId", locationId);
  const path = query.toString() ? `/measurements?${query.toString()}` : "/measurements";
  const response = await fetchAuthorized(path);
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) {
    return payload as MeasurementPoint[];
  }
  if (typeof payload === "object" && payload !== null) {
    const record = payload as {
      data?: MeasurementPoint[];
      measurements?: MeasurementPoint[];
      points?: MeasurementPoint[];
    };
    return record.data ?? record.measurements ?? record.points ?? [];
  }
  return [];
}

export async function fetchLatestMeasurements(): Promise<LatestMeasurementAlert[]> {
  const response = await fetchAuthorized("/measurements?latest=true");
  if (!response.ok) {
    return [];
  }
  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) {
    return payload as LatestMeasurementAlert[];
  }
  if (typeof payload === "object" && payload !== null) {
    const record = payload as {
      data?: LatestMeasurementAlert[];
      measurements?: LatestMeasurementAlert[];
      latest?: LatestMeasurementAlert[];
    };
    return record.data ?? record.measurements ?? record.latest ?? [];
  }
  return [];
}

export async function uploadMeasurementImages(files: File[]): Promise<void> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const response = await fetchAuthorized("/photos/upload", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "Upload failed");
    throw new Error(details);
  }
}

export async function postDocuFitUpload(payload: DocuFitUploadRequest): Promise<void> {
  const response = await fetchAuthorized("/docufit/uploads", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "Upload failed");
    throw new Error(details);
  }
}

export async function uploadDocuFitImage(params: {
  file: File;
  organizationId: string;
  locationId: string;
  metadata: DocuFitUploadMetadata;
}): Promise<DocuFitUploadRequest> {
  const formData = new FormData();
  formData.append("files", params.file);
  const response = await fetchAuthorized("/photos/upload", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "Upload failed");
    throw new Error(details);
  }
  const payload = (await response.json()) as unknown;
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const imageUrl =
    (typeof record.imageUrl === "string" && record.imageUrl) ||
    (typeof record.url === "string" && record.url) ||
    (typeof record.photoUrl === "string" && record.photoUrl) ||
    (Array.isArray(record.photo_urls) && typeof record.photo_urls[0] === "string" && record.photo_urls[0]) ||
    (Array.isArray(record.urls) && typeof record.urls[0] === "string" && record.urls[0]) ||
    "";
  if (!imageUrl) {
    throw new Error("Photo upload did not return an image URL.");
  }
  return {
    organizationId: params.organizationId,
    locationId: params.locationId,
    imageUrl,
    metadata: params.metadata,
  };
}
