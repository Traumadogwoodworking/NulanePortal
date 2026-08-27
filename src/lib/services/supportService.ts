import { buildApiUrl } from "@/lib/config";
import { getPortalAccessToken } from "@/lib/portalAuth";

export type SupportTicketSuccessResponse = {
  ticket_id?: string;
  status?: string;
};

export type SupportTicketValidationError = {
  error?: string;
  details?: Array<{
    field?: string;
    message?: string;
  }>;
};

export async function submitSupportTicket(
  formData: FormData
): Promise<SupportTicketSuccessResponse> {
  const token = await getPortalAccessToken();
  const response = await fetch(buildApiUrl("/api/support/tickets"), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  const payload = (await response.json().catch(() => null)) as
    | SupportTicketSuccessResponse
    | SupportTicketValidationError
    | null;

  if (!response.ok) {
    const error = new Error(
      (payload && "error" in payload && payload.error) || `Unable to submit support ticket (${response.status})`
    ) as Error & {
      status?: number;
      details?: Array<{
        field?: string;
        message?: string;
      }>;
    };
    error.status = response.status;
    if (payload && "details" in payload && Array.isArray(payload.details)) {
      error.details = payload.details;
    }
    console.error("[docudent.trace] support.submit.failed", {
      status: response.status,
      hasToken: Boolean(token),
    });
    throw error;
  }

  console.info("[docudent.trace] support.submit.succeeded", {
    status: response.status,
    hasToken: Boolean(token),
  });
  if (payload && "ticket_id" in payload) {
    return payload;
  }
  return {};
}
