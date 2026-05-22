"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageSection } from "@/components/ui/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { DataTableShell } from "@/components/ui/DataTableShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePortalSession } from "@/lib/portalSession";
import { refreshControlPlaneBootstrap, usePortalBrandingSnapshot, usePortalDirectorySnapshot } from "@/lib/portalData";
import { FacilitiesAdapter } from "@/lib/services/facilitiesService";
import { UsersAdapter } from "@/lib/services/usersService";
import { FacilityModal } from "@/components/facilities/FacilityModal";
import { Search, RefreshCw, MapPin, Building2, ChevronRight, Settings2 } from "lucide-react";

const columns = ["Facility Identity", "Status"];
const facilityRecipientAliases: Record<string, string> = {
  jn: "jnap",
  jnap: "jnap",
  shap: "shap",
  other: "other",
};

function normalizeFacilityRecipientKey(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  return normalized
    .split(" ")
    .map((token) => facilityRecipientAliases[token] || token)
    .join(" ");
}

function canonicalFacilityKey(value: string | null | undefined): string {
  return normalizeFacilityRecipientKey(value);
}

function extractFacilitySuffix(value: string | null | undefined): string {
  const normalized = (value ?? "").toString().trim();
  if (!normalized) {
    return "";
  }
  const parts = normalized.split(/[–-]/);
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return normalized;
}

function getFacilityMatchKeys(facility: {
  id?: string;
  slug?: string;
  name?: string;
  region?: string | null;
  location_id?: string;
  location_name?: string;
  location_label?: string;
  code?: string;
}) {
  const baseValues = [
    facility.id,
    facility.location_id,
    facility.slug,
    facility.code,
    facility.name,
    facility.location_name,
    facility.location_label,
    facility.region ?? "",
  ];
  return [
    ...baseValues.map((value) => canonicalFacilityKey(value)).filter(Boolean),
    ...baseValues.map((value) => canonicalFacilityKey(extractFacilitySuffix(value))).filter(Boolean),
  ];
}

export default function FacilitiesPage() {
  const { organizationId, isOrgAdmin } = usePortalSession();
  const searchParams = useSearchParams();
  const { data: branding } = usePortalBrandingSnapshot();
  const { data: directory, mutate: refreshDirectory, isLoading, error } = usePortalDirectorySnapshot();
  const facilities = useMemo(() => directory?.facilities ?? [], [directory]);
  const users = useMemo(() => directory?.users ?? [], [directory]);
  const locationMemberships = useMemo(() => directory?.locationMemberships ?? [], [directory]);
  const emailLists = useMemo(() => directory?.emailLists ?? [], [directory]);
  const emailListMembersByListId = useMemo(() => directory?.emailListMembersByListId ?? {}, [directory]);
  const directoryPartialError = directory?.partialError ?? null;
  const createDisabledReason = !isOrgAdmin ? "Organization admin required" : null;
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(searchParams?.get("facility") ?? null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<null | { membershipId: string; userName: string; facilityName: string }>(null);
  const [facilityActionMessage, setFacilityActionMessage] = useState<string | null>(null);
  const [facilityActionError, setFacilityActionError] = useState<string | null>(null);
  const loadFacilities = async () => {
    setStatusMessage(null);
    await refreshDirectory();
  };

  const handleCreateFacility = async (payload: { name: string; slug: string; region: string; active: boolean }) => {
    if (!organizationId || !isOrgAdmin) return;
    await FacilitiesAdapter.createFacility(organizationId, {
      name: payload.name,
      slug: payload.slug,
      region: payload.region || undefined,
      active: payload.active,
      locationCount: 1,
    });
    await loadFacilities();
    await refreshControlPlaneBootstrap(organizationId);
  };

  const handleEditFacility = async (payload: { name: string; slug: string; region: string; active: boolean }) => {
    if (!organizationId || !isOrgAdmin || !selectedFacility) return;
    await FacilitiesAdapter.updateFacility(organizationId, selectedFacility.id, {
      ...selectedFacility,
      name: payload.name,
      slug: payload.slug,
      region: payload.region || undefined,
      active: payload.active,
    });
    await loadFacilities();
    await refreshControlPlaneBootstrap(organizationId);
  };

  const handleRemoveFacilityMembership = async () => {
    if (!organizationId || !removeTarget) return;
    if (!isOrgAdmin) return;
    setFacilityActionMessage(null);
    setFacilityActionError(null);
    try {
      await UsersAdapter.removeFacilityMembership(organizationId, removeTarget.membershipId);
      setFacilityActionMessage(`Removed ${removeTarget.userName} from ${removeTarget.facilityName}.`);
      await loadFacilities();
      await refreshControlPlaneBootstrap(organizationId);
    } catch (error) {
      setFacilityActionError(error instanceof Error ? error.message : "Unable to remove facility access.");
    } finally {
      setRemoveTarget(null);
    }
  };

  const filteredFacilities = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return facilities;
    return facilities.filter((f) => 
      f.name.toLowerCase().includes(term) || 
      f.slug.toLowerCase().includes(term) || 
      (f.region || "").toLowerCase().includes(term)
    );
  }, [facilities, searchTerm]);

  const selectedFacility = filteredFacilities.find((facility) => facility.id === selectedFacilityId) ?? null;
  const selectedFacilityKeys = useMemo(() => {
    if (!selectedFacility) {
      return [];
    }
    return getFacilityMatchKeys(selectedFacility);
  }, [selectedFacility]);

  const selectedFacilityRecipientListMatches = useMemo(() => {
    if (!selectedFacility) {
      return [];
    }
    return emailLists.filter((list) => {
      const listKeys = [
        list.location_id ?? "",
        list.list_key ?? "",
        list.email_list_id ?? "",
        list.list_name ?? "",
        (list as Partial<{ key: string }>).key ?? "",
        (list as Partial<{ name: string }>).name ?? "",
        (list as Partial<{ navigation_label: string }>).navigation_label ?? "",
        (list.metadata && typeof list.metadata === "object" ? (list.metadata as Record<string, unknown>).location_key : "") as string,
        (list.metadata && typeof list.metadata === "object" ? (list.metadata as Record<string, unknown>).location_id : "") as string,
      ]
        .map((value) => canonicalFacilityKey(typeof value === "string" ? value : ""))
        .filter((value) => Boolean(value));

      return listKeys.some((listKey) =>
        selectedFacilityKeys.some((facilityKey) => {
          if (!facilityKey || !listKey) return false;
          return facilityKey === listKey || facilityKey.includes(listKey) || listKey.includes(facilityKey);
        })
      );
    });
  }, [emailLists, selectedFacility, selectedFacilityKeys]);

  const userLookup = users.reduce<Record<string, (typeof users)[number]>>((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});
  const userLookupByEmail = users.reduce<Record<string, (typeof users)[number]>>((acc, user) => {
    acc[user.email.toLowerCase()] = user;
    return acc;
  }, {});
  const selectedFacilityMembershipAssignments = (() => {
    if (!selectedFacilityId) return [];
    const seen = new Set<string>();
    return locationMemberships
      .filter((membership) => membership.location_id === selectedFacilityId)
      .map((membership) => {
        const user = userLookup[membership.user_id];
        return user ? { membership, user } : null;
      })
      .filter((entry): entry is { membership: (typeof locationMemberships)[number]; user: (typeof users)[number] } => Boolean(entry))
      .filter((entry) => {
        if (seen.has(entry.user.id)) return false;
        seen.add(entry.user.id);
        return true;
      });
  })();
  const selectedFacilityRecipientAssignments = (() => {
    if (!selectedFacilityId) return [];
    const matchingLists = selectedFacilityRecipientListMatches;
    const seen = new Set<string>();
    return matchingLists
      .flatMap((list) =>
        (emailListMembersByListId[list.email_list_id] ?? []).map((member) => ({
          list,
          member,
          user:
            (member.user_id && userLookup[member.user_id]) ||
            userLookupByEmail[member.email.toLowerCase()] ||
            null,
        }))
      )
      .filter((entry) => {
        const dedupeKey = entry.member.email.toLowerCase();
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);
        return true;
      });
  })();
  const selectedFacilityVisibleAssignments =
    selectedFacilityRecipientAssignments.length > 0
      ? selectedFacilityRecipientAssignments
      : selectedFacilityMembershipAssignments;

  const activeCount = facilities.filter(f => f.active).length;
  const summaryDeck = [
    { label: "Total Sites", value: facilities.length, detail: "Managed facilities" },
    { label: "Active Sites", value: `${activeCount}/${facilities.length || 0}`, detail: "Active / Total" },
  ];

  const showEmptyState = !filteredFacilities.length && !isLoading && !statusMessage;

  const facilitiesError = error instanceof Error ? error.message : error ? "Unable to load facilities." : null;
  const recipientMembersError =
    directoryPartialError && directoryPartialError.includes("email list members")
      ? "Recipient members could not be loaded."
      : null;
  const removeDisabledReason = !isOrgAdmin ? "Organization admin required" : null;

  return (
    <article className="space-y-4">
      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove user from facility?</DialogTitle>
            <DialogDescription>
              This removes facility access only. The user account remains intact and any other org membership is preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setRemoveTarget(null)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleRemoveFacilityMembership()}
              disabled={!removeTarget}
              className="rounded-full border border-rose-600 bg-rose-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              Remove Access
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {directoryPartialError ? (
        <ErrorPanel
          title="Partial directory data"
          error={directoryPartialError}
          action={<button type="button" onClick={() => void loadFacilities()} className="rounded-full border border-current/20 px-4 py-2 text-[11px] font-black uppercase tracking-widest">Retry</button>}
        />
      ) : null}
      {facilitiesError ? (
        <ErrorPanel
          title="Facility load failed"
          error={facilitiesError}
          action={<button type="button" onClick={() => void loadFacilities()} className="rounded-full border border-current/20 px-4 py-2 text-[11px] font-black uppercase tracking-widest">Retry</button>}
        />
      ) : null}
      {facilityActionMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{facilityActionMessage}</div>
      ) : null}
      {facilityActionError ? (
        <ErrorPanel title="Facility access update failed" error={facilityActionError} />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {summaryDeck.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />
        ))}
      </div>

      <PageSection
        title="Infrastructure Registry"
        description="Review facility readiness, operating regions, and backend-linked location detail."
        variant="panel"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand transition-colors" />
               <input
                 type="search"
                 placeholder="Search registry..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-48 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand/40 transition-all shadow-sm"
               />
            </div>
            <button
              onClick={() => void loadFacilities()}
              disabled={isLoading}
              title={isLoading ? "Facility refresh already in progress" : "Refresh facilities"}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-brand transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <FacilityModal
              trigger={
                <button
                  type="button"
              disabled={!organizationId || Boolean(createDisabledReason)}
                  title={createDisabledReason ?? "Add facility"}
                  className="flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-accent px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-white shadow-md shadow-brand/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Add Facility
                </button>
              }
              title="Add Facility"
              description="Create a scoped facility record through the backend control plane."
              submitLabel="Create Facility"
              disabledReason={createDisabledReason}
              onSubmit={handleCreateFacility}
            />
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-brand/40" /></div>
            ) : statusMessage ? (
              <EmptyState title="Facility sync error" description={statusMessage} tone="danger" action={<button type="button" onClick={() => void loadFacilities()} className="rounded-full border border-current/20 px-4 py-2 text-[11px] font-black uppercase tracking-widest">Retry</button>} />
            ) : showEmptyState ? (
              <EmptyState title="No facilities match the current view" description="Try adjusting search parameters. This is an empty filtered result, not a load failure." />
            ) : (
              <div className="-mx-4 -mb-4">
                <DataTableShell columns={columns}>
                  {filteredFacilities.map((f) => {
                    const isSelected = f.id === selectedFacilityId;
                    return (
                      <tr
                        key={f.id}
                        onClick={() => {
                          setSelectedFacilityId(f.id);
                        }}
                        className={`group transition-all duration-150 cursor-pointer ${
                          isSelected ? "bg-brand/[0.03]" : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="px-4 py-2">
                           <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded bg-slate-100 flex items-center justify-center text-slate-400 ${isSelected ? 'text-brand' : ''}`}>
                                 <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                 <span className={`text-xs font-bold truncate ${isSelected ? 'text-brand' : 'text-slate-900'}`}>{f.name}</span>
                                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight truncate">{f.slug}</span>
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-2">
                           <StatusBadge label={f.active ? "Ready" : "Offline"} tone={f.active ? "positive" : "danger"} />
                        </td>
                      </tr>
                    );
                  })}
                </DataTableShell>
              </div>
            )}
          </div>

          <aside className="lg:border-l border-slate-100 pl-4 py-2">
            <div className="sticky top-4 space-y-6">
               {selectedFacilityId ? (
                 <>
                   <header className="space-y-3">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center shadow-inner">
                            <MapPin className="w-5 h-5" />
                         </div>
                         <div className="min-w-0">
                            <h3 className="text-[14px] font-black text-slate-950 leading-none truncate uppercase tracking-tight">{selectedFacility?.name || "Facility Identity"}</h3>
                          </div>
                      </div>
                      <div className="flex gap-1.5">
                         <span className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                           ID: {selectedFacilityId.slice(0, 8)}
                         </span>
                      </div>
                   </header>

                   <nav className="space-y-4">
                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Assigned Users / Recipients</p>
                        <div className="space-y-2">
                          {selectedFacilityVisibleAssignments.length ? (
                            selectedFacilityVisibleAssignments.map((assignment) => {
                              const memberKey = "member" in assignment
                                ? assignment.member.email
                                : assignment.membership.location_membership_id;
                              const recipientUser = "member" in assignment ? assignment.user : assignment.user;
                              const recipientDisplayName =
                                "member" in assignment
                                  ? assignment.member.display_name || assignment.user?.name || assignment.member.email
                                  : assignment.user.name;
                              const recipientEmail =
                                "member" in assignment ? assignment.member.email : assignment.user.email;
                              const recipientLink =
                                recipientUser?.id ? `/users?user=${encodeURIComponent(recipientUser.id)}` : null;
                              const canRemove = "membership" in assignment && isOrgAdmin;
                              const removeReason = removeDisabledReason ?? (!("membership" in assignment) ? "Recipient list members are not facility memberships." : null);

                              const content = (
                                <div className="flex items-center justify-between gap-3 w-full">
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-slate-900 truncate">{recipientDisplayName}</p>
                                    <p className="text-[10px] font-medium text-slate-500 truncate">{recipientEmail}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {"membership" in assignment ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          if (!canRemove) return;
                                          setRemoveTarget({
                                            membershipId: assignment.membership.location_membership_id,
                                            userName: recipientDisplayName,
                                            facilityName: selectedFacility?.name || "facility",
                                          });
                                        }}
                                        disabled={!canRemove}
                                        title={removeReason ?? "Remove access"}
                                        className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                                      >
                                        Remove
                                      </button>
                                    ) : null}
                                    <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
                                  </div>
                                </div>
                              );

                              return recipientLink ? (
                                <Link
                                  key={memberKey}
                                  href={recipientLink}
                                  className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-brand/30 hover:bg-slate-50"
                                >
                                  {content}
                                </Link>
                              ) : (
                                <div
                                  key={memberKey}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
                                >
                                  {content}
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                              <p className="text-sm font-medium text-slate-600">
                                {selectedFacilityRecipientListMatches.length === 0
                                  ? "No recipient list matched this facility."
                                  : recipientMembersError
                                    ? recipientMembersError
                                    : "Recipient list has no members."}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Branding</p>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                          <p className="text-[11px] font-bold text-slate-900">Organization branding applied to this facility</p>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                              <p className="font-black uppercase tracking-widest text-slate-400">Org name</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {branding?.organization_name || "Not configured"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white p-2">
                              <p className="font-black uppercase tracking-widest text-slate-400">Logo</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {branding?.logo_url ? "Configured" : "Missing"}
                              </p>
                            </div>
                          </div>
                          <Link
                            href="/branding"
                            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-300 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all bg-white hover:bg-slate-50"
                          >
                            Open Branding Settings
                            <Settings2 className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                   </nav>

                   <footer className="space-y-2 pt-2">
                      <FacilityModal
                        trigger={
                          <button
                            type="button"
                            disabled={!organizationId || !isOrgAdmin || !selectedFacility}
                            title={!isOrgAdmin ? "Organization admin required" : !selectedFacility ? "Backend action pending" : "Edit facility"}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-300 text-[10px] font-black uppercase tracking-widest text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-slate-50"
                          >
                            Edit Facility
                            <Settings2 className="w-3.5 h-3.5" />
                          </button>
                        }
                        title="Edit Facility"
                        description="Update the facility record through the backend control plane."
                        submitLabel="Save Changes"
                        facility={selectedFacility ? {
                          name: selectedFacility.name,
                          slug: selectedFacility.slug,
                          region: selectedFacility.region || "",
                          active: selectedFacility.active,
                        } : null}
                          disabledReason={
                          !isOrgAdmin
                            ? "Organization admin required"
                            : !selectedFacility
                              ? "Select a facility to edit."
                              : null
                        }
                        onSubmit={handleEditFacility}
                      />
                   </footer>
                 </>
               ) : (
                 <div className="py-20 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                       <Building2 className="w-5 h-5" />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Select facility entry</p>
                 </div>
               )}
            </div>
          </aside>
        </div>
      </PageSection>
    </article>
  );
}
