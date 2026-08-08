"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  ExternalLink,
  MapPin,
  Search,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import {
  fetchFacilityRegistration,
  type FacilityRegistrationConfiguration,
} from "@/lib/services/facilityOnboardingService";
import type { FacilitySummary } from "@/lib/types";
import {
  buildFacilityGuide,
  generalResourceGuides,
  guideHref,
  resourceSearchText,
} from "@/components/resources/resourceCatalog";
import { matchesAnySearchQuery } from "@/lib/searchText";

type RegistrationMap = Record<string, FacilityRegistrationConfiguration | null>;

function GuideLink({
  title,
  description,
  href,
  external,
}: {
  title: string;
  description: string;
  href: string;
  external?: boolean;
}) {
  const content = (
    <>
      <span className="flex min-w-0 flex-1 items-start gap-3">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-slate-950">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span>
        </span>
      </span>
      {external ? <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" /> : <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />}
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-blue-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
      {content}
    </Link>
  );
}

function FacilityResourceSection({
  facility,
  registration,
  query,
}: {
  facility: FacilitySummary;
  registration?: FacilityRegistrationConfiguration | null;
  query: string;
}) {
  const guide = buildFacilityGuide(facility, registration);
  const facilityGuideMatches = matchesAnySearchQuery(resourceSearchText(guide), query);
  const guideLinks = [
    ...(facilityGuideMatches
      ? [{ title: guide.title, description: guide.description, href: guideHref({ facility: facility.id, task: "facility-start" }) }]
      : []),
    ...(registration?.registrationUrl && matchesAnySearchQuery("create account sign in register QR onboarding", query)
      ? [{ title: "Create or access your account", description: "Open the configured facility registration page and confirm facility access.", href: registration.registrationUrl, external: true }]
      : []),
    ...(facility.yards?.length && matchesAnySearchQuery(`${facility.name} yard area bay location`, query)
      ? [{ title: "Select the correct yard and bay", description: "Use the configured facility location options before completing an inspection.", href: guideHref({ facility: facility.id, task: "location-entry" }) }]
      : []),
    ...generalResourceGuides
      .filter((sharedGuide) => matchesAnySearchQuery(resourceSearchText(sharedGuide), query))
      .map((sharedGuide) => ({
        title: sharedGuide.title,
        description: `Shared product instructions to use at ${facility.name}.`,
        href: guideHref({ guide: sharedGuide.id, facility: facility.id }),
      })),
  ];

  if (!guideLinks.length) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white" aria-labelledby={`facility-${facility.id}`}>
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-slate-700" />
          <div className="min-w-0">
            <h2 id={`facility-${facility.id}`} className="truncate text-lg font-black tracking-tight text-slate-950">{facility.name}</h2>
            {facility.region ? <p className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><MapPin className="h-3.5 w-3.5" />{facility.region}</p> : null}
          </div>
        </div>
        <Link href={`/facilities?facility=${encodeURIComponent(facility.id)}`} className="inline-flex w-fit items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-900">
          Open facility settings <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {guideLinks.map((link) => <GuideLink key={link.title} {...link} />)}
      </div>
    </section>
  );
}

export default function ResourcesPage() {
  const { organizationId } = usePortalSession();
  const { data: directory, isLoading, error } = usePortalDirectorySnapshot();
  const facilities = useMemo(
    () => (directory?.facilities ?? []).slice().sort((left, right) => left.name.localeCompare(right.name)),
    [directory?.facilities],
  );
  const [query, setQuery] = useState("");
  const [registrations, setRegistrations] = useState<RegistrationMap>({});

  useEffect(() => {
    let active = true;
    if (!organizationId || !facilities.length) return () => { active = false; };
    void Promise.all(facilities.map(async (facility) => {
      try {
        return [facility.id, await fetchFacilityRegistration(organizationId, facility.id)] as const;
      } catch {
        return [facility.id, null] as const;
      }
    })).then((entries) => {
      if (active) setRegistrations(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [facilities, organizationId]);

  const visibleFacilities = facilities.filter((facility) => {
    const guide = buildFacilityGuide(facility, registrations[facility.id]);
    return matchesAnySearchQuery(
      `${facility.name} ${resourceSearchText(guide)} ${generalResourceGuides.map(resourceSearchText).join(" ")}`,
      query,
    );
  });
  const visibleGeneralGuides = generalResourceGuides.filter((guide) => matchesAnySearchQuery(resourceSearchText(guide), query));

  return (
    <div className="mx-auto w-full max-w-6xl space-y-7 pb-12">
      <PageTitle title="Resources & Training" subtitle="Step-by-step guides for using Inspection-Trac at each facility." />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <label htmlFor="resource-search" className="text-sm font-bold text-slate-950">Search resources</label>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="resource-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search login, VIN, scanner, damage, bay, report, export…"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="facilities-heading">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Facilities</p>
          <h2 id="facilities-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-950">Choose where you are working</h2>
        </div>
        {isLoading && !facilities.length ? <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading facilities…</div> : null}
        {error && !facilities.length ? <EmptyState title="Resources could not load" description={error instanceof Error ? error.message : "The facility directory is unavailable right now."} /> : null}
        {!isLoading && !error && !visibleFacilities.length ? <EmptyState title="No matching facilities or tasks" description="Try a different search term." /> : null}
        <div className="space-y-3">
          {visibleFacilities.map((facility) => (
            <FacilityResourceSection key={facility.id} facility={facility} registration={registrations[facility.id]} query={query} />
          ))}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="general-guides-heading">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">General guides</p>
          <h2 id="general-guides-heading" className="mt-1 text-2xl font-black tracking-tight text-slate-950">Shared product instructions</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {visibleGeneralGuides.map((guide) => (
            <GuideLink key={guide.id} title={guide.title} description={guide.description} href={guideHref({ guide: guide.id })} />
          ))}
        </div>
        {!visibleGeneralGuides.length && query ? <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No shared guides match this search.</p> : null}
      </section>
    </div>
  );
}
