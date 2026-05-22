import { buildApiUrl } from "@/lib/config";
import { apiFetch } from "@/lib/apiClient";
import { getPortalAccessToken } from "@/lib/portalAuth";
import type { BrandingSnapshot } from "@/lib/types";

const BRANDING_PATH = (organizationId: string) => `/organizations/${organizationId}/branding`;

export async function fetchBranding(organizationId: string): Promise<BrandingSnapshot> {
  return apiFetch<BrandingSnapshot>(BRANDING_PATH(organizationId));
}

export async function saveBranding(
  organizationId: string,
  payload: BrandingSnapshot
): Promise<BrandingSnapshot> {
  return apiFetch<BrandingSnapshot>(BRANDING_PATH(organizationId), {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function uploadBrandingLogo(
  organizationId: string,
  file: File
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("report_id", `branding-${organizationId}`);
  const token = await getPortalAccessToken();
  const response = await fetch(buildApiUrl("/photos/upload"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const payload = await response.json().catch(() => null) as { urls?: string[]; error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error || `Upload failed (${response.status})`);
  }
  const url = Array.isArray(payload?.urls) ? payload?.urls[0] : null;
  if (!url) {
    throw new Error("Upload completed but no URL returned.");
  }
  return url;
}
