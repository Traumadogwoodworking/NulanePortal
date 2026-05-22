import Link from "next/link";
import { SectionTitle } from "@components/ui/SectionTitle";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-start justify-center gap-6 px-6 py-12 text-white">
      <SectionTitle title="Control Console" description="Admin-only entry point for automation, registry, and observability surfaces." />
      <p className="text-lg text-slate-300">
        This standalone Next.js app surfaces the DocuDent control plane. Visit the command center to explore registry-driven surfaces.
      </p>
      <Link
        href="/admin/control"
        className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.4em] transition hover:border-white/40"
      >
        Enter command center
      </Link>
    </main>
  );
}
