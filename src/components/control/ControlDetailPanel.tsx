import type { ReactNode } from "react";

export interface ControlDetailField {
  label: string;
  value: ReactNode;
  helper?: string;
}

interface ControlDetailPanelProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  fields?: ControlDetailField[];
  afterFields?: ReactNode;
  footer?: ReactNode;
  emptyLabel?: string;
  emptyDescription?: string;
}

export function ControlDetailPanel({
  title,
  eyebrow,
  subtitle,
  fields = [],
  afterFields,
  footer,
  emptyLabel = "Select a record",
  emptyDescription = "Pick an item from the list to see traceable detail.",
}: ControlDetailPanelProps) {
  return (
    <aside className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-4 shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
      <div className="space-y-2 border-b border-[color:var(--border-subtle)] pb-3">
        {eyebrow ? (
          <p className="text-[10px] font-semibold uppercase tracking-[0.42em] text-[color:var(--brand)]">
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-xl font-semibold tracking-tight text-[color:var(--text-primary)]">{title}</h3>
        {subtitle ? <p className="text-sm leading-6 text-[color:var(--text-primary)]/88">{subtitle}</p> : null}
      </div>
      {fields.length ? (
        <dl className="space-y-2.5 py-3">
          {fields.map((field) => (
            <div key={field.label} className="rounded-[1.1rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[color:var(--text-primary)]/70">
                {field.label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-[color:var(--text-primary)]">{field.value}</dd>
              {field.helper ? <p className="mt-1 text-xs leading-5 text-[color:var(--text-primary)]/72">{field.helper}</p> : null}
            </div>
          ))}
        </dl>
      ) : (
        <div className="py-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">
            {emptyLabel}
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[color:var(--text-primary)]/80">{emptyDescription}</p>
        </div>
      )}
      {afterFields ? <div className="py-3">{afterFields}</div> : null}
      {footer ? <div className="border-t border-[color:var(--border-subtle)] pt-4">{footer}</div> : null}
    </aside>
  );
}
