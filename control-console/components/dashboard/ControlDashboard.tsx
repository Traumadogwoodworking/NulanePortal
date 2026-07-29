"use client";

import Link from "next/link";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  dueLabel,
  filterTodayTasks,
  getTodayCounts,
  LatestRequestGate,
  parseOverviewPayload,
  type TodayFilter,
  type TodayTask,
  type WorkOverview
} from "@lib/work/today";

const STATUS_LABELS: Record<string, string> = {
  queued: "Queued",
  interviewing: "Interviewing",
  ready: "Ready",
  working: "Working",
  verifying: "Verifying",
  approval_required: "Approval",
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
  queued: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  interviewing: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  approval_required: "border-amber-400/30 bg-amber-400/10 text-amber-100",
  blocked: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  failed: "border-rose-400/30 bg-rose-400/10 text-rose-100",
  complete: "border-white/10 bg-white/5 text-slate-300"
};

function relativeTime(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86_400)}d`;
}

function updatedLabel(value: string) {
  const age = relativeTime(value);
  return age === "now" ? "Updated now" : `Updated ${age} ago`;
}

function eventSummary(event: WorkOverview["events"][number]) {
  if (event.event_type === "progress" && typeof event.payload.message === "string") {
    return event.payload.message;
  }
  if (event.event_type === "status_changed") {
    return `${String(event.payload.from)} → ${String(event.payload.to)}`;
  }
  if (event.event_type === "question_answered") {
    return `Answered ${String(event.payload.fieldKey ?? "question")}`;
  }
  if (event.event_type === "blocked" && typeof event.payload.blocker === "string") {
    return event.payload.blocker;
  }
  return event.event_type.replaceAll("_", " ");
}

function payloadError(payload: unknown, fallback: string) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return fallback;
}

export function ControlDashboard() {
  const [overview, setOverview] = useState<WorkOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<TodayFilter>("open");
  const [title, setTitle] = useState("");
  const [projectCode, setProjectCode] = useState("OPS");
  const [priority, setPriority] = useState("P2");
  const [creating, setCreating] = useState(false);
  const requestGate = useRef(new LatestRequestGate());
  const activeRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    const requestId = requestGate.current.begin();
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setRefreshing(true);
    try {
      const response = await fetch("/api/overview", {
        cache: "no-store",
        signal: controller.signal
      });
      const rawPayload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          payloadError(rawPayload, `Overview returned ${response.status}`)
        );
      }
      const payload = parseOverviewPayload(rawPayload);
      if (!requestGate.current.isCurrent(requestId)) return;
      setOverview(payload);
      setError(null);
    } catch (cause) {
      if (!requestGate.current.isCurrent(requestId)) return;
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : "Control plane unavailable");
    } finally {
      if (requestGate.current.isCurrent(requestId)) setRefreshing(false);
      if (activeRequest.current === controller) activeRequest.current = null;
    }
  }, []);

  useEffect(() => {
    const gate = requestGate.current;
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
      gate.invalidate();
      activeRequest.current?.abort();
    };
  }, [refresh]);

  const operationalNow = overview?.generatedAt ?? new Date().toISOString();
  const counts = useMemo(() => {
    return getTodayCounts(overview?.tasks ?? [], operationalNow);
  }, [operationalNow, overview]);

  const visibleTasks = useMemo(() => {
    return filterTodayTasks(overview?.tasks ?? [], filter, operationalNow);
  }, [filter, operationalNow, overview]);

  async function createFeature(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectCode, title: title.trim(), priority, owner: "shared", status: "interviewing" })
      });
      const payload = (await response.json()) as { task?: TodayTask; error?: string };
      if (!response.ok || !payload.task) throw new Error(payload.error ?? "Task creation failed");
      const questionResponse = await fetch(`/api/tasks/${payload.task.public_id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startStandardInterview: true })
      });
      if (!questionResponse.ok) throw new Error("Task created, but interview initialization failed");
      setTitle("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Task creation failed");
    } finally {
      setCreating(false);
    }
  }

  const summary: Array<{ id: TodayFilter; label: string; value: number }> = [
    { id: "p0", label: "P0", value: counts.p0 },
    { id: "due", label: "Due today", value: counts.due },
    { id: "blocked", label: "Blocked", value: counts.blocked },
    { id: "approval", label: "Awaiting approval", value: counts.approval },
    { id: "evidence", label: "Missing evidence", value: counts.evidence },
    { id: "complete", label: "Completed today", value: counts.complete }
  ];

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-3 border-b border-white/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-300">Execution queue</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Today</h1>
          <p className="mt-1 text-sm text-slate-500">P0, blockers, decisions and missing evidence from PostgreSQL.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <Link href="/admin/inspection-trac" className="font-semibold text-cyan-200 hover:text-cyan-100">Inspection Trac operations</Link>
          <span>{overview ? updatedLabel(overview.generatedAt) : "Loading current work…"}</span>
          <button type="button" onClick={() => void refresh()} disabled={refreshing} className="rounded-lg border border-white/10 px-3 py-1.5 font-medium text-slate-300 hover:border-emerald-400/40 disabled:opacity-50">
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {error ? (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
          <span>Refresh failed. Showing the last successful data when available. {error}</span>
          <button type="button" onClick={() => void refresh()} className="font-semibold underline">Retry</button>
        </div>
      ) : null}

      <section aria-label="Actionable task counts" className="grid grid-cols-2 overflow-hidden rounded-xl border border-white/8 bg-[#10131a] sm:grid-cols-3 xl:grid-cols-6">
        {summary.map((item) => (
          <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`border-b border-r border-white/8 px-3 py-2.5 text-left transition hover:bg-white/5 ${filter === item.id ? "bg-emerald-400/10" : ""}`}>
            <span className={`text-xl font-semibold ${item.id === "blocked" && item.value ? "text-rose-200" : item.id === "p0" && item.value ? "text-amber-100" : "text-white"}`}>{item.value}</span>
            <span className="ml-2 text-[11px] text-slate-500">{item.label}</span>
          </button>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-white/8 bg-[#10131a]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-3 py-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setFilter("open")} aria-pressed={filter === "open"} className={`rounded-md px-2.5 py-1 text-xs font-medium ${filter === "open" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-200"}`}>Open {counts.open}</button>
            <span className="text-xs text-slate-600">Showing {visibleTasks.length}</span>
          </div>
          <details className="relative">
            <summary className="cursor-pointer list-none rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">New feature</summary>
            <form onSubmit={createFeature} className="absolute right-0 z-10 mt-2 w-[min(92vw,460px)] space-y-3 rounded-xl border border-white/10 bg-[#11141b] p-4 shadow-2xl">
              <label className="block text-xs text-slate-400">What are we starting?
                <input value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/50" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select value={projectCode} onChange={(event) => setProjectCode(event.target.value)} className="rounded-lg border border-white/10 bg-[#090b10] px-3 py-2 text-xs text-white">
                  {(overview?.projects ?? []).filter((project) => project.active).map((project) => <option key={project.code} value={project.code}>{project.code} · {project.name}</option>)}
                </select>
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="rounded-lg border border-white/10 bg-[#090b10] px-3 py-2 text-xs text-white">
                  <option value="P0">P0 · Critical</option><option value="P1">P1 · High</option><option value="P2">P2 · Normal</option><option value="P3">P3 · Later</option>
                </select>
              </div>
              <button type="submit" disabled={creating || !title.trim()} className="w-full rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40">{creating ? "Creating…" : "Begin interview"}</button>
            </form>
          </details>
        </div>

        {overview === null && !error ? <div className="p-6 text-sm text-slate-500">Loading the execution queue…</div> : null}
        {overview && visibleTasks.length === 0 ? <div className="p-6 text-sm text-slate-500">No tasks match this filter. Choose Open or another summary count.</div> : null}
        {visibleTasks.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-xs">
              <thead className="sticky top-[65px] z-10 bg-[#10131a] text-[10px] uppercase tracking-wider text-slate-500">
                <tr>{["Priority", "Task", "Product", "Owner", "Status", "Blocker or next action", "Due", "Evidence", "Updated"].map((label) => <th key={label} className="border-b border-white/8 px-3 py-2 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {visibleTasks.map((task) => (
                  <tr key={task.id} className={`${task.priority === "P0" ? "bg-amber-300/[0.025]" : ""} ${task.status === "blocked" ? "bg-rose-400/[0.035]" : ""} hover:bg-white/[0.035]`}>
                    <td className="px-3 py-2 align-top"><span className={`font-mono font-bold ${task.priority === "P0" ? "text-amber-200" : "text-slate-400"}`}>{task.priority}</span></td>
                    <td className="max-w-[270px] px-3 py-2 align-top"><Link href={`/tasks/${task.public_id}`} className="font-mono text-[10px] font-semibold text-emerald-300 hover:text-emerald-200">{task.public_id}</Link><Link href={`/tasks/${task.public_id}`} className="mt-0.5 block font-medium leading-snug text-slate-100 hover:text-white">{task.title}</Link></td>
                    <td className="px-3 py-2 align-top text-slate-400">{task.project_name}</td>
                    <td className="px-3 py-2 align-top capitalize text-slate-400">{task.owner}</td>
                    <td className="px-3 py-2 align-top"><span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${STATUS_TONES[task.status] ?? "border-white/10 bg-white/5 text-slate-300"}`}>{STATUS_LABELS[task.status] ?? task.status}</span></td>
                    <td className={`max-w-[360px] px-3 py-2 align-top leading-snug ${task.blocker ? "text-rose-100" : "text-slate-400"}`}><span className="line-clamp-2">{task.latest_action ?? "No next action recorded."}</span></td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-slate-400">{dueLabel(task.due_at, operationalNow)}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top">{task.verification_event_count ? <span className="text-emerald-300">{task.verification_event_count} recorded</span> : <span className="text-amber-200">Missing</span>}</td>
                    <td className="whitespace-nowrap px-3 py-2 align-top text-slate-500">{relativeTime(task.last_activity_at)} ago</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <details className="rounded-xl border border-white/8 bg-[#10131a]">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-300">Recent evidence timeline <span className="ml-2 text-xs font-normal text-slate-600">{overview?.events.length ?? 0} events loaded</span></summary>
        <div className="divide-y divide-white/6 border-t border-white/8">
          {(overview?.events ?? []).slice(0, 20).map((event) => (
            <div key={event.id} className="grid gap-1 px-4 py-2 text-xs sm:grid-cols-[72px_1fr_110px]">
              <Link href={`/tasks/${event.public_id}`} className="font-mono font-semibold text-emerald-300">{event.public_id}</Link>
              <span className="line-clamp-2 text-slate-300">{eventSummary(event)}</span>
              <span className="text-right text-slate-600">{event.actor_type} · {relativeTime(event.created_at)} ago</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
