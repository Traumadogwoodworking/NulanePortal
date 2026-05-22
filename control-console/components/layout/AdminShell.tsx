import { registerDefaultSurfaces } from "@lib/registry/registerDefaultSurfaces";
import { controlSurfaceRegistry } from "@lib/registry/ControlSurfaceRegistry";
import Link from "next/link";

export function AdminShell({ children }: { children: React.ReactNode }) {
  registerDefaultSurfaces();
  const categories = controlSurfaceRegistry.getCategorySummaries();

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto flex max-w-6xl flex-col px-6 py-10">
        <header className="flex flex-col gap-3 border-b border-white/5 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Control Plane</p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">DocuDent Control Console</h1>
          </div>
          <Link
            href="/admin/control"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/30"
          >
            Refresh
          </Link>
        </header>

        <nav className="mt-6 grid gap-3 sm:grid-cols-3">
          {categories.map((category) => (
            <div key={category.category} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <p className="font-semibold text-white">{category.category}</p>
              <p className="text-xs text-slate-400">{category.count} surfaces</p>
            </div>
          ))}
        </nav>

        <div className="mt-10 flex flex-col gap-8">{children}</div>
      </div>
    </div>
  );
}
