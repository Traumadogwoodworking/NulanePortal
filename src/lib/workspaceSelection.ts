import type { PortalOrganization } from "@/lib/types";

export const WORKSPACE_SELECTION_STORAGE_KEY = "docudentPortalWorkspaceV1";

type StoredWorkspaceSelection = {
  selectedOrganizationId: string;
  allowedOrganizationIds: string[];
};

function normalizeId(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizePortalOrganizations(
  organizations: PortalOrganization[] | null | undefined
): PortalOrganization[] {
  const unique = new Map<string, PortalOrganization>();
  for (const organization of organizations ?? []) {
    const organizationId = normalizeId(organization?.organization_id);
    if (!organizationId || unique.has(organizationId)) continue;
    unique.set(organizationId, { ...organization, organization_id: organizationId });
  }
  return Array.from(unique.values());
}

export function getWorkspaceDisplayName(organization: PortalOrganization): string {
  if (organization.type?.trim().toLowerCase() === "free") {
    return "DocuDent workspace";
  }
  return organization.name?.trim() || "Workspace";
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function parseStoredSelection(storage: Storage): StoredWorkspaceSelection | null {
  try {
    const parsed = JSON.parse(storage.getItem(WORKSPACE_SELECTION_STORAGE_KEY) || "null") as Partial<StoredWorkspaceSelection> | null;
    const selectedOrganizationId = normalizeId(parsed?.selectedOrganizationId);
    const allowedOrganizationIds = Array.isArray(parsed?.allowedOrganizationIds)
      ? parsed.allowedOrganizationIds.map(normalizeId).filter(Boolean)
      : [];
    if (!selectedOrganizationId || !allowedOrganizationIds.includes(selectedOrganizationId)) {
      return null;
    }
    return { selectedOrganizationId, allowedOrganizationIds };
  } catch {
    return null;
  }
}

export function readStoredWorkspaceOrganizationId(storage = getBrowserStorage()): string | null {
  if (!storage) return null;
  return parseStoredSelection(storage)?.selectedOrganizationId ?? null;
}

export function clearStoredWorkspaceSelection(storage = getBrowserStorage()): void {
  storage?.removeItem(WORKSPACE_SELECTION_STORAGE_KEY);
}

export function persistBackendWorkspaceSelection(
  organizations: PortalOrganization[] | null | undefined,
  selectedOrganizationId: string,
  storage = getBrowserStorage()
): string | null {
  if (!storage) return null;
  const allowedOrganizationIds = normalizePortalOrganizations(organizations).map(
    (organization) => organization.organization_id
  );
  const normalizedSelection = normalizeId(selectedOrganizationId);
  if (!normalizedSelection || !allowedOrganizationIds.includes(normalizedSelection)) {
    storage.removeItem(WORKSPACE_SELECTION_STORAGE_KEY);
    return null;
  }
  storage.setItem(
    WORKSPACE_SELECTION_STORAGE_KEY,
    JSON.stringify({ selectedOrganizationId: normalizedSelection, allowedOrganizationIds })
  );
  return normalizedSelection;
}

export function selectBackendWorkspace(
  organizations: PortalOrganization[] | null | undefined,
  requestedOrganizationId: string,
  storage = getBrowserStorage()
): string {
  const selected = persistBackendWorkspaceSelection(
    organizations,
    requestedOrganizationId,
    storage
  );
  if (!selected) {
    throw new Error("Workspace is not available for this authenticated account.");
  }
  return selected;
}
