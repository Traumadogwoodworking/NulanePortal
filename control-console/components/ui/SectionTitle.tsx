export function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Control Console</p>
      <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
      {description && <p className="mt-2 text-base text-slate-300">{description}</p>}
    </div>
  );
}
