export function RuntimeFreshnessBadge({ status, renderedAt }: { status?: string; renderedAt?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600">
      {status || "unknown"}
      {renderedAt ? <span className="ml-2 normal-case tracking-normal text-slate-400">{new Date(renderedAt).toLocaleString()}</span> : null}
    </span>
  );
}
