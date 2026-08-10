"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileWarning, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { formatFacilityDisplayName } from "@/lib/facilityDisplay";
import { usePortalSession } from "@/lib/portalSession";
import {
  fetchFacilityRegistration,
  type FacilityRegistrationConfiguration,
} from "@/lib/services/facilityOnboardingService";
import { useSearchParams } from "next/navigation";
import type { FacilitySummary } from "@/lib/types";
import { getPublishedQuickStartFacilities } from "@/components/facilities/facilityQuickStartAsset";
import {
  buildFacilityGuide,
  canAccessResourceGuide,
  findGeneralGuide,
  generalResourceGuides,
  guideHref,
  resourceCategories,
  type ResourceGuideDefinition,
} from "@/components/resources/resourceCatalog";

function GuideView({ guide }: { guide: ResourceGuideDefinition }) {
  const category = resourceCategories.find(
    (item) => item.id === guide.category,
  );
  const problemGuide = guide.problemGuideId
    ? generalResourceGuides.find((item) => item.id === guide.problemGuideId)
    : null;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="border-b border-slate-200 p-5 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
          {category?.title ?? "Task guide"}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {guide.title}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-700">
          <strong className="font-black text-slate-950">Where:</strong>{" "}
          {guide.where}
        </p>
      </header>
      <div className="space-y-7 p-5 sm:p-8">
        {guide.quickStart ? (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Scan to register
            </p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-blue-950">
              {guide.quickStart.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-900">
              {guide.quickStart.purpose}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href={guide.quickStart.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
              >
                <Download className="h-4 w-4" /> Open {guide.quickStart.title}{" "}
                PDF
              </a>
              <a
                href={guide.quickStart.registrationUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-blue-300 bg-white px-4 py-3 text-sm font-black text-blue-900"
              >
                Open registration link
              </a>
            </div>
          </section>
        ) : null}
        <ol className="space-y-4">
          {guide.steps.map((step, index) => (
            <li
              key={step}
              className="flex gap-3 text-sm leading-6 text-slate-700"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="grid gap-3 sm:grid-cols-2">
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-sm font-black text-emerald-950">Done</h2>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              {guide.done}
            </p>
          </section>
          <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-black text-amber-950">Problem</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {guide.problem}
            </p>
            {problemGuide ? (
              <Link
                href={guideHref({
                  guide: problemGuide.id,
                  facility: guide.facilityId,
                })}
                className="mt-3 inline-flex text-sm font-black text-blue-800 hover:text-blue-950"
              >
                Open {problemGuide.title}
              </Link>
            ) : null}
          </section>
        </div>
        {guide.referenceNote ? (
          <div
            role="note"
            className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
          >
            <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <p className="font-black">Reference boundary</p>
              <p className="mt-1">{guide.referenceNote}</p>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function ResourceGuidePageClient() {
  const params = useSearchParams();
  const guideId = params.get("guide");
  const facilityId = params.get("facility");
  const {
    organizationId,
    isFacilityAdmin,
    isOrgAdmin,
    isSuperAdmin,
    locations,
  } = usePortalSession();
  const { data: directory, isLoading, error } = usePortalDirectorySnapshot();
  const canManageFacilityAccess = isFacilityAdmin || isSuperAdmin;
  const [registrationState, setRegistrationState] = useState<{
    facilityId: string;
    value: FacilityRegistrationConfiguration | null;
    failed: boolean;
  } | null>(null);
  const facility = useMemo<FacilitySummary | null>(() => {
    const publishedFacilities = getPublishedQuickStartFacilities(
      directory?.facilities ?? [],
      locations,
    );
    return publishedFacilities.find((item) => item.id === facilityId) ?? null;
  }, [directory?.facilities, facilityId, locations]);

  useEffect(() => {
    let active = true;
    if (!canManageFacilityAccess || !organizationId || !facilityId)
      return () => {
        active = false;
      };
    void fetchFacilityRegistration(organizationId, facilityId)
      .then((value) => {
        if (active) setRegistrationState({ facilityId, value, failed: false });
      })
      .catch(() => {
        if (active)
          setRegistrationState({ facilityId, value: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [canManageFacilityAccess, facilityId, organizationId]);

  const registration =
    canManageFacilityAccess && registrationState?.facilityId === facilityId
      ? registrationState.value
      : null;
  const registrationFailed =
    canManageFacilityAccess &&
    registrationState?.facilityId === facilityId &&
    registrationState.failed;

  const generalGuide = guideId ? findGeneralGuide(guideId) : null;
  const guide =
    generalGuide && facility
      ? {
          ...generalGuide,
          facilityId: facility.id,
          facilityName: formatFacilityDisplayName(facility.name),
          registrationUrl: registration?.registrationUrl,
          support: registration?.support,
        }
      : generalGuide ||
        (facility ? buildFacilityGuide(facility, registration) : null);
  const access = { isFacilityAdmin, isOrgAdmin, isSuperAdmin };

  if (isLoading && !guide) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-sm text-slate-500">
        Loading guide…
      </div>
    );
  }

  if (error && facilityId && !facility) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Link
          href="/resources"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources & Training
        </Link>
        <EmptyState
          title="Facility guide could not load"
          description={
            error instanceof Error
              ? error.message
              : "The facility directory is unavailable right now."
          }
        />
      </div>
    );
  }

  if (guideId && !generalGuide) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Link
          href="/resources"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources & Training
        </Link>
        <EmptyState
          title="Guide not found"
          description="This guide link is invalid or no longer published. Choose a current guide from Resources & Training."
        />
      </div>
    );
  }

  if (facilityId && !facility) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Link
          href="/resources"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources & Training
        </Link>
        <EmptyState
          title="Facility context is unavailable"
          description="This facility quick start is not currently published or is outside your directory scope. Return to Resources & Training and choose an available facility."
        />
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Link
          href="/resources"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources & Training
        </Link>
        <EmptyState
          title="Choose a guide"
          description="Open a procedure or facility starting point from Resources & Training."
        />
      </div>
    );
  }

  if (!canAccessResourceGuide(guide, access)) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <Link
          href="/resources"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Resources & Training
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <ShieldAlert className="h-6 w-6 text-amber-800" />
          <h1 className="mt-3 text-xl font-black text-amber-950">
            Administrator access required
          </h1>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            This guide describes a facility-administration action. Your current
            portal role does not grant that action.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-12 pt-5 sm:px-6">
      <Link
        href="/resources"
        className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources & Training
      </Link>
      {registrationFailed && facilityId ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Enrollment details could not be loaded. The guide below is using the
          available facility directory context.
        </p>
      ) : null}
      <GuideView guide={guide} />
    </div>
  );
}
