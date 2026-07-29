import type { CircleQaStatus } from "@lib/circle/catalog";

export interface CircleComponent {
  id: string;
  code: string;
  name: string;
  component_type: string;
  authoritative_branch: string | null;
  gitlab_project_path: string | null;
  gitlab_web_url: string | null;
  runner_name: string | null;
  production_url: string | null;
  repository_name: string | null;
  local_path: string | null;
  remote_url: string | null;
  snapshot: {
    branch: string | null;
    commit_sha: string | null;
    version: string | null;
    build_identifier: string | null;
    working_tree_state: string;
    dirty_file_count: number | null;
    local_runtime_status: string;
    production_status: string;
    deployed_commit: string | null;
    current_release: string | null;
    previous_release: string | null;
    pipeline_status: string | null;
    checked_at: string;
    details: Record<string, unknown>;
  } | null;
}

export interface CircleReleaseComponent {
  component_code: string;
  component_name: string;
  commit_sha: string | null;
  version: string | null;
  build_identifier: string | null;
  deployment_identifier: string | null;
  verification_status: string;
  metadata: Record<string, unknown>;
}

export interface CircleRelease {
  id: string;
  release_key: string;
  environment: string;
  status: string;
  database_migrations: unknown[];
  test_tenant: string | null;
  last_known_good_release: string | null;
  notes: string | null;
  updated_at: string;
  components: CircleReleaseComponent[];
}

export interface CircleQaEvidence {
  id: string;
  evidence_type: string;
  summary: string;
  build_device: string | null;
  test_user: string | null;
  load_vin: string | null;
  screenshot_path: string | null;
  report_path: string | null;
  correlation_id: string | null;
  backend_record: string | null;
  portal_state: string | null;
  tester: string | null;
  captured_at: string;
  notes: string | null;
}

export interface CircleQaItem {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: CircleQaStatus;
  display_order: number;
  owner: string | null;
  blocker: string | null;
  updated_by: string | null;
  last_tested_at: string | null;
  component_code: string | null;
  component_name: string | null;
  evidence: CircleQaEvidence[];
}

export interface CircleHistoryEvent {
  id: string;
  component_code: string | null;
  source: string;
  event_type: string;
  external_id: string;
  title: string;
  status: string | null;
  url: string | null;
  occurred_at: string;
  details: Record<string, unknown>;
}

export interface CircleDailyPlan {
  id: string;
  plan_date: string;
  goal: string;
  progress_summary: string | null;
  items: Array<{
    id: string;
    sequence: number;
    title: string;
    status: string;
    estimated_minutes: number | null;
    dependency_note: string | null;
    task_public_id: string | null;
    qa_slug: string | null;
  }>;
}

export interface CircleNotification {
  id: string;
  severity: string;
  title: string;
  body: string;
  status: string;
  action_url: string | null;
  component_code: string | null;
  qa_slug: string | null;
  created_at: string;
}

export interface CirclePilotPayload {
  generatedAt: string;
  project: {
    id: string;
    code: string;
    name: string;
    description: string | null;
  };
  components: CircleComponent[];
  releases: CircleRelease[];
  qaItems: CircleQaItem[];
  needsReview: CircleQaItem[];
  history: CircleHistoryEvent[];
  today: CircleDailyPlan | null;
  notifications: CircleNotification[];
}
