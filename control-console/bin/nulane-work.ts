#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { closePool, ensureSchema } from "@lib/db";
import {
  addProgress,
  answerQuestion,
  attachRepository,
  createManualQuestion,
  createTask,
  getPendingQuestion,
  getTask,
  listTasks,
  setBlocker,
  startInterview,
  transitionTask
} from "@lib/work/task-service";
import type { TaskPriority } from "@lib/work/types";
import { syncCircleState } from "@lib/circle/sync";

const args = process.argv.slice(2);
const command = args.shift();

function option(name: string) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
}

function positional(index: number) {
  return args.filter((arg, argIndex) => {
    const previous = args[argIndex - 1];
    return !arg.startsWith("--") && !(previous?.startsWith("--"));
  })[index];
}

function usage() {
  console.log(`nulane-work commands:
  list
  status <TASK_ID>
  feature-init --project CIR --title "Feature title" --repo /absolute/repo/path [--scope "..."] [--priority P1]
  start <TASK_ID>
  progress <TASK_ID> --message "..."
  block <TASK_ID> --message "..."
  question <TASK_ID> --prompt "..." [--recommended "..."]
  answer <TASK_ID> --message "..."
  verify <TASK_ID> --test "..." --result "..."
  complete <TASK_ID> --evidence "..."
  pause <TASK_ID>
  sync-circle`);
}

function timestamp() {
  return new Date().toISOString();
}

async function appendFeatureRecord(input: {
  taskId: string;
  repositoryPath: string | null;
  fileName: string;
  heading: string;
  body: string;
}) {
  if (!input.repositoryPath) {
    return false;
  }
  const target = path.join(
    input.repositoryPath,
    "docs",
    "features",
    input.taskId,
    input.fileName
  );
  try {
    await fs.appendFile(
      target,
      `\n## ${input.heading}\n\n${input.body.trim()}\n`
    );
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

async function replaceFeatureSection(input: {
  taskId: string;
  repositoryPath: string | null;
  heading: string;
  body: string;
}) {
  if (!input.repositoryPath) {
    return false;
  }
  const target = path.join(
    input.repositoryPath,
    "docs",
    "features",
    input.taskId,
    "FEATURE.md"
  );
  try {
    const contents = await fs.readFile(target, "utf8");
    const headingLine = `## ${input.heading}`;
    const sectionStart = contents.indexOf(headingLine);
    if (sectionStart < 0) {
      return false;
    }
    const nextSection = contents.indexOf(
      "\n## ",
      sectionStart + headingLine.length
    );
    const prefix = contents.slice(0, sectionStart);
    const suffix =
      nextSection >= 0 ? contents.slice(nextSection + 1).trimStart() : "";
    const updated = `${prefix}${headingLine}\n\n${input.body.trim()}\n${
      suffix ? `\n${suffix}` : ""
    }`;
    await fs.writeFile(target, updated);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

function coreFeatureSection(fieldKey: string) {
  const sections: Record<string, string> = {
    outcome: "Outcome",
    current_behavior: "Current behavior",
    desired_behavior: "Desired behavior"
  };
  return sections[fieldKey] ?? null;
}

function requirementFile(fieldKey: string) {
  if (["acceptance_criteria", "definition_of_done"].includes(fieldKey)) {
    return "ACCEPTANCE.md";
  }
  if (fieldKey === "verification") {
    return "VERIFICATION.md";
  }
  if (fieldKey === "rollout_and_rollback") {
    return "PLAN.md";
  }
  return "FEATURE.md";
}

async function writeFeatureFiles(input: {
  taskId: string;
  title: string;
  repoPath: string;
  scope?: string;
}) {
  const featureDir = path.join(
    input.repoPath,
    "docs",
    "features",
    input.taskId
  );
  await fs.mkdir(featureDir, { recursive: true });

  const files: Record<string, string> = {
    "FEATURE.md": `# ${input.taskId}: ${input.title}

Status: interviewing
Owner: shared
Scope: ${input.scope ?? "To be confirmed during the interview"}

## Outcome

Pending interview.

## Current behavior

Pending interview.

## Desired behavior

Pending interview.
`,
    "INTERVIEW.md": `# ${input.taskId} Interview

Answers are authoritative requirements. Record one question and answer at a time.
`,
    "ACCEPTANCE.md": `# ${input.taskId} Acceptance Criteria

- [ ] Exact acceptance criteria captured from the completed interview.
- [ ] Failure and recovery behavior is explicit.
- [ ] Required roles, devices, data, and integrations are named.
`,
    "PLAN.md": `# ${input.taskId} Implementation Plan

Implementation must not begin until the interview and acceptance criteria are sufficiently complete.
`,
    "PROGRESS.md": `# ${input.taskId} Progress

Append dated progress checkpoints with files changed, tests, blocker, and next action.
`,
    "VERIFICATION.md": `# ${input.taskId} Verification

Record commands, test results, device/API/deployment evidence, remaining risks, and rollback source.
`
  };

  for (const [name, body] of Object.entries(files)) {
    const target = path.join(featureDir, name);
    try {
      await fs.writeFile(target, body, { flag: "wx" });
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !("code" in error) ||
        error.code !== "EEXIST"
      ) {
        throw error;
      }
    }
  }
  return featureDir;
}

async function main() {
  await ensureSchema();

  switch (command) {
    case "list": {
      for (const task of await listTasks()) {
        console.log(
          `${task.public_id}\t${task.priority}\t${task.status}\t${task.title}`
        );
      }
      break;
    }
    case "status": {
      const taskId = positional(0);
      if (!taskId) {
        throw new Error("status requires TASK_ID");
      }
      const task = await getTask(taskId);
      const question = await getPendingQuestion(taskId);
      console.log(JSON.stringify({ task, pendingQuestion: question }, null, 2));
      break;
    }
    case "feature-init": {
      const projectCode = option("project");
      const title = option("title");
      const requestedRepoPath = option("repo");
      if (!projectCode || !title || !requestedRepoPath) {
        throw new Error(
          "feature-init requires --project, --title, and --repo"
        );
      }
      const repoPath = await fs.realpath(requestedRepoPath);
      const repositoryStat = await fs.stat(repoPath);
      if (!repositoryStat.isDirectory()) {
        throw new Error(`${repoPath} is not a directory`);
      }
      const task = await createTask({
        projectCode,
        title,
        status: "interviewing",
        priority: (option("priority") as TaskPriority | undefined) ?? "P2",
        owner: "shared",
        allowedScope: option("scope")
      });
      if (!task) {
        throw new Error("Task creation failed");
      }
      await attachRepository({
        publicId: task.public_id,
        repositoryName: path.basename(repoPath),
        localPath: repoPath
      });
      const featureDir = await writeFeatureFiles({
        taskId: task.public_id,
        title,
        repoPath,
        scope: option("scope")
      });
      const question = await startInterview(task.public_id, "cli");
      console.log(
        JSON.stringify(
          {
            taskId: task.public_id,
            featureDir,
            firstQuestion: question?.prompt
          },
          null,
          2
        )
      );
      break;
    }
    case "start": {
      const taskId = positional(0);
      if (!taskId) {
        throw new Error("start requires TASK_ID");
      }
      console.log(
        JSON.stringify(
          await transitionTask(taskId, "working", "cli"),
          null,
          2
        )
      );
      break;
    }
    case "progress": {
      const taskId = positional(0);
      const message = option("message");
      if (!taskId || !message) {
        throw new Error("progress requires TASK_ID and --message");
      }
      const task = await addProgress(taskId, message, "cli");
      await appendFeatureRecord({
        taskId,
        repositoryPath: task.repository_path,
        fileName: "PROGRESS.md",
        heading: timestamp(),
        body: message
      });
      console.log(`${taskId} progress recorded`);
      break;
    }
    case "block": {
      const taskId = positional(0);
      const message = option("message");
      if (!taskId || !message) {
        throw new Error("block requires TASK_ID and --message");
      }
      const task = await setBlocker(taskId, message, "cli");
      await appendFeatureRecord({
        taskId,
        repositoryPath: task?.repository_path ?? null,
        fileName: "PROGRESS.md",
        heading: `${timestamp()} Blocker`,
        body: message
      });
      console.log(JSON.stringify(task, null, 2));
      break;
    }
    case "question": {
      const taskId = positional(0);
      const prompt = option("prompt");
      if (!taskId || !prompt) {
        throw new Error("question requires TASK_ID and --prompt");
      }
      console.log(
        JSON.stringify(
          await createManualQuestion({
            publicId: taskId,
            prompt,
            recommendedAnswer: option("recommended"),
            actorType: "cli"
          }),
          null,
          2
        )
      );
      break;
    }
    case "answer": {
      const taskId = positional(0);
      const message = option("message");
      if (!taskId || !message) {
        throw new Error("answer requires TASK_ID and --message");
      }
      const pending = await getPendingQuestion(taskId);
      if (!pending) {
        throw new Error(`Task ${taskId} has no pending question`);
      }
      const answered = await answerQuestion({
        publicId: taskId,
        answer: message,
        actorType: "cli"
      });
      const task = answered.task ?? (await getTask(taskId));
      await appendFeatureRecord({
        taskId,
        repositoryPath: task?.repository_path ?? null,
        fileName: "INTERVIEW.md",
        heading: `Question ${pending.sequence}: ${pending.field_key}`,
        body: `**Question:** ${pending.prompt}\n\n**Answer:** ${message}`
      });
      const featureSection = coreFeatureSection(pending.field_key);
      const replaced = featureSection
        ? await replaceFeatureSection({
            taskId,
            repositoryPath: task?.repository_path ?? null,
            heading: featureSection,
            body: message
          })
        : false;
      if (!replaced) {
        await appendFeatureRecord({
          taskId,
          repositoryPath: task?.repository_path ?? null,
          fileName: requirementFile(pending.field_key),
          heading: `${pending.field_key.replaceAll("_", " ")}`,
          body: message
        });
      }
      console.log(JSON.stringify(answered, null, 2));
      break;
    }
    case "verify": {
      const taskId = positional(0);
      const test = option("test");
      const result = option("result");
      if (!taskId || !test || !result) {
        throw new Error(
          "verify requires TASK_ID, --test, and --result"
        );
      }
      await transitionTask(taskId, "verifying", "cli", { test, result });
      const task = await addProgress(taskId, `Verification: ${test}`, "cli", {
        result
      });
      await appendFeatureRecord({
        taskId,
        repositoryPath: task.repository_path,
        fileName: "VERIFICATION.md",
        heading: `${timestamp()} ${test}`,
        body: result
      });
      console.log(`${taskId} verification recorded`);
      break;
    }
    case "complete": {
      const taskId = positional(0);
      const evidence = option("evidence");
      if (!taskId || !evidence) {
        throw new Error("complete requires TASK_ID and --evidence");
      }
      const task = await transitionTask(taskId, "complete", "cli", {
        evidence
      });
      await appendFeatureRecord({
        taskId,
        repositoryPath: task?.repository_path ?? null,
        fileName: "VERIFICATION.md",
        heading: `${timestamp()} Completion evidence`,
        body: evidence
      });
      console.log(JSON.stringify(task, null, 2));
      break;
    }
    case "pause": {
      const taskId = positional(0);
      if (!taskId) {
        throw new Error("pause requires TASK_ID");
      }
      console.log(
        JSON.stringify(
          await transitionTask(taskId, "paused", "cli"),
          null,
          2
        )
      );
      break;
    }
    case "sync-circle": {
      console.log(JSON.stringify(await syncCircleState(), null, 2));
      break;
    }
    default:
      usage();
      if (command) {
        process.exitCode = 1;
      }
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await closePool();
}
