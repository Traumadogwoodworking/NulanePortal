import { apiFetch } from "@/lib/apiClient";

export type SharedWorkspacePerson = {
  person_id: string;
  display_name: string;
  masked_email: string | null;
  is_current_user: boolean;
};

export type SharedWorkspacePeopleResponse = {
  shared_workspace: boolean;
  people: SharedWorkspacePerson[];
  total: number;
};

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePerson(value: unknown): SharedWorkspacePerson | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const personId = readString(record.person_id);
  const displayName = readString(record.display_name);
  if (!personId || !displayName) return null;
  return {
    person_id: personId,
    display_name: displayName,
    // Intentionally accept only the server-owned masked field. Never derive or
    // fall back to a raw email value in the browser.
    masked_email: readString(record.masked_email) || null,
    is_current_user: record.is_current_user === true,
  };
}

export async function fetchSharedWorkspacePeople(): Promise<SharedWorkspacePeopleResponse> {
  const payload = await apiFetch<unknown>("/shared-workspace/people", {
    portal: {
      callerLabel: "sharedWorkspace.people",
      timeoutMs: 10_000,
    },
  });
  const record = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
  const people = (Array.isArray(record.people) ? record.people : [])
    .map(normalizePerson)
    .filter((person): person is SharedWorkspacePerson => Boolean(person));
  const total = Number(record.total);
  return {
    shared_workspace: record.shared_workspace === true,
    people,
    total: Number.isFinite(total) && total >= people.length ? total : people.length,
  };
}
