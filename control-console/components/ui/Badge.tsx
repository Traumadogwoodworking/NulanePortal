export type BadgeTone = "accent" | "success" | "warning" | "muted";

const toneMap: Record<BadgeTone, string> = {
  accent: "bg-control-500 text-white",
  success: "bg-emerald-500/80 text-emerald-950",
  warning: "bg-amber-500/80 text-slate-900",
  muted: "bg-white/10 text-slate-200"
};

export function Badge({ tone = "muted", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold tracking-wide uppercase ${toneMap[tone]}`}>
      {children}
    </span>
  );
}
