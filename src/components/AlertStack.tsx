"use client";

import { NotificationSummary } from "@/lib/types";

const severityStyles: Record<NotificationSummary["severity"], string> = {
  info: "border-blue-500/40 bg-blue-500/5 text-blue-100",
  warning: "border-yellow-400/40 bg-yellow-500/10 text-yellow-100",
  danger: "border-red-500/10 bg-red-500/10 text-red-100",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
};

export function AlertStack({ alerts = [] }: { alerts?: NotificationSummary[] }) {
  if (alerts.length === 0) return null;
  
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--card)]/80 px-6 py-4">
      <div className="flex flex-col gap-3">
        {alerts.map((alert) => (
          <article
            key={alert.id}
            className={`rounded-2xl border p-3 text-sm shadow-sm ${severityStyles[alert.severity]}`}
          >
            <p className="font-semibold text-[var(--text-primary)]">{alert.title}</p>
            <p className="text-[var(--text-muted)]">{alert.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
