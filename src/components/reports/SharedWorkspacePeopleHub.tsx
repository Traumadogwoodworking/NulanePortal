"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, LockKeyhole, UsersRound } from "lucide-react";
import {
  fetchSharedWorkspacePeople,
  type SharedWorkspacePeopleResponse,
} from "@/lib/services/sharedWorkspaceService";

type SharedWorkspacePeopleHubProps = {
  productLabel: string;
  privateWorkspaceHref?: string;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "P";
}

export function SharedWorkspacePeopleHub({
  productLabel,
  privateWorkspaceHref = "/support",
}: SharedWorkspacePeopleHubProps) {
  const [payload, setPayload] = useState<SharedWorkspacePeopleResponse | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchSharedWorkspacePeople()
      .then((nextPayload) => {
        if (active) setPayload(nextPayload);
      })
      .catch(() => {
        // Customer workspaces and deployments with the shared-workspace gate
        // disabled intentionally have no people surface.
        if (active) setPayload(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const people = payload?.people ?? [];
  const visiblePeople = expanded ? people : people.slice(0, 2);

  if (!payload?.shared_workspace || people.length === 0) return null;

  const total = Math.max(payload.total, people.length);
  const hasMore = people.length > 2;

  return (
    <section
      aria-label={`People using ${productLabel}`}
      className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6"
    >
      <div className="grid gap-x-5 gap-y-4 xl:grid-cols-[minmax(230px,0.75fr)_minmax(420px,1.5fr)_auto] xl:items-center">
        <div className="flex min-w-0 items-start gap-3 xl:col-start-1 xl:row-start-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--brand)] text-white shadow-sm">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="whitespace-nowrap text-sm font-extrabold text-slate-950">People using {productLabel}</h2>
            <span className="block text-xs font-bold text-slate-500">{total} {total === 1 ? "person" : "people"}</span>
            <p className="mt-0.5 text-xs font-medium leading-5 text-slate-600 xl:hidden 2xl:block">
              People contributing damage submissions in this shared system.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 xl:col-start-2 xl:row-start-1 xl:grid-cols-2 2xl:grid-cols-4">
          {visiblePeople.map((person) => (
            <div
              key={person.person_id}
              className="flex min-w-0 items-center gap-2.5"
            >
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-light)] text-xs font-black text-[color:var(--brand)] ring-1 ring-[color:color-mix(in_srgb,var(--brand)_22%,transparent)]">
                {initials(person.display_name)}
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-bold text-slate-900">{person.display_name}</span>
                  {person.is_current_user ? (
                    <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-blue-800">You</span>
                  ) : null}
                </span>
                {person.masked_email ? (
                  <span className="block truncate text-xs font-medium text-slate-500">{person.masked_email}</span>
                ) : null}
              </span>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 xl:col-start-3 xl:row-start-1 xl:justify-end">
          {hasMore ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              {expanded ? "Show less" : `View all ${total}`}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          ) : null}
          <Link
            href={privateWorkspaceHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-[color:var(--brand)] transition hover:bg-[color:var(--brand-light)]"
          >
            <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
            Private workspace
          </Link>
        </div>
      </div>
    </section>
  );
}
