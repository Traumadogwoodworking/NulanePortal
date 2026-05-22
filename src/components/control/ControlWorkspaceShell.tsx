"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Command, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import { canAccessControlRoute, controlRoutes, getControlRouteByPath } from "@/lib/controlRoutes";
import { usePortalControlSnapshots } from "@/lib/portalData";
import { PortalStatusScreen } from "@/components/PortalStatusScreen";

function formatRoleLabel(isSuperAdmin: boolean, isOrgAdmin: boolean): string {
  if (isSuperAdmin) {
    return "super_admin";
  }
  if (isOrgAdmin) {
    return "org_admin";
  }
  return "Operator";
}

function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  const classes: Record<typeof tone, string> = {
    neutral: "bg-[color:var(--surface-panel-muted)] text-[color:var(--text-primary)] border-[color:var(--border-subtle)]",
    positive: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/25",
    danger: "bg-rose-500/15 text-rose-300 border-rose-500/25",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] ${classes[tone]}`}>
      {label}
    </span>
  );
}

function statusTone(status?: string, ready?: boolean): "neutral" | "positive" | "warning" | "danger" {
  if (ready) return "positive";
  const normalized = (status || "").toLowerCase();
  if (normalized.includes("ready") || normalized.includes("ok")) return "positive";
  if (normalized.includes("degrad") || normalized.includes("warn")) return "warning";
  if (normalized.includes("error") || normalized.includes("fail") || normalized.includes("not")) return "danger";
  return "neutral";
}

function connectionTone(status?: "real" | "mixed" | "mocked" | "placeholder" | "scaffold"): "neutral" | "positive" | "warning" | "danger" {
  switch (status) {
    case "real":
      return "positive";
    case "mixed":
      return "warning";
    case "mocked":
    case "placeholder":
    case "scaffold":
      return "neutral";
    default:
      return "neutral";
  }
}

function connectionLabel(status?: "real" | "mixed" | "mocked" | "placeholder" | "scaffold"): string {
  switch (status) {
    case "real":
      return "READY";
    case "mixed":
    case "mocked":
    case "placeholder":
    case "scaffold":
      return "WARNING";
    default:
      return "READY";
  }
}

function RouteRail({
  title,
  routes,
  pathname,
}: {
  title: string;
  routes: Array<(typeof controlRoutes)[number]>;
  pathname: string;
}) {
  if (!routes.length) {
    return null;
  }
  return (
    <div className="space-y-2 rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {routes.map((route) => {
          const active = pathname === route.href || pathname.startsWith(`${route.href}/`);
          return (
            <Link
              key={route.href}
              href={route.href}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.28em] transition ${
                active
                  ? "border-slate-300 bg-slate-100 text-slate-900 dark:text-slate-200"
                  : "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] text-[color:var(--text-secondary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel-muted)]"
              }`}
            >
              {route.label}
              <span className="rounded-full border border-current/20 px-2 py-0.5 text-[9px]">
                {connectionLabel(route.connectionStatus)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ControlWorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/control";
  const { session, user, isSuperAdmin, isOrgAdmin, isAdmin, selectedLocationLabel, hasPermission } = usePortalSession();
  const { data: controlSnapshot, mutate: refreshStatus, isLoading, error } = usePortalControlSnapshots();

  const activeRoute = useMemo(() => getControlRouteByPath(pathname), [pathname]);
  const visibleRoutes = useMemo(
    () => controlRoutes.filter((route) => !route.hideFromNav),
    []
  );
  const accessAllowed = useMemo(
    () =>
      canAccessControlRoute(activeRoute, {
        isAdmin,
        isOrgAdmin,
        isSuperAdmin,
        hasPermission,
      }),
    [activeRoute, hasPermission, isAdmin, isOrgAdmin, isSuperAdmin]
  );
  const roleLabel = formatRoleLabel(isSuperAdmin, isOrgAdmin);
  const organizationLabel =
    session?.organization?.name ||
    user?.display_name ||
    user?.email?.split("@")[0] ||
    "Control operator";

  const status = controlSnapshot?.status ?? null;
  const statusError = error instanceof Error ? error.message : error ? "Unable to load backend status." : null;
  const statusToneValue = statusTone(status?.status, status?.ready);
  const readyLabel = statusError ? "ERROR" : status?.ready ? "READY" : "WARNING";

  if (!accessAllowed) {
    return (
      <PortalStatusScreen
        title="Control plane access denied"
        description="Your current session does not satisfy the role or permission requirements for this control surface."
      />
    );
  }

  return (
    <div className="min-h-full bg-[color:var(--bg)] bg-[image:var(--bg-gradient)] text-[color:var(--text-primary)]">
      <div className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-4 md:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[2rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-overlay)] shadow-[0_32px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
          <div className="grid gap-5 border-b border-[color:var(--border-subtle)] px-5 py-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:px-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill label={readyLabel} tone={statusToneValue} />
                <StatusPill label={roleLabel} tone={isSuperAdmin ? "positive" : "neutral"} />
                <StatusPill label={organizationLabel} />
                {selectedLocationLabel ? <StatusPill label={selectedLocationLabel} /> : null}
                <StatusPill label={connectionLabel(activeRoute.connectionStatus)} tone={connectionTone(activeRoute.connectionStatus)} />
                {activeRoute.group ? <StatusPill label={activeRoute.group === "tenant-admin" ? "Tenant admin" : "Operations"} /> : null}
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-blue-600">
                  Control plane
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-blue-600 md:text-4xl">
                  {activeRoute.label}
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-[color:var(--text-secondary)] md:text-[15px]">
                  A dense control plane for tenant administration, operations, and system oversight without leaving the
                  current portal session.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {pathname !== "/control" && (
                  <Link
                    href="/control"
                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:bg-[color:var(--surface-panel-muted)]"
                  >
                    Open Hub Selector
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => void refreshStatus()}
                  className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel-muted)]"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh backend status
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 dark:text-slate-200">
                  <Command className="h-4 w-4" />
                  Keyboard-friendly route shell
                </div>
              </div>
              <div className="grid gap-4 pt-1 lg:grid-cols-2">
                <RouteRail title="Tenant admin" routes={visibleRoutes.filter((route) => route.group === "tenant-admin")} pathname={pathname} />
                <RouteRail title="Operations" routes={visibleRoutes.filter((route) => route.group === "operations")} pathname={pathname} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[color:var(--text-muted)]">
                    Service health
                  </p>
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
                  {status?.summary || statusError || "Checking"}
                </p>
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)]">
                  {status?.service || "backend"} · {status?.environment || "environment unknown"}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[color:var(--text-muted)]">
                    Last checked
                  </p>
                  <Sparkles className="h-4 w-4 text-slate-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">
                  {status?.lastCheckedAt ? new Date(status.lastCheckedAt).toLocaleTimeString() : "Pending"}
                </p>
                <p className="mt-2 text-xs leading-5 text-[color:var(--text-secondary)]">
                  {status?.failedDependencies.length
                    ? `${status.failedDependencies.length} failed dependency signal(s)`
                    : "No dependency failures surfaced"}
                </p>
              </div>
            </div>
          </div>

          <div className="flex px-4 py-4 lg:px-6">
            {pathname !== "/control" && (
              <Link
                href="/control"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                ← Back to Control Center
              </Link>
            )}
          </div>
        </header>

        {statusError ? (
          <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-[color:var(--text-primary)]">
            Live backend status could not be refreshed: {statusError}
          </div>
        ) : null}

        <main className="space-y-5">{children}</main>
      </div>
    </div>
  );
}
