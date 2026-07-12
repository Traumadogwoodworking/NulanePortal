import { apiFetch } from "@/lib/apiClient";

export async function deleteCurrentUser(): Promise<unknown> {
  return apiFetch("/users/me", {
    method: "DELETE",
    portal: {
      callerLabel: "settings.deleteCurrentUser",
      timeoutMs: 20000,
    },
  });
}
