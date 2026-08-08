"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  LayoutDashboard,
  MapPin,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { saveAs } from "file-saver";
import { PageTitle } from "@/components/ui/PageTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import {
  fetchFacilityRegistration,
  type FacilityRegistrationConfiguration,
} from "@/lib/services/facilityOnboardingService";
import {
  buildFacilityGuidePdfDefinition,
  facilityStartupSteps,
} from "@/components/facilities/facilityStartupGuide";
import { publicBranding } from "@/lib/publicBranding";
import { createPdfBlob } from "@/lib/pdfClient";
import type { FacilitySummary } from "@/lib/types";

type RegistrationMap = Record<string, FacilityRegistrationConfiguration | null>;

const portalGuideSteps = [
  { title: "Home dashboard", detail: "Review inspection volume, severity, and leading damage areas." },
  { title: "Facilities", detail: "Manage facility access, yards, enrollment links, and packet status." },
  { title: "Reports", detail: "Open submitted inspection records and operational review views." },
  { title: "Resources", detail: "Return here for facility-specific setup links, guides, and PDFs." },
];

function personalizeFacilityText(detail: string, facilityLabel: string) {
  return detail.replace(/\b(?:your )?Chicago Heights\b/gi, facilityLabel);
}

function facilityHref(facility: FacilitySummary) {
  return `/facilities?facility=${encodeURIComponent(facility.id)}`;
}

function ResourceLink({
  href,
  label,
  detail,
  icon,
}: {
  href?: string;
  label: string;
  detail: string;
  icon: React.ReactNode;
}) {
  if (!href) {
    return (
      <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
        <span className="mt-0.5 text-slate-400">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
    >
      <span className="mt-0.5 text-blue-700">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          {label}
          {href.startsWith("http") ? <ExternalLink className="h-3.5 w-3.5 text-slate-400" /> : <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span>
      </span>
    </a>
  );
}

function GuideCard({
  icon,
  eyebrow,
  title,
  description,
  steps,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  steps: Array<{ title: string; detail: string }>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_55px_-35px_rgba(15,23,42,0.4)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">{eyebrow}</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-black text-white">{index + 1}</span>
            <div>
              <p className="text-sm font-black text-slate-900">{step.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-slate-600">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FacilityResourceCard({
  facility,
  registration,
  isDownloadingPdf,
  onDownloadPdf,
}: {
  facility: FacilitySummary;
  registration: FacilityRegistrationConfiguration | null | undefined;
  isDownloadingPdf: boolean;
  onDownloadPdf: () => void;
}) {
  const hasRegistration = Boolean(registration?.registrationUrl);
  const iosUrl = registration?.stores.ios || publicBranding.appStoreUrl;
  const androidUrl = registration?.stores.android || publicBranding.googlePlayUrl;
  const facilityLabel = registration?.onboardingDisplayName || facility.name;

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_55px_-35px_rgba(15,23,42,0.4)]" aria-labelledby={`facility-${facility.id}`}>
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id={`facility-${facility.id}`} className="truncate text-xl font-black tracking-tight text-slate-950">{facility.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
              {facility.region ? <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{facility.region}</span> : null}
              <span>{facility.locationCount} location{facility.locationCount === 1 ? "" : "s"}</span>
              {facility.yards?.length ? <span>{facility.yards.length} yard{facility.yards.length === 1 ? "" : "s"}</span> : null}
            </div>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] ${facility.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
          <span className={`h-2 w-2 rounded-full ${facility.active ? "bg-emerald-600" : "bg-slate-500"}`} />
          {facility.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr] lg:p-6">
        <div className="flex flex-col justify-between rounded-3xl bg-slate-950 p-6 text-white">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Start here</p>
            <h3 className="mt-3 text-2xl font-black tracking-tight">Get {facilityLabel} ready.</h3>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
              Open the facility workspace to manage access, review the setup checklist, and download the current two-sided access packet.
            </p>
          </div>
          <Link href={facilityHref(facility)} className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-white">
            Open facility workspace <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ResourceLink
            href={registration?.registrationUrl}
            label="Registration link"
            detail={hasRegistration ? "Open the permanent facility enrollment page." : "Configure the permanent enrollment page in the facility workspace."}
            icon={<ExternalLink className="h-5 w-5" />}
          />
          <ResourceLink
            href={iosUrl}
            label="iPhone app"
            detail="Install Inspection-Trac from the App Store."
            icon={<Smartphone className="h-5 w-5" />}
          />
          <ResourceLink
            href={androidUrl}
            label="Android app"
            detail="Install Inspection-Trac from Google Play."
            icon={<Smartphone className="h-5 w-5" />}
          />
          <ResourceLink
            href={facilityHref(facility)}
            label="Facility access"
            detail="Review registration status, support details, and packet revision."
            icon={<UsersRound className="h-5 w-5" />}
          />
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={!hasRegistration || isDownloadingPdf}
            className="group flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
          >
            <span className="mt-0.5 text-blue-700"><FileText className="h-5 w-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                {isDownloadingPdf ? "Preparing access PDF…" : "Download access PDF"}
                <Download className="h-3.5 w-3.5 text-slate-400" />
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                {hasRegistration ? "Save the current two-sided facility guide and QR enrollment packet." : "Configure the facility registration link to enable this PDF."}
              </span>
            </span>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500"><BookOpenCheck className="h-4 w-4 text-blue-700" /> Setup checklist</p>
            <p className="mt-1 text-sm text-slate-600">Use this sequence when bringing a new inspector online at {facilityLabel}.</p>
          </div>
          {registration?.packetRevision ? <span className="text-xs font-bold text-slate-400">Packet revision {registration.packetRevision}</span> : null}
        </div>
        <ol className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {facilityStartupSteps.map((step, index) => (
            <li key={step.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-800">{index + 1}</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="mt-3 text-sm font-black leading-5 text-slate-900">{step.title}</p>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">{personalizeFacilityText(step.detail, facilityLabel)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export default function ResourcesPage() {
  const { organizationId } = usePortalSession();
  const { data: directory, isLoading, error } = usePortalDirectorySnapshot();
  const facilities = useMemo(
    () => (directory?.facilities ?? []).slice().sort((left, right) => left.name.localeCompare(right.name)),
    [directory?.facilities]
  );
  const [registrations, setRegistrations] = useState<RegistrationMap>({});
  const [pdfDownloadFacilityId, setPdfDownloadFacilityId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!organizationId || !facilities.length) {
      return () => { active = false; };
    }
    void Promise.all(
      facilities.map(async (facility) => {
        try {
          return [facility.id, await fetchFacilityRegistration(organizationId, facility.id)] as const;
        } catch {
          return [facility.id, null] as const;
        }
      })
    ).then((entries) => {
      if (active) setRegistrations(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [facilities, organizationId]);

  const configuredCount = facilities.filter((facility) => Boolean(registrations[facility.id]?.registrationUrl)).length;

  async function handleDownloadPdf(facility: FacilitySummary) {
    const registration = registrations[facility.id];
    if (!registration?.registrationUrl) return;

    setPdfDownloadFacilityId(facility.id);
    setPdfError(null);
    try {
      const blob = await createPdfBlob(buildFacilityGuidePdfDefinition({
        facilityName: registration.onboardingDisplayName || facility.name,
        organizationName: registration.organizationName || publicBranding.companyName,
        registrationUrl: registration.registrationUrl,
        supportName: registration.support.displayName || "Inspection-Trac Support",
        supportEmail: registration.support.email || publicBranding.supportEmail,
        supportPhone: registration.support.phone,
        appName: publicBranding.appName,
        appStoreUrl: registration.stores.ios || publicBranding.appStoreUrl,
        googlePlayUrl: registration.stores.android || publicBranding.googlePlayUrl,
        packetRevision: registration.packetRevision || 1,
      }));
      saveAs(blob, `${registration.slug || facility.id}-inspection-trac-facility-access.pdf`);
    } catch {
      setPdfError("The facility PDF could not be prepared. Open the facility workspace to review the access packet.");
    } finally {
      setPdfDownloadFacilityId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <PageTitle title="Resources" subtitle="Facility-specific access, setup, and operational guidance." />

      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-[0_24px_70px_-35px_rgba(15,23,42,0.75)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-200">Resource library</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Everything your facilities need to get moving.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">Find the correct enrollment link, app installation path, setup checklist, and facility workspace for every location in the current organization view.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:w-80">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-2xl font-black">{facilities.length}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-300">Facilities</p></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4"><p className="text-2xl font-black">{configuredCount}</p><p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-300">Access links</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Quick explainers</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Know where each part of the workflow lives.</h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-500">Use the mobile app to complete inspections in the field and the portal to manage facilities, review records, and coordinate access.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <GuideCard
            icon={<Smartphone className="h-5 w-5" />}
            eyebrow="For inspectors"
            title="Inspection-Trac mobile app"
            description="The app is the field workflow: sign in, confirm the assigned facility, and complete the inspection from the vehicle or yard."
            steps={facilityStartupSteps.map((step) => ({
              title: step.title,
              detail: personalizeFacilityText(step.detail, "your assigned facility"),
            }))}
          />
          <GuideCard
            icon={<LayoutDashboard className="h-5 w-5" />}
            eyebrow="For coordinators"
            title="Inspection-Trac portal"
            description="The portal is the operations workspace for facility access, submitted records, dashboards, and reusable setup resources."
            steps={portalGuideSteps}
          />
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-[1.75rem] border border-blue-100 bg-blue-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
          <div>
            <p className="text-sm font-black text-slate-950">One place for every facility</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">Each card below is backed by the live facility directory and keeps its own enrollment link, app links, setup guide, and access packet together.</p>
          </div>
        </div>
        <Link href="/facilities" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300">
          Open Facilities <ArrowUpRight className="h-4 w-4" />
        </Link>
      </section>

      {pdfError ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900" role="status">{pdfError}</div> : null}

      {isLoading && !facilities.length ? <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm font-semibold text-slate-500">Loading facility resources…</div> : null}
      {error && !facilities.length ? <EmptyState title="Resources could not load" description={error instanceof Error ? error.message : "The facility directory is unavailable right now."} /> : null}
      {!isLoading && !error && !facilities.length ? <EmptyState title="No facilities in this view" description="Switch the organization view or add a facility before resources can be listed here." action={<Link href="/facilities" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white">Open Facilities</Link>} /> : null}
      <div className="space-y-5">
        {facilities.map((facility) => (
          <FacilityResourceCard
            key={facility.id}
            facility={facility}
            registration={registrations[facility.id]}
            isDownloadingPdf={pdfDownloadFacilityId === facility.id}
            onDownloadPdf={() => void handleDownloadPdf(facility)}
          />
        ))}
      </div>
    </div>
  );
}
