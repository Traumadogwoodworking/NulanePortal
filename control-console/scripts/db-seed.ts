import { closePool, ensureSchema, withTransaction } from "@lib/db";
import {
  CIRCLE_COMPONENTS,
  CIRCLE_QA_ITEMS,
  CIRCLE_TODAY_ITEMS
} from "@lib/circle/catalog";
import {
  PRODUCT_CATALOG,
  PRODUCT_COMPONENT_CATALOG,
  SERVICE_MONITOR_CATALOG
} from "@lib/services/catalog";

try {
  await ensureSchema();
  await withTransaction(async (client) => {
    const operations = await client.query<{ id: string }>(
      `INSERT INTO projects (code, name, description, next_task_number)
       VALUES (
         'OPS',
         'Nulane Operations',
         'Durable work loop, communication, and control-plane foundation',
         2
       )
       ON CONFLICT (code)
       DO UPDATE SET updated_at = now()
       RETURNING id`
    );

    const circle = await client.query<{ id: string }>(
      `INSERT INTO projects (code, name, description, repository_path)
       VALUES (
         'CIR',
         'Circle',
         'Circle Logistics pilot product: mobile, API/load engine, and portal/dispatch',
         '/Users/home/Desktop/Codex/apps/docudent-circle'
       )
       ON CONFLICT (code)
       DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         repository_path = EXCLUDED.repository_path,
         next_task_number = GREATEST(projects.next_task_number, 2),
         updated_at = now()
      RETURNING id`
    );

    const productIds = new Map<string, string>([["CIR", circle.rows[0].id]]);
    for (const product of PRODUCT_CATALOG) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO projects (code, name, description, repository_path)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code)
         DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           repository_path = EXCLUDED.repository_path,
           updated_at = now()
         RETURNING id`,
        [product.code, product.name, product.description, product.repositoryPath]
      );
      productIds.set(product.code, result.rows[0].id);
    }

    for (const definition of PRODUCT_COMPONENT_CATALOG) {
      const projectId = productIds.get(definition.projectCode);
      if (!projectId) throw new Error(`Missing project ${definition.projectCode}`);
      const repository = definition.localPath
        ? await client.query<{ id: string }>(
            `INSERT INTO repositories (
               project_id, name, local_path, remote_url, default_branch
             ) VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (name, local_path)
             DO UPDATE SET project_id = EXCLUDED.project_id, remote_url = EXCLUDED.remote_url,
               default_branch = EXCLUDED.default_branch, active = true, updated_at = now()
             RETURNING id`,
            [projectId, definition.name, definition.localPath, definition.remoteUrl, definition.authoritativeBranch]
          )
        : null;
      await client.query(
        `INSERT INTO product_components (
           project_id, repository_id, code, name, component_type,
           authoritative_branch, gitlab_project_path, gitlab_web_url,
           runner_name, production_url, display_order, metadata
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           '{"deploymentEvidence":"unverified until synchronized"}'::jsonb)
         ON CONFLICT (project_id, code)
         DO UPDATE SET repository_id = EXCLUDED.repository_id, name = EXCLUDED.name,
           component_type = EXCLUDED.component_type, authoritative_branch = EXCLUDED.authoritative_branch,
           gitlab_project_path = EXCLUDED.gitlab_project_path, gitlab_web_url = EXCLUDED.gitlab_web_url,
           runner_name = EXCLUDED.runner_name, production_url = EXCLUDED.production_url,
           display_order = EXCLUDED.display_order, active = true, updated_at = now()`,
        [
          projectId,
          repository?.rows[0]?.id ?? null,
          definition.code,
          definition.name,
          definition.componentType,
          definition.authoritativeBranch,
          definition.gitlabProjectPath,
          definition.gitlabWebUrl,
          definition.runnerName,
          definition.productionUrl,
          definition.displayOrder
        ]
      );
    }

    for (const monitor of SERVICE_MONITOR_CATALOG) {
      const projectId = productIds.get(monitor.projectCode);
      if (!projectId) throw new Error(`Missing monitor project ${monitor.projectCode}`);
      const component = await client.query<{ id: string }>(
        "SELECT id FROM product_components WHERE project_id = $1 AND code = $2",
        [projectId, monitor.componentCode]
      );
      await client.query(
        `INSERT INTO service_monitors (
           project_id, component_id, slug, name, service_kind, environment,
           endpoint_url, expected_http_status, display_order, metadata
         ) VALUES ($1, $2, $3, $4, $5, 'production', $6, 200, $7,
           '{"probePolicy":"manual or explicit sync; no invented availability"}'::jsonb)
         ON CONFLICT (slug)
         DO UPDATE SET project_id = EXCLUDED.project_id, component_id = EXCLUDED.component_id,
           name = EXCLUDED.name, service_kind = EXCLUDED.service_kind,
           endpoint_url = EXCLUDED.endpoint_url, expected_http_status = EXCLUDED.expected_http_status,
           display_order = EXCLUDED.display_order, active = true, updated_at = now()`,
        [
          projectId,
          component.rows[0]?.id ?? null,
          monitor.slug,
          monitor.name,
          monitor.serviceKind,
          monitor.endpointUrl,
          monitor.displayOrder
        ]
      );
    }

    const taskResult = await client.query<{ id: string }>(
      `INSERT INTO tasks (
         public_id,
         project_id,
         title,
         description,
         status,
         priority,
         owner,
         blocker,
         allowed_scope
       )
       VALUES (
         'OPS-001',
         $1,
         'Connect the private Telegram work loop',
         'Run the custom Telegram adapter with one-user pairing and durable task context.',
         'blocked',
         'P0',
         'shared',
         'A rotated Telegram bot token and one-time pairing code must be installed outside the repository.',
         'Custom Telegram Bot API adapter only. OpenClaw is prohibited.'
       )
       ON CONFLICT (public_id)
       DO UPDATE SET
         description = EXCLUDED.description,
         allowed_scope = EXCLUDED.allowed_scope,
         updated_at = now()
       RETURNING id`,
      [operations.rows[0].id]
    );

    await client.query(
      `INSERT INTO task_events (task_id, event_type, actor_type, payload)
       SELECT
         $1,
         'task_created',
         'system',
         '{"seeded":true,"reason":"first control-plane milestone"}'::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM task_events WHERE task_id = $1
       )`,
      [taskResult.rows[0].id]
    );

    const circleTask = await client.query<{ id: string }>(
      `INSERT INTO tasks (
         public_id,
         project_id,
         title,
         description,
         status,
         priority,
         owner,
         allowed_scope
       )
       VALUES (
         'CIR-001',
         $1,
         'Onboard Circle as the Work Control pilot product',
         'Make the coordinated Circle mobile, API, and portal release and QA state visible and actionable.',
         'working',
         'P0',
         'shared',
         'Work Control Circle onboarding only; preserve all external adapter boundaries.'
       )
       ON CONFLICT (public_id)
       DO UPDATE SET
         description = COALESCE(tasks.description, EXCLUDED.description),
         updated_at = now()
       RETURNING id`,
      [circle.rows[0].id]
    );

    const componentIds = new Map<string, string>();
    for (const component of CIRCLE_COMPONENTS) {
      const repository = await client.query<{ id: string }>(
        `INSERT INTO repositories (
           project_id, name, local_path, remote_url, default_branch
         )
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name, local_path)
         DO UPDATE SET
           project_id = EXCLUDED.project_id,
           remote_url = EXCLUDED.remote_url,
           default_branch = EXCLUDED.default_branch,
           active = true,
           updated_at = now()
         RETURNING id`,
        [
          circle.rows[0].id,
          component.name,
          component.localPath,
          component.remoteUrl,
          component.authoritativeBranch
        ]
      );
      const productComponent = await client.query<{ id: string }>(
        `INSERT INTO product_components (
           project_id, repository_id, code, name, component_type,
           authoritative_branch, gitlab_project_path, gitlab_web_url,
           runner_name, production_url, display_order, metadata
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           '{"deploymentEvidence":"unverified until synchronized"}'::jsonb
         )
         ON CONFLICT (project_id, code)
         DO UPDATE SET
           repository_id = EXCLUDED.repository_id,
           name = EXCLUDED.name,
           component_type = EXCLUDED.component_type,
           authoritative_branch = EXCLUDED.authoritative_branch,
           gitlab_project_path = EXCLUDED.gitlab_project_path,
           gitlab_web_url = EXCLUDED.gitlab_web_url,
           runner_name = EXCLUDED.runner_name,
           production_url = EXCLUDED.production_url,
           display_order = EXCLUDED.display_order,
           active = true,
           updated_at = now()
         RETURNING id`,
        [
          circle.rows[0].id,
          repository.rows[0].id,
          component.code,
          component.name,
          component.componentType,
          component.authoritativeBranch,
          component.gitlabProjectPath,
          component.gitlabWebUrl,
          component.runnerName,
          component.productionUrl,
          component.displayOrder
        ]
      );
      componentIds.set(component.code, productComponent.rows[0].id);
    }

    const release = await client.query<{ id: string }>(
      `INSERT INTO product_releases (
         project_id, release_key, environment, status, database_migrations,
         test_tenant, last_known_good_release, notes
       )
       VALUES (
         $1,
         'CIRCLE-RC-2026-07-28',
         'production',
         'testing',
         '[]'::jsonb,
         'Not yet confirmed',
         NULL,
         'Candidate assembled from synchronized local GitLab heads. Deployed commits and the last known-good cross-repository release remain unverified.'
       )
       ON CONFLICT (project_id, release_key, environment)
       DO UPDATE SET
         notes = EXCLUDED.notes,
         updated_at = now()
       RETURNING id`,
      [circle.rows[0].id]
    );

    const releaseComponents = [
      {
        code: "mobile",
        commit: "f28183861e1181a358d15e6dc93b3693a8acf361",
        version: "1.0.1",
        build: "9"
      },
      {
        code: "api",
        commit: "b0ae9772f85c536f9f14c6660477cd6323811008",
        version: null,
        build: null
      },
      {
        code: "portal",
        commit: "8b192a135c9ca28b8cce03a71da7ab998e4558f5",
        version: null,
        build: null
      }
    ];
    for (const releaseComponent of releaseComponents) {
      await client.query(
        `INSERT INTO product_release_components (
           release_id, component_id, commit_sha, version, build_identifier,
           deployment_identifier, verification_status, metadata
         )
         VALUES (
           $1, $2, $3, $4, $5, NULL, 'testing',
           '{"deployedCommit":"unverified"}'::jsonb
         )
         ON CONFLICT (release_id, component_id)
         DO UPDATE SET
           commit_sha = EXCLUDED.commit_sha,
           version = EXCLUDED.version,
           build_identifier = EXCLUDED.build_identifier,
           updated_at = now()`,
        [
          release.rows[0].id,
          componentIds.get(releaseComponent.code),
          releaseComponent.commit,
          releaseComponent.version,
          releaseComponent.build
        ]
      );
    }

    const initialQaStatus = new Map<string, string>([
      ["my-loads", "testing"],
      ["direct-delivery-submission", "needs_review"],
      ["portal-load-builder", "testing"],
      ["retry-and-recovery", "testing"],
      ["deployment-and-rollback", "needs_review"]
    ]);
    const qaIds = new Map<string, string>();
    for (const [index, qa] of CIRCLE_QA_ITEMS.entries()) {
      const [slug, title, componentCode] = qa;
      const qaItem = await client.query<{ id: string }>(
        `INSERT INTO qa_items (
           project_id, component_id, slug, title, status, display_order, owner
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'shared')
         ON CONFLICT (project_id, slug)
         DO UPDATE SET
           component_id = EXCLUDED.component_id,
           title = EXCLUDED.title,
           display_order = EXCLUDED.display_order,
           updated_at = now()
         RETURNING id`,
        [
          circle.rows[0].id,
          componentIds.get(componentCode),
          slug,
          title,
          initialQaStatus.get(slug) ?? "not_started",
          index + 1
        ]
      );
      qaIds.set(slug, qaItem.rows[0].id);
    }

    const initialEvidence = [
      {
        slug: "my-loads",
        type: "automated_test",
        summary:
          "Targeted Flutter Circle delivery/load/submission suite passed 36 tests; physical-device assigned-load proof is still required."
      },
      {
        slug: "portal-load-builder",
        type: "automated_test",
        summary:
          "Portal baseline passed 40 test files and 143 tests; no Circle lifecycle E2E proof exists yet."
      },
      {
        slug: "retry-and-recovery",
        type: "automated_test",
        summary:
          "Circle API contract suite passed; guarded database integration and live device recovery remain separate proof."
      },
      {
        slug: "deployment-and-rollback",
        type: "repository_state",
        summary:
          "All three GitLab refs match the verified local candidate commits; private pipeline/deployment history is unavailable without GitLab API authentication."
      }
    ];
    for (const evidence of initialEvidence) {
      await client.query(
        `INSERT INTO qa_evidence (
           qa_item_id, evidence_type, summary, tester, notes
         )
         SELECT $1, $2, $3, 'codex', 'Baseline evidence only; does not mark the workflow Passed.'
         WHERE NOT EXISTS (
           SELECT 1
           FROM qa_evidence
           WHERE qa_item_id = $1 AND summary = $3
         )`,
        [qaIds.get(evidence.slug), evidence.type, evidence.summary]
      );
    }

    const plan = await client.query<{ id: string }>(
      `INSERT INTO daily_plans (project_id, plan_date, goal, progress_summary)
       VALUES (
         $1,
         CURRENT_DATE,
         'Prove one real Circle load from dispatch through mobile delivery, durable backend records, PDFs, and portal completion.',
         'Repository, runner, and automated-test baseline verified. Real test identity, device, load, and cross-system acknowledgement remain.'
       )
       ON CONFLICT (project_id, plan_date)
       DO UPDATE SET
         goal = EXCLUDED.goal,
         progress_summary = EXCLUDED.progress_summary,
         updated_at = now()
       RETURNING id`,
      [circle.rows[0].id]
    );
    for (const item of CIRCLE_TODAY_ITEMS) {
      await client.query(
        `INSERT INTO daily_plan_items (
           daily_plan_id, task_id, sequence, title, status,
           estimated_minutes, dependency_note
         )
         VALUES ($1, $2, $3, $4, 'planned', $5, $6)
         ON CONFLICT (daily_plan_id, sequence)
         DO UPDATE SET
           title = EXCLUDED.title,
           estimated_minutes = EXCLUDED.estimated_minutes,
           dependency_note = EXCLUDED.dependency_note,
           updated_at = now()`,
        [
          plan.rows[0].id,
          item.sequence === 1 ? circleTask.rows[0].id : null,
          item.sequence,
          item.title,
          item.estimatedMinutes,
          item.dependency
        ]
      );
    }

    const notifications = [
      {
        kind: "gitlab_access",
        severity: "warning",
        title: "GitLab history needs authentication",
        body:
          "Repository refs are verified, but private pipelines, jobs, merge requests, and deployments cannot be read until the GitLab adapter has approved API access.",
        actionUrl: "/admin/circle"
      },
      {
        kind: "device_qa",
        severity: "warning",
        title: "Circle physical-device QA is awaiting review",
        body:
          "The mobile automated baseline passes, but no current TestFlight happy-path delivery and backend acknowledgement have been attached.",
        actionUrl: "/admin/circle#qa"
      },
      {
        kind: "release_evidence",
        severity: "critical",
        title: "Deployed commits are not yet traceable",
        body:
          "Production API and portal respond, but Work Control cannot yet prove which API and portal commits are deployed or name a last known-good cross-repository release.",
        actionUrl: "/admin/circle#release"
      }
    ];
    for (const notification of notifications) {
      await client.query(
        `INSERT INTO dashboard_notifications (
           project_id, kind, severity, title, body, action_url
         )
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1
           FROM dashboard_notifications
           WHERE project_id = $1 AND kind = $2 AND status <> 'resolved'
         )`,
        [
          circle.rows[0].id,
          notification.kind,
          notification.severity,
          notification.title,
          notification.body,
          notification.actionUrl
        ]
      );
    }
  });
  console.log("Nulane Work seed data is ready");
} finally {
  await closePool();
}
