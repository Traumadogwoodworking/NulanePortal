export function JsonInspector({ data }: { data: unknown }) {
  if (data === undefined || data === null) {
    return <span className="text-slate-500 italic">null</span>;
  }

  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-4 overflow-auto max-h-96 custom-scrollbar">
      <pre className="text-xs font-mono text-slate-100/80 m-0">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
