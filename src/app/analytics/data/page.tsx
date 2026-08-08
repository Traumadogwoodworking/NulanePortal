import { DashboardRuntimeShell } from "@/features/dashboard-runtime/components/DashboardRuntimeShell";
import { RuntimeDataCatalog } from "@/features/dashboard-runtime/components/RuntimeDataCatalog";

export default function AnalyticsDataCatalogPage() {
  return (
    <DashboardRuntimeShell
      title="Runtime Data Catalog"
      subtitle="See what backend data is available to dashboards, which fields are declared, and copy or download the dashboard data contract."
    >
      <RuntimeDataCatalog />
    </DashboardRuntimeShell>
  );
}
