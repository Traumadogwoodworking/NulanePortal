CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE CHECK (code ~ '^[A-Z][A-Z0-9]{1,7}$'),
  name text NOT NULL,
  description text,
  repository_path text,
  active boolean NOT NULL DEFAULT true,
  next_task_number integer NOT NULL DEFAULT 1 CHECK (next_task_number > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  local_path text,
  remote_url text,
  default_branch text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, local_path)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  repository_id uuid REFERENCES repositories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued',
      'interviewing',
      'ready',
      'working',
      'verifying',
      'approval_required',
      'blocked',
      'failed',
      'paused',
      'cancelled',
      'complete'
    )),
  priority text NOT NULL DEFAULT 'P2'
    CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  owner text NOT NULL DEFAULT 'shared'
    CHECK (owner IN ('matthew', 'codex', 'agent', 'external', 'shared')),
  allowed_scope text,
  acceptance_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_verification jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocker text,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  telegram_user_id bigint UNIQUE,
  telegram_chat_id bigint UNIQUE,
  role text NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner', 'operator', 'viewer')),
  active boolean NOT NULL DEFAULT true,
  active_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sequence integer NOT NULL CHECK (sequence > 0),
  field_key text NOT NULL,
  prompt text NOT NULL,
  recommended_answer text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'answered', 'skipped', 'cancelled')),
  answer text,
  answered_by uuid REFERENCES operators(id) ON DELETE SET NULL,
  telegram_message_id bigint,
  asked_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  UNIQUE (task_id, sequence),
  UNIQUE (task_id, field_key)
);

CREATE TABLE IF NOT EXISTS task_events (
  id bigserial PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  actor_type text NOT NULL
    CHECK (actor_type IN ('matthew', 'codex', 'agent', 'system', 'telegram', 'cli')),
  actor_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id bigserial PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  operator_id uuid REFERENCES operators(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'telegram',
  kind text NOT NULL,
  body text NOT NULL,
  action_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  runner text NOT NULL,
  external_run_id text,
  repository_path text,
  worktree_path text,
  branch text,
  phase text NOT NULL,
  changed_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  test_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  blocker text,
  result_summary text,
  started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS product_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  repository_id uuid REFERENCES repositories(id) ON DELETE SET NULL,
  code text NOT NULL,
  name text NOT NULL,
  component_type text NOT NULL
    CHECK (component_type IN ('mobile', 'api', 'portal', 'worker', 'other')),
  authoritative_branch text,
  gitlab_project_path text,
  gitlab_web_url text,
  runner_name text,
  production_url text,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, code)
);

CREATE TABLE IF NOT EXISTS component_snapshots (
  id bigserial PRIMARY KEY,
  component_id uuid NOT NULL REFERENCES product_components(id) ON DELETE CASCADE,
  source text NOT NULL,
  branch text,
  commit_sha text,
  version text,
  build_identifier text,
  working_tree_state text NOT NULL DEFAULT 'unknown'
    CHECK (working_tree_state IN ('clean', 'dirty', 'unavailable', 'unknown')),
  dirty_file_count integer,
  local_runtime_status text NOT NULL DEFAULT 'unknown',
  production_status text NOT NULL DEFAULT 'unknown',
  deployed_commit text,
  current_release text,
  previous_release text,
  pipeline_status text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS product_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  release_key text NOT NULL,
  environment text NOT NULL,
  status text NOT NULL
    CHECK (status IN (
      'draft',
      'candidate',
      'testing',
      'approval_required',
      'released',
      'failed',
      'rolled_back',
      'superseded'
    )),
  database_migrations jsonb NOT NULL DEFAULT '[]'::jsonb,
  test_tenant text,
  last_known_good_release text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, release_key, environment)
);

CREATE TABLE IF NOT EXISTS product_release_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES product_releases(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES product_components(id) ON DELETE CASCADE,
  commit_sha text,
  version text,
  build_identifier text,
  deployment_identifier text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'testing', 'verified', 'failed')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (release_id, component_id)
);

CREATE TABLE IF NOT EXISTS qa_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_id uuid REFERENCES product_components(id) ON DELETE SET NULL,
  slug text NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started',
      'testing',
      'passed',
      'failed',
      'needs_review',
      'blocked',
      'retest_required'
    )),
  display_order integer NOT NULL DEFAULT 0,
  owner text,
  blocker text,
  updated_by text,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, slug)
);

CREATE TABLE IF NOT EXISTS qa_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  qa_item_id uuid NOT NULL REFERENCES qa_items(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  summary text NOT NULL,
  build_device text,
  test_user text,
  load_vin text,
  screenshot_path text,
  report_path text,
  correlation_id text,
  backend_record text,
  portal_state text,
  tester text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS integration_events (
  id bigserial PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  component_id uuid REFERENCES product_components(id) ON DELETE CASCADE,
  source text NOT NULL,
  event_type text NOT NULL,
  external_id text NOT NULL,
  title text NOT NULL,
  status text,
  url text,
  occurred_at timestamptz NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, component_id, source, external_id)
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  goal text NOT NULL,
  progress_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, plan_date)
);

CREATE TABLE IF NOT EXISTS daily_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id uuid NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  qa_item_id uuid REFERENCES qa_items(id) ON DELETE SET NULL,
  sequence integer NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'working', 'blocked', 'complete', 'skipped')),
  estimated_minutes integer CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  dependency_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (daily_plan_id, sequence)
);

CREATE TABLE IF NOT EXISTS dashboard_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  component_id uuid REFERENCES product_components(id) ON DELETE CASCADE,
  qa_item_id uuid REFERENCES qa_items(id) ON DELETE CASCADE,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'critical')),
  title text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  action_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS service_monitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  component_id uuid REFERENCES product_components(id) ON DELETE SET NULL,
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  name text NOT NULL,
  service_kind text NOT NULL,
  environment text NOT NULL DEFAULT 'production',
  endpoint_url text NOT NULL,
  expected_http_status integer NOT NULL DEFAULT 200,
  active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS service_check_samples (
  id bigserial PRIMARY KEY,
  monitor_id uuid NOT NULL REFERENCES service_monitors(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('ready', 'degraded', 'unavailable', 'unknown')),
  http_status integer,
  latency_ms integer,
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_status_priority_idx
  ON tasks (status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS tasks_activity_idx
  ON tasks (last_activity_at DESC);
CREATE INDEX IF NOT EXISTS task_events_task_created_idx
  ON task_events (task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS task_events_created_idx
  ON task_events (created_at DESC);
CREATE INDEX IF NOT EXISTS questions_pending_idx
  ON questions (task_id, status, sequence);
CREATE INDEX IF NOT EXISTS notification_outbox_delivery_idx
  ON notification_outbox (status, available_at, id);
CREATE INDEX IF NOT EXISTS component_snapshots_component_checked_idx
  ON component_snapshots (component_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS product_releases_project_updated_idx
  ON product_releases (project_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS qa_items_project_status_idx
  ON qa_items (project_id, status, display_order);
CREATE INDEX IF NOT EXISTS qa_evidence_item_captured_idx
  ON qa_evidence (qa_item_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS integration_events_component_occurred_idx
  ON integration_events (component_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS daily_plans_project_date_idx
  ON daily_plans (project_id, plan_date DESC);
CREATE INDEX IF NOT EXISTS dashboard_notifications_open_idx
  ON dashboard_notifications (status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS service_monitors_active_idx
  ON service_monitors (active, display_order);
CREATE INDEX IF NOT EXISTS service_check_samples_monitor_checked_idx
  ON service_check_samples (monitor_id, checked_at DESC);

CREATE OR REPLACE FUNCTION reject_task_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'task_events is append-only';
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'task_events_append_only'
  ) THEN
    CREATE TRIGGER task_events_append_only
      BEFORE UPDATE OR DELETE ON task_events
      FOR EACH ROW
      EXECUTE FUNCTION reject_task_event_mutation();
  END IF;
END;
$$;
