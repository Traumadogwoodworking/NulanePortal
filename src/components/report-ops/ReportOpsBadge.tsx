import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  lifecycleLabel,
  lifecycleTone,
  outboxStateLabel,
  outboxStateTone,
  type ReportLifecycleState,
  type ReportOutboxState,
} from "@/lib/services/reportOpsService";

export function ReportLifecycleBadge({ state }: { state: ReportLifecycleState }) {
  return <StatusBadge label={lifecycleLabel(state)} tone={lifecycleTone(state)} />;
}

export function ReportOutboxBadge({ state }: { state: ReportOutboxState }) {
  return <StatusBadge label={outboxStateLabel(state)} tone={outboxStateTone(state)} />;
}
