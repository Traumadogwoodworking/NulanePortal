import type { ControlOperationsStatus, ControlReadyzStatus, ControlOutboxHistoryItem, ControlOutboxItem, ControlRelease, ControlSettingsResponse, YmsVehicleSummary, YmsYardStateResponse } from "@/lib/services/controlPlaneService";
import type { LocationMembership, OrganizationMembership, PortalUserRecord } from "@/lib/types";
import { publicBranding } from "@/lib/publicBranding";

let devFetchInstalled = false;
const MOCK_BRAND_LOGO = publicBranding.logoPath;
const MOCK_FROM_NAME = `${publicBranding.appName} Ops`;
const MOCK_FACILITY_REGISTRATION_STORAGE_KEY = "inspection-trac.dev.facility-registrations.v1";
const mockFacilityRegistrations = new Map<string, {
  slug: string;
  enabled: boolean;
  roleKey: string;
  roleName: string;
}>([
  ["loc-001", { slug: "western-hub", enabled: false, roleKey: "user", roleName: "User" }],
  ["loc-002", { slug: "eastern-yard", enabled: false, roleKey: "user", roleName: "User" }],
  ["6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c", { slug: "chicago-heights", enabled: true, roleKey: "user", roleName: "User" }],
]);

function syncMockFacilityRegistrationsFromStorage() {
  if (typeof window === "undefined") return;
  try {
    const stored = JSON.parse(window.localStorage.getItem(MOCK_FACILITY_REGISTRATION_STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return;
    for (const entry of stored) {
      if (!Array.isArray(entry) || typeof entry[0] !== "string" || !entry[1] || typeof entry[1] !== "object") continue;
      const value = entry[1] as Record<string, unknown>;
      if (typeof value.slug !== "string" || typeof value.enabled !== "boolean" || typeof value.roleKey !== "string") continue;
      mockFacilityRegistrations.set(entry[0], {
        slug: value.slug,
        enabled: value.enabled,
        roleKey: value.roleKey,
        roleName: typeof value.roleName === "string" ? value.roleName : "User",
      });
    }
  } catch {
    // Corrupt local-only mock state falls back to deterministic defaults.
  }
}

function persistMockFacilityRegistrations() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    MOCK_FACILITY_REGISTRATION_STORAGE_KEY,
    JSON.stringify(Array.from(mockFacilityRegistrations.entries()))
  );
}

function findMockFacilityRegistrationBySlug(slug: string) {
  syncMockFacilityRegistrationsFromStorage();
  return Array.from(mockFacilityRegistrations.entries()).find(([, value]) => value.slug === slug);
}

function mockFacilityName(locationId: string) {
  if (locationId === "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c") return "Chicago Heights";
  return locationId === "loc-002" ? "Eastern Yard" : "Western Hub";
}

function mockFacilityLabel(locationId: string) {
  if (locationId === "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c") return "Chicago Heights";
  return locationId === "loc-002" ? "B-Zone" : "A-Peak";
}

function mockRegistrationPayload(locationId: string) {
  syncMockFacilityRegistrationsFromStorage();
  const registration = mockFacilityRegistrations.get(locationId) || {
    slug: locationId,
    enabled: false,
    roleKey: "user",
    roleName: "User",
  };
  return {
    organization_id: "org-awct",
    organization_name: "American Wheel & Car",
    location_id: locationId,
    location_name: mockFacilityName(locationId),
    location_label: mockFacilityLabel(locationId),
    registration_slug: registration.slug,
    registration_enabled: registration.enabled,
    registration_available: registration.enabled,
    registration_default_role_id: "dev-user-role",
    registration_default_role_key: registration.roleKey,
    registration_default_role_name: registration.roleName,
    registration_url: "",
    global_registration_enabled: true,
    updated_at: mockTimestamp(),
  };
}

function isExplicitDevSessionBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  if (process.env.NEXT_PUBLIC_PORTAL_DEV_AUTH_BYPASS === "1") {
    return true;
  }
  if (typeof window !== "undefined") {
    return (window as Window & { __PORTAL_DEV_SESSION_BYPASS__?: boolean }).__PORTAL_DEV_SESSION_BYPASS__ === true;
  }
  return process.env.PORTAL_DEV_SESSION_BYPASS === "true";
}

function normalizePath(input: string): string {
  try {
    return new URL(input, "http://localhost").pathname;
  } catch {
    return input;
  }
}

function mockTimestamp(offsetMinutes = 0): string {
  return new Date(Date.now() - offsetMinutes * 60_000).toISOString();
}

function buildMockTwentyFourHourResponse(facility = "") {
  const snapshotId = "dev-24-hour-snapshot";
  const currentServerTime = mockTimestamp();
  const rows = [
    {
      id: `${snapshotId}:shap-1`,
      inventory_row_id: `${snapshotId}:shap-1`,
      snapshot_id: snapshotId,
      vin: "SHAPLOCALVIN00001",
      bucket: "needs_inspected",
      inspected: false,
      severity: "overdue",
      display_label: "Overdue · 2h 0m",
      display_background_color: "#000000",
      display_text_color: "#ffffff",
      first_seen_at: mockTimestamp(26 * 60),
      last_seen_at: mockTimestamp(5),
      current_server_time: currentServerTime,
      time_in_inventory_seconds: 93_600,
      time_until_24h_seconds: 0,
      overdue_seconds: 7_200,
      facility: "SHAP",
      facility_id: "loc-001",
      location_id: "loc-001",
      location: "SHAP/A12",
      bay: "A12",
    },
    {
      id: `${snapshotId}:jnap-1`,
      inventory_row_id: `${snapshotId}:jnap-1`,
      snapshot_id: snapshotId,
      vin: "JNAPLOCALVIN00001",
      bucket: "needs_inspected",
      inspected: false,
      severity: "normal",
      display_label: "Needs inspected · 4h 0m",
      display_background_color: "#ffffff",
      display_text_color: "#0f172a",
      first_seen_at: mockTimestamp(4 * 60),
      last_seen_at: mockTimestamp(3),
      current_server_time: currentServerTime,
      time_in_inventory_seconds: 14_400,
      time_until_24h_seconds: 72_000,
      overdue_seconds: 0,
      facility: "JNAP",
      facility_id: "loc-002",
      location_id: "loc-002",
      location: "JNAP/B07",
      bay: "B07",
    },
  ].filter((row) => {
    const requested = facility.trim().toLowerCase();
    if (!requested) return true;
    return [row.facility, row.facility_id, row.location_id]
      .some((value) => value.toLowerCase() === requested);
  });
  const inspected = rows.filter((row) => row.inspected).length;
  return {
    ok: true,
    request_id: `dev-24-hour-${Date.now()}`,
    inspection_type: "24_hour",
    generated_at: currentServerTime,
    current_server_time: currentServerTime,
    archive_window_days: 3,
    snapshot: {
      id: snapshotId,
      status: "completed",
      capture_time: mockTimestamp(5),
      completed_at: mockTimestamp(4),
      filename: "local-facility-inventory.csv",
      total_raw_rows: rows.length,
      accepted_active_rows: rows.length,
      excluded_stale_rows: 0,
      rejected_malformed_rows: 0,
      deduplicated_rows: 0,
    },
    summary: {
      total_active: rows.length,
      needs_inspected: rows.length - inspected,
      normal: rows.filter((row) => row.severity === "normal").length,
      due_12h: 0,
      critical: 0,
      overdue: rows.filter((row) => row.severity === "overdue").length,
      inspected,
    },
    totals: { total_active: rows.length, needs_inspected: rows.length - inspected, inspected },
    metadata: {
      total_raw_rows: rows.length,
      accepted_active_rows: rows.length,
      excluded_stale_rows: 0,
      rejected_malformed_rows: 0,
      deduplicated_rows: 0,
      client_rejected_rows: 0,
      client_excluded_stale_rows: 0,
      client_deduplicated_rows: 0,
    },
    rows,
    warnings: [],
  };
}

function buildMockReportRows() {
  return [
    {
      report_id: "damage-001",
      organization_id: "org-awct",
      vin: "1HGBH41JXMN109186",
      make: "Atlas",
      model: "Rover",
      year: 2025,
      status: "open",
      inspector_email: "ops@example.com",
      splat_urls: [MOCK_BRAND_LOGO],
      photo_urls: [MOCK_BRAND_LOGO],
      pdf_url: "/media/mock-damage-report.pdf",
      damage_summary: [{ damage_area: "Front Fascia", damage_type: "Impact", severity: "high" }],
      location: {
        location_label: "A-Peak",
        location_name: "Western Hub",
        facility: "Western Hub",
      },
      created_at: mockTimestamp(120),
      updated_at: mockTimestamp(45),
    },
    {
      report_id: "damage-002",
      organization_id: "org-awct",
      vin: "1HGBH41JXMN109187",
      make: "Atlas",
      model: "Carrier",
      year: 2024,
      status: "review",
      inspector_email: "ops@example.com",
      splat_urls: [],
      photo_urls: [],
      damage_summary: [],
      location: {
        location_label: "B-Zone",
        location_name: "Eastern Yard",
        facility: "Eastern Yard",
      },
      created_at: mockTimestamp(80),
      updated_at: mockTimestamp(35),
    },
  ];
}

function buildMockDashboardAnalytics() {
  return {
    totals: {
      totalReports: 3,
      damageReports: 2,
      noDamageReports: 1,
      twentyFourHourReports: 1,
      inspection02Reports: 1,
      rsaReports: 1,
      damageReportsToday: 2,
      rsaReportsToday: 1,
      reportsToday: 3,
      reportsLast7Days: 3,
      reportsThisMonth: 3,
      reportsThisYear: 3,
      vins: 2,
      entries: 1,
      facilities: 3,
    },
    currentPeriod: {
      damageToday: 2,
      rsaToday: 1,
      damageLast7Days: 2,
      rsaLast7Days: 1,
      damageMonthToDate: 2,
      damageYearToDate: 2,
    },
    severity: [{ level: "high", label: "High", count: 1, percent: 100 }],
    severityGroups: { low: 0, medium: 0, high: 1 },
    byFacility: [
      { key: "western-hub", label: "Western Hub", totalReports: 2, damageReports: 1, noDamageReports: 1, rsaReports: 1, reportsToday: 2, reportsLast7Days: 2, reportsThisMonth: 2, reportsThisYear: 2, vins: 1, entries: 1 },
      { key: "eastern-yard", label: "Eastern Yard", totalReports: 1, damageReports: 1, noDamageReports: 0, rsaReports: 0, reportsToday: 1, reportsLast7Days: 1, reportsThisMonth: 1, reportsThisYear: 1, vins: 1, entries: 0 },
    ],
    byFacilityDaily: [
      { date: new Date().toISOString().slice(0, 10), label: "Western Hub", damageReports: 1, noDamageReports: 1 },
      { date: new Date().toISOString().slice(0, 10), label: "Eastern Yard", damageReports: 1, noDamageReports: 0 },
    ],
    byInspector: [{ email: "ops@example.com", label: "ops@example.com", reportCount: 3 }],
    byInspectorDaily: [
      {
        date: new Date().toISOString().slice(0, 10),
        email: "ops@example.com",
        label: "ops@example.com",
        reportCount: 3,
        damageReports: 2,
        noDamageReports: 1,
      },
    ],
    byInspectionType: [{ number: "02", label: "Interchange", count: 1 }],
    topAreas: [{ name: "Front Fascia", count: 1 }],
    topTypes: [{ name: "Impact", count: 1 }],
    dailyTrend: [{ date: new Date().toISOString().slice(0, 10), damageReports: 2, rsaReports: 1 }],
  };
}

function buildMockOutbox(): ControlOutboxItem[] {
  return [
    {
      id: "outbox-001",
      organization_id: "org-awct",
      template_key: "damage-report",
      subject: "Damage report sent",
      recipient_list: ["ops@nulanesystems.com"],
      recipient_count: 1,
      recipients: ["ops@nulanesystems.com"],
      status: "sent",
      attempt_count: 1,
      last_attempt_at: mockTimestamp(55),
      next_retry_at: null,
      last_error_code: null,
      last_error_message: null,
      created_at: mockTimestamp(60),
      updated_at: mockTimestamp(50),
      sent_at: mockTimestamp(55),
      source_record_type: "report",
      source_record_id: "damage-001",
      email_type: "damage",
      payload_preview: { report_id: "damage-001", pdf_url: "https://example.invalid/report.pdf" },
    },
    {
      id: "outbox-002",
      organization_id: "org-awct",
      template_key: "rsa-alert",
      subject: "RSA report retry needed",
      recipient_list: ["alerts@nulanesystems.com"],
      recipient_count: 1,
      recipients: ["alerts@nulanesystems.com"],
      status: "failed_retryable",
      attempt_count: 3,
      last_attempt_at: mockTimestamp(15),
      next_retry_at: mockTimestamp(-20),
      last_error_code: "SMTP_TIMEOUT",
      last_error_message: "The upstream mail provider timed out.",
      last_error_retryable: true,
      created_at: mockTimestamp(75),
      updated_at: mockTimestamp(10),
      source_record_type: "rsa_report",
      source_record_id: "rsa-3001",
      email_type: "rsa",
      payload_preview: { report_id: "rsa-3001" },
    },
    {
      id: "outbox-003",
      organization_id: "org-awct",
      template_key: "ops-digest",
      subject: "Operations digest queued",
      recipient_list: ["ops@nulanesystems.com"],
      recipient_count: 1,
      recipients: ["ops@nulanesystems.com"],
      status: "queued",
      attempt_count: 0,
      last_attempt_at: null,
      next_retry_at: null,
      last_error_code: null,
      last_error_message: null,
      created_at: mockTimestamp(8),
      updated_at: mockTimestamp(8),
      source_record_type: "operations_digest",
      source_record_id: null,
      email_type: "digest",
      payload_preview: { digest_window: "local-demo" },
    },
  ];
}

const mockOutbox = buildMockOutbox();

type MockDirectoryUserRecord = PortalUserRecord & {
  organization_membership?: OrganizationMembership | null;
  location_memberships?: LocationMembership[];
  facility_ids?: string[];
};

let mockLocationMembershipSeq = 1;

function buildMockLocationMembership(
  userId: string,
  locationId: string,
  role: string,
  isPrimary = false
): LocationMembership {
  return {
    location_membership_id: `dev-location-membership-${mockLocationMembershipSeq++}`,
    location_id: locationId,
    organization_id: "org-awct",
    user_id: userId,
    role,
    is_active: true,
    is_primary: isPrimary,
    membership_metadata: {},
    updated_at: mockTimestamp(),
  };
}

function buildMockDirectoryUser(overrides: Partial<MockDirectoryUserRecord> = {}): MockDirectoryUserRecord {
  const facilityIds = Array.from(new Set(overrides.facility_ids ?? ["loc-001"]));
  return {
    user_id: "dev-guest-user",
    email: "guest@nulanesystems.com",
    display_name: "Guest Operator",
    first_name: "Guest",
    last_name: "Operator",
    role: "super_admin",
    is_active: true,
    permissions: ["portal.admin"],
    organization_id: "org-awct",
    facility_ids: facilityIds,
    location_memberships: facilityIds.map((locationId, index) =>
      buildMockLocationMembership("dev-guest-user", locationId, "super_admin", index === 0)
    ),
    organization_membership: {
      membership_id: "dev-membership",
      user_id: "dev-guest-user",
      organization_id: "org-awct",
      role: "super_admin",
      is_primary: true,
      is_active: true,
    },
    updated_at: mockTimestamp(),
    ...overrides,
  };
}

let mockDirectoryUsers: MockDirectoryUserRecord[] = [buildMockDirectoryUser()];
let mockDeletedDirectoryUsers: MockDirectoryUserRecord[] = [];

function cloneMockDirectoryUser(user: MockDirectoryUserRecord): MockDirectoryUserRecord {
  return JSON.parse(JSON.stringify(user)) as MockDirectoryUserRecord;
}

function normalizeMockFacilityIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean)
    )
  );
}

function syncMockFacilityMemberships(user: MockDirectoryUserRecord, facilityIds: string[]): MockDirectoryUserRecord {
  const nextFacilityIds = normalizeMockFacilityIds(facilityIds);
  const locationMemberships = nextFacilityIds.map((locationId, index) =>
    buildMockLocationMembership(user.user_id, locationId, user.role ?? "member", index === 0)
  );
  return {
    ...user,
    facility_ids: nextFacilityIds,
    location_memberships: locationMemberships,
    updated_at: mockTimestamp(),
  };
}

function upsertMockDirectoryUser(user: MockDirectoryUserRecord) {
  const nextUser = cloneMockDirectoryUser(user);
  const index = mockDirectoryUsers.findIndex((entry) => entry.user_id === nextUser.user_id);
  if (index >= 0) {
    mockDirectoryUsers[index] = nextUser;
  } else {
    mockDirectoryUsers = [nextUser, ...mockDirectoryUsers];
  }
  return nextUser;
}

function buildMockSession() {
  return {
    user: {
      user_id: "dev-guest-user",
      display_name: "Guest Operator",
      first_name: "Guest",
      last_name: "Operator",
      email: "guest@nulanesystems.com",
      role: "super_admin",
      organization_id: "org-awct",
      is_active: true,
      is_free_user: false,
      show_ads: false,
      permissions: [
        "portal.admin",
        "portal.dashboard.view",
        "portal.reports.view",
        "portal.facilities.manage",
        "portal.people.view",
        "portal.notifications.manage",
      ],
      organization_membership: {
        membership_id: "dev-membership",
        user_id: "dev-guest-user",
        organization_id: "org-awct",
        role: "super_admin",
        is_primary: true,
        is_active: true,
      },
      location_memberships: [
        {
          location_membership_id: "dev-location-membership-west",
          location_id: "loc-001",
          organization_id: "org-awct",
          user_id: "dev-guest-user",
          role: "super_admin",
          is_active: true,
          is_primary: true,
        },
      ],
      updated_at: mockTimestamp(),
    },
    organization: {
      organization_id: "org-awct",
      name: "American Wheel & Car",
      type: "admin",
    },
    plan_tier: "enterprise",
    portal_access: true,
    organization_type: "admin",
    requires_ads: false,
    locations: [
      {
        location_id: "loc-001",
        organization_id: "org-awct",
        location_name: "Western Hub",
        location_label: "A-Peak",
        display_name: "Western Hub",
        is_active: true,
      },
      {
        location_id: "loc-002",
        organization_id: "org-awct",
        location_name: "Eastern Yard",
        location_label: "B-Zone",
        display_name: "Eastern Yard",
        is_active: true,
      },
      {
        location_id: "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c",
        organization_id: "org-awct",
        location_name: "Chicago Heights",
        location_label: "Chicago Heights",
        display_name: "Chicago Heights",
        is_active: true,
        metadata: {
          yards: [{ yard_id: "yard-ff39eedd-4630-467a-97f6-2149b4c6a6d3", yard_name: "Main", yard_code: "MAIN", is_active: true, areas: [] }],
        },
      },
    ],
    selected_location: {
      location_id: "loc-001",
      organization_id: "org-awct",
      location_name: "Western Hub",
      location_label: "A-Peak",
      display_name: "Western Hub",
      is_active: true,
    },
    location_locked: false,
    branding_snapshot: {
      organization_name: "American Wheel & Car",
      logo_url: "/media/powered_by_colorful.png",
    },
    is_admin: true,
    timestamp: mockTimestamp(),
  };
}

export function isDevMockEnabled(): boolean {
  return isExplicitDevSessionBypassEnabled();
}

function toJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function resolveForcedDevResponse(path: string): Response | null {
  const publicRegistrationMatch = path.match(/\/registration\/facilities\/([^/]+)$/);
  if (publicRegistrationMatch) {
    const slug = decodeURIComponent(publicRegistrationMatch[1]);
    const entry = findMockFacilityRegistrationBySlug(slug);
    if (!entry) return toJsonResponse({ error: "Facility registration was not found." });
    const [locationId, registration] = entry;
    return toJsonResponse({
      facilityName: mockFacilityName(locationId),
      facilityLabel: mockFacilityLabel(locationId),
      organizationName: "American Wheel & Car",
      registrationEnabled: registration.enabled,
      branding: { companyName: publicBranding.appName, logoUrl: publicBranding.logoPath },
      support: { displayName: "Inspection-Trac Support", email: publicBranding.supportEmail, phone: "" },
    });
  }

  if (path.includes("/dashboard/analytics")) {
    return toJsonResponse(buildMockDashboardAnalytics());
  }

  if (path.includes("/dashboard/summary")) {
    return toJsonResponse({
      organizationId: "org-awct",
      reports: { open: 0, review: 0, closed: 0 },
      users: 11,
      facilities: 3,
      vehicles: 2,
      alerts: 0,
      lastUpdated: mockTimestamp(5),
    });
  }

  if (path.includes("/reports/list")) {
    const rows = buildMockReportRows();
    return toJsonResponse({ rows, page: 1, pageSize: rows.length, limit: rows.length, total: rows.length, hasNextPage: false });
  }

  if (path.includes("/reports/rsa") || path.includes("/report/pull")) {
    return toJsonResponse({ reports: [] });
  }

  if (path.includes("/admin/organizations/") && path.endsWith("/email-lists")) {
    return toJsonResponse({ emailLists: [] });
  }

  if (path.includes("/admin/organizations/") && path.includes("/password-reset")) {
    if (process.env.NEXT_PUBLIC_MOCK_PASSWORD_RESET === "1") {
      return toJsonResponse({ ok: true, message: "If the account is eligible, a password reset email has been sent." });
    }
    return null;
  }

  if (path.includes("/admin/ledec/shipments")) {
    return toJsonResponse({ shipments: [] });
  }

  return null;
}

export function installDevFetchMock(): void {
  if (!isDevMockEnabled() || devFetchInstalled || typeof globalThis.fetch !== "function") {
    return;
  }

  const originalFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
    const path = normalizePath(url);
    const forced = resolveForcedDevResponse(path);
    if (forced) {
      return forced;
    }
    return originalFetch(input as never, init);
  }) as typeof globalThis.fetch;
  devFetchInstalled = true;
}

installDevFetchMock();

export async function resolveDevMockResponse(url: string, init: RequestInit = {}): Promise<unknown | null> {
  if (!isDevMockEnabled()) return null;
  const path = normalizePath(url).replace(/\/+$/, "") || "/";
  const method = (init.method || "GET").toUpperCase();

  const registrationAdminMatch = path.match(/\/admin\/organizations\/[^/]+\/locations\/([^/]+)\/registration$/);
  if (registrationAdminMatch) {
    const locationId = decodeURIComponent(registrationAdminMatch[1]);
    if (method === "PUT") {
      const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
      mockFacilityRegistrations.set(locationId, {
        slug: body.registration_slug || locationId,
        enabled: body.registration_enabled === true,
        roleKey: body.registration_default_role_key || "user",
        roleName: body.registration_default_role_key === "viewer" ? "Viewer" : "User",
      });
      persistMockFacilityRegistrations();
    }
    return { registration: mockRegistrationPayload(locationId) };
  }

  const registrationEnrollMatch = path.match(/\/registration\/facilities\/([^/]+)\/enroll$/);
  if (registrationEnrollMatch && method === "POST") {
    const slug = decodeURIComponent(registrationEnrollMatch[1]);
    const entry = findMockFacilityRegistrationBySlug(slug);
    if (!entry) return null;
    const [locationId, registration] = entry;
    return {
      success: true,
      organization: { name: "American Wheel & Car" },
      facility: { name: mockFacilityName(locationId), label: mockFacilityLabel(locationId), slug },
      role: { name: registration.roleName, key: registration.roleKey },
      onboardingStatus: "ready",
      missingFields: [],
      recommendedFields: ["first_name", "last_name"],
      issues: [],
      auth0: { status: "skipped_local_authority" },
    };
  }

  const publicRegistrationMatch = path.match(/\/registration\/facilities\/([^/]+)$/);
  if (publicRegistrationMatch && method === "GET") {
    const slug = decodeURIComponent(publicRegistrationMatch[1]);
    const entry = findMockFacilityRegistrationBySlug(slug);
    if (!entry) return null;
    const [locationId, registration] = entry;
    return {
      facilityName: mockFacilityName(locationId),
      facilityLabel: mockFacilityLabel(locationId),
      organizationName: "American Wheel & Car",
      registrationEnabled: registration.enabled,
      branding: { companyName: publicBranding.appName, logoUrl: publicBranding.logoPath },
      support: { displayName: "Inspection-Trac Support", email: publicBranding.supportEmail, phone: "" },
    };
  }

  if (path.endsWith("/status")) {
    const response: ControlOperationsStatus = {
      service: "portal-control",
      environment: "local-dev",
      service_identifier: "dev-control",
      time: mockTimestamp(),
      status: "ok",
      ready: true,
      summary: "Local dev control plane is ready",
      phase: "stable",
      checks: { api: "ok", auth: "ok", data: "ok" },
      failedDependencies: [],
      warnings: [],
      lastCheckedAt: mockTimestamp(),
      alerting: {
        enabled: false,
        summaryEnabled: false,
        envLabel: "local-dev",
        alertOpen: false,
        lastStatus: "ok",
        checkIntervalMs: 30_000,
        dedupeMs: 300_000,
        summaryIntervalMs: 900_000,
      },
    };
    return response;
  }

  if (path.endsWith("/readyz")) {
    const response: ControlReadyzStatus = {
      status: "ready",
      time: mockTimestamp(),
      checks: { api: "ok", db: "ok", auth: "ok" },
    };
    return response;
  }

  if (path.endsWith("/docufit/health")) {
    return {
      status: "ready",
      message: "DocuFit mock health is ready",
      detail: "Local test harness",
      timestamp: mockTimestamp(),
    };
  }

  if (path.includes("/photos/upload")) {
    return {
      photo_urls: [MOCK_BRAND_LOGO],
      imageUrl: MOCK_BRAND_LOGO,
      url: MOCK_BRAND_LOGO,
    };
  }

  if (path.endsWith("/user/me")) {
    return buildMockSession();
  }

  if (path.endsWith("/inspection/24-hour/portal-display")) {
    const facility = new URL(url, "http://localhost").searchParams.get("facility") ?? "";
    return buildMockTwentyFourHourResponse(facility);
  }

  if (path.includes("/dashboard/analytics")) {
    return buildMockDashboardAnalytics();
  }

  if (path.includes("/dashboard/summary")) {
    return {
      organizationId: "org-awct",
      reports: { open: 1, review: 1, closed: 3 },
      users: 11,
      facilities: 3,
      vehicles: 2,
      alerts: 1,
      lastUpdated: mockTimestamp(),
    };
  }

  if (path.includes("/reports/list")) {
    const rows = buildMockReportRows();
    return { rows, page: 1, pageSize: rows.length, limit: rows.length, total: rows.length, hasNextPage: false };
  }

  if (path.includes("/report/pull")) {
    return {
      vin: "1HGBH41JXMN109186",
      reports: buildMockReportRows().map((row) => ({
        ...row,
          damage_entries: [
            {
              damage_area: "Front Fascia",
              damage_type: "Impact",
              severity: "high",
              photos: [
                { url: MOCK_BRAND_LOGO },
                { url: MOCK_BRAND_LOGO },
              ],
            },
          ],
      })),
    };
  }

  if (path.includes("/railcar-scans/report/pull") || path.includes("/reports/rsa")) {
    return {
      reports: [
        {
          report_id: "rsa-001",
          organization_id: "org-awct",
          inspector_email: "ops@example.com",
          rail_car_number: "RC-1001",
          template_key: "rsa-default",
          subject: "Railcar loading check",
          recipients: ["ops@example.com"],
          track: "A",
          spot: "12",
          facility: "Western Hub",
          created_at: mockTimestamp(95),
          updated_at: mockTimestamp(30),
          cars: [
            {
              railCarNumber: "RC-1001",
              spot: "12",
              decks: {
                A: [{ vin: "1HGBH41JXMN109186" }],
              },
            },
          ],
        },
      ],
    };
  }

  if (path.includes("/admin/settings")) {
    const response: ControlSettingsResponse = {
      settings: [
        { key: "maintenance_mode", scope_type: "global", scope_id: undefined, value: false, updated_at: mockTimestamp(240) },
        { key: "active_portal_backend_target", scope_type: "global", scope_id: undefined, value: "docudent-api", updated_at: mockTimestamp(240) },
        { key: "feature.docufit_enabled", scope_type: "organization", scope_id: "org-awct", value: true, updated_at: mockTimestamp(180) },
        { key: "layout.company_admin.dashboard", scope_type: "organization", scope_id: "org-awct", value: "default", updated_at: mockTimestamp(120) },
        { key: "smtp.from_name", scope_type: "global", scope_id: undefined, value: MOCK_FROM_NAME, updated_at: mockTimestamp(120) },
      ],
      allowed_keys: ["maintenance_mode", "active_portal_backend_target", "feature.docufit_enabled", "layout.company_admin.dashboard", "smtp.from_name"],
    };
    return response;
  }

  if (path.includes("/admin/organization-list")) {
    return {
      organizations: [
        { id: "org-awct", name: "American Wheel & Car", users: 11, facilities: 3, flags: 0, status: "healthy" },
        { id: "org-demo", name: "Demo Logistics", users: 4, facilities: 1, flags: 1, status: "watch" },
      ],
    };
  }

  if (path.includes("/admin/organizations/") && path.endsWith("/email-lists")) {
    return {
      email_lists: [
        {
          email_list_id: "email-list-001",
          list_key: "damage",
          list_name: "Damage Reports",
          list_type: "notification",
          location_id: "loc-001",
          is_active: true,
        },
        {
          email_list_id: "email-list-002",
          list_key: "alerts",
          list_name: "Operational Alerts",
          list_type: "alert",
          location_id: "loc-002",
          is_active: true,
        },
      ],
    };
  }

  if (path.includes("/admin/organizations/") && path.includes("/email-lists/") && path.endsWith("/members")) {
    return {
      members: [
        {
          email_list_member_id: "member-001",
          email_list_id: "email-list-001",
          email: "ops@example.com",
          display_name: "Ops Team",
          member_type: "email",
          is_active: true,
        },
      ],
    };
  }

  if (path.includes("/admin/outbox")) {
    const history: ControlOutboxHistoryItem[] = mockOutbox.flatMap((item, index) => [
      {
        id: `${item.id}-history-${index + 1}`,
        outbox_id: item.id,
        organization_id: item.organization_id,
        attempt_number: item.attempt_count,
        action: item.status === "sent" ? "sent" : "retry",
        status: item.status === "sent" ? "success" : "failure",
        actor_user_id: "dev-guest-user",
        actor_email: "guest@nulanesystems.com",
        request_id: `req-${index + 1}`,
        provider_message_id: null,
        error_code: item.last_error_code ?? null,
        error_message: item.last_error_message ?? null,
        metadata: {},
        created_at: item.updated_at,
      },
    ]);

    if (method === "POST") {
      return { outbox: mockOutbox[1] };
    }

    if (path.includes("/history")) {
      const outboxId = path.split("/").at(-2) ?? "";
      return { history: history.filter((entry) => entry.outbox_id === outboxId) };
    }

    if (path.match(/\/admin\/outbox\/[^/]+$/)) {
      const outboxId = path.split("/").at(-1) ?? "";
      return { outbox: mockOutbox.find((item) => item.id === outboxId) ?? null };
    }

    return { items: mockOutbox, total: mockOutbox.length };
  }

  if (path.includes("/admin/control-plane/releases")) {
    const releases: ControlRelease[] = [
      { id: "rel-001", version: "2026.04.21-1", environment: "local-dev", deployed_at: mockTimestamp(90), deployed_by: "dev@nulanesystems.com", status: "active", summary: "Latest dev control-plane build" },
      { id: "rel-002", version: "2026.04.20-2", environment: "local-dev", deployed_at: mockTimestamp(1440), deployed_by: "dev@nulanesystems.com", status: "healthy", summary: "Previous stable build" },
    ];
    return { releases };
  }

  if (path.includes("/yms/vehicles")) {
    const vehicles: YmsVehicleSummary[] = [
      { vehicleId: "veh-001", vin: "1HGBH41JXMN109186", make: "Ford", model: "Transit", year: 2024, status: "ready", lastSeen: mockTimestamp(12), yardId: "yard-west", yardName: "Western Hub", slotId: "A-01", slotLabel: "A-01" },
      { vehicleId: "veh-002", vin: "2HGBH41JXMN109187", make: "Chevrolet", model: "Express", year: 2023, status: "stale", lastSeen: mockTimestamp(180), yardId: "yard-east", yardName: "Eastern Yard", slotId: "B-04", slotLabel: "B-04" },
    ];
    return { vehicles };
  }

  if (path.includes("/yms/yard-state")) {
    const response: YmsYardStateResponse = {
      summary: { yards: 2, zones: 4, slots: 48, occupiedSlots: 31 },
      yards: [
        { yardId: "yard-west", code: "WEST", name: "Western Hub" },
        { yardId: "yard-east", code: "EAST", name: "Eastern Yard" },
      ],
      data_source: "local-dev",
    };
    return response;
  }

  if (path.includes("/organizations/") && path.endsWith("/locations")) {
    return {
      locations: [
        { location_id: "loc-001", location_name: "Western Hub", location_label: "A-Peak", metadata: { city: "Dallas", state: "TX" } },
        { location_id: "loc-002", location_name: "Eastern Yard", location_label: "B-Zone", metadata: { city: "Atlanta", state: "GA" } },
        {
          location_id: "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c",
          location_name: "Chicago Heights",
          location_label: "Chicago Heights",
          metadata: {
            city: "Chicago Heights",
            state: "IL",
            yards: [{ yard_id: "yard-ff39eedd-4630-467a-97f6-2149b4c6a6d3", yard_name: "Main", yard_code: "MAIN", is_active: true, areas: [] }],
          },
        },
      ],
    };
  }

  if (path.includes("/admin/organizations/") && path.endsWith("/users")) {
    if (method === "POST") {
      const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
      const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : "new.user@nulanesystems.com";
      const createdUserId = body.user_id || body.userId || body.auth0_user_id || body.auth0UserId || `auth0|${email}`;
      const facilityIds = normalizeMockFacilityIds(body.facility_ids ?? body.facilityIds);
      const createdUser = syncMockFacilityMemberships(
        {
          user_id: createdUserId,
          email,
          display_name: body.display_name ?? body.displayName ?? email,
          first_name: body.first_name ?? body.firstName ?? null,
          last_name: body.last_name ?? body.lastName ?? null,
          role: body.role ?? body.role_key ?? "member",
          is_active: body.is_active !== false,
          permissions: [],
          organization_id: "org-awct",
          facility_ids: facilityIds,
          location_memberships: [],
          organization_membership: {
            membership_id: `dev-membership-${createdUserId}`,
            user_id: createdUserId,
            organization_id: "org-awct",
            role: body.role ?? body.role_key ?? "member",
            is_primary: true,
            is_active: true,
          },
          updated_at: mockTimestamp(),
        },
        facilityIds
      );
      upsertMockDirectoryUser(createdUser);
      return {
        user: cloneMockDirectoryUser(createdUser),
        invitation: {
          provider: "auth0",
          status: body.invite === false ? "skipped" : "requested",
          invitation_id: `inv-${createdUserId}`,
          email_requested: body.invite !== false && body.send_email !== false,
        },
      };
    }
    return {
      users: mockDirectoryUsers.map((user) => cloneMockDirectoryUser(user)),
    };
  }

  if (path.includes("/admin/organizations/") && path.endsWith("/roles")) {
    return { roles: [
      { role_key: "super_admin", role_name: "Super Admin", role_scope: "organization", is_active: true, permissions: ["location:manage"] },
      { role_key: "user", role_name: "User", role_scope: "organization", is_active: true, permissions: ["organization:read", "profile:edit"] },
      { role_key: "viewer", role_name: "Viewer", role_scope: "organization", is_active: true, permissions: ["organization:read"] },
    ] };
  }

  if (path.includes("/admin/organizations/") && path.endsWith("/memberships")) {
    return { memberships: [{ membership_id: "dev-membership", user_id: "dev-guest-user", organization_id: "org-awct", role: "super_admin", is_primary: true, is_active: true }] };
  }

  if (path.includes("/admin/organizations/") && path.includes("/location-memberships")) {
    return { memberships: [{ location_membership_id: "dev-location-membership-west", location_id: "loc-001", organization_id: "org-awct", user_id: "dev-guest-user", role: "super_admin", is_active: true, is_primary: true }] };
  }

  if (path.includes("/admin/organizations/") && path.endsWith("/users/deleted")) {
    return { users: mockDeletedDirectoryUsers.map((user) => cloneMockDirectoryUser(user)) };
  }

  const userDetailMatch = path.match(/\/admin\/organizations\/[^/]+\/users\/([^/]+)$/);
  if (userDetailMatch && method === "GET") {
    const userId = decodeURIComponent(userDetailMatch[1]);
    const user = mockDirectoryUsers.find((entry) => entry.user_id === userId);
    return { user: user ? cloneMockDirectoryUser(user) : null };
  }

  if (userDetailMatch && method === "PUT") {
    const userId = decodeURIComponent(userDetailMatch[1]);
    const body = typeof init.body === "string" ? JSON.parse(init.body) : {};
    const existingUser = mockDirectoryUsers.find((entry) => entry.user_id === userId) ?? buildMockDirectoryUser({ user_id: userId });
    const nextFacilityIds = normalizeMockFacilityIds(body.facility_ids ?? body.facilityIds ?? existingUser.facility_ids);
    const nextUser = syncMockFacilityMemberships(
      {
        ...existingUser,
        email: body.email ?? existingUser.email,
        display_name: body.display_name ?? existingUser.display_name,
        first_name: body.first_name ?? existingUser.first_name,
        last_name: body.last_name ?? existingUser.last_name,
        role: body.role ?? body.role_key ?? existingUser.role,
        is_active: body.is_active ?? existingUser.is_active,
        permissions: body.permissions ?? existingUser.permissions,
        organization_id: existingUser.organization_id ?? "org-awct",
        facility_ids: nextFacilityIds,
      },
      nextFacilityIds
    );
    upsertMockDirectoryUser(nextUser);
    return { user: cloneMockDirectoryUser(nextUser), auth0_sync: { ok: true } };
  }

  const userByEmailMatch = path.match(/\/admin\/organizations\/[^/]+\/users\/by-email\/([^/]+)(?:\/status)?$/);
  if (userByEmailMatch && method === "DELETE") {
    const email = decodeURIComponent(userByEmailMatch[1]).toLowerCase();
    const matchIndex = mockDirectoryUsers.findIndex((entry) => (entry.email || "").toLowerCase() === email);
    if (matchIndex >= 0) {
      const [removed] = mockDirectoryUsers.splice(matchIndex, 1);
      mockDeletedDirectoryUsers = [removed, ...mockDeletedDirectoryUsers];
    }
    return { success: true };
  }

  if (userByEmailMatch && method === "PATCH") {
    return { success: true };
  }

  const reactivateMatch = path.match(/\/admin\/organizations\/[^/]+\/users\/([^/]+)\/reactivate$/);
  if (reactivateMatch && method === "POST") {
    const userId = decodeURIComponent(reactivateMatch[1]);
    const matchIndex = mockDeletedDirectoryUsers.findIndex((entry) => entry.user_id === userId);
    if (matchIndex >= 0) {
      const [restored] = mockDeletedDirectoryUsers.splice(matchIndex, 1);
      upsertMockDirectoryUser(syncMockFacilityMemberships({ ...restored, is_active: true }, restored.facility_ids ?? []));
    }
    return { success: true };
  }

  if (path.includes("/admin/control-plane/organizations/") && path.includes("/users/") && path.includes("/facilities")) {
    if (method === "DELETE" || method === "PUT") {
      return { success: true };
    }
  }

  if (path.includes("/admin/audit-log")) {
    return {
      audit_logs: [
        { action: "session.bootstrap", entity_type: "auth", entity_id: "dev-guest-user", created_at: mockTimestamp(8), actor_email: "guest@nulanesystems.com", actor_user_id: "dev-guest-user" },
        { action: "control.view", entity_type: "page", entity_id: "control-overview", created_at: mockTimestamp(4), actor_email: "guest@nulanesystems.com", actor_user_id: "dev-guest-user" },
      ],
    };
  }

  if (path.includes("/organizations/") && path.includes("/branding")) {
    return {
      organization_name: "American Wheel & Car",
      logo_url: MOCK_BRAND_LOGO,
    };
  }

  return null;
}
