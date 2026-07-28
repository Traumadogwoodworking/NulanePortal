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

