import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { RootRouteShell } from "@/components/RootRouteShell";
import { publicBranding } from "@/lib/publicBranding";

export const metadata: Metadata = {
  title: publicBranding.appName,
  description: publicBranding.shortDescription,
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const devSessionBypassEnabled = process.env.PORTAL_DEV_SESSION_BYPASS === "true";
  const shouldInjectDevMockScript = process.env.NODE_ENV !== "production" && devSessionBypassEnabled;

return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-screen">
        {devSessionBypassEnabled ? (
          <Script id="portal-dev-session-bypass" strategy="beforeInteractive">
            {`
              window.__PORTAL_DEV_SESSION_BYPASS__ = true;
            `}
          </Script>
        ) : null}
        {shouldInjectDevMockScript ? (
          <Script id="dev-api-fetch-mock" strategy="beforeInteractive">
            {`
              (function () {
                var originalFetch = window.fetch.bind(window);
                var shouldMock = function (url) {
                  try {
                    var path = new URL(url, window.location.origin).pathname;
                    return (
                      path.indexOf("/dashboard/analytics") !== -1 ||
                      path.indexOf("/dashboard/summary") !== -1 ||
                      path.indexOf("/reports/list") !== -1 ||
                      path.indexOf("/reports/rsa") !== -1 ||
                      path.indexOf("/report/pull") !== -1 ||
                      (path.indexOf("/admin/organizations/") !== -1 && path.endsWith("/email-lists")) ||
                      path.indexOf("/admin/ledec/shipments") !== -1
                    );
                  } catch (error) {
                    return false;
                  }
                };
                window.fetch = function (input, init) {
                  var url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
                  if (shouldMock(url)) {
                    var path = new URL(url, window.location.origin).pathname;
                    var body = {};
                    if (path.indexOf("/dashboard/analytics") !== -1) {
                      body = {
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
                          facilities: 2,
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
                        byInspectorDaily: [{
                          date: new Date().toISOString().slice(0, 10),
                          email: "ops@example.com",
                          label: "ops@example.com",
                          reportCount: 3,
                          damageReports: 2,
                          noDamageReports: 1,
                        }],
                        byInspectionType: [{ number: "02", label: "Interchange", count: 1 }],
                        topAreas: [{ name: "Front Fascia", count: 1 }],
                        topTypes: [{ name: "Impact", count: 1 }],
                        dailyTrend: [{ date: new Date().toISOString().slice(0, 10), damageReports: 2, rsaReports: 1 }],
                      };
                    } else if (path.indexOf("/dashboard/summary") !== -1) {
                      body = {
                        organizationId: "org-awct",
                        reports: { open: 0, review: 0, closed: 0 },
                        users: 11,
                        facilities: 2,
                        vehicles: 2,
                        alerts: 0,
                        lastUpdated: new Date().toISOString(),
                      };
                    } else if (path.indexOf("/reports/list") !== -1) {
                      var rows = [
                        {
                          report_id: "damage-001",
                          organization_id: "org-awct",
                          vin: "1HGBH41JXMN109186",
                          status: "open",
                          inspector_email: "ops@example.com",
                          created_at: new Date(Date.now() - 120 * 60000).toISOString(),
                          updated_at: new Date(Date.now() - 45 * 60000).toISOString(),
                          photo_urls: ["/media/powered_by_colorful.png"],
                          splat_urls: ["/media/powered_by_colorful.png"],
                          pdf_url: "/media/mock-damage-report.pdf",
                          damage_summary: [{ damage_area: "Front Fascia", damage_type: "Impact", severity: "high" }],
                          location: { location_label: "A-Peak", location_name: "Western Hub", facility: "Western Hub" },
                        },
                        {
                          report_id: "damage-002",
                          organization_id: "org-awct",
                          vin: "1HGBH41JXMN109187",
                          status: "review",
                          inspector_email: "ops@example.com",
                          created_at: new Date(Date.now() - 80 * 60000).toISOString(),
                          updated_at: new Date(Date.now() - 35 * 60000).toISOString(),
                          damage_summary: [],
                          location: { location_label: "B-Zone", location_name: "Eastern Yard", facility: "Eastern Yard" },
                        },
                      ];
                      body = { rows: rows, page: 1, pageSize: rows.length, limit: rows.length, total: rows.length, hasNextPage: false };
                    } else if (path.indexOf("/reports/rsa") !== -1 || path.indexOf("/report/pull") !== -1) {
                      body = { reports: [] };
                    } else if (path.indexOf("/admin/organizations/") !== -1 && path.endsWith("/email-lists")) {
                      body = { emailLists: [] };
                    } else if (path.indexOf("/admin/ledec/shipments") !== -1) {
                      body = { shipments: [] };
                    }
                    return Promise.resolve(new Response(JSON.stringify(body), {
                      status: 200,
                      headers: { "Content-Type": "application/json" },
                    }));
                  }
                  return originalFetch(input, init);
                };
              })();
            `}
          </Script>
        ) : null}
        <Suspense fallback={null}>
          <RootRouteShell>{children}</RootRouteShell>
        </Suspense>
      </body>
    </html>
  );
}
