"use client";

import type { ReactNode } from "react";

interface PortalStatusScreenProps {
  title: string;
  description: ReactNode;
  actions?: ReactNode;
}

export function PortalStatusScreen({ title, description, actions }: PortalStatusScreenProps) {
  return (
    <div className="flex h-full flex-1 items-center justify-center px-6 py-12 text-center">
      <div className="max-w-xl space-y-4 rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-8 shadow-lg shadow-black/30">
        <h1 className="text-xl font-semibold text-[color:var(--text-primary)]">{title}</h1>
        <p className="text-sm text-[color:var(--text-secondary)]">{description}</p>
        {actions ? <div className="mt-6 flex items-center justify-center gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}
