import type { ReactNode } from "react";

interface ControlSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ControlSection({ title, description, actions, children }: ControlSectionProps) {
  return (
    <section className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-slate-700">
            {title}
          </p>
          {description ? <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}
