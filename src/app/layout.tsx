import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import "./globals.css";
import { RootRouteShell } from "@/components/RootRouteShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: false,
});

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Inspection-Trac",
  description: "Vehicle inspection and condition reporting portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const devSessionBypassEnabled = process.env.PORTAL_DEV_SESSION_BYPASS === "true";
  const shouldInjectDevMockScript = process.env.NODE_ENV !== "production" && devSessionBypassEnabled;

  return (
    <html lang="en" className={`${inter.variable} ${geistSans.variable} h-full antialiased`}>
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
                      path.indexOf("/dashboard/summary") !== -1 ||
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
                    if (path.indexOf("/dashboard/summary") !== -1) {
                      body = {
                        organizationId: "org-awct",
                        reports: { open: 0, review: 0, closed: 0 },
                        users: 11,
                        facilities: 2,
                        vehicles: 2,
                        alerts: 0,
                        lastUpdated: new Date().toISOString(),
                      };
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
