import { DashboardRuntimeShell } from "@/features/dashboard-runtime/components/DashboardRuntimeShell";
import { RuntimeRunStatus } from "@/features/dashboard-runtime/components/RuntimeRunStatus";

export default function AnalyticsRunsPage() {
  return (
    <DashboardRuntimeShell
      title="Runtime Runs"
      subtitle="Preview and refresh runs from the dashboard runtime. Scheduling and materialization are still scaffolded."
    >
      <RuntimeRunStatus />
    </DashboardRuntimeShell>
  );
}
