import { apiFetch } from "@/lib/apiClient";
import { isDevMockEnabled } from "@/lib/devMockApi";

export interface LedecShipmentRecord {
  shipment_id: string;
  source_system?: string | null;
  status?: string | null;
  reference_id?: string | null;
  expected_at?: string | null;
  sent_at?: string | null;
  delivered_at?: string | null;
  updated_at?: string | null;
  anomaly?: string | null;
}

export interface LedecShipmentsResponse {
  shipments: LedecShipmentRecord[];
}

/**
 * Future hook for LEDEC shipment monitoring.
 * This intentionally fails open with an empty list until a real backend contract exists.
 */
export async function fetchLedecShipments(): Promise<LedecShipmentRecord[]> {
  if (isDevMockEnabled()) {
    return [];
  }
  try {
    const payload = await apiFetch<LedecShipmentsResponse>("/admin/ledec/shipments");
    return Array.isArray(payload?.shipments) ? payload.shipments : [];
  } catch {
    return [];
  }
}
