import { buildApiUrl } from "@/lib/config";
import { getPortalAccessToken } from "@/lib/portalAuth";

type UploadResponse = {
  urls?: string[];
  uploads?: unknown[];
  __upload_debug_error?: boolean;
  error?: string;
};

export type UploadSummary = {
  photoUrls: string[];
  pdfUrls: string[];
  uploads: unknown[];
};

function determineEndpoint(file: File) {
  const isPdf = file.type === "application/pdf";
  return isPdf ? "/pdf/upload" : "/photos/upload";
}

async function sendUploadRequest(reportId: string, file: File, endpoint: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("report_id", reportId);
  formData.append("file", file, file.name);
  const token = await getPortalAccessToken();
  const headers: Record<string, string> = {
    "x-portal-request": "true",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const response = await fetch(buildApiUrl(endpoint), {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "Upload request failed");
    throw new Error(`Upload failed (${response.status}): ${details}`);
  }
  const payload = (await response.json()) as UploadResponse;
  if (payload.__upload_debug_error) {
    throw new Error(payload.error || "Upload endpoint reported an error");
  }
  return payload;
}

export async function uploadAttachments(reportId: string, files: File[]): Promise<UploadSummary> {
  const summary: UploadSummary = { photoUrls: [], pdfUrls: [], uploads: [] };
  for (const file of files) {
    const endpoint = determineEndpoint(file);
    const response = await sendUploadRequest(reportId, file, endpoint);
    const urls = Array.isArray(response.urls) ? response.urls : [];
    if (endpoint === "/pdf/upload") {
      summary.pdfUrls.push(...urls);
    } else {
      summary.photoUrls.push(...urls);
    }
    if (Array.isArray(response.uploads)) {
      summary.uploads.push(...response.uploads);
    }
  }
  return summary;
}
