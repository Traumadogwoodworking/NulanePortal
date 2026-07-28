"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

type TaskDetailPayload = {
  task: {
    public_id: string;
    project_name: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    owner: string;
    blocker: string | null;
    allowed_scope: string | null;
    created_at: string;
    updated_at: string;
  };
  questions: Array<{
    id: string;
    sequence: number;
    field_key: string;
    prompt: string;
    recommended_answer: string | null;
    status: string;
    answer: string | null;
  }>;
  events: Array<{
    id: string;
    event_type: string;
    actor_type: string;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
  pendingQuestion: {
    id: string;
    sequence: number;
    prompt: string;
    recommended_answer: string | null;
  } | null;
};

function detail(event: TaskDetailPayload["events"][number]) {
  if (typeof event.payload.message === "string") return event.payload.message;
  if (event.event_type === "status_changed") {
    return `${String(event.payload.from)} → ${String(event.payload.to)}`;
  }
  if (event.event_type === "question_answered") {
    return `Answered ${String(event.payload.fieldKey ?? "question")}`;
  }
  return event.event_type.replaceAll("_", " ");
}

export function TaskDetail({ taskId }: { taskId: string }) {
  const [data, setData] = useState<TaskDetailPayload | null>(null);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as TaskDetailPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Task unavailable");
      }
      setData(payload);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Task unavailable");
    }
  }, [taskId]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  async function submitAnswer(event: FormEvent) {
    event.preventDefault();
    if (!answer.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answer.trim() })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Answer failed");
      setAnswer("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Answer failed");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Update failed");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-rose-100">
        {error}
      </div>
    );
  }
  if (!data) {
    return <p className="text-slate-500">Loading task…</p>;
  }

  return (
    <div className="space-y-7">
      <Link
        href="/admin/control"
        className="text-sm font-medium text-emerald-300 hover:text-emerald-200"
      >
        ← Back to Today
      </Link>

      <section className="rounded-[2rem] border border-white/8 bg-[#10131a] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-sm font-semibold text-emerald-300">
              {data.task.public_id}
            </p>
            <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {data.task.title}
            </h1>
            <p className="mt-3 text-sm text-slate-400">
              {data.task.project_name} · {data.task.priority} ·{" "}
              {data.task.owner}
            </p>
          </div>
          <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-slate-200">
            {data.task.status.replaceAll("_", " ")}
          </span>
        </div>
        {data.task.description ? (
          <p className="mt-6 max-w-3xl leading-relaxed text-slate-300">
            {data.task.description}
          </p>
        ) : null}
        {data.task.allowed_scope ? (
          <div className="mt-5 rounded-xl border border-white/8 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Allowed scope
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {data.task.allowed_scope}
            </p>
          </div>
        ) : null}
        {data.task.blocker ? (
          <div className="mt-5 rounded-xl border border-rose-400/25 bg-rose-400/8 p-4 text-sm leading-relaxed text-rose-100">
            <strong>Blocked:</strong> {data.task.blocker}
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            disabled={saving}
            onClick={() => void changeStatus("working")}
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40"
          >
            Start work
          </button>
          <button
            disabled={saving}
            onClick={() => void changeStatus("paused")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-40"
          >
            Pause
          </button>
          <button
            disabled={saving}
            onClick={() => void changeStatus("verifying")}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 disabled:opacity-40"
          >
            Begin verification
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Feature interview
          </p>
          <p className="mt-1 text-xs text-slate-600">
            One answer at a time. These answers become the feature contract.
          </p>

          {data.pendingQuestion ? (
            <form onSubmit={submitAnswer} className="mt-5">
              <p className="font-mono text-xs text-emerald-300">
                Question {data.pendingQuestion.sequence}
              </p>
              <h2 className="mt-2 text-xl font-semibold leading-relaxed text-white">
                {data.pendingQuestion.prompt}
              </h2>
              {data.pendingQuestion.recommended_answer ? (
                <div className="mt-4 rounded-xl border border-amber-300/15 bg-amber-300/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-100/60">
                    Recommended starting point
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-amber-50/80">
                    {data.pendingQuestion.recommended_answer}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setAnswer(data.pendingQuestion?.recommended_answer ?? "")
                    }
                    className="mt-3 text-xs font-semibold text-amber-200 hover:text-amber-100"
                  >
                    Use recommendation
                  </button>
                </div>
              ) : null}
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                rows={5}
                placeholder="Your answer…"
                className="mt-4 w-full resize-y rounded-xl border border-white/10 bg-[#090b10] px-3 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
              />
              <button
                type="submit"
                disabled={saving || !answer.trim()}
                className="mt-3 rounded-xl bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-emerald-950 disabled:opacity-40"
              >
                Save and ask next
              </button>
            </form>
          ) : (
            <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-100">
              No unanswered interview question.
            </div>
          )}

          <div className="mt-7 space-y-3">
            {data.questions
              .filter((question) => question.status === "answered")
              .map((question) => (
                <details
                  key={question.id}
                  className="rounded-xl border border-white/8 bg-black/15 p-4"
                >
                  <summary className="cursor-pointer text-sm font-medium text-slate-300">
                    {question.sequence}. {question.prompt}
                  </summary>
                  <p className="mt-3 border-l-2 border-emerald-400/40 pl-3 text-sm leading-relaxed text-slate-400">
                    {question.answer}
                  </p>
                </details>
              ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Evidence timeline
          </p>
          <div className="mt-5 space-y-5 border-l border-white/10 pl-5">
            {data.events.map((event) => (
              <div key={event.id} className="relative">
                <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-[#10131a]" />
                <p className="text-sm leading-relaxed text-slate-300">
                  {detail(event)}
                </p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-600">
                  {event.actor_type} ·{" "}
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
