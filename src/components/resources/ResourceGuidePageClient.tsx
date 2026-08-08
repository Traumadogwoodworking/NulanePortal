"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, LifeBuoy, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { formatFacilityDisplayName } from "@/lib/facilityDisplay";
import { usePortalSession } from "@/lib/portalSession";
import { fetchFacilityRegistration, type FacilityRegistrationConfiguration } from "@/lib/services/facilityOnboardingService";
import { useSearchParams } from "next/navigation";
import type { FacilitySummary } from "@/lib/types";
import {
  buildFacilityGuide,
  findGeneralGuide,
  generalResourceGuides,
  guideHref,
  type ResourceGuideDefinition,
} from "@/components/resources/resourceCatalog";

function GuideSection({ title, steps }: { title: string; steps: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-black tracking-tight text-slate-950">{title}</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={`${title}-${step}`} className="flex gap-3 text-sm leading-6 text-slate-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function GuideView({ guide }: { guide: ResourceGuideDefinition }) {
  return (
    <article className="space-y-5">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">{guide.facilityName ? "Facility guide" : guide.audience === "portal" ? "Portal guide" : "Shared guide"}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{guide.title}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{guide.description}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {guide.facilityName ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"><MapPin className="h-3.5 w-3.5" />{guide.facilityName}</span> : null}
          {guide.registrationUrl ? <a href={guide.registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">Open account access <ExternalLink className="h-3.5 w-3.5" /></a> : null}
        </div>
      </header>
      {guide.sections.map((section) => <GuideSection key={section.title} {...section} />)}
      <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <p className="text-sm leading-6 text-slate-700">Need help with access, a workflow, or a report?</p>
        </div>
        <Link href="/support" className="inline-flex w-fit items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Open Support Tickets</Link>
      </div>
    </article>
  );
}

export default function ResourceGuidePageClient() {
  const params = useSearchParams();
  const guideId = params.get("guide");
  const facilityId = params.get("facility");
  const task = params.get("task");
  const { organizationId } = usePortalSession();
  const { data: directory, isLoading } = usePortalDirectorySnapshot();
  const [registration, setRegistration] = useState<FacilityRegistrationConfiguration | null>(null);
  const facility = useMemo<FacilitySummary | null>(
    () => directory?.facilities.find((item) => item.id === facilityId) ?? null,
    [directory?.facilities, facilityId],
  );

  useEffect(() => {
    let active = true;
    if (!organizationId || !facilityId) return () => { active = false; };
    void fetchFacilityRegistration(organizationId, facilityId).then((value) => {
      if (active) setRegistration(value);
    }).catch(() => {
      if (active) setRegistration(null);
    });
    return () => { active = false; };
  }, [facilityId, organizationId]);

  const generalGuide = guideId ? findGeneralGuide(guideId) : null;
  const guide = generalGuide && facility
    ? { ...generalGuide, facilityId: facility.id, facilityName: formatFacilityDisplayName(facility.name), registrationUrl: registration?.registrationUrl, support: registration?.support }
    : generalGuide || (facility ? buildFacilityGuide(facility, registration) : null);

  if (isLoading && !guide) {
    return <main className="mx-auto max-w-4xl p-6 text-sm text-slate-500">Loading guide…</main>;
  }

  if (!guide) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-6">
        <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><ArrowLeft className="h-4 w-4" />Back to Resources & Training</Link>
        <EmptyState title="Guide not found" description="Choose a facility or shared guide from Resources & Training." />
      </main>
    );
  }

  const selectedGuide = task === "location-entry" && facility
    ? { ...guide, title: `Select the Correct Yard and Bay at ${guide.facilityName}`, description: `Use the configured location options for ${guide.facilityName} before completing an inspection.`, sections: guide.sections.filter((section) => section.title === "Location entry") }
    : task === "facility-start" && facility
      ? {
          ...guide,
          title: `Start Inspection-Trac at ${guide.facilityName}`,
          description: `Use this short path when you are already at ${guide.facilityName}: confirm the facility, choose the enabled workflow, and verify the working location before starting.`,
          sections: guide.sections.filter((section) => ["Getting started", "Already inside the facility", "What to expect in the app", "Help"].includes(section.title)),
        }
      : guide;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-12 pt-5 sm:px-6">
      <Link href="/resources" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900">
        <ArrowLeft className="h-4 w-4" />Back to Resources & Training
      </Link>
      <GuideView guide={selectedGuide} />
      {!guideId && facility ? (
        <div className="flex flex-wrap gap-2 text-sm">
          {generalResourceGuides.map((sharedGuide) => <Link key={sharedGuide.id} href={guideHref({ guide: sharedGuide.id })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-slate-700 hover:border-blue-300">{sharedGuide.title}</Link>)}
        </div>
      ) : null}
    </main>
  );
}
