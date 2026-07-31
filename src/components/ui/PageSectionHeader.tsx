"use client";

import type { ReactNode } from "react";

interface PageSectionHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  badge?: string;
}

export function PageSectionHeader({ title, description, actions, badge }: PageSectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100/60 pb-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-bold tracking-tight text-slate-950">
            {title}
          </h3>
          {badge && (
            <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="max-w-2xl text-sm font-medium leading-6 text-slate-600">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
