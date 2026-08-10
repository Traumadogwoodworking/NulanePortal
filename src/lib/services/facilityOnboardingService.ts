import { apiFetch, PortalApiHttpError } from "@/lib/apiClient";
import { buildApiUrl } from "@/lib/config";
import { isDevMockEnabled, resolveDevMockResponse } from "@/lib/devMockApi";

export interface FacilitySupport {
  displayName?: string;
  email?: string;
  phone?: string;
}

export interface FacilityStores {
  ios?: string;
  android?: string;
}

export interface FacilityEnrollmentHistoryItem {
  sessionId: string;
  status: string;
  source: string;
  failureCode: string;
  userEmail: string;
  roleName: string;
  lastEventKey: string;
  lastEventResult: string;
  lastEventAt: string | null;
  createdAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
}

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
  onboardingDisplayName: string;
  support: FacilitySupport;
  stores: FacilityStores;
  packetRevision: number;
  packetUpdatedAt: string | null;
  lastSuccessfulEnrollment: FacilityEnrollmentHistoryItem | null;
  recentEnrollments: FacilityEnrollmentHistoryItem[];
  globalEnabled: boolean;
  updatedAt: string | null;
}

export interface PublicFacilityRegistration {
  facilityName: string;
  facilityLabel: string;
  organizationName: string;
  registrationEnabled: boolean;
  branding: { companyName?: string; logoUrl?: string };
  support: FacilitySupport;
  stores: FacilityStores;
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
  alreadyMember: boolean;
  signedInEmail?: string;
  idempotentReplay?: boolean;
  membershipChanges?: {
    userCreated?: boolean;
    organizationMembershipCreated?: boolean;
    facilityMembershipCreated?: boolean;
    roleAssigned?: boolean;
    facilitySelected?: boolean;
  };
  auth0: { status: "identity_only" };
}

export interface FacilityEnrollmentSession {
  enrollmentToken: string;
  status: string;
  expiresAt: string | null;
  completedAt: string | null;
  failureCode: string;
  organizationName: string;
  facilityName: string;
  facilityLabel: string;
  registrationEnabled: boolean;
  roleName: string;
  support: FacilitySupport;
  stores: FacilityStores;
  branding: { companyName?: string; logoUrl?: string };
  packetRevision: number;
  restartUrl: string;
  emailEntered: boolean;
  enrollmentResult: FacilityEnrollmentResult | null;
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

function normalizeSupport(value: unknown): FacilitySupport {
  const row = record(value);
  return {
    displayName: text(row.displayName) || undefined,
    email: text(row.email) || undefined,
    phone: text(row.phone) || undefined,
  };
}

function normalizeStores(value: unknown): FacilityStores {
  const row = record(value);
  return { ios: text(row.ios) || undefined, android: text(row.android) || undefined };
}

function normalizeHistoryItem(value: unknown): FacilityEnrollmentHistoryItem {
  const row = record(value);
  return {
    sessionId: text(row.enrollment_session_id),
    status: text(row.status),
    source: text(row.source),
    failureCode: text(row.failure_code),
    userEmail: text(row.user_email),
    roleName: text(row.role_name),
    lastEventKey: text(row.last_event_key),
    lastEventResult: text(row.last_event_result),
    lastEventAt: text(row.last_event_at) || null,
    createdAt: text(row.created_at) || null,
    completedAt: text(row.completed_at) || null,
    expiresAt: text(row.expires_at) || null,
  };
}

function normalizeConfiguration(payload: unknown): FacilityRegistrationConfiguration {
  const row = record(record(payload).registration || payload);
  const recentEnrollments = Array.isArray(row.recent_enrollments)
    ? row.recent_enrollments.map(normalizeHistoryItem)
    : [];
  const lastSuccessful = record(row.last_successful_enrollment);
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
    onboardingDisplayName: text(row.onboarding_display_name),
    support: normalizeSupport(row.support),
    stores: normalizeStores(row.stores),
    packetRevision: Number(row.packet_revision) || 1,
    packetUpdatedAt: text(row.packet_updated_at) || null,
    lastSuccessfulEnrollment: Object.keys(lastSuccessful).length ? normalizeHistoryItem(lastSuccessful) : null,
    recentEnrollments,
    globalEnabled: row.global_registration_enabled !== false,
    updatedAt: text(row.updated_at) || null,
  };
}

function normalizeEnrollmentResult(payload: unknown): FacilityEnrollmentResult {
  const response = record(payload);
  const organization = record(response.organization);
  const facility = record(response.facility);
  const role = record(response.role);
  const auth0 = record(response.auth0);
  const membershipChanges = record(response.membershipChanges);
  return {
    success: true,
    organization: { name: text(organization.name) },
    facility: { name: text(facility.name), label: text(facility.label) || undefined, slug: text(facility.slug) },
    role: { name: text(role.name), key: text(role.key) },
    onboardingStatus: text(response.onboardingStatus) || "profile_incomplete",
    missingFields: texts(response.missingFields),
    recommendedFields: texts(response.recommendedFields),
    issues: Array.isArray(response.issues) ? response.issues.map((issue) => record(issue)) : [],
    alreadyMember: response.alreadyMember === true,
    signedInEmail: text(response.signedInEmail) || undefined,
    idempotentReplay: response.idempotentReplay === true || undefined,
    membershipChanges: Object.keys(membershipChanges).length ? {
      userCreated: membershipChanges.userCreated === true,
      organizationMembershipCreated: membershipChanges.organizationMembershipCreated === true,
      facilityMembershipCreated: membershipChanges.facilityMembershipCreated === true,
      roleAssigned: membershipChanges.roleAssigned === true,
      facilitySelected: membershipChanges.facilitySelected === true,
    } : undefined,
    auth0: { status: text(auth0.status) === "identity_only" ? "identity_only" : "identity_only" },
  };
}

function normalizeSession(payload: unknown, knownToken = ""): FacilityEnrollmentSession {
  const row = record(payload);
  const result = record(row.enrollmentResult);
  return {
    enrollmentToken: text(row.enrollmentToken) || knownToken,
    status: text(row.status) || "started",
    expiresAt: text(row.expiresAt) || null,
    completedAt: text(row.completedAt) || null,
    failureCode: text(row.failureCode),
    organizationName: text(row.organizationName),
    facilityName: text(row.facilityName),
    facilityLabel: text(row.facilityLabel),
    registrationEnabled: row.registrationEnabled === true,
    roleName: text(row.roleName),
    support: normalizeSupport(row.support),
    stores: normalizeStores(row.stores),
    branding: {
      companyName: text(record(row.branding).companyName) || undefined,
      logoUrl: text(record(row.branding).logoUrl) || undefined,
    },
    packetRevision: Number(row.packetRevision) || 1,
    restartUrl: text(row.restartUrl),
    emailEntered: row.emailEntered === true || ["email_entered", "auth_started", "authenticated", "enrolling", "completed"].includes(text(row.status)),
    enrollmentResult: Object.keys(result).length ? normalizeEnrollmentResult(result) : null,
  };
}

async function publicRegistrationRequest(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  if (isDevMockEnabled()) {
    return record(await resolveDevMockResponse(buildApiUrl(path), init));
  }
  const requestId = `portal-${Date.now().toString(36)}-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2, 10)}`;
  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      "X-Portal-Request-Id": requestId,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const payload = record(await response.json().catch(() => ({})));
  if (!response.ok) {
    throw new FacilityRegistrationError(
      text(payload.error) || "Facility registration is unavailable.",
      {
        code: text(payload.code) || "REGISTRATION_REQUEST_FAILED",
        requestId: response.headers.get("x-request-id") || requestId,
        status: response.status,
      }
    );
  }
  return payload;
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
  update: {
    slug: string;
    enabled: boolean;
    defaultRoleKey: string;
    onboardingDisplayName?: string;
    supportEmail?: string;
    supportPhone?: string;
    iosStoreUrl?: string;
    androidStoreUrl?: string;
  }
): Promise<FacilityRegistrationConfiguration> {
  return normalizeConfiguration(await apiFetch(
    `/admin/organizations/${organizationId}/locations/${facilityId}/registration`,
    {
      method: "PUT",
      body: JSON.stringify({
        registration_slug: update.slug,
        registration_enabled: update.enabled,
        registration_default_role_key: update.defaultRoleKey,
        onboarding_display_name: update.onboardingDisplayName,
        support_email: update.supportEmail,
        support_phone: update.supportPhone,
        ios_store_url: update.iosStoreUrl,
        android_store_url: update.androidStoreUrl,
      }),
      portal: { callerLabel: "facility-registration.update" },
    }
  ));
}

export async function fetchPublicFacilityRegistration(slug: string): Promise<PublicFacilityRegistration> {
  const payload = await publicRegistrationRequest(`/registration/facilities/${encodeURIComponent(slug)}`);
  const branding = record(payload.branding);
  return {
    facilityName: text(payload.facilityName),
    facilityLabel: text(payload.facilityLabel),
    organizationName: text(payload.organizationName),
    registrationEnabled: payload.registrationEnabled === true,
    branding: { companyName: text(branding.companyName), logoUrl: text(branding.logoUrl) },
    support: normalizeSupport(payload.support),
    stores: normalizeStores(payload.stores),
  };
}

export async function createFacilityEnrollmentSession(
  slug: string,
  source: "facility_qr" | "portal_link" | "portal_test" = "facility_qr"
): Promise<FacilityEnrollmentSession> {
  const payload = await publicRegistrationRequest(
    `/registration/facilities/${encodeURIComponent(slug)}/session`,
    { method: "POST", body: JSON.stringify({ source }) }
  );
  return normalizeSession(payload);
}

export async function fetchFacilityEnrollmentSession(token: string): Promise<FacilityEnrollmentSession> {
  return normalizeSession(await publicRegistrationRequest(
    `/registration/sessions/${encodeURIComponent(token)}`
  ), token);
}

export async function submitFacilityEnrollmentEmail(token: string, email: string): Promise<FacilityEnrollmentSession> {
  return normalizeSession(await publicRegistrationRequest(
    `/registration/sessions/${encodeURIComponent(token)}/email`,
    { method: "POST", body: JSON.stringify({ email: email.trim().toLowerCase() }) }
  ), token);
}

export async function recordFacilityEnrollmentEvent(
  token: string,
  eventKey: "registration.page_viewed" | "registration.auth_started" | "registration.app_open_clicked" | "registration.install_clicked",
  details: Record<string, string | number | boolean> = {}
): Promise<void> {
  await publicRegistrationRequest(`/registration/sessions/${encodeURIComponent(token)}/events`, {
    method: "POST",
    body: JSON.stringify({ event_key: eventKey, details }),
  });
}

export async function enrollInFacility(token: string): Promise<FacilityEnrollmentResult> {
  let response: Record<string, unknown>;
  try {
    response = record(await apiFetch(`/registration/sessions/${encodeURIComponent(token)}/enroll`, {
      method: "POST",
      body: JSON.stringify({}),
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
  return normalizeEnrollmentResult(response);
}
