import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";

export function ErrorPanel({ 
  error, 
  title = "Unable to load data",
  action,
}: { 
  error: string | Error; 
  title?: string;
  action?: ReactNode;
}) {
  if (!error) return null;

  return (
    <div className="flex gap-3 rounded-[1rem] border border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] p-4 text-[color:var(--metric-danger-fg)]">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <h3 className="mb-1 text-sm font-semibold tracking-tight">
          {title}
        </h3>
        <p className="break-words text-sm leading-relaxed opacity-85">
          Something went wrong. Please retry.
        </p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
