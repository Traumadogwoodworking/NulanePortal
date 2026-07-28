import type { PoolClient, QueryResultRow } from "pg";
import { query, withTransaction } from "@lib/db";
import { FEATURE_INTERVIEW } from "@lib/work/interview";
import type {
  TaskEvent,
  TaskOwner,
  TaskPriority,
  TaskStatus,
  WorkQuestion,
  WorkTask
} from "@lib/work/types";

const TASK_SELECT = `
  SELECT
    t.*,
    p.code AS project_code,
    p.name AS project_name,
    r.name AS repository_name,
    COALESCE(r.local_path, p.repository_path) AS repository_path
  FROM tasks t
  JOIN projects p ON p.id = t.project_id
  LEFT JOIN repositories r ON r.id = t.repository_id
`;

function runQuery<T extends QueryResultRow>(
  client: PoolClient | undefined,
  statement: string,
  values: unknown[]
) {
  return client
    ? client.query<T>(statement, values)
    : query<T>(statement, values);
}

export async function appendTaskEvent(
  taskId: string,
  eventType: string,
  actorType: string,
  payload: Record<string, unknown> = {},
  actorId?: string | null,
  client?: PoolClient
) {
  await runQuery(
    client,
    `INSERT INTO task_events (task_id, event_type, actor_type, actor_id, payload)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [taskId, eventType, actorType, actorId ?? null, JSON.stringify(payload)]
  );
}

export async function createTask(input: {
  projectCode: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  owner?: TaskOwner;
  status?: TaskStatus;
  allowedScope?: string;
}) {
  return withTransaction(async (client) => {
    const projectResult = await client.query<{
      id: string;
      code: string;
      next_task_number: number;
    }>(
      `SELECT id, code, next_task_number
       FROM projects
       WHERE code = $1 AND active = true
       FOR UPDATE`,
      [input.projectCode.toUpperCase()]
    );

    const project = projectResult.rows[0];
    if (!project) {
      throw new Error(`Unknown active project ${input.projectCode}`);
    }

    const publicId = `${project.code}-${String(project.next_task_number).padStart(3, "0")}`;
    const taskResult = await client.query<WorkTask>(
      `INSERT INTO tasks (
         public_id,
         project_id,
         title,
         description,
         priority,
         owner,
         status,
         allowed_scope
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        publicId,
        project.id,
        input.title,
        input.description ?? null,
        input.priority ?? "P2",
        input.owner ?? "shared",
        input.status ?? "queued",
        input.allowedScope ?? null
      ]
    );

    await client.query(
      `UPDATE projects
       SET next_task_number = next_task_number + 1, updated_at = now()
       WHERE id = $1`,
      [project.id]
    );
    await appendTaskEvent(
      taskResult.rows[0].id,
      "task_created",
      "system",
      {
        publicId,
        title: input.title,
        initialStatus: input.status ?? "queued"
      },
      null,
      client
    );

    return getTask(publicId, client);
  });
}

export async function getTask(publicId: string, client?: PoolClient) {
  const result = await runQuery<WorkTask>(
    client,
    `${TASK_SELECT} WHERE t.public_id = $1`,
    [publicId.toUpperCase()]
  );
  return result.rows[0] ?? null;
}

export async function listTasks(limit = 100) {
  const result = await query<WorkTask>(
    `${TASK_SELECT}
     ORDER BY
       CASE t.priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 ELSE 3 END,
       t.updated_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function attachRepository(input: {
  publicId: string;
  repositoryName: string;
  localPath: string;
}) {
  return withTransaction(async (client) => {
    const task = await getTask(input.publicId, client);
    if (!task) {
      throw new Error(`Task ${input.publicId} was not found`);
    }
    const repository = await client.query<{ id: string }>(
      `INSERT INTO repositories (project_id, name, local_path)
       VALUES ($1, $2, $3)
       ON CONFLICT (name, local_path)
       DO UPDATE SET
         project_id = EXCLUDED.project_id,
         active = true,
         updated_at = now()
       RETURNING id`,
      [task.project_id, input.repositoryName, input.localPath]
    );
    await client.query(
      `UPDATE tasks
       SET repository_id = $2, updated_at = now()
       WHERE id = $1`,
      [task.id, repository.rows[0].id]
    );
    await client.query(
      `UPDATE projects
       SET repository_path = $2, updated_at = now()
       WHERE id = $1`,
      [task.project_id, input.localPath]
    );
    await appendTaskEvent(
      task.id,
      "repository_attached",
      "cli",
      {
        repositoryName: input.repositoryName,
        localPath: input.localPath
      },
      null,
      client
    );
    return getTask(input.publicId, client);
  });
}

export async function transitionTask(
  publicId: string,
  status: TaskStatus,
  actorType: string,
  payload: Record<string, unknown> = {}
) {
  return withTransaction(async (client) => {
    const current = await getTask(publicId, client);
    if (!current) {
      throw new Error(`Task ${publicId} was not found`);
    }

    if (status === "working" || status === "complete") {
      const pending = await client.query<{ count: string }>(
        `SELECT count(*)::text AS count
         FROM questions
         WHERE task_id = $1 AND status = 'pending'`,
        [current.id]
      );
      if (Number(pending.rows[0].count) > 0) {
        throw new Error(
          `Task ${publicId} still has unanswered interview questions`
        );
      }
    }
    if (
      status === "complete" &&
      (typeof payload.evidence !== "string" || !payload.evidence.trim())
    ) {
      throw new Error(`Task ${publicId} requires completion evidence`);
    }

    const startedAt = status === "working" && !current.started_at ? "now()" : "started_at";
    const completedAt = status === "complete" ? "now()" : "completed_at";
    await client.query(
      `UPDATE tasks
       SET status = $2,
           started_at = ${startedAt},
           completed_at = ${completedAt},
           blocker = CASE WHEN $2 = 'blocked' THEN blocker ELSE NULL END,
           last_activity_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [current.id, status]
    );
    await appendTaskEvent(
      current.id,
      "status_changed",
      actorType,
      { from: current.status, to: status, ...payload },
      null,
      client
    );
    return getTask(publicId, client);
  });
}

export async function addProgress(
  publicId: string,
  message: string,
  actorType: string,
  details: Record<string, unknown> = {}
) {
  return withTransaction(async (client) => {
    const task = await getTask(publicId, client);
    if (!task) {
      throw new Error(`Task ${publicId} was not found`);
    }
    await client.query(
      `UPDATE tasks
       SET last_activity_at = now(), updated_at = now()
       WHERE id = $1`,
      [task.id]
    );
    await appendTaskEvent(
      task.id,
      "progress",
      actorType,
      { message, ...details },
      null,
      client
    );
    return task;
  });
}

export async function setBlocker(
  publicId: string,
  blocker: string,
  actorType: string
) {
  return withTransaction(async (client) => {
    const task = await getTask(publicId, client);
    if (!task) {
      throw new Error(`Task ${publicId} was not found`);
    }
    await client.query(
      `UPDATE tasks
       SET status = 'blocked',
           blocker = $2,
           last_activity_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [task.id, blocker]
    );
    await appendTaskEvent(
      task.id,
      "blocked",
      actorType,
      { blocker },
      null,
      client
    );
    return getTask(publicId, client);
  });
}

export async function startInterview(publicId: string, actorType = "system") {
  return withTransaction(async (client) => {
    const task = await getTask(publicId, client);
    if (!task) {
      throw new Error(`Task ${publicId} was not found`);
    }

    const existing = await client.query<WorkQuestion>(
      `SELECT * FROM questions WHERE task_id = $1 ORDER BY sequence`,
      [task.id]
    );
    if (existing.rows.length === 0) {
      const step = FEATURE_INTERVIEW[0];
      await client.query(
        `INSERT INTO questions (
           task_id, sequence, field_key, prompt, recommended_answer
         )
         VALUES ($1, 1, $2, $3, $4)`,
        [task.id, step.fieldKey, step.prompt, step.recommendedAnswer]
      );
      await appendTaskEvent(
        task.id,
        "interview_started",
        actorType,
        { totalQuestions: FEATURE_INTERVIEW.length },
        null,
        client
      );
    }
    await client.query(
      `UPDATE tasks
       SET status = 'interviewing', blocker = NULL, updated_at = now(), last_activity_at = now()
       WHERE id = $1`,
      [task.id]
    );
    return getPendingQuestionByTaskId(task.id, client);
  });
}

async function getPendingQuestionByTaskId(taskId: string, client?: PoolClient) {
  const result = await runQuery<WorkQuestion>(
    client,
    `SELECT *
     FROM questions
     WHERE task_id = $1 AND status = 'pending'
     ORDER BY sequence
     LIMIT 1`,
    [taskId]
  );
  return result.rows[0] ?? null;
}

export async function getPendingQuestion(publicId: string) {
  const task = await getTask(publicId);
  if (!task) {
    return null;
  }
  return getPendingQuestionByTaskId(task.id);
}

export async function answerQuestion(input: {
  publicId: string;
  answer: string;
  operatorId?: string | null;
  actorType?: string;
}) {
  return withTransaction(async (client) => {
    const task = await getTask(input.publicId, client);
    if (!task) {
      throw new Error(`Task ${input.publicId} was not found`);
    }
    const pendingResult = await client.query<WorkQuestion>(
      `SELECT *
       FROM questions
       WHERE task_id = $1 AND status = 'pending'
       ORDER BY sequence
       LIMIT 1
       FOR UPDATE`,
      [task.id]
    );
    const pending = pendingResult.rows[0];
    if (!pending) {
      throw new Error(`Task ${input.publicId} has no pending question`);
    }

    const answeredResult = await client.query<WorkQuestion>(
      `UPDATE questions
       SET status = 'answered',
           answer = $2,
           answered_by = $3,
           answered_at = now()
       WHERE id = $1
       RETURNING *`,
      [pending.id, input.answer, input.operatorId ?? null]
    );
    const answeredQuestion = answeredResult.rows[0];
    await appendTaskEvent(
      task.id,
      "question_answered",
      input.actorType ?? "telegram",
      {
        questionId: pending.id,
        sequence: pending.sequence,
        fieldKey: pending.field_key,
        answer: input.answer
      },
      input.operatorId ?? null,
      client
    );

    const nextStep = FEATURE_INTERVIEW[pending.sequence];
    let nextQuestion: WorkQuestion | null = null;
    if (nextStep) {
      const nextResult = await client.query<WorkQuestion>(
        `INSERT INTO questions (
           task_id, sequence, field_key, prompt, recommended_answer
         )
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (task_id, field_key)
         DO UPDATE SET prompt = EXCLUDED.prompt
         RETURNING *`,
        [
          task.id,
          pending.sequence + 1,
          nextStep.fieldKey,
          nextStep.prompt,
          nextStep.recommendedAnswer
        ]
      );
      nextQuestion = nextResult.rows[0];
      await client.query(
        `UPDATE tasks
         SET status = 'interviewing', last_activity_at = now(), updated_at = now()
         WHERE id = $1`,
        [task.id]
      );
    } else {
      await client.query(
        `UPDATE tasks
         SET status = 'ready', blocker = NULL, last_activity_at = now(), updated_at = now()
         WHERE id = $1`,
        [task.id]
      );
      await appendTaskEvent(
        task.id,
        "interview_completed",
        input.actorType ?? "telegram",
        { totalQuestions: FEATURE_INTERVIEW.length },
        input.operatorId ?? null,
        client
      );
    }

    return {
      task: await getTask(input.publicId, client),
      answered: answeredQuestion,
      nextQuestion
    };
  });
}

export async function createManualQuestion(input: {
  publicId: string;
  prompt: string;
  recommendedAnswer?: string;
  actorType: string;
}) {
  return withTransaction(async (client) => {
    const task = await getTask(input.publicId, client);
    if (!task) {
      throw new Error(`Task ${input.publicId} was not found`);
    }
    const sequenceResult = await client.query<{ next_sequence: number }>(
      `SELECT COALESCE(MAX(sequence), 0) + 1 AS next_sequence
       FROM questions
       WHERE task_id = $1`,
      [task.id]
    );
    const sequence = Number(sequenceResult.rows[0].next_sequence);
    const fieldKey = `manual_${sequence}`;
    const questionResult = await client.query<WorkQuestion>(
      `INSERT INTO questions (
         task_id, sequence, field_key, prompt, recommended_answer
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        task.id,
        sequence,
        fieldKey,
        input.prompt,
        input.recommendedAnswer ?? null
      ]
    );
    await client.query(
      `UPDATE tasks
       SET status = 'blocked',
           blocker = $2,
           last_activity_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [task.id, `Awaiting answer: ${input.prompt}`]
    );
    await appendTaskEvent(
      task.id,
      "question_asked",
      input.actorType,
      {
        questionId: questionResult.rows[0].id,
        prompt: input.prompt,
        recommendedAnswer: input.recommendedAnswer ?? null
      },
      null,
      client
    );
    await client.query(
      `INSERT INTO notification_outbox (task_id, kind, body, action_payload)
       VALUES ($1, 'question', $2, $3::jsonb)`,
      [
        task.id,
        `${task.public_id} needs your answer:\n\n${input.prompt}`,
        JSON.stringify({ taskId: task.public_id, questionId: questionResult.rows[0].id })
      ]
    );
    return questionResult.rows[0];
  });
}

export async function listRecentEvents(limit = 40) {
  const result = await query<TaskEvent>(
    `SELECT e.*, t.public_id
     FROM task_events e
     JOIN tasks t ON t.id = e.task_id
     ORDER BY e.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getOverview() {
  const [tasks, events, projects, operator, outbox] = await Promise.all([
    listTasks(),
    listRecentEvents(30),
    query<{ code: string; name: string; active: boolean }>(
      `SELECT code, name, active FROM projects ORDER BY code`
    ),
    query<{ telegram_user_id: string | null; display_name: string }>(
      `SELECT telegram_user_id::text, display_name
       FROM operators
       WHERE active = true
       ORDER BY approved_at
       LIMIT 1`
    ),
    query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM notification_outbox
       WHERE status IN ('pending', 'failed')`
    )
  ]);

  const statusCounts = Object.fromEntries(
    tasks.reduce<Map<string, number>>((counts, task) => {
      counts.set(task.status, (counts.get(task.status) ?? 0) + 1);
      return counts;
    }, new Map())
  );

  return {
    generatedAt: new Date().toISOString(),
    statusCounts,
    tasks,
    events,
    projects: projects.rows,
    operatorPaired: Boolean(operator.rows[0]?.telegram_user_id),
    operatorName: operator.rows[0]?.display_name ?? null,
    telegramConfigured:
      process.env.TELEGRAM_ENABLED === "true" &&
      Boolean(process.env.TELEGRAM_BOT_TOKEN),
    pendingNotifications: Number(outbox.rows[0]?.count ?? 0)
  };
}
