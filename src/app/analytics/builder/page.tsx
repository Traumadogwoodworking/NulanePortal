import { DashboardBuilder } from "@/features/dashboard-runtime/components/DashboardBuilder";
import { DashboardRuntimeShell } from "@/features/dashboard-runtime/components/DashboardRuntimeShell";

export default function AnalyticsBuilderPage() {
  return (
    <DashboardRuntimeShell
      title="Dashboard Builder"
      subtitle="Paste a dashboard JSON package, validate the fields and widgets, register it with the runtime, and preview the ordered layout."
    >
      <DashboardBuilder />
    </DashboardRuntimeShell>
  );
}
