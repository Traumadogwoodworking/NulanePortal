export interface MetricDatum {
  label: string;
  value: string;
  detail?: string;
}

export function MetricGrid({ metrics }: { metrics: MetricDatum[] }) {
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm">
          <dt className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</dt>
          <dd className="mt-2 text-2xl font-semibold text-white">{metric.value}</dd>
          {metric.detail && <p className="mt-1 text-xs text-slate-400">{metric.detail}</p>}
        </div>
      ))}
    </dl>
  );
}
