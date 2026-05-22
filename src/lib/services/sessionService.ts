import { apiFetch } from "@/lib/apiClient";
import { PortalSessionResponse } from "@/lib/types";

const SESSION_ENDPOINT = "/user/me";

export async function fetchPortalSession(): Promise<PortalSessionResponse> {
  return apiFetch<PortalSessionResponse>(SESSION_ENDPOINT);
}
