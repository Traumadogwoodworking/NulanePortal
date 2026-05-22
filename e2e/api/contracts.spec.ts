import { expect, test } from "playwright/test";
import type { APIRequestContext } from "playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

async function getJson(request: APIRequestContext, path: string) {
  const normalizedPath = path.endsWith("/") ? path : `${path}/`;
  const response = await request.get(new URL(normalizedPath, baseURL).toString());
  expect(response.ok(), `Expected ${path} to return 200`).toBeTruthy();
  return response.json();
}

test("portal and control API contracts remain available", async ({ request }) => {
  const session = await getJson(request, "/api/user/me");
  expect(session.user.email).toBe("guest@nulanesystems.com");
  expect(session.organization.organization_id).toBe("org-awct");

  const status = await getJson(request, "/api/status");
  expect(status.ready).toBe(true);
  expect(status.summary).toContain("ready");

  const readiness = await getJson(request, "/api/readyz");
  expect(readiness.status).toBe("ready");

  const dashboardSummary = await getJson(request, "/api/dashboard/summary");
  expect(dashboardSummary.organizationId).toBe("org-awct");
  expect(dashboardSummary.reports.open).toBeGreaterThanOrEqual(0);

  const settings = await getJson(request, "/api/admin/settings");
  expect(Array.isArray(settings.settings)).toBe(true);
  expect(settings.allowed_keys).toContain("maintenance_mode");

  const orgList = await getJson(request, "/api/admin/organization-list");
  expect(orgList.organizations.length).toBeGreaterThan(0);

  const emailLists = await getJson(request, "/api/admin/organizations/org-awct/email-lists");
  expect(emailLists.email_lists.length).toBeGreaterThan(0);

  const emailMembers = await getJson(
    request,
    "/api/admin/organizations/org-awct/email-lists/email-list-001/members"
  );
  expect(emailMembers.members.length).toBeGreaterThan(0);

  const users = await getJson(request, "/api/admin/organizations/org-awct/users");
  expect(users.users.length).toBeGreaterThan(0);

  const locations = await getJson(request, "/api/organizations/org-awct/locations");
  expect(locations.locations.length).toBeGreaterThan(0);

  const branding = await getJson(request, "/api/organizations/org-awct/branding");
  expect(branding.organization_name).toBe("American Wheel & Car");

  const damageReports = await getJson(request, "/api/report/pull?organization_id=org-awct");
  expect(damageReports.reports.length).toBeGreaterThan(0);

  const rsaReports = await getJson(request, "/api/reports/rsa");
  expect(rsaReports.reports.length).toBeGreaterThan(0);

  const outbox = await getJson(request, "/api/admin/outbox?organizationId=org-awct");
  expect(outbox.items.length).toBeGreaterThan(0);
  expect(outbox.total).toBeGreaterThan(0);
  expect(
    outbox.items.some(
      (row: { source_record_type?: string; source_record_id?: string; payload_preview?: { report_id?: string } }) =>
        row.source_record_type === "report" &&
        Boolean(row.source_record_id || row.payload_preview?.report_id)
    )
  ).toBe(true);

  const audit = await getJson(
    request,
    "/api/admin/audit-log?organizationId=org-awct&limit=5"
  );
  expect(audit.audit_logs.length).toBeGreaterThan(0);
});
