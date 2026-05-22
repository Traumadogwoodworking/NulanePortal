import { apiFetch } from "@/lib/apiClient";
import type { PortalOrganization } from "@/lib/types";

const ORGANIZATIONS_ENDPOINT = "/organizations";
const ORGANIZATION_DETAIL_ENDPOINT = (organizationId: string) => `/organizations/${organizationId}`;
const ORGANIZATION_VISIBILITY_ENDPOINT = (organizationId: string) => `/organizations/${organizationId}/visibility`;

interface OrganizationVisibility {
  organization_id: string;
  is_private: boolean;
  // Add other visibility related fields as needed
}

export async function getOrganizations(): Promise<PortalOrganization[]> {
  const payload = await apiFetch<{ organizations: PortalOrganization[] }>(ORGANIZATIONS_ENDPOINT);
  return Array.isArray(payload?.organizations) ? payload.organizations : [];
}

export async function getOrganization(organizationId: string): Promise<PortalOrganization> {
  return apiFetch<PortalOrganization>(ORGANIZATION_DETAIL_ENDPOINT(organizationId));
}

export async function updateOrganization(
  organizationId: string,
  patch: Partial<PortalOrganization>
): Promise<PortalOrganization> {
  return apiFetch<PortalOrganization>(ORGANIZATION_DETAIL_ENDPOINT(organizationId), {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

export async function getOrganizationVisibility(organizationId: string): Promise<OrganizationVisibility> {
  return apiFetch<OrganizationVisibility>(ORGANIZATION_VISIBILITY_ENDPOINT(organizationId));
}

export async function updateOrganizationVisibility(
  organizationId: string,
  patch: Partial<OrganizationVisibility>
): Promise<OrganizationVisibility> {
  return apiFetch<OrganizationVisibility>(ORGANIZATION_VISIBILITY_ENDPOINT(organizationId), {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}
