interface StatusBadgeProps {
  label: string;
  tone?: "positive" | "warning" | "danger" | "neutral";
}

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  positive: "bg-emerald-50 text-emerald-900 border border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border border-amber-200",
  danger: "bg-rose-50 text-rose-900 border border-rose-200",
  neutral: "bg-[color:var(--metric-neutral-bg)] text-[color:var(--metric-neutral-fg)] border border-[color:var(--metric-neutral-border)]",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}
