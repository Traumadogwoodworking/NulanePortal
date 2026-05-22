import { apiFetch } from "@/lib/apiClient";
import {
  LocationMembership,
  OrganizationMembership,
  PortalUserRecord,
  RoleCatalog,
  RoleKey,
  UserSummary,
} from "@/lib/types";

const USERS_ENDPOINT = (organizationId: string) => `/admin/organizations/${organizationId}/users`;
const USER_DETAIL_ENDPOINT = (organizationId: string, userId: string) => `${USERS_ENDPOINT(organizationId)}/${userId}`;
const USER_BY_EMAIL_STATUS_ENDPOINT = (organizationId: string, email: string) =>
  `/admin/organizations/${organizationId}/users/by-email/${encodeURIComponent(email)}/status`;
const USER_BY_EMAIL_ENDPOINT = (organizationId: string, email: string) =>
  `/admin/organizations/${organizationId}/users/by-email/${encodeURIComponent(email)}`;
const USER_ROLES_ENDPOINT = (userId: string) => `/users/${userId}/roles`;
const USER_FACILITIES_ENDPOINT = (organizationId: string, userId: string) => `/admin/organizations/${organizationId}/users/${userId}/facilities`;
const USER_FACILITY_DETAIL_ENDPOINT = (organizationId: string, userId: string, facilityId: string) => `${USER_FACILITIES_ENDPOINT(organizationId, userId)}/${facilityId}`;
const USER_PASSWORD_RESET_ENDPOINT = (organizationId: string, userId: string) =>
  `/admin/organizations/${organizationId}/users/${userId}/password-reset`;

const ROLES_ENDPOINT = (organizationId: string) => `/admin/organizations/${organizationId}/roles`;
const MEMBERSHIPS_ENDPOINT = (organizationId: string) =>
  `/admin/organizations/${organizationId}/memberships`;
const LOCATION_MEMBERSHIPS_ENDPOINT = (organizationId: string) =>
  `/admin/organizations/${organizationId}/location-memberships`;
const LOCATION_MEMBERSHIP_DETAIL_ENDPOINT = (organizationId: string, membershipId: string) => `/admin/organizations/${organizationId}/location-memberships/${membershipId}`;

interface CreateUserPayload {
  email: string;
  role: string;
  facility_ids: string[];
  display_name?: string;
  first_name?: string;
  last_name?: string;
  location_id?: string;
  phone?: string;
  is_active?: boolean;
  invite?: boolean;
  send_email?: boolean;
  redirect_uri?: string;
  location_role?: string;
  location_primary?: boolean;
  location_metadata?: Record<string, unknown>;
  preferences?: Record<string, unknown>;
  auth0_metadata?: Record<string, unknown>;
  membership_metadata?: Record<string, unknown>;
  auth0_organization_id?: string;
}

function normalizeRoleKey(value?: string): RoleKey {
  if (!value) return "user";
  const candidate = value.toString().trim().toLowerCase();
  if (candidate === "admin" || candidate === "org_admin") {
    return "admin";
  }
  if (candidate === "viewer") {
    return "viewer";
  }
  return "user";
}

function formatName(user: PortalUserRecord) {
  if (user.display_name) {
    return user.display_name;
  }
  const pieces = [user.first_name, user.last_name].filter(Boolean);
  if (pieces.length) {
    return pieces.join(" ");
  }
  return user.email || user.user_id || "Unknown user";
}

function mapUserRecord(user: PortalUserRecord): UserSummary {
  const role = normalizeRoleKey(user.role);
  const facilityIds = Array.isArray(user.facility_ids)
    ? Array.from(
        new Set(
          user.facility_ids
            .map((id) => id || "")
            .filter(Boolean)
        )
      )
    : [];
  return {
    id: user.user_id || user.id || "",
    name: formatName(user),
    email: user.email || "",
    role,
    status: user.status || "inactive",
    isActive: user.is_active !== false,
    facilityIds,
    permissions: Array.isArray(user.permissions) ? user.permissions.map((permission) => permission.toString()) : [],
    lastLogin: user.last_login || user.updated_at || null,
    lastUpdated: user.updated_at || new Date().toISOString(),
    createdAt: user.created_at || new Date().toISOString(),
  };
}

function mapRoleRecord(row: Partial<RoleCatalog> & { role_key?: string; role_name?: string; role_scope?: string; is_active?: boolean; permissions?: string[] }): RoleCatalog {
  return {
    key: (row.role_key || "member").toString(),
    name: row.role_name || row.role_key || "Unnamed role",
    description: row.description || "",
    scope: (["organization", "facility", "location"].includes(row.role_scope || "")
      ? (row.role_scope as "organization" | "facility" | "location")
      : "organization"),
    permissions: Array.isArray(row.permissions) ? row.permissions.map((permission) => permission.toString()) : [],
    status: row.is_active === false ? "archived" : "active",
  };
}

function readArrayFromPayload<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (!payload || typeof payload !== "object") {
    throw new Error("Unexpected directory response shape.");
  }
  const typedPayload = payload as Record<string, unknown>;
  for (const key of keys) {
    const value = typedPayload[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (value && typeof value === "object") {
      const nestedValue = value as Record<string, unknown>;
      for (const nestedKey of keys) {
        if (Array.isArray(nestedValue[nestedKey])) {
          return nestedValue[nestedKey] as T[];
        }
      }
    }
  }
  throw new Error("Unexpected directory response shape.");
}


export async function fetchOrganizationUsers(organizationId: string): Promise<UserSummary[]> {
  if (!organizationId) {
    return [];
  }
  const payload = await apiFetch<unknown>(USERS_ENDPOINT(organizationId));
  const records = readArrayFromPayload<PortalUserRecord>(payload, ["users", "data", "results", "rows"]);
  return records.map((user) => mapUserRecord(user));
}

export async function fetchOrganizationRoles(organizationId: string): Promise<RoleCatalog[]> {
  if (!organizationId) {
    return [];
  }
  const payload = await apiFetch<{ roles: RoleCatalog[] }>(ROLES_ENDPOINT(organizationId));
  const records = Array.isArray(payload?.roles) ? payload.roles : [];
  return records.map((role) => mapRoleRecord(role));
}

export async function fetchOrganizationMemberships(
  organizationId: string
): Promise<OrganizationMembership[]> {
  if (!organizationId) {
    return [];
  }
  const payload = await apiFetch<unknown>(MEMBERSHIPS_ENDPOINT(organizationId));
  return readArrayFromPayload<OrganizationMembership>(payload, ["memberships", "data", "results", "rows"]);
}

export async function fetchLocationMemberships(
  organizationId: string
): Promise<LocationMembership[]> {
  if (!organizationId) {
    return [];
  }
  const resolvedUrl = LOCATION_MEMBERSHIPS_ENDPOINT(organizationId);
  const payload = await apiFetch<unknown>(resolvedUrl);
  const memberships = readArrayFromPayload<LocationMembership>(payload, [
    "location_memberships",
    "memberships",
    "data",
    "results",
    "rows",
  ]);
  if (process.env.NODE_ENV === "development") {
    const facilityCounts = memberships.reduce<Record<string, number>>((acc, membership) => {
      const key = membership.location_id || "unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const userCounts = memberships.reduce<Record<string, number>>((acc, membership) => {
      const key = membership.user_id || "unassigned";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.info("[assignments] loaded location memberships", {
      resolvedUrl,
      organizationId,
      rawCount: memberships.length,
      normalizedCount: memberships.length,
      groupedByFacility: facilityCounts,
      groupedByUser: userCounts,
      firstFields: memberships[0]
        ? {
            location_membership_id: memberships[0].location_membership_id,
            location_id: memberships[0].location_id,
            organization_id: memberships[0].organization_id,
            user_id: memberships[0].user_id,
            role: memberships[0].role,
            is_active: memberships[0].is_active,
            is_primary: memberships[0].is_primary,
          }
        : {},
    });
  }
  return memberships;
}

export async function fetchUserDetail(
  organizationId: string,
  userId: string
): Promise<UserSummary | null> {
  if (!organizationId || !userId) {
    return null;
  }
  const payload = await apiFetch<unknown>(USER_DETAIL_ENDPOINT(organizationId, userId));
  if (payload && typeof payload === "object" && "user" in payload) {
    const user = (payload as { user?: PortalUserRecord }).user;
    return user ? mapUserRecord(user) : null;
  }
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    const data = (payload as { data?: unknown }).data as PortalUserRecord[];
    return data[0] ? mapUserRecord(data[0]) : null;
  }
  throw new Error("Unexpected user detail response shape.");
}

export async function createUser(
  organizationId: string,
  payload: CreateUserPayload
): Promise<UserSummary> {
  const response = await apiFetch<unknown>(USERS_ENDPOINT(organizationId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (response && typeof response === "object" && "user" in response) {
    const user = (response as { user?: PortalUserRecord }).user;
    if (user) return mapUserRecord(user);
  }
  throw new Error("Unexpected create user response shape.");
}

export async function updateUser(
  organizationId: string,
  userId: string,
  patch: Partial<PortalUserRecord> & { is_active?: boolean }
): Promise<UserSummary> {
  const response = await apiFetch<unknown>(USER_DETAIL_ENDPOINT(organizationId, userId), {
    method: "PUT",
    body: JSON.stringify(patch),
  });
  if (response && typeof response === "object" && "user" in response) {
    const user = (response as { user?: PortalUserRecord }).user;
    if (user) return mapUserRecord(user);
  }
  throw new Error("Unexpected user update response shape.");
}

export async function updateUserStatusByEmail(
  organizationId: string,
  email: string,
  isActive: boolean
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(USER_BY_EMAIL_STATUS_ENDPOINT(organizationId, email), {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

export async function deleteUserByEmail(
  organizationId: string,
  email: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(USER_BY_EMAIL_ENDPOINT(organizationId, email), {
    method: "DELETE",
  });
}

export async function resetUserPassword(
  organizationId: string,
  userId: string,
  reason = "Portal admin requested password reset"
): Promise<{ ok: true; message: string }> {
  const endpoint = USER_PASSWORD_RESET_ENDPOINT(organizationId, userId);
  console.info("[reset-password.trace] usersService.resetUserPassword.enter", {
    organizationId,
    userId,
    endpoint,
  });
  try {
    return await apiFetch<{ ok: true; message: string }>(endpoint, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  } catch (error) {
    const responseError = error as { status?: number; message?: string };
    const status = responseError.status;
    const message = responseError.message || "";
    if (status === 429 || message.includes("PASSWORD_RESET_RATE_LIMITED")) {
      throw new Error("Too many password reset requests. Try again later.");
    }
    if (status === 403) {
      throw new Error("You do not have permission to send password reset emails.");
    }
    if (status === 404) {
      throw new Error("User not found.");
    }
    if (status === 400 && message.includes("User email is required")) {
      throw new Error("User email is required.");
    }
    if (status === 400 && message.includes("not eligible")) {
      throw new Error("User is not eligible for password reset.");
    }
    if (status === 503 || message.includes("PASSWORD_RESET_UNAVAILABLE")) {
      throw new Error("Password reset emails are temporarily unavailable.");
    }
    if (status === 502 || message.includes("PASSWORD_RESET_FAILED")) {
      throw new Error("Password reset email request failed.");
    }
    throw new Error("Could not send password reset email.");
  }
}

export async function updateUserRole(
  userId: string,
  role: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(USER_ROLES_ENDPOINT(userId), {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function updateUserFacilities(
  organizationId: string,
  userId: string,
  facilityIds: string[]
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(USER_FACILITIES_ENDPOINT(organizationId, userId), {
    method: "PUT",
    body: JSON.stringify({ facilityIds }),
  });
}

export async function removeUserFacility(
  organizationId: string,
  userId: string,
  facilityId: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(USER_FACILITY_DETAIL_ENDPOINT(organizationId, userId, facilityId), {
    method: "DELETE",
  });
}


export async function addLocationMembership(
  organizationId: string,
  userId: string,
  locationId: string,
  role: string = "member"
): Promise<LocationMembership> {
  return apiFetch<LocationMembership>(LOCATION_MEMBERSHIPS_ENDPOINT(organizationId), {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      location_id: locationId,
      location_role: role,
      is_primary: false,
    }),
  });
}

export async function removeLocationMembership(
  organizationId: string,
  membershipId: string
): Promise<{ success: boolean }> {
  return apiFetch<{ success: boolean }>(LOCATION_MEMBERSHIP_DETAIL_ENDPOINT(organizationId, membershipId), {
    method: "DELETE",
  });
}

export class UsersAdapter {
  static async getUsers(organizationId: string): Promise<UserSummary[]> {
    return fetchOrganizationUsers(organizationId);
  }

  static async getUserDetail(
    organizationId: string,
    userId: string
  ): Promise<UserSummary | null> {
    return fetchUserDetail(organizationId, userId);
  }

  static async getRoles(organizationId: string): Promise<RoleCatalog[]> {
    return fetchOrganizationRoles(organizationId);
  }

  static async getMemberships(organizationId: string): Promise<OrganizationMembership[]> {
    return fetchOrganizationMemberships(organizationId);
  }

  static async getLocationMemberships(organizationId: string): Promise<LocationMembership[]> {
    return fetchLocationMemberships(organizationId);
  }

  static async inviteUser(organizationId: string, payload: CreateUserPayload): Promise<UserSummary> {
    return createUser(organizationId, payload);
  }

  static async updateUser(
    organizationId: string,
    userId: string,
    patch: Partial<PortalUserRecord>
  ): Promise<UserSummary> {
    return updateUser(organizationId, userId, patch);
  }

  static async updateUserStatusByEmail(
    organizationId: string,
    email: string,
    isActive: boolean
  ): Promise<{ success: boolean }> {
    return updateUserStatusByEmail(organizationId, email, isActive);
  }

  static async updateUserRole(
    userId: string,
    role: string
  ): Promise<{ success: boolean }> {
    return updateUserRole(userId, role);
  }

  static async updateUserFacilities(
    organizationId: string,
    userId: string,
    facilityIds: string[]
  ): Promise<{ success: boolean }> {
    return updateUserFacilities(organizationId, userId, facilityIds);
  }

  static async removeUserFacility(
    organizationId: string,
    userId: string,
    facilityId: string
  ): Promise<{ success: boolean }> {
    return removeUserFacility(organizationId, userId, facilityId);
  }

  static async addFacilityMembership(
    organizationId: string,
    userId: string,
    locationId: string,
    role: string = "member"
  ): Promise<LocationMembership> {
    return addLocationMembership(organizationId, userId, locationId, role);
  }

  static async removeFacilityMembership(
    organizationId: string,
    membershipId: string
  ): Promise<{ success: boolean }> {
    return removeLocationMembership(organizationId, membershipId);
  }

  static async deleteUserByEmail(
    organizationId: string,
    email: string
  ): Promise<{ success: boolean }> {
    return deleteUserByEmail(organizationId, email);
  }

  static async resetUserPassword(
    organizationId: string,
    userId: string,
    reason?: string
  ): Promise<{ ok: true; message: string }> {
    return resetUserPassword(organizationId, userId, reason);
  }
}



