import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export const PORTAL_URL = "/home";

export function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <Image src="/media/Docudent.png" alt="DocuDent" width={48} height={48} />
          <div>
            <p className="text-sm font-black text-slate-950">DocuDent</p>
            <p className="text-xs font-semibold text-slate-500">Nulane Systems</p>
          </div>
        </div>
        <Link
          href={PORTAL_URL}
          className="rounded-xl bg-[#0d2c71] px-4 py-2 text-sm font-black text-white no-underline"
        >
          Open portal
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs font-semibold text-slate-500">
        <span>© {new Date().getFullYear()} Nulane Systems.</span>
        <div className="flex gap-4">
          <Link href="/privacy/">Privacy</Link>
          <Link href="/terms/">Terms</Link>
        </div>
      </div>
    </footer>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#2563eb]">
      {children}
    </p>
  );
}
