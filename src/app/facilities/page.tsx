"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Search, RefreshCw, MapPin, Building2, Settings2, Check, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { matchesAnySearchQuery } from "@/lib/searchText";

const columns = ["Facility Identity", "Users", "Status"];
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
  const {
    organizationId,
    isFacilityAdmin: isOrgAdmin,
    selectedOrganizationScopeKey,
  } = usePortalSession();
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
  const [removeTarget, setRemoveTarget] = useState<null | { userId: string; facilityId: string; userName: string; facilityName: string }>(null);
  const [facilityActionMessage, setFacilityActionMessage] = useState<string | null>(null);
  const [facilityActionError, setFacilityActionError] = useState<string | null>(null);
  const [facilityAssignmentDraftUserIds, setFacilityAssignmentDraftUserIds] = useState<string[]>([]);
  const [facilityAssignmentSaving, setFacilityAssignmentSaving] = useState(false);
  const [isAssignmentEditorOpen, setIsAssignmentEditorOpen] = useState(false);
  const didMountOrganizationScopeRef = useRef(false);

  useEffect(() => {
    if (!didMountOrganizationScopeRef.current) {
      didMountOrganizationScopeRef.current = true;
      return;
    }
    setSelectedFacilityId(null);
    setFacilityAssignmentDraftUserIds([]);
    setIsAssignmentEditorOpen(false);
  }, [selectedOrganizationScopeKey]);
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
      const currentFacilityIds = Array.from(userFacilityIdsByUserId.get(removeTarget.userId) ?? []);
      const nextFacilityIds = currentFacilityIds.filter((facilityId) => facilityId !== removeTarget.facilityId);
      await UsersAdapter.updateUser(organizationId, removeTarget.userId, {
        facility_ids: nextFacilityIds,
      });
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
    return facilities.filter((facility) =>
      matchesAnySearchQuery([facility.name, facility.slug, facility.region].filter(Boolean).join(" "), searchTerm)
    );
  }, [facilities, searchTerm]);

  const selectedFacility = filteredFacilities.find((facility) => facility.id === selectedFacilityId) ?? null;
  const userFacilityIdsByUserId = useMemo(() => {
    const assignments = new Map<string, Set<string>>();
    users.forEach((user) => {
      const assignedFacilities = Array.isArray(user.facilityIds) ? user.facilityIds.filter(Boolean) : [];
      assignments.set(user.id, new Set(assignedFacilities));
    });
    locationMemberships.forEach((membership) => {
      if (!membership.user_id || !membership.location_id || membership.is_active === false) return;
      const existing = assignments.get(membership.user_id) ?? new Set<string>();
      existing.add(membership.location_id);
      assignments.set(membership.user_id, existing);
    });
    return assignments;
  }, [locationMemberships, users]);

  const selectedFacilityAssignedUserIds = useMemo(() => {
    if (!selectedFacilityId) return [];
    return users
      .filter((user) => {
        const assignedFacilities = userFacilityIdsByUserId.get(user.id);
        return Boolean(assignedFacilities?.size && assignedFacilities.has(selectedFacilityId));
      })
      .map((user) => user.id);
  }, [selectedFacilityId, userFacilityIdsByUserId, users]);

  useEffect(() => {
    if (!selectedFacilityId) {
      setFacilityAssignmentDraftUserIds([]);
      return;
    }
    setFacilityAssignmentDraftUserIds(selectedFacilityAssignedUserIds);
  }, [selectedFacilityAssignedUserIds, selectedFacilityId]);

  const toggleFacilityAssignmentDraft = (userId: string) => {
    if (!selectedFacilityId || !isOrgAdmin || facilityAssignmentSaving) return;
    setFacilityAssignmentDraftUserIds((current) => {
      const next = current.includes(userId) ? current.filter((entry) => entry !== userId) : [...current, userId];
      return next;
    });
  };

  const handleSaveFacilityAssignments = async () => {
    if (!organizationId || !selectedFacilityId || !isOrgAdmin) return;
    const currentAssigned = new Set(selectedFacilityAssignedUserIds);
    const nextAssigned = new Set(facilityAssignmentDraftUserIds);
    const changedUsers = users.filter((user) => currentAssigned.has(user.id) !== nextAssigned.has(user.id));
    if (!changedUsers.length) {
      setFacilityActionMessage("Facility assignments already match the current selection.");
      return;
    }
    setFacilityAssignmentSaving(true);
    setFacilityActionError(null);
    try {
      await Promise.all(
        changedUsers.map((user) => {
          const currentIds = Array.from(userFacilityIdsByUserId.get(user.id) ?? []);
          const nextIds = nextAssigned.has(user.id)
            ? Array.from(new Set([...currentIds, selectedFacilityId]))
            : currentIds.filter((facilityId) => facilityId !== selectedFacilityId);
          return UsersAdapter.updateUser(organizationId, user.id, {
            facility_ids: nextIds,
          });
        })
      );
      setFacilityActionMessage("Facility assignments saved.");
      await loadFacilities();
      await refreshControlPlaneBootstrap(organizationId);
      setIsAssignmentEditorOpen(false);
    } catch (error) {
      setFacilityActionError(error instanceof Error ? error.message : "Unable to save facility assignments.");
    } finally {
      setFacilityAssignmentSaving(false);
    }
  };

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
  const facilityUserCounts = useMemo(() => {
    const counts = new Map<string, number>();
    facilities.forEach((facility) => {
      counts.set(
        facility.id,
        users.filter((user) => {
          const assignedFacilities = userFacilityIdsByUserId.get(user.id);
          return Boolean(assignedFacilities?.size && assignedFacilities.has(facility.id));
        }).length
      );
    });
    return counts;
  }, [facilities, userFacilityIdsByUserId, users]);
  const assignedUsers = useMemo(() => {
    if (!selectedFacilityId) {
      return [];
    }
    return users.filter((user) => {
      const assignedFacilities = userFacilityIdsByUserId.get(user.id);
      return Boolean(assignedFacilities?.size && assignedFacilities.has(selectedFacilityId));
    });
  }, [selectedFacilityId, userFacilityIdsByUserId, users]);

  const openAssignmentEditor = () => {
    if (!selectedFacilityId || facilityAssignmentSaving) return;
    setFacilityAssignmentDraftUserIds(selectedFacilityAssignedUserIds);
    setIsAssignmentEditorOpen(true);
  };

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
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleRemoveFacilityMembership()}
              disabled={!removeTarget}
              className="rounded-full border border-rose-600 bg-rose-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              Remove Access
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAssignmentEditorOpen} onOpenChange={(open) => setIsAssignmentEditorOpen(open)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Facility Assignments</DialogTitle>
            <DialogDescription>
              Select the users that should be directly assigned to this facility, then save the updated list.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              {users.length ? users.map((user) => {
                const assignedFacilities = userFacilityIdsByUserId.get(user.id);
                const checked = facilityAssignmentDraftUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleFacilityAssignmentDraft(user.id)}
                    aria-disabled={!isOrgAdmin || facilityAssignmentSaving}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition cursor-pointer ${
                      checked ? "border-brand bg-brand/5" : "border-slate-100 bg-white hover:bg-slate-50"
                    } ${!isOrgAdmin || facilityAssignmentSaving ? "opacity-75" : ""}`}
                    title={assignedFacilities?.size ? "Direct facility assignment" : "No direct facility assignment"}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
                      <p className="truncate text-xs font-medium text-slate-500">{user.email}</p>
                    </div>
                    <span className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-slate-500">
                      {checked ? <Check className="h-3 w-3 text-emerald-500" /> : <Minus className="h-3 w-3 text-slate-300" />}
                      {checked ? "Assigned" : "Unassigned"}
                    </span>
                  </button>
                );
              }) : (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No users available</p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setIsAssignmentEditorOpen(false)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSaveFacilityAssignments()}
              disabled={!isOrgAdmin || facilityAssignmentSaving || !selectedFacilityId}
              className="rounded-full border border-brand/20 bg-brand px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {facilityAssignmentSaving ? "Saving..." : "Save"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {directoryPartialError ? (
        <ErrorPanel
          title="Partial directory data"
          error={directoryPartialError}
          action={<button type="button" onClick={() => void loadFacilities()} className="rounded-full border border-current/20 px-4 py-2 text-xs font-black uppercase tracking-widest">Retry</button>}
        />
      ) : null}
      {facilitiesError ? (
        <ErrorPanel
          title="Facility load failed"
          error={facilitiesError}
          action={<button type="button" onClick={() => void loadFacilities()} className="rounded-full border border-current/20 px-4 py-2 text-xs font-black uppercase tracking-widest">Retry</button>}
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
              <Input
                type="search"
                placeholder="Search registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand/40 transition-all shadow-sm"
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
                  className="flex items-center gap-2 rounded-lg bg-brand hover:bg-brand-accent px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-brand/10 transition-all active:scale-95 disabled:opacity-50"
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
              <EmptyState title="Facility sync error" description={statusMessage} tone="danger" action={<button type="button" onClick={() => void loadFacilities()} className="rounded-full border border-current/20 px-4 py-2 text-xs font-black uppercase tracking-widest">Retry</button>} />
            ) : showEmptyState ? (
              <EmptyState title="No facilities match the current view" description="Try adjusting search parameters. This is an empty filtered result, not a load failure." />
            ) : (
              <div className="-mx-4 -mb-4">
                <DataTableShell
                  title="Facility Registry"
                  description="Facilities currently returned by the directory snapshot."
                  columns={columns}
                >
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
                              </div>
                           </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs font-black text-slate-700">
                            {facilityUserCounts.get(f.id) ?? users.length}
                          </span>
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
                         <span className="px-2 py-0.5 rounded bg-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-200">
                           ID: {selectedFacilityId.slice(0, 8)}
                         </span>
                      </div>
                   </header>

                   <nav className="space-y-4">
                      <div className="space-y-2">
                         <div className="flex items-center justify-between gap-2 px-1">
                           <div className="min-w-0">
                             <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Direct Assignments</p>
                             <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
                               {assignedUsers.length} directly assigned
                             </p>
                           </div>
                           <button
                             type="button"
                             onClick={() => void openAssignmentEditor()}
                             disabled={!isOrgAdmin || !selectedFacilityId}
                             title={!isOrgAdmin ? "Organization admin permission is required." : "Manage users assigned to this facility"}
                             className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                           >
                             Manage Assignments
                           </button>
                         </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-2">
                          <div className="max-h-[14rem] overflow-y-auto pr-1">
                            <div className="space-y-1">
                              {assignedUsers.length ? assignedUsers.map((user) => {
                                const assignedFacilities = userFacilityIdsByUserId.get(user.id);
                                return (
                                  <div
                                    key={user.id}
                                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 text-left"
                                  >
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-bold text-slate-900">{user.name}</p>
                                      <p className="truncate text-xs font-medium text-slate-500">{user.email}</p>
                                    </div>
                                    <span className="flex items-center gap-1 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-black uppercase tracking-widest text-slate-500">
                                      <Check className="h-3 w-3 text-emerald-500" />
                                      Assigned
                                    </span>
                                  </div>
                                );
                              }) : (
                                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No directly assigned users</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Branding</p>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                          <p className="text-xs font-bold text-slate-900">Organization branding applied to this facility</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
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
                            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-900 transition-all bg-white hover:bg-slate-50"
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
                            title={!isOrgAdmin ? "Organization admin required" : !selectedFacility ? "Select a facility to edit" : "Edit facility"}
                            className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-300 text-xs font-black uppercase tracking-widest text-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-slate-50"
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
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select facility entry</p>
                 </div>
               )}
            </div>
          </aside>
        </div>
      </PageSection>
    </article>
  );
}
