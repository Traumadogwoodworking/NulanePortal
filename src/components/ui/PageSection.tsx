"use client";

import type { ReactNode } from "react";

interface PageSectionProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: string;
  children: ReactNode;
  variant?: "card" | "panel";
}

export function PageSection({ title, description, actions, children, badge, variant = "card" }: PageSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="mb-0.5 text-lg font-bold tracking-tight text-slate-950">
              {title}
            </h2>
            {badge && (
              <span className="rounded border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold leading-none text-slate-700">
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="max-w-3xl text-sm font-medium leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
      <div className={variant === "card" ? "space-y-3" : "rounded-2xl border border-slate-200/50 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"}>
        {children}
      </div>
    </section>
  );
}
