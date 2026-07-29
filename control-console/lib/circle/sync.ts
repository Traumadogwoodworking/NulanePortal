import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { CIRCLE_COMPONENTS } from "@lib/circle/catalog";
import { query, withTransaction } from "@lib/db";

const execFileAsync = promisify(execFile);

interface GitState {
  branch: string;
  commit: string;
  dirtyFiles: string[];
  version: string | null;
  buildIdentifier: string | null;
  recentCommits: Array<{
    sha: string;
    occurredAt: string;
    title: string;
  }>;
}

interface RuntimeState {
  status: string;
  health: string;
  restarts: number | null;
}

function redact(value: string) {
  return value
    .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, "$1<redacted>")
    .replace(/((?:token|password|secret|api[_-]?key)[=:]\s*)[^\s,;]+/gi, "$1<redacted>")
    .replace(/postgresql:\/\/[^@\s]+@/gi, "postgresql://<redacted>@");
}

async function run(command: string, args: string[], cwd?: string) {
  const result = await execFileAsync(command, args, {
    cwd,
    timeout: 20_000,
    maxBuffer: 2 * 1024 * 1024
  });
  return result.stdout.trim();
}

async function readVersion(componentCode: string, localPath: string) {
  if (componentCode === "mobile") {
    const pubspec = await fs.readFile(path.join(localPath, "pubspec.yaml"), "utf8");
    const match = pubspec.match(/^version:\s*([^\s+]+)(?:\+([^\s]+))?/m);
    return {
      version: match?.[1] ?? null,
      buildIdentifier: match?.[2] ?? null
    };
  }
  try {
    const packageJson = JSON.parse(
      await fs.readFile(path.join(localPath, "package.json"), "utf8")
    ) as { version?: string };
    return {
      version: packageJson.version ?? null,
      buildIdentifier: null
    };
  } catch {
    return { version: null, buildIdentifier: null };
  }
}

async function inspectGit(
  componentCode: string,
  localPath: string
): Promise<GitState> {
  const [branch, commit, status, log, version] = await Promise.all([
    run("git", ["branch", "--show-current"], localPath),
    run("git", ["rev-parse", "HEAD"], localPath),
    run("git", ["status", "--porcelain=v1"], localPath),
    run(
      "git",
      ["log", "-12", "--format=%H%x1f%cI%x1f%s"],
      localPath
    ),
    readVersion(componentCode, localPath)
  ]);
  return {
    branch,
    commit,
    dirtyFiles: status ? status.split("\n").filter(Boolean) : [],
    version: version.version,
    buildIdentifier: version.buildIdentifier,
    recentCommits: log
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const [sha, occurredAt, title] = line.split("\u001f");
        return { sha, occurredAt, title };
      })
  };
}

async function inspectRuntimes() {
  const output = await run("nulane-dev", ["status"]);
  const states = new Map<string, RuntimeState>();
  for (const line of output.split("\n")) {
    const columns = line.trim().split(/\s{2,}/);
    if (columns.length < 8 || columns[0] === "PID") continue;
    const [, name, , status, , health, restarts] = columns;
    states.set(name, {
      status: status.toLowerCase(),
      health: health === "-" ? "unknown" : health.toLowerCase(),
      restarts: Number.isFinite(Number(restarts)) ? Number(restarts) : null
    });
  }
  return states;
}

async function readRunnerLog(runnerName: string) {
  const logPath = `/Users/home/.nulane/dev/logs/${runnerName}.log`;
  try {
    const contents = await fs.readFile(logPath, "utf8");
    return {
      logPath,
      excerpt: redact(contents.split("\n").slice(-24).join("\n")).slice(-12_000)
    };
  } catch (error) {
    return {
      logPath,
      excerpt: "",
      error: error instanceof Error ? error.message : "Log unavailable"
    };
  }
}

async function inspectProduction(productionUrl: string | null) {
  if (!productionUrl) {
    return {
      status: "not_applicable",
      httpStatus: null,
      body: null,
      error: null
    };
  }
  try {
    const response = await fetch(productionUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000)
    });
    const body = redact((await response.text()).slice(0, 4_000));
    return {
      status: response.ok ? "ready" : "degraded",
      httpStatus: response.status,
      body,
      error: null
    };
  } catch (error) {
    return {
      status: "unavailable",
      httpStatus: null,
      body: null,
      error: error instanceof Error ? error.message : "Probe failed"
    };
  }
}

async function inspectGitLab(projectPath: string) {
  const baseUrl = process.env.GITLAB_BASE_URL ?? "http://127.0.0.1:8929";
  const token = process.env.GITLAB_TOKEN;
  try {
    const response = await fetch(
      `${baseUrl}/api/v4/projects/${encodeURIComponent(projectPath)}/pipelines?per_page=8`,
      {
        headers: token ? { "PRIVATE-TOKEN": token } : {},
        signal: AbortSignal.timeout(10_000)
      }
    );
    if (!response.ok) {
      return {
        status: response.status === 401 || response.status === 404
          ? "unavailable_authentication_required"
          : `unavailable_http_${response.status}`,
        pipelines: [] as Array<Record<string, unknown>>
      };
    }
    return {
      status: "available",
      pipelines: (await response.json()) as Array<Record<string, unknown>>
    };
  } catch (error) {
    return {
      status: "unavailable",
      error: error instanceof Error ? error.message : "GitLab probe failed",
      pipelines: [] as Array<Record<string, unknown>>
    };
  }
}

export async function syncCircleState() {
  const projectResult = await query<{ id: string }>(
    "SELECT id FROM projects WHERE code = 'CIR'"
  );
  const projectId = projectResult.rows[0]?.id;
  if (!projectId) {
    throw new Error("Run the Work Control seed before Circle synchronization");
  }
  const runtimes = await inspectRuntimes();
  const checkedAt = new Date().toISOString();
  const synchronized: Array<Record<string, unknown>> = [];

  for (const definition of CIRCLE_COMPONENTS) {
    const [git, log, production, gitlab] = await Promise.all([
      inspectGit(definition.code, definition.localPath),
      readRunnerLog(definition.runnerName),
      inspectProduction(definition.productionUrl),
      inspectGitLab(definition.gitlabProjectPath)
    ]);
    const runtime = runtimes.get(definition.runnerName) ?? {
      status: "unknown",
      health: "unknown",
      restarts: null
    };

    await withTransaction(async (client) => {
      const componentResult = await client.query<{ id: string }>(
        `SELECT id
         FROM product_components
         WHERE project_id = $1 AND code = $2`,
        [projectId, definition.code]
      );
      const componentId = componentResult.rows[0]?.id;
      if (!componentId) {
        throw new Error(`Circle component ${definition.code} is not seeded`);
      }
      await client.query(
        `INSERT INTO component_snapshots (
           component_id, source, branch, commit_sha, version, build_identifier,
           working_tree_state, dirty_file_count, local_runtime_status,
           production_status, pipeline_status, checked_at, details
         )
         VALUES (
           $1, 'host-sync', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
           $12::jsonb
         )`,
        [
          componentId,
          git.branch,
          git.commit,
          git.version,
          git.buildIdentifier,
          git.dirtyFiles.length > 0 ? "dirty" : "clean",
          git.dirtyFiles.length,
          runtime.health === "ready" ? "ready" : runtime.status,
          production.status,
          gitlab.status,
          checkedAt,
          JSON.stringify({
            dirtyFiles: git.dirtyFiles,
            runtime,
            production,
            runnerLog: log,
            gitlab: {
              status: gitlab.status,
              pipelineCount: gitlab.pipelines.length
            },
            deployedCommitEvidence: "unverified"
          })
        ]
      );

      for (const commit of git.recentCommits) {
        await client.query(
          `INSERT INTO integration_events (
             project_id, component_id, source, event_type, external_id,
             title, status, url, occurred_at, details
           )
           VALUES (
             $1, $2, 'git', 'commit', $3, $4, 'recorded', $5, $6,
             $7::jsonb
           )
           ON CONFLICT (project_id, component_id, source, external_id)
           DO UPDATE SET
             title = EXCLUDED.title,
             occurred_at = EXCLUDED.occurred_at,
             details = EXCLUDED.details,
             ingested_at = now()`,
          [
            projectId,
            componentId,
            commit.sha,
            commit.title,
            `${definition.gitlabWebUrl}/-/commit/${commit.sha}`,
            commit.occurredAt,
            JSON.stringify({ branch: git.branch })
          ]
        );
      }

      for (const pipeline of gitlab.pipelines) {
        const pipelineId = String(pipeline.id ?? pipeline.iid ?? "unknown");
        await client.query(
          `INSERT INTO integration_events (
             project_id, component_id, source, event_type, external_id,
             title, status, url, occurred_at, details
           )
           VALUES (
             $1, $2, 'gitlab', 'pipeline', $3, $4, $5, $6, $7, $8::jsonb
           )
           ON CONFLICT (project_id, component_id, source, external_id)
           DO UPDATE SET
             status = EXCLUDED.status,
             url = EXCLUDED.url,
             occurred_at = EXCLUDED.occurred_at,
             details = EXCLUDED.details,
             ingested_at = now()`,
          [
            projectId,
            componentId,
            pipelineId,
            `Pipeline #${pipelineId}`,
            String(pipeline.status ?? "unknown"),
            typeof pipeline.web_url === "string" ? pipeline.web_url : null,
            String(pipeline.updated_at ?? pipeline.created_at ?? checkedAt),
            JSON.stringify(pipeline)
          ]
        );
      }

      await client.query(
        `INSERT INTO integration_events (
           project_id, component_id, source, event_type, external_id,
           title, status, url, occurred_at, details
         )
         VALUES (
           $1, $2, 'runtime', 'snapshot', $3, $4, $5, $6, $7, $8::jsonb
         )
         ON CONFLICT (project_id, component_id, source, external_id)
         DO NOTHING`,
        [
          projectId,
          componentId,
          `${definition.runnerName}:${checkedAt}`,
          `${definition.runnerName} ${runtime.status} / ${runtime.health}`,
          runtime.health,
          definition.productionUrl,
          checkedAt,
          JSON.stringify({ runtime, production, runnerLog: log })
        ]
      );

      await client.query(
        `UPDATE product_release_components rc
         SET commit_sha = $3,
             version = $4,
             build_identifier = $5,
             updated_at = now()
         FROM product_releases pr
         WHERE rc.release_id = pr.id
           AND pr.project_id = $1
           AND rc.component_id = $2
           AND pr.status IN ('candidate', 'testing', 'approval_required')`,
        [projectId, componentId, git.commit, git.version, git.buildIdentifier]
      );
    });

    synchronized.push({
      component: definition.code,
      branch: git.branch,
      commit: git.commit,
      workingTree: git.dirtyFiles.length > 0 ? "dirty" : "clean",
      dirtyFiles: git.dirtyFiles.length,
      runtime,
      production: production.status,
      gitlab: gitlab.status,
      pipelines: gitlab.pipelines.length
    });
  }

  return { checkedAt, synchronized };
}
