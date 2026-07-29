import { query, withTransaction } from "@lib/db";
import type { CircleQaStatus } from "@lib/circle/catalog";
import type {
  CircleComponent,
  CircleDailyPlan,
  CircleHistoryEvent,
  CircleNotification,
  CirclePilotPayload,
  CircleQaEvidence,
  CircleQaItem,
  CircleRelease,
  CircleReleaseComponent
} from "@lib/circle/types";

export async function getCirclePilot(): Promise<CirclePilotPayload> {
  const projectResult = await query<{
    id: string;
    code: string;
    name: string;
    description: string | null;
  }>(
    `SELECT id, code, name, description
     FROM projects
     WHERE code = 'CIR' AND active = true`
  );
  const project = projectResult.rows[0];
  if (!project) {
    throw new Error("Circle project is not registered");
  }

  const [componentsResult, releasesResult, qaResult, historyResult, planResult, notificationsResult] =
    await Promise.all([
      query<CircleComponent & { snapshot: CircleComponent["snapshot"] }>(
        `SELECT
           c.id,
           c.code,
           c.name,
           c.component_type,
           c.authoritative_branch,
           c.gitlab_project_path,
           c.gitlab_web_url,
           c.runner_name,
           c.production_url,
           r.name AS repository_name,
           r.local_path,
           r.remote_url,
           CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
             'branch', s.branch,
             'commit_sha', s.commit_sha,
             'version', s.version,
             'build_identifier', s.build_identifier,
             'working_tree_state', s.working_tree_state,
             'dirty_file_count', s.dirty_file_count,
             'local_runtime_status', s.local_runtime_status,
             'production_status', s.production_status,
             'deployed_commit', s.deployed_commit,
             'current_release', s.current_release,
             'previous_release', s.previous_release,
             'pipeline_status', s.pipeline_status,
             'checked_at', s.checked_at,
             'details', s.details
           ) END AS snapshot
         FROM product_components c
         LEFT JOIN repositories r ON r.id = c.repository_id
         LEFT JOIN LATERAL (
           SELECT *
           FROM component_snapshots
           WHERE component_id = c.id
           ORDER BY checked_at DESC, id DESC
           LIMIT 1
         ) s ON true
         WHERE c.project_id = $1 AND c.active = true
         ORDER BY c.display_order, c.name`,
        [project.id]
      ),
      query<CircleRelease>(
        `SELECT *
         FROM product_releases
         WHERE project_id = $1
         ORDER BY updated_at DESC`,
        [project.id]
      ),
      query<Omit<CircleQaItem, "evidence">>(
        `SELECT
           q.*,
           c.code AS component_code,
           c.name AS component_name
         FROM qa_items q
         LEFT JOIN product_components c ON c.id = q.component_id
         WHERE q.project_id = $1
         ORDER BY q.display_order, q.title`,
        [project.id]
      ),
      query<CircleHistoryEvent>(
        `SELECT
           e.id::text,
           c.code AS component_code,
           e.source,
           e.event_type,
           e.external_id,
           e.title,
           e.status,
           e.url,
           e.occurred_at,
           e.details
         FROM integration_events e
         LEFT JOIN product_components c ON c.id = e.component_id
         WHERE e.project_id = $1
         ORDER BY e.occurred_at DESC, e.id DESC
         LIMIT 100`,
        [project.id]
      ),
      query<Omit<CircleDailyPlan, "items">>(
        `SELECT *
         FROM daily_plans
         WHERE project_id = $1
         ORDER BY
           CASE WHEN plan_date = CURRENT_DATE THEN 0 ELSE 1 END,
           plan_date DESC
         LIMIT 1`,
        [project.id]
      ),
      query<CircleNotification>(
        `SELECT
           n.*,
           c.code AS component_code,
           q.slug AS qa_slug
         FROM dashboard_notifications n
         LEFT JOIN product_components c ON c.id = n.component_id
         LEFT JOIN qa_items q ON q.id = n.qa_item_id
         WHERE n.project_id = $1 AND n.status <> 'resolved'
         ORDER BY
           CASE n.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
           n.created_at DESC`,
        [project.id]
      )
    ]);

  const releases: CircleRelease[] = [];
  for (const release of releasesResult.rows) {
    const componentResult = await query<CircleReleaseComponent>(
      `SELECT
         c.code AS component_code,
         c.name AS component_name,
         rc.commit_sha,
         rc.version,
         rc.build_identifier,
         rc.deployment_identifier,
         rc.verification_status,
         rc.metadata
       FROM product_release_components rc
       JOIN product_components c ON c.id = rc.component_id
       WHERE rc.release_id = $1
       ORDER BY c.display_order`,
      [release.id]
    );
    releases.push({ ...release, components: componentResult.rows });
  }

  const qaItems: CircleQaItem[] = [];
  for (const item of qaResult.rows) {
    const evidenceResult = await query<CircleQaEvidence>(
      `SELECT *
       FROM qa_evidence
       WHERE qa_item_id = $1
       ORDER BY captured_at DESC, created_at DESC`,
      [item.id]
    );
    qaItems.push({ ...item, evidence: evidenceResult.rows });
  }

  let today: CircleDailyPlan | null = null;
  const plan = planResult.rows[0];
  if (plan) {
    const itemsResult = await query<CircleDailyPlan["items"][number]>(
      `SELECT
         i.id,
         i.sequence,
         i.title,
         i.status,
         i.estimated_minutes,
         i.dependency_note,
         t.public_id AS task_public_id,
         q.slug AS qa_slug
       FROM daily_plan_items i
       LEFT JOIN tasks t ON t.id = i.task_id
       LEFT JOIN qa_items q ON q.id = i.qa_item_id
       WHERE i.daily_plan_id = $1
       ORDER BY i.sequence`,
      [plan.id]
    );
    today = { ...plan, items: itemsResult.rows };
  }

  return {
    generatedAt: new Date().toISOString(),
    project,
    components: componentsResult.rows,
    releases,
    qaItems,
    needsReview: qaItems.filter((item) =>
      ["needs_review", "failed", "blocked", "retest_required"].includes(item.status)
    ),
    history: historyResult.rows,
    today,
    notifications: notificationsResult.rows
  };
}

export async function updateCircleQaItem(input: {
  itemId: string;
  status: CircleQaStatus;
  updatedBy: string;
  blocker?: string | null;
}) {
  return withTransaction(async (client) => {
    const updated = await client.query<
      Omit<CircleQaItem, "evidence"> & {
        project_id: string;
        component_id: string | null;
      }
    >(
      `UPDATE qa_items
       SET status = $2,
           updated_by = $3,
           blocker = CASE WHEN $2 = 'blocked' THEN NULLIF($4, '') ELSE NULL END,
           last_tested_at = CASE
             WHEN $2 IN ('testing', 'passed', 'failed', 'needs_review', 'retest_required')
             THEN now()
             ELSE last_tested_at
           END,
           updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [input.itemId, input.status, input.updatedBy, input.blocker ?? null]
    );
    const item = updated.rows[0];
    if (!item) {
      throw new Error("Circle QA item not found");
    }
    await client.query(
      `INSERT INTO integration_events (
         project_id, component_id, source, event_type, external_id,
         title, status, occurred_at, details
       )
       VALUES (
         $1, $2, 'work-control', 'qa_status', gen_random_uuid()::text,
         $3, $4, now(), $5::jsonb
       )`,
      [
        item.project_id,
        item.component_id,
        `${item.title} → ${input.status.replaceAll("_", " ")}`,
        input.status,
        JSON.stringify({ updatedBy: input.updatedBy, blocker: input.blocker ?? null })
      ]
    );
    return item;
  });
}

export async function addCircleQaEvidence(input: {
  itemId: string;
  evidenceType: string;
  summary: string;
  buildDevice?: string;
  testUser?: string;
  loadVin?: string;
  screenshotPath?: string;
  reportPath?: string;
  correlationId?: string;
  backendRecord?: string;
  portalState?: string;
  tester?: string;
  notes?: string;
}) {
  return withTransaction(async (client) => {
    const itemResult = await client.query<{
      id: string;
      project_id: string;
      component_id: string | null;
      title: string;
    }>(
      `SELECT id, project_id, component_id, title
       FROM qa_items
       WHERE id = $1`,
      [input.itemId]
    );
    const item = itemResult.rows[0];
    if (!item) {
      throw new Error("Circle QA item not found");
    }
    const evidenceResult = await client.query<CircleQaEvidence>(
      `INSERT INTO qa_evidence (
         qa_item_id, evidence_type, summary, build_device, test_user,
         load_vin, screenshot_path, report_path, correlation_id,
         backend_record, portal_state, tester, notes
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
       )
       RETURNING *`,
      [
        input.itemId,
        input.evidenceType,
        input.summary,
        input.buildDevice ?? null,
        input.testUser ?? null,
        input.loadVin ?? null,
        input.screenshotPath ?? null,
        input.reportPath ?? null,
        input.correlationId ?? null,
        input.backendRecord ?? null,
        input.portalState ?? null,
        input.tester ?? null,
        input.notes ?? null
      ]
    );
    await client.query(
      `UPDATE qa_items
       SET updated_at = now(),
           last_tested_at = COALESCE(last_tested_at, now())
       WHERE id = $1`,
      [input.itemId]
    );
    await client.query(
      `INSERT INTO integration_events (
         project_id, component_id, source, event_type, external_id,
         title, status, occurred_at, details
       )
       VALUES (
         $1, $2, 'work-control', 'qa_evidence', $3,
         $4, 'recorded', now(), $5::jsonb
       )`,
      [
        item.project_id,
        item.component_id,
        evidenceResult.rows[0].id,
        `Evidence recorded for ${item.title}`,
        JSON.stringify({
          evidenceType: input.evidenceType,
          tester: input.tester ?? null
        })
      ]
    );
    return evidenceResult.rows[0];
  });
}

export async function updateCirclePlanItem(input: {
  itemId: string;
  status: "planned" | "working" | "blocked" | "complete" | "skipped";
}) {
  const result = await query<CircleDailyPlan["items"][number]>(
    `UPDATE daily_plan_items
     SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING
       id,
       sequence,
       title,
       status,
       estimated_minutes,
       dependency_note,
       NULL::text AS task_public_id,
       NULL::text AS qa_slug`,
    [input.itemId, input.status]
  );
  if (!result.rows[0]) {
    throw new Error("Circle plan item not found");
  }
  return result.rows[0];
}
