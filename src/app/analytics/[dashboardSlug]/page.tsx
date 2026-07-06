import { DashboardRuntimeShell } from "@/features/dashboard-runtime/components/DashboardRuntimeShell";
import { DashboardViewer } from "@/features/dashboard-runtime/components/DashboardViewer";

export function generateStaticParams() {
  return [{ dashboardSlug: "home-inspection-overview" }, { dashboardSlug: "facility-damage-profile" }];
}

export default async function AnalyticsDashboardPage({ params }: { params: Promise<{ dashboardSlug: string }> }) {
  const { dashboardSlug } = await params;
  return (
    <DashboardRuntimeShell
      title="Dashboard Viewer"
      subtitle="Native React rendering for a dashboard definition. The runtime API renders data; the portal renders widgets."
    >
      <DashboardViewer dashboardSlug={dashboardSlug} />
    </DashboardRuntimeShell>
  );
}
