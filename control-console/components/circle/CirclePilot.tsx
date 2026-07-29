"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  CircleComponent,
  CirclePilotPayload,
  CircleQaItem
} from "@lib/circle/types";
import { QA_STATUSES, type CircleQaStatus } from "@lib/circle/catalog";

const QA_LABELS: Record<CircleQaStatus, string> = {
  not_started: "Not started",
  testing: "Testing",
  passed: "Passed",
  failed: "Failed",
  needs_review: "Needs review",
  blocked: "Blocked",
  retest_required: "Retest required"
};

const STATUS_TONES: Record<string, string> = {
  ready: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  passed: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  clean: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  available: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
  testing: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
  working: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
  needs_review: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  blocked: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  failed: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  degraded: "border-rose-400/25 bg-rose-400/10 text-rose-100",
  dirty: "border-amber-400/25 bg-amber-400/10 text-amber-100",
  retest_required: "border-violet-400/25 bg-violet-400/10 text-violet-100"
};

function StatusPill({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${
        STATUS_TONES[value] ?? "border-white/10 bg-white/5 text-slate-300"
      }`}
    >
      {label ?? value.replaceAll("_", " ")}
    </span>
  );
}

function shortSha(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "unverified";
}

function formatTime(value: string | null | undefined) {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function detailObject(component: CircleComponent) {
  return component.snapshot?.details ?? {};
}

function nestedString(
  value: Record<string, unknown>,
  key: string,
  nestedKey: string
) {
  const nested = value[key];
  if (!nested || typeof nested !== "object") return null;
  const result = (nested as Record<string, unknown>)[nestedKey];
  return typeof result === "string" ? result : null;
}

function ComponentCard({ component }: { component: CircleComponent }) {
  const snapshot = component.snapshot;
  const details = detailObject(component);
  const logExcerpt = nestedString(details, "runnerLog", "excerpt");
  const productionBody = nestedString(details, "production", "body");

  return (
    <article className="rounded-[1.5rem] border border-white/8 bg-[#10131a] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
            {component.component_type}
          </p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {component.name}
          </h3>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {component.gitlab_project_path}
          </p>
        </div>
        <StatusPill
          value={snapshot?.working_tree_state ?? "unknown"}
          label={
            snapshot?.working_tree_state === "dirty"
              ? `${snapshot.dirty_file_count} changed`
              : snapshot?.working_tree_state
          }
        />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
        <div>
          <dt className="text-xs text-slate-600">Branch</dt>
          <dd className="mt-1 truncate font-mono text-slate-300">
            {snapshot?.branch ?? component.authoritative_branch ?? "unavailable"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Commit</dt>
          <dd className="mt-1 font-mono text-slate-300">
            {shortSha(snapshot?.commit_sha)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Local runner</dt>
          <dd className="mt-1">
            <StatusPill value={snapshot?.local_runtime_status ?? "unknown"} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Production</dt>
          <dd className="mt-1">
            <StatusPill value={snapshot?.production_status ?? "unknown"} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Version / build</dt>
          <dd className="mt-1 text-slate-300">
            {snapshot?.version
              ? `${snapshot.version}${snapshot.build_identifier ? ` +${snapshot.build_identifier}` : ""}`
              : "Not declared"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-600">Latest pipeline</dt>
          <dd className="mt-1">
            <StatusPill value={snapshot?.pipeline_status ?? "unavailable"} />
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-xl border border-white/6 bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Deployment truth
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Deployed commit:{" "}
          <span className="font-mono">
            {shortSha(snapshot?.deployed_commit)}
          </span>
        </p>
        <p className="mt-1 text-xs text-slate-600">
          Checked {formatTime(snapshot?.checked_at)}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        {component.gitlab_web_url ? (
          <a
            href={component.gitlab_web_url}
            className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:border-emerald-400/40 hover:text-white"
          >
            GitLab project
          </a>
        ) : null}
        {component.production_url ? (
          <a
            href={component.production_url}
            className="rounded-lg border border-white/10 px-3 py-2 text-slate-300 hover:border-emerald-400/40 hover:text-white"
          >
            Production probe
          </a>
        ) : null}
      </div>

      {logExcerpt || productionBody ? (
        <details className="mt-4 rounded-xl border border-white/6 bg-black/20 p-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-400">
            Recent runtime evidence
          </summary>
          {productionBody ? (
            <pre className="mt-3 max-h-28 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-emerald-100/70">
              {productionBody}
            </pre>
          ) : null}
          {logExcerpt ? (
            <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all border-t border-white/6 pt-3 font-mono text-[10px] leading-relaxed text-slate-500">
              {logExcerpt}
            </pre>
          ) : null}
        </details>
      ) : null}
    </article>
  );
}

function EvidenceForm({
  item,
  onSaved,
  onCancel
}: {
  item: CircleQaItem;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [evidenceType, setEvidenceType] = useState("manual_qa");
  const [tester, setTester] = useState("matthew");
  const [buildDevice, setBuildDevice] = useState("");
  const [loadVin, setLoadVin] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const [reportPath, setReportPath] = useState("");
  const [screenshotPath, setScreenshotPath] = useState("");
  const [backendRecord, setBackendRecord] = useState("");
  const [portalState, setPortalState] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!summary.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/circle/qa/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceType,
          summary: summary.trim(),
          tester: tester.trim() || undefined,
          buildDevice: buildDevice.trim() || undefined,
          loadVin: loadVin.trim() || undefined,
          correlationId: correlationId.trim() || undefined,
          reportPath: reportPath.trim() || undefined,
          screenshotPath: screenshotPath.trim() || undefined,
          backendRecord: backendRecord.trim() || undefined,
          portalState: portalState.trim() || undefined,
          notes: notes.trim() || undefined
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Evidence failed");
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Evidence failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
            Evidence for {item.title}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Record what was actually proven; status remains a separate decision.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-white"
        >
          Cancel
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <select
          value={evidenceType}
          onChange={(event) => setEvidenceType(event.target.value)}
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-slate-300"
        >
          <option value="manual_qa">Manual QA</option>
          <option value="automated_test">Automated test</option>
          <option value="device_test">Device test</option>
          <option value="backend_record">Backend record</option>
          <option value="portal_state">Portal state</option>
          <option value="release">Release/deployment</option>
        </select>
        <input
          value={tester}
          onChange={(event) => setTester(event.target.value)}
          placeholder="Tester"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
        />
        <input
          value={buildDevice}
          onChange={(event) => setBuildDevice(event.target.value)}
          placeholder="Build / device"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
        />
        <input
          value={loadVin}
          onChange={(event) => setLoadVin(event.target.value)}
          placeholder="Load / VIN"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
        />
        <input
          value={correlationId}
          onChange={(event) => setCorrelationId(event.target.value)}
          placeholder="Correlation ID"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
        />
        <input
          value={reportPath}
          onChange={(event) => setReportPath(event.target.value)}
          placeholder="PDF / report path or URL"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
        />
        <input
          value={screenshotPath}
          onChange={(event) => setScreenshotPath(event.target.value)}
          placeholder="Screenshot path or URL"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
        />
        <input
          value={backendRecord}
          onChange={(event) => setBackendRecord(event.target.value)}
          placeholder="Backend record"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
        />
        <input
          value={portalState}
          onChange={(event) => setPortalState(event.target.value)}
          placeholder="Portal state"
          className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white sm:col-span-2"
        />
      </div>
      <textarea
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        rows={3}
        placeholder="Required: concise proof summary"
        className="mt-3 w-full rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
      />
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={2}
        placeholder="Optional notes"
        className="mt-3 w-full rounded-xl border border-white/10 bg-[#090b10] px-3 py-2.5 text-sm text-white"
      />
      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      <button
        type="submit"
        disabled={saving || !summary.trim()}
        className="mt-3 rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 disabled:opacity-40"
      >
        {saving ? "Saving…" : "Attach evidence"}
      </button>
    </form>
  );
}

export function CirclePilot() {
  const [data, setData] = useState<CirclePilotPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [evidenceItemId, setEvidenceItemId] = useState<string | null>(null);
  const [historySource, setHistorySource] = useState("all");

  const refresh = useCallback(async () => {
    const response = await fetch("/api/circle", { cache: "no-store" });
    const payload = (await response.json()) as CirclePilotPayload & {
      error?: string;
    };
    if (!response.ok) {
      throw new Error(payload.error ?? "Circle pilot unavailable");
    }
    setData(payload);
    setError(null);
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh().catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Circle unavailable")
      );
    }, 0);
    return () => window.clearTimeout(initial);
  }, [refresh]);

  async function updateQa(item: CircleQaItem, status: CircleQaStatus) {
    setSavingId(item.id);
    try {
      const response = await fetch(`/api/circle/qa/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          updatedBy: "matthew",
          blocker: status === "blocked" ? "Needs blocker details" : null
        })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "QA update failed");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "QA update failed");
    } finally {
      setSavingId(null);
    }
  }

  async function updatePlan(itemId: string, status: string) {
    setSavingId(itemId);
    try {
      const response = await fetch(`/api/circle/plan/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Plan update failed");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Plan update failed");
    } finally {
      setSavingId(null);
    }
  }

  const filteredHistory = useMemo(
    () =>
      (data?.history ?? []).filter(
        (event) => historySource === "all" || event.source === historySource
      ),
    [data, historySource]
  );

  if (!data && !error) {
    return <p className="text-slate-500">Loading Circle control plane…</p>;
  }
  if (!data) {
    return (
      <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-rose-100">
        {error}
      </div>
    );
  }

  const qaPassed = data.qaItems.filter((item) => item.status === "passed").length;
  const openMinutes =
    data.today?.items
      .filter((item) => item.status !== "complete")
      .reduce((sum, item) => sum + (item.estimated_minutes ?? 0), 0) ?? 0;

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-[#10131a] p-6 sm:p-8">
        <div className="absolute -right-16 -top-28 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.26em] text-cyan-300">
              Pilot product · synchronized evidence
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Circle
            </h1>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-400">
              Mobile, API/load engine, and portal/dispatch tracked as one
              coordinated release and QA surface.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-white">{data.components.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Components</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-amber-200">{data.needsReview.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Needs review</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-center">
              <p className="text-2xl font-semibold text-emerald-200">{qaPassed}/{data.qaItems.length}</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">QA passed</p>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                Today
              </p>
              <h2 className="mt-2 max-w-4xl text-xl font-semibold leading-relaxed text-emerald-100">
                {data.today?.goal ?? "No Circle plan is registered."}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {data.today?.progress_summary}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-right">
              <p className="text-2xl font-semibold text-emerald-200">
                {(openMinutes / 60).toFixed(1)}h
              </p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">
                Remaining estimate
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {(data.today?.items ?? []).map((item) => (
              <div
                key={item.id}
                className="grid gap-3 rounded-xl border border-white/7 bg-black/15 p-3 sm:grid-cols-[32px_1fr_auto] sm:items-center"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 font-mono text-xs text-slate-500">
                  {item.sequence}
                </div>
                <div>
                  <p className={item.status === "complete" ? "text-slate-600 line-through" : "text-sm text-slate-200"}>
                    {item.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {item.estimated_minutes}m · {item.dependency_note}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={savingId === item.id}
                    onClick={() => void updatePlan(item.id, item.status === "working" ? "planned" : "working")}
                    className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-40"
                  >
                    {item.status === "working" ? "Pause" : "Start"}
                  </button>
                  <button
                    disabled={savingId === item.id}
                    onClick={() => void updatePlan(item.id, item.status === "complete" ? "planned" : "complete")}
                    className="rounded-lg border border-emerald-400/20 px-2.5 py-1.5 text-xs text-emerald-200 disabled:opacity-40"
                  >
                    {item.status === "complete" ? "Reopen" : "Done"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
            Notifications
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Durable in-dashboard review and evidence gaps.
          </p>
          <div className="mt-4 space-y-3">
            {data.notifications.map((notification) => (
              <a
                key={notification.id}
                href={notification.action_url ?? "#"}
                className={`block rounded-xl border p-3 ${
                  notification.severity === "critical"
                    ? "border-rose-400/20 bg-rose-400/7"
                    : "border-amber-400/15 bg-amber-400/5"
                }`}
              >
                <p className="text-sm font-semibold text-slate-100">
                  {notification.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  {notification.body}
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="circle-components">
        <div className="mb-4">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
            Product components
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Latest host synchronization; unavailable deployment evidence remains explicit.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {data.components.map((component) => (
            <ComponentCard key={component.id} component={component} />
          ))}
        </div>
      </section>

      <section
        id="release"
        data-testid="circle-release"
        className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
              Cross-repository release
            </p>
            <p className="mt-1 text-xs text-slate-600">
              One manifest ties mobile, API, portal, migrations, tenant, and rollback truth together.
            </p>
          </div>
          {data.releases[0] ? <StatusPill value={data.releases[0].status} /> : null}
        </div>
        {data.releases[0] ? (
          <div className="mt-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/7 bg-black/15 p-3">
                <p className="text-xs text-slate-600">Release</p>
                <p className="mt-1 font-mono text-sm text-emerald-200">{data.releases[0].release_key}</p>
              </div>
              <div className="rounded-xl border border-white/7 bg-black/15 p-3">
                <p className="text-xs text-slate-600">Environment</p>
                <p className="mt-1 text-sm text-slate-200">{data.releases[0].environment}</p>
              </div>
              <div className="rounded-xl border border-white/7 bg-black/15 p-3">
                <p className="text-xs text-slate-600">Test tenant</p>
                <p className="mt-1 text-sm text-slate-200">{data.releases[0].test_tenant ?? "Unverified"}</p>
              </div>
              <div className="rounded-xl border border-white/7 bg-black/15 p-3">
                <p className="text-xs text-slate-600">Last known good</p>
                <p className="mt-1 text-sm text-amber-100">{data.releases[0].last_known_good_release ?? "Not established"}</p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-white/8 text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="py-3 pr-4">Component</th>
                    <th className="py-3 pr-4">Commit</th>
                    <th className="py-3 pr-4">Version/build</th>
                    <th className="py-3 pr-4">Deployment</th>
                    <th className="py-3">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {data.releases[0].components.map((component) => (
                    <tr key={component.component_code}>
                      <td className="py-3 pr-4 font-medium text-white">{component.component_name}</td>
                      <td className="py-3 pr-4 font-mono text-slate-300">{shortSha(component.commit_sha)}</td>
                      <td className="py-3 pr-4 text-slate-400">
                        {component.version ?? "—"}{component.build_identifier ? ` +${component.build_identifier}` : ""}
                      </td>
                      <td className="py-3 pr-4 text-amber-100">{component.deployment_identifier ?? "Unverified"}</td>
                      <td className="py-3"><StatusPill value={component.verification_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-500">{data.releases[0].notes}</p>
          </div>
        ) : (
          <p className="mt-4 text-slate-500">No Circle release manifest exists.</p>
        )}
      </section>

      <section id="qa" className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
              QA matrix
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Status and evidence are separate so automated coverage cannot impersonate field proof.
            </p>
          </div>
          <p className="text-sm text-slate-400">
            {qaPassed} passed · {data.needsReview.length} need attention
          </p>
        </div>
        <div className="mt-5 divide-y divide-white/7">
          {data.qaItems.map((item) => (
            <div
              key={item.id}
              data-testid={`qa-item-${item.slug}`}
              className="py-4"
            >
              <div className="grid gap-3 lg:grid-cols-[1.2fr_180px_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-white">{item.title}</h3>
                    <span className="text-xs text-slate-600">{item.component_name}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {item.evidence.length} evidence record{item.evidence.length === 1 ? "" : "s"}
                    {item.last_tested_at ? ` · tested ${formatTime(item.last_tested_at)}` : ""}
                  </p>
                  {item.blocker ? <p className="mt-1 text-xs text-rose-200">{item.blocker}</p> : null}
                </div>
                <select
                  aria-label={`${item.title} status`}
                  value={item.status}
                  disabled={savingId === item.id}
                  onChange={(event) => void updateQa(item, event.target.value as CircleQaStatus)}
                  className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2 text-sm text-slate-200 disabled:opacity-40"
                >
                  {QA_STATUSES.map((status) => (
                    <option key={status} value={status}>{QA_LABELS[status]}</option>
                  ))}
                </select>
                <button
                  onClick={() => setEvidenceItemId(evidenceItemId === item.id ? null : item.id)}
                  className="rounded-xl border border-emerald-400/20 px-3 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/5"
                >
                  Add evidence
                </button>
              </div>
              {item.evidence.length ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                    Show evidence
                  </summary>
                  <div className="mt-3 grid gap-2 lg:grid-cols-2">
                    {item.evidence.map((evidence) => (
                      <div key={evidence.id} className="rounded-xl border border-white/7 bg-black/15 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                            {evidence.evidence_type.replaceAll("_", " ")}
                          </p>
                          <p className="text-[10px] text-slate-600">{formatTime(evidence.captured_at)}</p>
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-slate-300">{evidence.summary}</p>
                        <p className="mt-2 text-xs text-slate-600">
                          {[evidence.tester, evidence.build_device, evidence.load_vin, evidence.correlation_id]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
              {evidenceItemId === item.id ? (
                <EvidenceForm
                  item={item}
                  onCancel={() => setEvidenceItemId(null)}
                  onSaved={async () => {
                    setEvidenceItemId(null);
                    await refresh();
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-[1.75rem] border border-amber-400/15 bg-amber-400/5 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-100">
            Needs Review
          </p>
          <p className="mt-1 text-xs text-amber-100/50">
            Failed, blocked, retest, and explicit reviewer decisions.
          </p>
          <div className="mt-4 space-y-3">
            {data.needsReview.length ? data.needsReview.map((item) => (
              <a key={item.id} href="#qa" className="block rounded-xl border border-amber-300/10 bg-black/15 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-amber-50">{item.title}</p>
                  <StatusPill value={item.status} />
                </div>
                <p className="mt-1 text-xs text-amber-50/40">
                  {item.component_name} · {item.evidence.length} evidence records
                </p>
              </a>
            )) : <p className="text-sm text-slate-500">Nothing currently needs review.</p>}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/8 bg-[#10131a] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white">
                GitLab and runtime history
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Indexed metadata links to GitLab and preserves runtime/log evidence summaries.
              </p>
            </div>
            <select
              value={historySource}
              onChange={(event) => setHistorySource(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#090b10] px-3 py-2 text-xs text-slate-300"
            >
              <option value="all">All sources</option>
              <option value="git">Git commits</option>
              <option value="gitlab">GitLab pipelines</option>
              <option value="runtime">Runtime</option>
              <option value="work-control">Work Control</option>
            </select>
          </div>
          <div className="mt-4 max-h-[560px] divide-y divide-white/6 overflow-auto">
            {filteredHistory.slice(0, 50).map((event) => (
              <div key={event.id} className="grid gap-2 py-3 sm:grid-cols-[88px_1fr_auto] sm:items-start">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-300">{event.component_code ?? "circle"}</p>
                  <p className="mt-1 text-[10px] text-slate-600">{event.source}</p>
                </div>
                <div>
                  {event.url ? (
                    <a href={event.url} className="text-sm text-slate-200 hover:text-emerald-100">{event.title}</a>
                  ) : (
                    <p className="text-sm text-slate-200">{event.title}</p>
                  )}
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-600">{event.event_type.replaceAll("_", " ")}</p>
                </div>
                <p className="text-xs text-slate-600">{formatTime(event.occurred_at)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
