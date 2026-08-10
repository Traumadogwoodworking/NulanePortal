"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  MapPin,
  Search,
  ShieldCheck,
} from "lucide-react";
import { FacilityQuickStartActions } from "@/components/facilities/FacilityQuickStartActions";
import {
  getFacilityQuickStartAsset,
  getPublishedQuickStartFacilities,
} from "@/components/facilities/facilityQuickStartAsset";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageTitle } from "@/components/ui/PageTitle";
import { formatOrganizationDisplayName } from "@/lib/facilityDisplay";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import {
  fetchFacilityRegistration,
  type FacilityRegistrationConfiguration,
} from "@/lib/services/facilityOnboardingService";
import type { FacilitySummary } from "@/lib/types";
import {
  buildFacilityGuide,
  guideHref,
  rankResourceGuides,
  resourceCategories,
  visibleResourceGuides,
  type ResourceGuideDefinition,
} from "@/components/resources/resourceCatalog";

type RegistrationEntry = {
  value: FacilityRegistrationConfiguration | null;
  error: boolean;
};
type RegistrationMap = Record<string, RegistrationEntry>;
const EMPTY_REGISTRATION_MAP: RegistrationMap = {};
const commonGuideIds = new Set([
  "start-an-inspection",
  "complete-damage-inspection",
  "find-and-export-reports",
]);

function GuideLink({
  guide,
  facilityId,
  featured = false,
}: {
  guide: ResourceGuideDefinition;
  facilityId?: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={guideHref({ guide: guide.id, facility: facilityId })}
      className={
        featured
          ? "group flex min-w-0 items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 transition hover:border-blue-300 hover:bg-blue-100/70 focus:outline-none focus:ring-2 focus:ring-blue-300"
          : "group flex min-w-0 items-start gap-3 px-4 py-3 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-300"
      }
    >
      <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-950">
          {guide.title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-600">
          {guide.description}
        </span>
        {featured ? (
          <span className="mt-2 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {guide.audience === "field"
              ? "Mobile app"
              : guide.audience === "portal"
                ? "Portal"
                : "App & portal"}
          </span>
        ) : null}
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-700" />
    </Link>
  );
}

function FacilityResourceCard({
  facility,
  registration,
  canManage,
  organizationName,
}: {
  facility: FacilitySummary;
  registration?: RegistrationEntry;
  canManage: boolean;
  organizationName?: string;
}) {
  const registrationReady = Boolean(
    registration?.value?.enabled &&
    registration.value.available &&
    registration.value.globalEnabled &&
    registration.value.registrationUrl,
  );
  const resolvedOrganizationName = formatOrganizationDisplayName(
    registration?.value?.organizationName || organizationName,
  );
  const quickStartAsset = getFacilityQuickStartAsset({
    slug: facility.slug,
    id: facility.id,
  });

  if (!quickStartAsset) return null;

  return (
    <article className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-black tracking-tight text-slate-950">
            {quickStartAsset.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            {quickStartAsset.purpose}
          </p>
        </div>
      </div>
      <div className="mt-5">
        <FacilityQuickStartActions
          facilityName={quickStartAsset.facility.name}
          organizationName={resolvedOrganizationName}
          registrationUrl={quickStartAsset.registrationUrl}
          slug={quickStartAsset.facility.registrationSlug}
          active={registration?.value ? registrationReady : true}
          supportName={quickStartAsset.support.displayName}
          supportEmail={quickStartAsset.support.email}
          supportPhone={registration?.value?.support.phone}
          appStoreUrl={registration?.value?.stores.ios}
          googlePlayUrl={registration?.value?.stores.android}
          packetRevision={registration?.value?.packetRevision}
          lastSuccessfulEnrollmentAt={
            registration?.value?.lastSuccessfulEnrollment?.completedAt
          }
          publishedQuickStart={quickStartAsset}
          showProcedure
        />
      </div>
      {registration?.error ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Registration details are temporarily unavailable. The published
          Chicago Heights link, QR, and PDF remain available.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={guideHref({ facility: facility.id, task: "facility-start" })}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
        >
          Facility quick reference <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
        {canManage ? (
          <Link
            href={`/facilities?facility=${encodeURIComponent(facility.id)}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700"
          >
            Manage registration <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default function ResourcesPage() {
  const {
    session,
    organizationId,
    selectedLocationLabel,
    isFacilityAdmin,
    isOrgAdmin,
    isSuperAdmin,
    locations,
  } = usePortalSession();
  const { data: directory } = usePortalDirectorySnapshot();
  const facilities = useMemo(
    () =>
      getPublishedQuickStartFacilities(directory?.facilities ?? [], locations)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name)),
    [directory?.facilities, locations],
  );
  const [query, setQuery] = useState("");
  const [registrationState, setRegistrationState] = useState<{
    requestKey: string;
    entries: RegistrationMap;
  }>({ requestKey: "", entries: {} });
  const access = useMemo(
    () => ({ isFacilityAdmin, isOrgAdmin, isSuperAdmin }),
    [isFacilityAdmin, isOrgAdmin, isSuperAdmin],
  );
  const availableGuides = useMemo(
    () => visibleResourceGuides(access),
    [access],
  );
  const canManageFacilityAccess = isFacilityAdmin || isSuperAdmin;
  const registrationRequestKey =
    canManageFacilityAccess && organizationId && facilities.length
      ? `${organizationId}:${facilities.map((facility) => facility.id).join(",")}`
      : "";
  const registrations =
    registrationState.requestKey === registrationRequestKey
      ? registrationState.entries
      : EMPTY_REGISTRATION_MAP;

  useEffect(() => {
    let active = true;
    if (!registrationRequestKey || !organizationId || !facilities.length)
      return () => {
        active = false;
      };
    void Promise.all(
      facilities.map(async (facility) => {
        try {
          return [
            facility.id,
            {
              value: await fetchFacilityRegistration(
                organizationId,
                facility.id,
              ),
              error: false,
            },
          ] as const;
        } catch {
          return [facility.id, { value: null, error: true }] as const;
        }
      }),
    ).then((entries) => {
      if (active)
        setRegistrationState({
          requestKey: registrationRequestKey,
          entries: Object.fromEntries(entries),
        });
    });
    return () => {
      active = false;
    };
  }, [facilities, organizationId, registrationRequestKey]);

  const visibleGuides = useMemo(
    () => rankResourceGuides(availableGuides, query),
    [availableGuides, query],
  );
  const availableCategories = useMemo(
    () =>
      resourceCategories.filter((category) =>
        availableGuides.some((guide) => guide.category === category.id),
      ),
    [availableGuides],
  );
  const facilityGuides = useMemo(
    () =>
      facilities.map((facility) =>
        buildFacilityGuide(facility, registrations[facility.id]?.value),
      ),
    [facilities, registrations],
  );
  const visibleFacilityGuides = useMemo(
    () => rankResourceGuides(facilityGuides, query),
    [facilityGuides, query],
  );
  const hasResults =
    visibleGuides.length > 0 || visibleFacilityGuides.length > 0;
  const roleLabel = isSuperAdmin
    ? "Super admin"
    : isOrgAdmin
      ? "Organization admin"
      : isFacilityAdmin
        ? "Facility admin"
        : "Operator";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-12">
      <PageTitle
        title="Resources & Training"
        subtitle="What do you need help doing?"
      />

      <section aria-label="Facility quick starts">
        <div className="grid gap-3">
          {facilities.map((facility) => (
            <FacilityResourceCard
              key={facility.id}
              facility={facility}
              registration={registrations[facility.id]}
              canManage={Boolean(canManageFacilityAccess && organizationId)}
              organizationName={session?.organization?.name}
            />
          ))}
        </div>
      </section>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        aria-label="Current resource context"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label
              htmlFor="resource-search"
              className="text-sm font-bold text-slate-950"
            >
              Search the handbook
            </label>
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="resource-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search VIN, railcar, chock, damage, report, access…"
                className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-700">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleLabel}
            </span>
            {selectedLocationLabel ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2">
                <MapPin className="h-3.5 w-3.5" />
                {selectedLocationLabel}
              </span>
            ) : null}
          </div>
        </div>
        {query ? (
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {visibleGuides.length + visibleFacilityGuides.length} matching guide
            {visibleGuides.length + visibleFacilityGuides.length === 1
              ? ""
              : "s"}
          </p>
        ) : null}
      </section>

      {availableCategories.map((category) => {
        const guides = visibleGuides.filter(
          (guide) => guide.category === category.id,
        );
        if (!guides.length) return null;
        return (
          <section
            key={category.id}
            id={category.id}
            className="scroll-mt-24 space-y-3"
            aria-labelledby={`${category.id}-heading`}
          >
            <div>
              <h2
                id={`${category.id}-heading`}
                className="text-2xl font-black tracking-tight text-slate-950"
              >
                {category.title}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                {category.description}
              </p>
            </div>
            <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {guides.map((guide) => (
                <GuideLink
                  key={guide.id}
                  guide={guide}
                  featured={!query && commonGuideIds.has(guide.id)}
                />
              ))}
            </div>
          </section>
        );
      })}

      {!hasResults && query ? (
        <EmptyState
          title="No handbook results"
          description="Try a broader term such as VIN, rail, damage, report, access, or scanner."
        />
      ) : null}
    </div>
  );
}
