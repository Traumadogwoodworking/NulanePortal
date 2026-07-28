import Link from "next/link";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#080a0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <Link href="/admin/control" className="group">
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-emerald-400">
              Nulane Systems
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-white group-hover:text-emerald-100">
              Work Control
            </p>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/admin/control"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-medium text-slate-200 transition hover:border-emerald-400/50 hover:text-white"
            >
              Today
            </Link>
            <a
              href="/api/health"
              className="rounded-full px-3 py-2 text-slate-400 transition hover:text-white"
            >
              Health
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
