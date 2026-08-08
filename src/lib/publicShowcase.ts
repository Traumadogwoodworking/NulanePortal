export type ShowcaseShot = {
  path: string;
  exists: boolean;
  featured?: boolean;
  kind?: "portrait" | "landscape";
  caption?: string;
};

export const appShowcaseShots: ShowcaseShot[] = [
  { path: "/images/app-showcase-01.jpg", exists: true, kind: "portrait" },
  { path: "/images/app-showcase-03.jpg", exists: true, kind: "portrait" },
  { path: "/images/app-showcase-04.jpg", exists: true, kind: "portrait" },
  { path: "/images/app-showcase-06.jpg", exists: true, kind: "portrait" },
  { path: "/images/app-showcase-08.jpg", exists: true, kind: "portrait" },
  { path: "/images/app-photo-2.png", exists: true, kind: "portrait" },
  { path: "/images/app-photo-4.png", exists: true, kind: "portrait" },
];

export const portalShowcaseShots: ShowcaseShot[] = [
  { path: "/images/portal-report-pdf-example.png", exists: true, featured: true, caption: "Report PDF" },
  { path: "/images/portal-report-list.png", exists: true, kind: "landscape", caption: "Portal Reports Page" },
  { path: "/images/portal-chatgpt-dashboard.png", exists: true, kind: "landscape", caption: "Metrics" },
  { path: "/images/portal-powerbi-dashboard.png", exists: true, kind: "landscape", caption: "Portal Dashboards" },
];
