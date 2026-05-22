import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
}

const toneClasses = {
  neutral: "border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] text-[color:var(--text-primary)]",
  warning: "border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] text-[color:var(--metric-warning-fg)]",
  danger: "border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] text-[color:var(--metric-danger-fg)]",
  success: "border-[color:var(--metric-positive-border)] bg-[color:var(--metric-positive-bg)] text-[color:var(--metric-positive-fg)]",
};

export function EmptyState({ title, description, action, icon, tone = "neutral" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed px-6 py-10 text-center shadow-sm ${toneClasses[tone]}`}>
      <div className="mb-5 flex items-center justify-center">
        {icon ? (
          icon
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-current/15 bg-[color:var(--surface-panel)]/70 text-current">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6" />
              <path d="m9 9 6 6" />
            </svg>
          </div>
        )}
      </div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 opacity-80">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
