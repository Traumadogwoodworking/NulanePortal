import { docuFitFetch } from "@/lib/apiClient";
import type { DocuFitHealthResponse } from "@/lib/types";

const DOCUFIT_HEALTH_PATH = "/health";

export async function fetchDocuFitHealth(): Promise<DocuFitHealthResponse> {
  return docuFitFetch<DocuFitHealthResponse>(DOCUFIT_HEALTH_PATH);
}
