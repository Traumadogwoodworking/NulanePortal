"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { CirclePilotPayload } from "@lib/circle/types";
import type { ServicesOverviewPayload } from "@lib/services/types";

type Task = {
  id: string;
  public_id: string;
  project_code: string;
  project_name: string;
  title: string;
  description: string | null;
  status: string;
  priority: "P0" | "P1" | "P2" | "P3";
  owner: string;
  blocker: string | null;
  due_at: string | null;
  last_activity_at: string;
};

type TaskEvent = {
  id: string;
  public_id: string;
  event_type: string;
  actor_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

type Overview = {
  generatedAt: string;
  statusCounts: Record<string, number>;
  tasks: Task[];
  events: TaskEvent[];
  projects: Array<{ code: string; name: string; active: boolean }>;
  operatorPaired: boolean;
  operatorName: string | null;
  telegramConfigured: boolean;
  pendingNotifications: number;
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  interviewing: "Interviewing",
  ready: "Ready",
  working: "Working",
  verifying: "Verifying",
  approval_required: "Approval required",
  blocked: "Blocked",
  failed: "Failed",
  paused: "Paused",
  cancelled: "Cancelled",
  complete: "Complete"
};

const STATUS_TONES: Record<string, string> = {
  working: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  verifying: "border-violet-400/30 bg-violet-400/10 text-violet-200",
  ready: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  interviewing: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  approval_required: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  complete: "border-white/10 bg-white/5 text-slate-300"
};

function relativeTime(value: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 1000)
  );
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

function TaskCard({ task }: { task: Task }) {
  return (
    <Link
      href={`/tasks/${task.public_id}`}
      className="group block rounded-2xl border border-white/8 bg-[#11141b] p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/30 hover:bg-[#151922]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-semibold tracking-wide text-emerald-300">
            {task.public_id}
          </p>
          <h3 className="mt-2 font-semibold leading-snug text-white group-hover:text-emerald-50">
            {task.title}
          </h3>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] font-bold text-slate-300">
          {task.priority}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
            STATUS_TONES[task.status] ??
            "border-white/10 bg-white/5 text-slate-300"
          }`}
        >
          {STATUS_LABELS[task.status] ?? task.status}
        </span>
        <span className="text-xs text-slate-500">{task.project_name}</span>
        <span className="text-xs text-slate-600">·</span>
        <span className="text-xs text-slate-500">
          {relativeTime(task.last_activity_at)}
        </span>
      </div>
      {task.blocker ? (
        <p className="mt-3 line-clamp-2 border-l-2 border-rose-400/50 pl-3 text-sm leading-relaxed text-rose-100/80">
          {task.blocker}
        </p>
      ) : null}
    </Link>
  );
}

function TaskLane({
  title,
  description,
  tasks,
  empty
}: {
  title: string;
  description: string;
  tasks: Task[];
  empty: string;
}) {
  return (
    <section className="min-w-0">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
            {title}
          </h2>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-slate-400">
            {tasks.length}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      </div>
      <div className="space-y-3">
        {tasks.length ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="rounded-2xl border border-dashed border-white/8 p-5 text-sm text-slate-600">
            {empty}
          </div>
        )}
      </div>
    </section>
  );
}

function eventSummary(event: TaskEvent) {
  const payload = event.payload ?? {};
  if (event.event_type === "progress" && typeof payload.message === "string") {
    return payload.message;
  }
  if (event.event_type === "status_changed") {
    return `${String(payload.from)} → ${String(payload.to)}`;
  }
  if (event.event_type === "question_answered") {
    return `Answered ${String(payload.fieldKey ?? "project question")}`;
  }
  if (event.event_type === "blocked" && typeof payload.blocker === "string") {
    return payload.blocker;
  }
  return event.event_type.replaceAll("_", " ");
}

export function ControlDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [circle, setCircle] = useState<CirclePilotPayload | null>(null);
  const [services, setServices] = useState<ServicesOverviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [projectCode, setProjectCode] = useState("OPS");
  const [priority, setPriority] = useState("P2");
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [response, circleResponse, servicesResponse] = await Promise.all([
        fetch("/api/overview", { cache: "no-store" }),
        fetch("/api/circle", { cache: "no-store" }),
        fetch("/api/services", { cache: "no-store" })
      ]);
      if (!response.ok) {
        throw new Error(`Overview returned ${response.status}`);
      }
      setOverview((await response.json()) as Overview);
      if (circleResponse.ok) {
        setCircle((await circleResponse.json()) as CirclePilotPayload);
      }
      if (servicesResponse.ok) {
        setServices((await servicesResponse.json()) as ServicesOverviewPayload);
      }
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Control plane unavailable");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 8_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refresh]);

  const lanes = useMemo(() => {
    const tasks = overview?.tasks ?? [];
    return {
      active: tasks.filter((task) =>
        ["working", "verifying"].includes(task.status)
      ),
      waiting: tasks.filter((task) =>
        ["interviewing", "approval_required", "blocked"].includes(task.status)
      ),
      ready: tasks.filter((task) =>
        ["ready", "queued", "paused"].includes(task.status)
      ),
      complete: tasks.filter((task) => task.status === "complete").slice(0, 8)
    };
  }, [overview]);

  async function createFeature(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const taskResponse = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectCode,
          title: title.trim(),
          priority,
          owner: "shared",
          status: "interviewing"
        })
      });
      const payload = (await taskResponse.json()) as {
        task?: Task;
        error?: string;
      };
      if (!taskResponse.ok || !payload.task) {
        throw new Error(payload.error ?? "Task creation failed");
      }
      await fetch(`/api/tasks/${payload.task.public_id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startStandardInterview: true })
      });
      setTitle("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Task creation failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-9">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[#10131a] p-6 sm:p-8">
        <div className="absolute -right-24 -top-32 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.45fr_0.85fr]">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.26em] text-emerald-300">
              Durable work loop
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Know what is moving, what is blocked, and what needs you.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              PostgreSQL owns the work history. Telegram asks precise questions.
              Codex runs bounded jobs and reports evidence back here.
            </p>
          </div>
          <form
            onSubmit={createFeature}
            className="rounded-2xl border border-white/8 bg-black/20 p-4"
          >
            <p className="text-sm font-semibold text-white">
              Start a feature interview
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Creates one durable task and asks one question at a time.
            </p>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What are we starting?"
              className="mt-4 w-full rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select
                value={projectCode}
                onChange={(event) => setProjectCode(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-emerald-400/50"
              >
                {(overview?.projects ?? []).map((project) => (
                  <option key={project.code} value={project.code}>
                    {project.code} · {project.name}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
                className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-emerald-400/50"
              >
                <option value="P0">P0 · Critical</option>
                <option value="P1">P1 · High</option>
                <option value="P2">P2 · Normal</option>
                <option value="P3">P3 · Later</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="mt-3 w-full rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? "Creating…" : "Begin interview"}
            </button>
          </form>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {circle?.today ? (
        <section className="rounded-[1.75rem] border border-cyan-400/15 bg-cyan-400/5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Circle · Today&apos;s goal
              </p>
              <h2 className="mt-2 max-w-4xl text-xl font-semibold leading-relaxed text-white">
                {circle.today.goal}
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">
                {circle.today.progress_summary}
              </p>
            </div>
            <Link
              href="/admin/circle"
              className="shrink-0 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-cyan-950 hover:bg-cyan-200"
            >
              Open Circle pilot
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-black/15 p-3">
              <p className="text-xs text-slate-500">Next work</p>
              <p className="mt-1 text-sm text-slate-200">
                {circle.today.items.find((item) => item.status !== "complete")?.title ??
                  "Today plan complete"}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/15 p-3">
              <p className="text-xs text-slate-500">Needs Review</p>
              <p className="mt-1 text-xl font-semibold text-amber-100">
                {circle.needsReview.length}
              </p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/15 p-3">
              <p className="text-xs text-slate-500">Open notifications</p>
              <p className="mt-1 text-xl font-semibold text-rose-100">
                {circle.notifications.length}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {(() => {
        const inspectionApi = services?.monitors.find((monitor) => monitor.slug === "inspection-trac-api");
        if (!inspectionApi) return null;
        const state = inspectionApi.latest?.outcome ?? "unknown";
        const stateTone = state === "ready" ? "border-emerald-400/20 bg-emerald-400/5" : state === "degraded" ? "border-amber-400/25 bg-amber-400/5" : "border-rose-400/25 bg-rose-400/5";
        return <section className={`rounded-[1.75rem] border p-5 sm:p-6 ${stateTone}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">Inspection Trac · production API</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{state === "ready" ? "Ready" : state.replaceAll("_", " ")}</h2>
              <p className="mt-1 text-sm text-slate-400">HTTP {inspectionApi.latest?.http_status ?? "—"} · {inspectionApi.latest?.latency_ms ?? "—"}ms · {inspectionApi.latest?.summary ?? "No stored probe"}</p>
              <p className="mt-1 text-xs text-slate-500">24h observed: {inspectionApi.observedUptime24h == null ? "not sampled" : `${inspectionApi.observedUptime24h}% across ${inspectionApi.samples24h} samples`}</p>
            </div>
            <Link href="/admin/services/inspection-trac-api" className="shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20">Open API status</Link>
          </div>
        </section>;
      })()}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Event store",
            value: overview ? "PostgreSQL live" : "Connecting",
            detail: "Append-only task timeline",
            tone: "text-emerald-300"
          },
          {
            label: "Telegram",
            value: overview?.operatorPaired
              ? `Paired to ${overview.operatorName}`
              : overview?.telegramConfigured
                ? "Ready to pair"
                : "Secret required",
            detail: "One authorized operator",
            tone: overview?.operatorPaired
              ? "text-emerald-300"
              : "text-amber-200"
          },
          {
            label: "Awaiting you",
            value: String(lanes.waiting.length),
            detail: "Questions, approvals, blockers",
            tone: lanes.waiting.length ? "text-amber-200" : "text-slate-300"
          },
          {
            label: "Message outbox",
            value: String(overview?.pendingNotifications ?? 0),
            detail: "Pending or failed delivery",
            tone:
              (overview?.pendingNotifications ?? 0) > 0
                ? "text-rose-200"
                : "text-slate-300"
          }
        ].map((metric) => (
          <div
            key={metric.label}
            className="rounded-2xl border border-white/8 bg-[#10131a] p-4"
          >
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              {metric.label}
            </p>
            <p className={`mt-2 text-xl font-semibold ${metric.tone}`}>
              {metric.value}
            </p>
            <p className="mt-1 text-xs text-slate-600">{metric.detail}</p>
          </div>
        ))}
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-3">
        <TaskLane
          title="Active"
          description="A bounded work run is executing or being verified."
          tasks={lanes.active}
          empty="No task is actively working."
        />
        <TaskLane
          title="Awaiting Matthew"
          description="A precise answer, approval, or blocker resolution is required."
          tasks={lanes.waiting}
          empty="Nothing is waiting on you."
        />
        <TaskLane
          title="Ready"
          description="Defined work that can move forward without another decision."
          tasks={lanes.ready}
          empty="No ready work is queued."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
                Work timeline
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Append-only evidence of what actually happened.
              </p>
            </div>
            <span className="font-mono text-[10px] text-slate-600">
              {overview?.generatedAt
                ? `Updated ${relativeTime(overview.generatedAt)}`
                : "Connecting"}
            </span>
          </div>
          <div className="mt-5 divide-y divide-white/6">
            {(overview?.events ?? []).slice(0, 16).map((event) => (
              <div
                key={event.id}
                className="grid gap-1 py-3 sm:grid-cols-[84px_1fr_auto] sm:items-start sm:gap-4"
              >
                <Link
                  href={`/tasks/${event.public_id}`}
                  className="font-mono text-xs font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  {event.public_id}
                </Link>
                <div>
                  <p className="text-sm text-slate-300">
                    {eventSummary(event)}
                  </p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-600">
                    {event.actor_type} · {event.event_type.replaceAll("_", " ")}
                  </p>
                </div>
                <span className="text-xs text-slate-600">
                  {relativeTime(event.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <TaskLane
            title="Recently complete"
            description="Finished work remains visible with its evidence."
            tasks={lanes.complete}
            empty="No completed tasks yet."
          />
        </div>
      </section>
    </div>
  );
}
