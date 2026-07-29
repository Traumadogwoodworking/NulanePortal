import type { ServiceMonitor } from "@lib/services/types";

export type ReadinessState = "VERIFIED" | "DEGRADED" | "BLOCKED" | "UNKNOWN" | "NOT APPLICABLE";

export interface InspectionTracComponent {
  id: string;
  code: string;
  name: string;
  component_type: string;
  production_url: string | null;
  authoritative_branch: string | null;
  snapshot: {
    commit_sha: string | null;
    version: string | null;
    build_identifier: string | null;
    working_tree_state: string;
    production_status: string;
    deployed_commit: string | null;
    checked_at: string;
  } | null;
}

export interface InspectionTracRelease {
  id: string;
  release_key: string;
  environment: string;
  status: string;
  last_known_good_release: string | null;
  updated_at: string;
  components: Array<{
    component_code: string;
    component_name: string;
    commit_sha: string | null;
    version: string | null;
    build_identifier: string | null;
    deployment_identifier: string | null;
    verification_status: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface InspectionTracQaItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  owner: string | null;
  blocker: string | null;
  last_tested_at: string | null;
  component_code: string | null;
  component_name: string | null;
  evidence_count: number;
  latest_evidence: string | null;
  latest_evidence_at: string | null;
}

export interface InspectionTracQaEvidence {
  id: string;
  qa_item_id: string;
  qa_item_slug: string;
  qa_item_title: string;
  evidence_type: string;
  summary: string;
  build_device: string | null;
  tester: string | null;
  captured_at: string;
  created_at: string;
}

export interface InspectionTracNotification {
  id: string;
  severity: string;
  title: string;
  body: string;
  action_url: string | null;
  created_at: string;
}

export interface InspectionTracTask {
  public_id: string;
  title: string;
  status: string;
  priority: string;
  owner: string;
  blocker: string | null;
  latest_action: string | null;
  verification_event_count: number;
  last_activity_at: string;
}

export interface InspectionTracVerification {
  id: string;
  event_type: string;
  actor_type: string;
  payload: Record<string, unknown>;
  created_at: string;
  task_public_id: string;
}

export interface InspectionTracOperationsPayload {
  generatedAt: string;
  project: { code: string; name: string; description: string | null };
  overall: ReadinessState;
  components: InspectionTracComponent[];
  releases: InspectionTracRelease[];
  qaItems: InspectionTracQaItem[];
  qaEvidence: InspectionTracQaEvidence[];
  notifications: InspectionTracNotification[];
  tasks: InspectionTracTask[];
  verifications: InspectionTracVerification[];
  services: ServiceMonitor[];
}
