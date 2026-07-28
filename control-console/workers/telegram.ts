import { Bot, InlineKeyboard } from "grammy";
import { closePool, ensureSchema, query } from "@lib/db";
import {
  answerQuestion,
  createTask,
  getOverview,
  getPendingQuestion,
  getTask,
  listTasks,
  startInterview,
  transitionTask
} from "@lib/work/task-service";
import {
  getActiveTaskPublicId,
  getOperatorByTelegramId,
  pairOwner,
  setActiveTask
} from "@lib/work/operators";
import { FEATURE_INTERVIEW } from "@lib/work/interview";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (process.env.TELEGRAM_ENABLED !== "true") {
  throw new Error("TELEGRAM_ENABLED must be true to start the Telegram adapter");
}
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

await ensureSchema();
const bot = new Bot(token);

function displayName(ctx: {
  from?: { first_name: string; last_name?: string };
}) {
  return [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ") || "Matthew";
}

async function authorize(userId?: number) {
  if (!userId) {
    return null;
  }
  return getOperatorByTelegramId(userId);
}

function formatTask(task: Awaited<ReturnType<typeof getTask>>) {
  if (!task) {
    return "Task not found.";
  }
  const lines = [
    `${task.public_id} · ${task.priority} · ${task.status}`,
    task.title,
    `Owner: ${task.owner}`,
    task.blocker ? `Blocked: ${task.blocker}` : null,
    task.due_at ? `Due: ${new Date(task.due_at).toLocaleString()}` : null
  ];
  return lines.filter(Boolean).join("\n");
}

function questionKeyboard(question: {
  id: string;
  task_id: string;
  recommended_answer: string | null;
}) {
  const keyboard = new InlineKeyboard();
  if (question.recommended_answer) {
    keyboard.text("Accept recommendation", `accept:${question.id}`).row();
  }
  keyboard.text("Pause task", `pause:${question.task_id}`);
  return keyboard;
}

async function sendQuestion(
  chatId: number,
  publicId: string,
  question: Awaited<ReturnType<typeof getPendingQuestion>>
) {
  if (!question) {
    await bot.api.sendMessage(
      chatId,
      `${publicId} has no unanswered interview question.`
    );
    return;
  }
  const total = FEATURE_INTERVIEW.length;
  const recommendation = question.recommended_answer
    ? `\n\nRecommended starting point:\n${question.recommended_answer}`
    : "";
  const sent = await bot.api.sendMessage(
    chatId,
    `${publicId} · Question ${question.sequence}/${Math.max(total, question.sequence)}\n\n${question.prompt}${recommendation}`,
    { reply_markup: questionKeyboard(question) }
  );
  await query(
    `UPDATE questions SET telegram_message_id = $2 WHERE id = $1`,
    [question.id, sent.message_id]
  );
}

async function requireOperator(ctx: {
  from?: { id: number };
  reply: (text: string) => Promise<unknown>;
}) {
  const operator = await authorize(ctx.from?.id);
  if (!operator) {
    await ctx.reply("This private Nulane work channel is not authorized.");
    return null;
  }
  return operator;
}

bot.command("start", async (ctx) => {
  const existing = await authorize(ctx.from?.id);
  if (existing) {
    await ctx.reply("Nulane Work Control is connected. Use /today or /new.");
    return;
  }
  const pairingCode = ctx.match?.trim();
  if (!pairingCode) {
    await ctx.reply("Pairing code required.");
    return;
  }
  if (!ctx.from) {
    await ctx.reply("Telegram user identity is required.");
    return;
  }
  try {
    await pairOwner({
      telegramUserId: ctx.from.id,
      telegramChatId: ctx.chat.id,
      displayName: displayName(ctx),
      pairingCode
    });
    await ctx.reply(
      "Paired. This bot now accepts commands only from your Telegram account."
    );
  } catch {
    await ctx.reply("Pairing was rejected.");
  }
});

bot.command("help", async (ctx) => {
  if (!(await requireOperator(ctx))) {
    return;
  }
  await ctx.reply(
    [
      "/today — current active work",
      "/status [TASK-ID] — select and inspect a task",
      "/projects — available project codes",
      "/blockers — blocked or approval-required work",
      "/new <title> — create a task and begin its interview",
      "/continue [TASK-ID] — resume the next question",
      "/pause [TASK-ID] — pause work",
      "/approve [TASK-ID] — approve and return work to ready",
      "/reject — reject the selected task"
    ].join("\n")
  );
});

bot.command("today", async (ctx) => {
  if (!(await requireOperator(ctx))) {
    return;
  }
  const overview = await getOverview();
  const active = overview.tasks
    .filter((task) => !["complete", "cancelled"].includes(task.status))
    .slice(0, 6);
  const body = active.length
    ? active.map((task) => formatTask(task)).join("\n\n")
    : "No active tasks.";
  await ctx.reply(`Today\n\n${body}`);
});

bot.command("status", async (ctx) => {
  const operator = await requireOperator(ctx);
  if (!operator) {
    return;
  }
  const requested =
    ctx.match?.trim().toUpperCase() ||
    (await getActiveTaskPublicId(operator.id));
  if (!requested) {
    await ctx.reply("No active task. Use /status OPS-001 or /new.");
    return;
  }
  await setActiveTask(operator.id, requested);
  await ctx.reply(formatTask(await getTask(requested)));
});

bot.command("projects", async (ctx) => {
  if (!(await requireOperator(ctx))) {
    return;
  }
  const result = await query<{ code: string; name: string }>(
    `SELECT code, name FROM projects WHERE active = true ORDER BY code`
  );
  await ctx.reply(
    result.rows.map((project) => `${project.code} · ${project.name}`).join("\n")
  );
});

bot.command("blockers", async (ctx) => {
  if (!(await requireOperator(ctx))) {
    return;
  }
  const blocked = (await listTasks()).filter(
    (task) => task.status === "blocked" || task.status === "approval_required"
  );
  await ctx.reply(
    blocked.length
      ? blocked.map((task) => formatTask(task)).join("\n\n")
      : "No blocked or approval-required tasks."
  );
});

bot.command("new", async (ctx) => {
  const operator = await requireOperator(ctx);
  if (!operator) {
    return;
  }
  const title = ctx.match?.trim();
  if (!title) {
    await ctx.reply("Use /new followed by a short feature or task title.");
    return;
  }
  const task = await createTask({
    projectCode: "OPS",
    title,
    status: "interviewing",
    owner: "shared"
  });
  if (!task) {
    throw new Error("Task creation did not return a task");
  }
  await setActiveTask(operator.id, task.public_id);
  const question = await startInterview(task.public_id, "telegram");
  await ctx.reply(`Created ${task.public_id}: ${task.title}`);
  await sendQuestion(ctx.chat.id, task.public_id, question);
});

bot.command("continue", async (ctx) => {
  const operator = await requireOperator(ctx);
  if (!operator) {
    return;
  }
  const publicId =
    ctx.match?.trim().toUpperCase() ||
    (await getActiveTaskPublicId(operator.id));
  if (!publicId) {
    await ctx.reply("No task selected.");
    return;
  }
  await setActiveTask(operator.id, publicId);
  const pending = await getPendingQuestion(publicId);
  if (pending) {
    await sendQuestion(ctx.chat.id, publicId, pending);
    return;
  }
  const task = await transitionTask(publicId, "ready", "telegram", {
    requestedBy: operator.display_name
  });
  await ctx.reply(`${task?.public_id} is ready for the next bounded work run.`);
});

bot.command("pause", async (ctx) => {
  const operator = await requireOperator(ctx);
  if (!operator) {
    return;
  }
  const publicId =
    ctx.match?.trim().toUpperCase() ||
    (await getActiveTaskPublicId(operator.id));
  if (!publicId) {
    await ctx.reply("No task selected.");
    return;
  }
  await transitionTask(publicId, "paused", "telegram");
  await ctx.reply(`${publicId} is paused.`);
});

bot.command("approve", async (ctx) => {
  const operator = await requireOperator(ctx);
  if (!operator) {
    return;
  }
  const publicId =
    ctx.match?.trim().toUpperCase() ||
    (await getActiveTaskPublicId(operator.id));
  if (!publicId) {
    await ctx.reply("No task selected.");
    return;
  }
  await transitionTask(publicId, "ready", "telegram", {
    approval: "approved",
    approvedBy: operator.display_name
  });
  await ctx.reply(`${publicId} approved and ready.`);
});

bot.command("reject", async (ctx) => {
  const operator = await requireOperator(ctx);
  if (!operator) {
    return;
  }
  const publicId = await getActiveTaskPublicId(operator.id);
  if (!publicId) {
    await ctx.reply("No task selected.");
    return;
  }
  await transitionTask(publicId, "paused", "telegram", {
    approval: "rejected",
    rejectedBy: operator.display_name
  });
  await ctx.reply(`${publicId} rejected and paused.`);
});

bot.callbackQuery(/^accept:(.+)$/, async (ctx) => {
  const operator = await authorize(ctx.from.id);
  if (!operator) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  const questionId = ctx.match[1];
  const result = await query<{
    public_id: string;
    recommended_answer: string | null;
  }>(
    `SELECT t.public_id, q.recommended_answer
     FROM questions q
     JOIN tasks t ON t.id = q.task_id
     WHERE q.id = $1 AND q.status = 'pending'`,
    [questionId]
  );
  const item = result.rows[0];
  if (!item?.recommended_answer) {
    await ctx.answerCallbackQuery({ text: "Recommendation is unavailable" });
    return;
  }
  const answered = await answerQuestion({
    publicId: item.public_id,
    answer: item.recommended_answer,
    operatorId: operator.id,
    actorType: "telegram"
  });
  await ctx.answerCallbackQuery({ text: "Recommendation accepted" });
  await ctx.editMessageReplyMarkup();
  if (answered.nextQuestion) {
    if (!operator.telegram_chat_id) {
      throw new Error("Paired operator has no Telegram chat ID");
    }
    await sendQuestion(
      Number(operator.telegram_chat_id),
      item.public_id,
      answered.nextQuestion
    );
  } else {
    await ctx.reply(`${item.public_id} interview complete. The task is ready.`);
  }
});

bot.callbackQuery(/^pause:(.+)$/, async (ctx) => {
  const operator = await authorize(ctx.from.id);
  if (!operator) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  const taskResult = await query<{ public_id: string }>(
    `SELECT public_id FROM tasks WHERE id = $1`,
    [ctx.match[1]]
  );
  const publicId = taskResult.rows[0]?.public_id;
  if (!publicId) {
    await ctx.answerCallbackQuery({ text: "Task not found" });
    return;
  }
  await transitionTask(publicId, "paused", "telegram");
  await ctx.answerCallbackQuery({ text: `${publicId} paused` });
  await ctx.editMessageReplyMarkup();
});

bot.callbackQuery(/^status:(.+)$/, async (ctx) => {
  const operator = await authorize(ctx.from.id);
  if (!operator) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  const publicId = ctx.match[1].toUpperCase();
  await setActiveTask(operator.id, publicId);
  await ctx.answerCallbackQuery();
  await ctx.reply(formatTask(await getTask(publicId)));
  const pending = await getPendingQuestion(publicId);
  if (pending && operator.telegram_chat_id) {
    await sendQuestion(Number(operator.telegram_chat_id), publicId, pending);
  }
});

bot.callbackQuery(/^pause-public:(.+)$/, async (ctx) => {
  if (!(await authorize(ctx.from.id))) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  const publicId = ctx.match[1].toUpperCase();
  await transitionTask(publicId, "paused", "telegram");
  await ctx.answerCallbackQuery({ text: `${publicId} paused` });
  await ctx.editMessageReplyMarkup();
});

bot.on("message:text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) {
    return;
  }
  const operator = await requireOperator(ctx);
  if (!operator) {
    return;
  }
  const publicId = await getActiveTaskPublicId(operator.id);
  if (!publicId) {
    await ctx.reply("No active task. Start one with /new.");
    return;
  }
  const pending = await getPendingQuestion(publicId);
  if (!pending) {
    await ctx.reply(
      `${publicId} has no pending question. Use /continue, /pause, or /new.`
    );
    return;
  }
  const result = await answerQuestion({
    publicId,
    answer: ctx.message.text.trim(),
    operatorId: operator.id,
    actorType: "telegram"
  });
  if (result.nextQuestion) {
    await sendQuestion(ctx.chat.id, publicId, result.nextQuestion);
  } else {
    await ctx.reply(`${publicId} interview complete. The task is ready.`);
  }
});

bot.catch((error) => {
  console.error("Telegram adapter error", error.error);
});

process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
process.once("beforeExit", async () => closePool());

console.log("Nulane Work Telegram adapter starting");
await bot.start({
  allowed_updates: ["message", "callback_query"],
  onStart: ({ username }) => {
    console.log(`Telegram adapter connected as @${username}`);
  }
});
