import Link from "next/link";
import { BarChart3, Boxes, Clock3, Hammer } from "lucide-react";

const navItems = [
  { href: "/analytics", label: "Dashboards", icon: BarChart3 },
  { href: "/analytics/home-inspection-overview", label: "Reference", icon: Boxes },
  { href: "/analytics/builder", label: "Builder", icon: Hammer },
  { href: "/analytics/runs", label: "Runs", icon: Clock3 },
];

export function DashboardRuntimeShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Analytics Runtime</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">{subtitle}</p> : null}
          </div>
          <nav className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black uppercase tracking-[0.16em] text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
