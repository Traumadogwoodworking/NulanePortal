"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, Headset, Home, Settings } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";

const actions = [
  {
    href: "/reports/damage",
    label: "Damage Submissions",
    description: "Review submitted damage reports and supporting media.",
    icon: FileText,
  },
  {
    href: "/support",
    label: "Support Tickets",
    description: "Open a support request for the Nulane Systems team.",
    icon: Headset,
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Review your account and DocuDent workspace.",
    icon: Settings,
  },
];

export default function HomePage() {
  const { user } = usePortalSession();
  const firstName = user?.display_name?.split(/\s+/)[0] || user?.first_name || "there";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#163c85] bg-[#0d2c71] px-6 py-8 text-white shadow-[0_28px_80px_-45px_rgba(4,14,40,0.8)] sm:px-9 sm:py-10">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#49b6ff]/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-blue-200">
              <Home className="h-4 w-4" />
              Nulane Systems workspace
            </div>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Welcome, {firstName}.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-blue-100 sm:text-lg">
              Review DocuDent damage submissions, request support, and manage your workspace from one authenticated portal.
            </p>
            <Link
              href="/reports/damage"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-[#0d2c71] shadow-lg transition hover:-translate-y-0.5"
            >
              Open Damage Submissions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-[2rem] border border-white/20 bg-white p-5 shadow-2xl">
            <Image
              src="/media/Docudent.png"
              alt="DocuDent"
              width={220}
              height={220}
              className="h-full w-full object-contain"
              priority
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="workspace-actions-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#2563eb]">DocuDent operations</p>
            <h2 id="workspace-actions-title" className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Your workspace
            </h2>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">
            Authenticated
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#0d2c71]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-black text-slate-950">{action.label}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-[#2563eb]">
                  Open
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
