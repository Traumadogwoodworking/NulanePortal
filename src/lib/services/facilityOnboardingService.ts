import { apiFetch, PortalApiHttpError } from "@/lib/apiClient";
import { buildApiUrl } from "@/lib/config";
import { isDevMockEnabled, resolveDevMockResponse } from "@/lib/devMockApi";

export interface FacilityRegistrationConfiguration {
  organizationId: string;
  organizationName: string;
  facilityId: string;
  facilityName: string;
  facilityLabel: string;
  slug: string;
  enabled: boolean;
  available: boolean;
  defaultRoleId: string;
  defaultRoleKey: string;
  defaultRoleName: string;
  registrationUrl: string;
  globalEnabled: boolean;
  updatedAt: string | null;
}

export interface PublicFacilityRegistration {
  facilityName: string;
  facilityLabel: string;
  organizationName: string;
  registrationEnabled: boolean;
  branding: { companyName?: string; logoUrl?: string };
  support: { displayName?: string; email?: string; phone?: string };
}

export interface FacilityEnrollmentResult {
  success: true;
  organization: { name: string };
  facility: { name: string; label?: string; slug: string };
  role: { name: string; key: string };
  onboardingStatus: string;
  missingFields: string[];
  recommendedFields: string[];
  issues: Array<{ reference_code?: string; issue_key?: string; details?: unknown }>;
  auth0: { status: "synced" | "skipped_local_authority" | "needs_attention"; reason?: string };
}

export class FacilityRegistrationError extends Error {
  code: string;
  requestId: string;
  status: number;

  constructor(message: string, details: { code?: string; requestId?: string; status?: number } = {}) {
    super(message);
    this.name = "FacilityRegistrationError";
    this.code = details.code || "FACILITY_REGISTRATION_FAILED";
    this.requestId = details.requestId || "";
    this.status = details.status || 0;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function normalizeConfiguration(payload: unknown): FacilityRegistrationConfiguration {
  const row = record(record(payload).registration || payload);
  return {
    organizationId: text(row.organization_id),
    organizationName: text(row.organization_name),
    facilityId: text(row.location_id),
    facilityName: text(row.location_name),
    facilityLabel: text(row.location_label),
    slug: text(row.registration_slug),
    enabled: row.registration_enabled === true,
    available: row.registration_available === true,
    defaultRoleId: text(row.registration_default_role_id),
    defaultRoleKey: text(row.registration_default_role_key),
    defaultRoleName: text(row.registration_default_role_name),
    registrationUrl: text(row.registration_url),
    globalEnabled: row.global_registration_enabled !== false,
    updatedAt: text(row.updated_at) || null,
  };
}

export async function fetchFacilityRegistration(
  organizationId: string,
  facilityId: string
): Promise<FacilityRegistrationConfiguration> {
  return normalizeConfiguration(await apiFetch(
    `/admin/organizations/${organizationId}/locations/${facilityId}/registration`,
    { portal: { callerLabel: "facility-registration.get" } }
  ));
}

export async function updateFacilityRegistration(
  organizationId: string,
  facilityId: string,
  update: { slug: string; enabled: boolean; defaultRoleKey: string }
): Promise<FacilityRegistrationConfiguration> {
  return normalizeConfiguration(await apiFetch(
    `/admin/organizations/${organizationId}/locations/${facilityId}/registration`,
    {
      method: "PUT",
      body: JSON.stringify({
        registration_slug: update.slug,
        registration_enabled: update.enabled,
        registration_default_role_key: update.defaultRoleKey,
      }),
      portal: { callerLabel: "facility-registration.update" },
    }
  ));
}

export async function fetchPublicFacilityRegistration(slug: string): Promise<PublicFacilityRegistration> {
  let payload: Record<string, unknown>;
  if (isDevMockEnabled()) {
    payload = record(await resolveDevMockResponse(buildApiUrl(`/registration/facilities/${encodeURIComponent(slug)}`)));
  } else {
    const response = await fetch(buildApiUrl(`/registration/facilities/${encodeURIComponent(slug)}`), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    payload = record(await response.json().catch(() => ({})));
    if (!response.ok) {
      throw new FacilityRegistrationError(
        text(payload.error) || "Facility registration is unavailable.",
        {
          code: text(payload.code) || "REGISTRATION_LOOKUP_FAILED",
          requestId: response.headers.get("x-request-id") || "",
          status: response.status,
        }
      );
    }
  }
  const branding = record(payload.branding);
  const support = record(payload.support);
  return {
    facilityName: text(payload.facilityName),
    facilityLabel: text(payload.facilityLabel),
    organizationName: text(payload.organizationName),
    registrationEnabled: payload.registrationEnabled === true,
    branding: { companyName: text(branding.companyName), logoUrl: text(branding.logoUrl) },
    support: {
      displayName: text(support.displayName),
      email: text(support.email),
      phone: text(support.phone),
    },
  };
}

export async function enrollInFacility(slug: string, expectedEmail: string): Promise<FacilityEnrollmentResult> {
  let response: Record<string, unknown>;
  try {
    response = record(await apiFetch(`/registration/facilities/${encodeURIComponent(slug)}/enroll`, {
      method: "POST",
      body: JSON.stringify({ expected_email: expectedEmail.trim().toLowerCase() }),
      portal: { callerLabel: "facility-registration.enroll", skipAuthRedirect: true },
    }));
  } catch (error) {
    if (error instanceof PortalApiHttpError) {
      throw new FacilityRegistrationError(
        error.userMessage || "Unable to complete facility registration.",
        { code: error.code, requestId: error.requestId, status: error.status }
      );
    }
    throw error;
  }
  const organization = record(response.organization);
  const facility = record(response.facility);
  const role = record(response.role);
  const auth0 = record(response.auth0);
  return {
    success: true,
    organization: { name: text(organization.name) },
    facility: { name: text(facility.name), label: text(facility.label) || undefined, slug: text(facility.slug) },
    role: { name: text(role.name), key: text(role.key) },
    onboardingStatus: text(response.onboardingStatus) || "profile_incomplete",
    missingFields: texts(response.missingFields),
    recommendedFields: texts(response.recommendedFields),
    issues: Array.isArray(response.issues) ? response.issues.map((issue) => record(issue)) : [],
    auth0: {
      status: (text(auth0.status) || "needs_attention") as FacilityEnrollmentResult["auth0"]["status"],
      reason: text(auth0.reason) || undefined,
    },
  };
}
