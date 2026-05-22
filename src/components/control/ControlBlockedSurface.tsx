import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface ControlBlockedSurfaceProps {
  title: string;
  description: string;
  blockers: string[];
  liveNotes?: string[];
  nextLinks?: Array<{ href: string; label: string }>;
}

export function ControlBlockedSurface({
  title,
  description,
  blockers,
  liveNotes = [],
  nextLinks = [],
}: ControlBlockedSurfaceProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-5 shadow-[0_20px_48px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-3 border-b border-[color:var(--border-subtle)] pb-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">
              Blocked surface
            </p>
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text-primary)]">{title}</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[color:var(--text-primary)]/86">{description}</p>
        <div className="mt-5 rounded-[1.25rem] border border-amber-400/20 bg-amber-500/10 p-4 text-sm text-[color:var(--text-primary)]">
          The backend does not currently expose the read/write surface required for full control-plane parity.
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {liveNotes.map((note) => (
            <div key={note} className="rounded-[1.25rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">
                Live signal
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-primary)]">{note}</p>
            </div>
          ))}
        </div>
      </div>

      <aside className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-5 shadow-[0_20px_48px_rgba(0,0,0,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]/72">
          Current blockers
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--text-primary)]/86">
          {blockers.map((blocker) => (
            <li key={blocker} className="rounded-[1.2rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-3">
              {blocker}
            </li>
          ))}
        </ul>
        {nextLinks.length ? (
          <div className="mt-6 space-y-2">
            {nextLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-slate-300 hover:bg-[color:var(--surface-panel)]"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ) : null}
      </aside>
    </section>
  );
}
