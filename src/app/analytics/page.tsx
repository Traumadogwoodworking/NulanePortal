import { DashboardPicker } from "@/features/dashboard-runtime/components/DashboardPicker";
import { DashboardRuntimeShell } from "@/features/dashboard-runtime/components/DashboardRuntimeShell";

export default function AnalyticsPage() {
  return (
    <DashboardRuntimeShell
      title="Dashboards"
      subtitle="Runtime dashboard packages are made from datasets, fields, filters, widgets, layout, permissions, and run history."
    >
      <DashboardPicker />
    </DashboardRuntimeShell>
  );
}
