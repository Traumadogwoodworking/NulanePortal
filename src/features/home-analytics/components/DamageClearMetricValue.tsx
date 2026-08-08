"use client";

function formatMetricNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Number.isFinite(value) ? value : 0);
}

export function DamageClearMetricValue({
  damageCount,
  clearCount,
}: {
  damageCount: number;
  clearCount: number;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-700">Damage</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{formatMetricNumber(damageCount)}</p>
      </div>
      <span className="h-10 w-px bg-slate-200" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Clear</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{formatMetricNumber(clearCount)}</p>
      </div>
    </div>
  );
}
