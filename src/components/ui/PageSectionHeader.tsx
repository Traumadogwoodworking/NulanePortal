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
          <h3 className="text-base font-extrabold uppercase tracking-[0.24em] text-slate-900">
            {title}
          </h3>
          {badge && (
            <span className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-700 uppercase tracking-widest">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="max-w-2xl text-sm font-semibold uppercase tracking-[0.18em] text-slate-700">
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
