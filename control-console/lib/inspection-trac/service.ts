import { query } from "@lib/db";
import { getServicesOverview } from "@lib/services/service";
import { listTasks } from "@lib/work/task-service";
import type {
  InspectionTracComponent,
  InspectionTracNotification,
  InspectionTracOperationsPayload,
  InspectionTracQaItem,
  InspectionTracRelease,
  InspectionTracVerification
} from "@lib/inspection-trac/types";

export async function getInspectionTracOperations(): Promise<InspectionTracOperationsPayload> {
  const projectResult = await query<{ id: string; code: string; name: string; description: string | null }>(
    "SELECT id, code, name, description FROM projects WHERE code = 'INS' AND active = true"
  );
  const project = projectResult.rows[0];
  if (!project) throw new Error("Inspection Trac project is not registered");

  const [componentsResult, releasesResult, releaseComponentsResult, qaResult, notificationsResult, verificationsResult, services, tasks] = await Promise.all([
    query<InspectionTracComponent>(
      `SELECT c.id, c.code, c.name, c.component_type, c.production_url, c.authoritative_branch,
        CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
          'commit_sha', s.commit_sha, 'version', s.version,
          'build_identifier', s.build_identifier, 'working_tree_state', s.working_tree_state,
          'production_status', s.production_status, 'deployed_commit', s.deployed_commit,
          'checked_at', s.checked_at
        ) END AS snapshot
       FROM product_components c
       LEFT JOIN LATERAL (
         SELECT * FROM component_snapshots WHERE component_id = c.id
         ORDER BY checked_at DESC, id DESC LIMIT 1
       ) s ON true
       WHERE c.project_id = $1 AND c.active = true
       ORDER BY c.display_order, c.name`,
      [project.id]
    ),
    query<Omit<InspectionTracRelease, "components">>(
      `SELECT id, release_key, environment, status, last_known_good_release, updated_at
       FROM product_releases WHERE project_id = $1 ORDER BY updated_at DESC`,
      [project.id]
    ),
    query<InspectionTracRelease["components"][number] & { release_id: string }>(
      `SELECT rc.release_id, c.code AS component_code, c.name AS component_name,
        rc.commit_sha, rc.version, rc.build_identifier, rc.deployment_identifier,
        rc.verification_status, rc.metadata
       FROM product_release_components rc
       JOIN product_releases r ON r.id = rc.release_id
       JOIN product_components c ON c.id = rc.component_id
       WHERE r.project_id = $1
       ORDER BY r.updated_at DESC, c.display_order`,
      [project.id]
    ),
    query<InspectionTracQaItem>(
      `SELECT q.id, q.slug, q.title, q.description, q.status, q.owner, q.blocker,
        q.last_tested_at, c.code AS component_code, c.name AS component_name,
        COALESCE(evidence.evidence_count, 0)::int AS evidence_count,
        evidence.latest_evidence, evidence.latest_evidence_at
       FROM qa_items q
       LEFT JOIN product_components c ON c.id = q.component_id
       LEFT JOIN LATERAL (
         SELECT count(*)::int AS evidence_count,
           (array_agg(e.summary ORDER BY e.captured_at DESC, e.created_at DESC))[1] AS latest_evidence,
           max(e.captured_at)::text AS latest_evidence_at
         FROM qa_evidence e WHERE e.qa_item_id = q.id
       ) evidence ON true
       WHERE q.project_id = $1
       ORDER BY q.display_order, q.title`,
      [project.id]
    ),
    query<InspectionTracNotification>(
      `SELECT id, severity, title, body, action_url, created_at
       FROM dashboard_notifications
       WHERE project_id = $1 AND status <> 'resolved'
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, created_at DESC`,
      [project.id]
    ),
    query<InspectionTracVerification>(
      `SELECT e.id::text, e.event_type, e.actor_type, e.payload, e.created_at, t.public_id AS task_public_id
       FROM task_events e JOIN tasks t ON t.id = e.task_id
       WHERE t.project_id = $1 AND e.event_type IN ('verification', 'progress', 'blocked')
       ORDER BY e.created_at DESC LIMIT 24`,
      [project.id]
    ),
    getServicesOverview(),
    listTasks()
  ]);

  const releases = releasesResult.rows.map((release) => ({
    ...release,
    components: releaseComponentsResult.rows.filter((component) => component.release_id === release.id)
      .map((component) => ({
        component_code: component.component_code,
        component_name: component.component_name,
        commit_sha: component.commit_sha,
        version: component.version,
        build_identifier: component.build_identifier,
        deployment_identifier: component.deployment_identifier,
        verification_status: component.verification_status,
        metadata: component.metadata
      }))
  }));
  const inspectionTasks = tasks.filter((task) => task.project_code === "INS").map((task) => ({
    public_id: task.public_id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    owner: task.owner,
    blocker: task.blocker,
    latest_action: task.latest_action,
    verification_event_count: task.verification_event_count,
    last_activity_at: task.last_activity_at
  }));
  const hasCriticalBlocker = notificationsResult.rows.some((item) => item.severity === "critical") ||
    inspectionTasks.some((task) => task.priority === "P0" && ["blocked", "failed"].includes(task.status));

  return {
    generatedAt: new Date().toISOString(),
    project: { code: project.code, name: project.name, description: project.description },
    overall: hasCriticalBlocker || releases.some((release) => release.status !== "released") ? "BLOCKED" : "UNKNOWN",
    components: componentsResult.rows,
    releases,
    qaItems: qaResult.rows,
    notifications: notificationsResult.rows,
    tasks: inspectionTasks,
    verifications: verificationsResult.rows,
    services: services.monitors.filter((monitor) => monitor.project_code === "INS")
  };
}
