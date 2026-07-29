"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/control", label: "Today", match: "/admin/control" },
  { href: "/admin/circle", label: "Circle", match: "/admin/circle" },
  {
    href: "/admin/inspection-trac",
    label: "Inspection Trac",
    match: "/admin/inspection-trac"
  },
  {
    href: "/admin/services/docudent-api",
    label: "DocuDent",
    match: "/admin/services/docudent-api"
  },
  { href: "/admin/services", label: "Services", match: "/admin/services" }
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#080a0f] text-slate-100">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#080a0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-8">
          <Link href="/admin/control" className="group">
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-emerald-400">
              Nulane Systems
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-white group-hover:text-emerald-100">
              Work Control
            </p>
          </Link>
          <nav className="flex w-full flex-wrap items-center gap-2 text-sm sm:w-auto sm:justify-end">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/admin/services"
                  ? pathname === item.href
                  : pathname.startsWith(item.match);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full border px-4 py-2 font-medium transition hover:text-white ${
                    active
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                      : "border-transparent text-slate-400 hover:border-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
