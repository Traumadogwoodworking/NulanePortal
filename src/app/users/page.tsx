"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageSection } from "@/components/ui/PageSection";
import { StatCard } from "@/components/ui/StatCard";
import { FacilitySelector } from "@/components/ui/FacilitySelector";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTableShell } from "@/components/ui/DataTableShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorPanel } from "@/components/ui/ErrorPanel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InviteUserModal } from "@/components/users/InviteUserModal";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import { UsersAdapter } from "@/lib/services/usersService";
import { usePortalSession } from "@/lib/portalSession";
import { refreshControlPlaneBootstrap, useControlPlaneBootstrap, usePortalDirectorySnapshot } from "@/lib/portalData";
import { RefreshCw, UserPlus, Search, Shield, ChevronDown, User } from "lucide-react";
import type { ChangeEvent } from "react";
import type { EmailListSummary, FacilitySummary } from "@/lib/types";
import { selectedRowStrokeClass } from "@/lib/severityTheme";

const columns = ["User Identity", "Security Role", "Status", "Last Login"];
const FACILITY_ALL = "all";
const ACTIVE_LOGIN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
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

function getFacilityKeys(facility: FacilitySummary): string[] {
  return [
    facility.id,
    facility.slug,
    facility.name,
    (facility as Partial<{ location_id: string }>).location_id ?? "",
    (facility as Partial<{ location_name: string }>).location_name ?? "",
    (facility as Partial<{ location_label: string }>).location_label ?? "",
  ]
    .map((value) => canonicalFacilityKey(value))
    .filter((value): value is string => Boolean(value));
}

function getListKeys(list: EmailListSummary): string[] {
  return [
    list.location_id ?? "",
    list.list_key ?? "",
    (list as Partial<{ key: string }>).key ?? "",
    list.list_name ?? "",
    (list as Partial<{ name: string }>).name ?? "",
    (list as Partial<{ list_name: string }>).list_name ?? "",
    (list as Partial<{ navigation_label: string }>).navigation_label ?? "",
    (list.metadata && typeof list.metadata === "object" ? (list.metadata as Record<string, unknown>).location_key : "") as string,
    (list.metadata && typeof list.metadata === "object" ? (list.metadata as Record<string, unknown>).location_id : "") as string,
  ]
    .map((value) => canonicalFacilityKey(typeof value === "string" ? value : ""))
    .filter((value): value is string => Boolean(value));
}

function userMatchesRecipientEntry(
  selectedUser: { id: string; email: string; name: string },
  member: { email: string; user_id?: string; display_name?: string }
): boolean {
  const candidateKeys = [
    canonicalFacilityKey(member.email),
    canonicalFacilityKey(member.user_id || ""),
    canonicalFacilityKey(member.display_name || ""),
  ].filter((value): value is string => Boolean(value));
  const userKeys = [
    canonicalFacilityKey(selectedUser.id),
    canonicalFacilityKey(selectedUser.email),
    canonicalFacilityKey(selectedUser.name),
  ].filter((value): value is string => Boolean(value));
  return candidateKeys.some((candidateKey) =>
    userKeys.some((userKey) => userKey === candidateKey || userKey.includes(candidateKey) || candidateKey.includes(userKey))
  );
}

function isUserActiveFromLastLogin(lastLogin?: string | null): boolean {
  if (!lastLogin) {
    return false;
  }
  const timestamp = new Date(lastLogin).getTime();
  if (Number.isNaN(timestamp)) {
    return false;
  }
  return Date.now() - timestamp <= ACTIVE_LOGIN_WINDOW_MS;
}

type UserFacilityAssignmentDisplay = {
  facility: FacilitySummary;
  source: "location" | "email";
  roleLabel: string;
  membershipId?: string;
};

export default function UsersPage() {
  const { organizationId, isOrgAdmin } = usePortalSession();
  const searchParams = useSearchParams();
  const { data: bootstrap } = useControlPlaneBootstrap();
  const { data: directory, mutate: refreshDirectory, isLoading, error } = usePortalDirectorySnapshot();
  const [facilityFilter, setFacilityFilter] = useState<string>(FACILITY_ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams?.get("user") ?? null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"invite" | "identity" | "status" | "password-reset" | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedAssignmentFacilityId, setSelectedAssignmentFacilityId] = useState<string>("");
  const [selectedAssignmentRole, setSelectedAssignmentRole] = useState("user");
  const [assignError, setAssignError] = useState<string | null>(null);
  const users = useMemo(() => directory?.users ?? [], [directory]);
  const facilities = useMemo(() => directory?.facilities ?? [], [directory]);
  const locationMemberships = useMemo(() => directory?.locationMemberships ?? [], [directory]);
  const emailLists = useMemo(() => directory?.emailLists ?? [], [directory]);
  const emailListMembersByListId = useMemo(() => directory?.emailListMembersByListId ?? {}, [directory]);
  const directoryPartialError = directory?.partialError ?? null;
  const capabilities = bootstrap?.capabilities;
  const inviteDisabledReason = !isOrgAdmin ? "Organization admin permission is required to add users." : null;
  const assignDisabledReason = !isOrgAdmin ? "Organization admin permission is required to assign facilities." : null;

  const loadDirectory = async () => {
    setStatusMessage(null);
    await refreshDirectory();
  };

  const facilityLookup = useMemo(() => {
    return facilities.reduce<Record<string, FacilitySummary>>((acc, facility) => {
      acc[facility.id] = facility;
      return acc;
    }, {});
  }, [facilities]);
  const userLookupByEmail = useMemo(() => {
    return users.reduce<Record<string, (typeof users)[number]>>((acc, user) => {
      acc[user.email.toLowerCase()] = user;
      return acc;
    }, {});
  }, [users]);

  useEffect(() => {
    const userFromQuery = searchParams?.get("user");
    if (userFromQuery && userFromQuery !== selectedUserId) {
      startTransition(() => setSelectedUserId(userFromQuery));
    }
  }, [searchParams, selectedUserId]);

  const userFacilityIdsByUserId = useMemo(() => {
    const assignments = new Map<string, Set<string>>();
    const addAssignment = (userId: string | undefined, facilityId: string | undefined) => {
      if (!userId || !facilityId) return;
      const existing = assignments.get(userId) ?? new Set<string>();
      existing.add(facilityId);
      assignments.set(userId, existing);
    };

    locationMemberships.forEach((membership) => {
      addAssignment(membership.user_id, membership.location_id);
    });

    facilities.forEach((facility) => {
      const facilityKeys = getFacilityKeys(facility);
      const matchedLists = emailLists.filter((list) =>
        getListKeys(list).some((listKey) =>
          facilityKeys.some((facilityKey) => facilityKey === listKey || facilityKey.includes(listKey) || listKey.includes(facilityKey))
        )
      );

      matchedLists.forEach((list) => {
        const members = emailListMembersByListId[list.email_list_id] ?? [];
        members.forEach((member) => {
          const resolvedUser =
            (member.user_id && users.find((user) => user.id === member.user_id)) ||
            userLookupByEmail[member.email.toLowerCase()] ||
            null;
          if (resolvedUser && userMatchesRecipientEntry(resolvedUser, member)) {
            addAssignment(resolvedUser.id, facility.id);
          }
        });
      });
    });

    return assignments;
  }, [emailListMembersByListId, emailLists, facilities, locationMemberships, userLookupByEmail, users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const assignedFacilityIds = Array.from(userFacilityIdsByUserId.get(user.id) ?? []);
      const matchesFacility =
        facilityFilter === FACILITY_ALL || assignedFacilityIds.includes(facilityFilter);
      return matchesSearch && matchesFacility;
    });
  }, [facilityFilter, searchTerm, userFacilityIdsByUserId, users]);

  const selectedUser =
    filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;
  const selectedUserIsActive = selectedUser
    ? selectedUser.isActive && (selectedUser.lastLogin ? isUserActiveFromLastLogin(selectedUser.lastLogin) : true)
    : false;
  const selectedFacilityAssignments = useMemo(() => {
    if (!selectedUser) return [];
    const seen = new Set<string>();
    const membershipAssignments = (locationMemberships
      .filter((membership) => membership.user_id === selectedUser.id)
      .map((membership) => {
        const facility = facilityLookup[membership.location_id];
        return facility
          ? {
              facility,
              membershipId: membership.location_membership_id,
              source: "location" as const,
              roleLabel: membership.role || "member",
            }
          : null;
      })
      .filter(Boolean) as UserFacilityAssignmentDisplay[])
      .filter((entry) => {
        if (seen.has(entry.facility.id)) return false;
        seen.add(entry.facility.id);
        return true;
      });
    const emailRecipientAssignments: UserFacilityAssignmentDisplay[] = facilities
      .filter((facility) => {
        const facilityKeys = getFacilityKeys(facility);
        return emailLists.some((list) => {
          const listKeys = getListKeys(list);
          const facilityMatched = listKeys.some((listKey) =>
            facilityKeys.some((facilityKey) => facilityKey === listKey || facilityKey.includes(listKey) || listKey.includes(facilityKey))
          );
          if (!facilityMatched) return false;
          const members = emailListMembersByListId[list.email_list_id] ?? [];
          return members.some((member) => userMatchesRecipientEntry(selectedUser, member));
        });
      })
      .map((facility) => ({ facility, source: "email" as const, roleLabel: "recipient" }))
      .filter((entry) => {
        if (seen.has(entry.facility.id)) return false;
        seen.add(entry.facility.id);
        return true;
      });
    return [...membershipAssignments, ...emailRecipientAssignments];
  }, [emailListMembersByListId, emailLists, facilityLookup, locationMemberships, selectedUser, facilities]);

  const activeUsers = users.filter((user) => user.isActive && (user.lastLogin ? isUserActiveFromLastLogin(user.lastLogin) : true)).length;
  const adminUsers = users.filter((user) => user.role === "admin").length;

  const summaryDeck = [
    { label: "Users", value: `${activeUsers}/${users.length || 0}`, detail: "Active / Total" },
    { label: "Admin", value: adminUsers, detail: "Full Access" },
    { label: "Facilities", value: `${facilities.filter((facility) => facility.active).length}/${facilities.length || 0}`, detail: "Active / Total" },
  ];

  const showEmptyState = !filteredUsers.length && !isLoading && !statusMessage;

  const handleInviteUser = async (payload: {
    email: string;
    display_name?: string;
    role: string;
    facility_ids: string[];
    invite: boolean;
  }) => {
    if (!organizationId) {
      throw new Error("Organization context missing.");
    }
    setOperationMessage(null);
    setPendingAction("invite");
    try {
      const result = await UsersAdapter.inviteUser(organizationId, payload);
      setOperationMessage(`Invitation sent to ${result.email}.`);
      await loadDirectory();
      await refreshControlPlaneBootstrap(organizationId);
    } catch {
      throw new Error("User invite failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!organizationId || !selectedUser) return;
    if (!window.confirm(`Delete ${selectedUser.name}? This cannot be undone.`)) return;
    setPendingAction("status");
    try {
      await UsersAdapter.deleteUserByEmail(organizationId, selectedUser.email);
      setOperationMessage(`${selectedUser.name} deleted.`);
      await loadDirectory();
      await refreshControlPlaneBootstrap(organizationId);
    } catch {
      setOperationMessage("User delete failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handlePasswordResetSuccess = async (message: string) => {
    setOperationMessage(message);
    await loadDirectory();
  };

  const handleRoleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    if (!organizationId || !selectedUser || !isOrgAdmin) return;
    const nextRole = event.target.value;
    if (!nextRole || nextRole === selectedUser.role) return;
    setPendingAction("identity");
    try {
      await UsersAdapter.updateUserRole(selectedUser.id, nextRole);
      setOperationMessage(`Role updated to ${nextRole}.`);
      await loadDirectory();
      await refreshControlPlaneBootstrap(organizationId);
    } catch {
      setOperationMessage("Role update failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleAddFacilityAssignment = async () => {
    if (!organizationId || !selectedUser || !isOrgAdmin) return;
    if (!selectedAssignmentFacilityId.trim()) return;
    setPendingAction("identity");
    try {
      await UsersAdapter.addFacilityMembership(organizationId, selectedUser.id, selectedAssignmentFacilityId.trim(), selectedAssignmentRole.trim() || "member");
      setOperationMessage(`Assigned ${selectedUser.name} to ${selectedAssignmentFacilityId.trim()}.`);
      await loadDirectory();
      await refreshControlPlaneBootstrap(organizationId);
      setIsAssignDialogOpen(false);
      setSelectedAssignmentFacilityId("");
      setSelectedAssignmentRole("user");
    } catch {
      setAssignError("Facility assignment failed.");
      setOperationMessage("Facility assignment failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handleRemoveFacilityAssignment = async (membershipId: string) => {
    if (!organizationId || !isOrgAdmin) return;
    setPendingAction("identity");
    try {
      await UsersAdapter.removeFacilityMembership(organizationId, membershipId);
      setOperationMessage("Facility assignment removed.");
      await loadDirectory();
      await refreshControlPlaneBootstrap(organizationId);
    } catch {
      setOperationMessage("Facility removal failed.");
    } finally {
      setPendingAction(null);
    }
  };

  if (!organizationId) {
    return <EmptyState title="Org Context Missing" description="No organization linked." />;
  }

  const directoryError = error ? "Directory load failed." : null;

  return (
    <article className="space-y-4">
      {directoryPartialError ? (
        <ErrorPanel
          title="Partial directory data"
          error={directoryPartialError}
          action={<button type="button" onClick={() => void loadDirectory()} className="rounded-full border border-current/20 px-4 py-2 text-sm font-black uppercase tracking-widest">Retry</button>}
        />
      ) : null}
      {directoryError ? (
        <ErrorPanel
          title="Directory load failed"
          error={directoryError}
          action={<button type="button" onClick={() => void loadDirectory()} className="rounded-full border border-current/20 px-4 py-2 text-sm font-black uppercase tracking-widest">Retry</button>}
        />
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {summaryDeck.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />
        ))}
      </div>

      <PageSection
        title="Access Directory"
        description="Review users, roles, facility access, and backend synchronization state."
        variant="panel"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative group">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
               <input
                 type="search"
                 placeholder="Search registry..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-48 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all shadow-sm"
               />
            </div>
            <FacilitySelector
              facilities={facilities}
              value={facilityFilter}
              onChange={setFacilityFilter}
            />
            <button
              onClick={() => void loadDirectory()}
              disabled={isLoading}
              title={isLoading ? "Directory refresh already in progress" : "Refresh user directory"}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <InviteUserModal
              facilities={facilities}
              canInviteUser={true}
              organizationMissingReason={!organizationId ? "Organization context missing." : null}
              onInvite={handleInviteUser}
              trigger={
                <button
                  type="button"
                  disabled={pendingAction !== null || Boolean(inviteDisabledReason)}
                  title={inviteDisabledReason ?? undefined}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-sm font-black uppercase tracking-widest text-white shadow-md shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {pendingAction === "invite" ? "Adding..." : "Add Users"}
                </button>
              }
            />
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>
            ) : statusMessage ? (
              <EmptyState title="Directory error" description={statusMessage} tone="danger" action={<button type="button" onClick={() => void loadDirectory()} className="rounded-full border border-current/20 px-4 py-2 text-sm font-black uppercase tracking-widest">Retry</button>} />
            ) : showEmptyState ? (
              <EmptyState title="No users match the current view" description="Try adjusting search or facility filters. This is an empty filtered result, not a load failure." />
            ) : (
              <div className="-mx-4 -mb-4">
                <DataTableShell columns={columns}>
                  {filteredUsers.map((user) => {
                    const isSelected = user.id === selectedUser?.id;
                    const isActiveByLogin = user.isActive && (user.lastLogin ? isUserActiveFromLastLogin(user.lastLogin) : true);
                    return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`group transition-all duration-150 cursor-pointer ${selectedRowStrokeClass(isSelected)} hover:bg-slate-50`}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-sm font-black ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                               {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className={`text-sm font-bold truncate ${isSelected ? 'text-slate-900' : 'text-slate-900'}`}>
                                 {user.name}
                               </span>
                               <span className="text-sm text-slate-500 font-medium truncate">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge label={user.role} tone={user.role === "admin" ? "positive" : "neutral"} />
                        </td>
                        <td className="px-4 py-2">
                           <div className="flex items-center gap-1.5">
                              <div className={`w-1.5 h-1.5 rounded-full ${isActiveByLogin ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                          <span className="text-sm font-bold text-slate-600 uppercase tracking-widest">{isActiveByLogin ? "Active" : "Inactive"}</span>
                           </div>
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-slate-400 uppercase tracking-tighter">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "N/A"}
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
                {selectedUser ? (
                  <>
                    <header className="space-y-3">
                       <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center text-xl font-black shadow-inner">
                            {selectedUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                             <h3 className="text-sm font-black text-slate-950 leading-none truncate uppercase tracking-tight">{selectedUser.name}</h3>
                          <p className="text-sm text-slate-500 font-bold mt-1 truncate">{selectedUser.email}</p>
                          </div>
                       </div>
                          <div className="flex gap-1.5">
                          <StatusBadge label={selectedUser.role} tone="neutral" />
                          <StatusBadge label={selectedUserIsActive ? "Sync: Active" : "Sync: Inactive"} tone={selectedUserIsActive ? "positive" : "danger"} />
                       </div>
                    </header>

                    <nav className="space-y-4">
                       <div className="space-y-2">
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Facility Assignments</p>
                          <div className="grid grid-cols-1 gap-1">
                             {selectedFacilityAssignments.length ? selectedFacilityAssignments.map((assignment) => {
                               const key = assignment.source === "email" ? `${assignment.facility.id}-email` : assignment.membershipId || assignment.facility.id;
                               return (
                               <Link
                                 key={key}
                                 href={`/facilities?facility=${encodeURIComponent(assignment.facility.id)}`}
                                 className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between group transition hover:bg-slate-100"
                               >
                               <span className="text-sm font-bold text-slate-800 truncate">{assignment.facility.name}</span>
                               <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">{assignment.roleLabel}</span>
                               </Link>
                             ); }) : <div className="p-3 text-center border border-dashed border-slate-200 rounded-lg text-sm font-bold text-slate-400 uppercase">No facility assignments found.</div>}
                          </div>
                       </div>

                    </nav>

                    <footer className="space-y-3 pt-2">
                       {!isOrgAdmin ? (
                         <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                           Organization admin permission is required for user changes.
                         </p>
                       ) : null}
                       <ResetPasswordDialog
                         organizationId={organizationId}
                         user={selectedUser}
                         onSuccess={handlePasswordResetSuccess}
                         onError={setOperationMessage}
                         onPendingChange={(isPending) => setPendingAction(isPending ? "password-reset" : null)}
                       />
                       <button
                         type="button"
                         onClick={() => void handleDeleteUser()}
                         disabled={!isOrgAdmin || pendingAction !== null}
                         title={!isOrgAdmin ? "Organization admin permission is required." : undefined}
                         className="w-full py-2 rounded-lg border border-rose-200 text-sm font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                       >
                         {pendingAction === "status" ? "Deleting..." : "Delete User"}
                       </button>
                         <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Role Assignment</p>
                          <div className="relative">
                             <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                             <select
                               className="w-full pl-7 pr-3 py-1.5 bg-transparent text-sm font-bold text-slate-700 outline-none appearance-none cursor-pointer"
                               value={selectedUser.role}
                               onChange={(event) => void handleRoleChange(event)}
                              disabled={!isOrgAdmin || pendingAction !== null}
                              title={!isOrgAdmin ? "Organization admin required" : "Change user role"}
                             >
                                <option value="admin">Administrator</option>
                                <option value="user">Standard Agent</option>
                                <option value="viewer">Audit Viewer</option>
                             </select>
                          </div>
                       </div>
                       <button
                         type="button"
                         onClick={() => {
                           setAssignError(null);
                           setIsAssignDialogOpen(true);
                           if (!selectedAssignmentFacilityId && facilities[0]?.id) {
                             setSelectedAssignmentFacilityId(facilities[0].id);
                           }
                         }}
                         disabled={!isOrgAdmin || pendingAction !== null}
                         title={assignDisabledReason ?? "Assign facility"}
                         className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 text-sm font-black uppercase tracking-widest text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-slate-50"
                       >
                         Add Facility Assignment
                         <ChevronDown className="w-3.5 h-3.5" />
                       </button>
                       {selectedFacilityAssignments.length ? (
                         <div className="space-y-2">
                           {selectedFacilityAssignments.map((assignment) => (
                             <div key={assignment.membershipId || `${assignment.facility.id}-${assignment.source}`} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2">
                               <Link href={`/facilities?facility=${encodeURIComponent(assignment.facility.id)}`} className="min-w-0">
                                 <p className="truncate text-sm font-bold text-slate-800">{assignment.facility.name}</p>
                                 <p className="truncate text-sm text-slate-500">{assignment.facility.slug}</p>
                               </Link>
                               {assignment.source === "location" && assignment.membershipId ? (
                                 <button
                                   type="button"
                                   onClick={() => void handleRemoveFacilityAssignment(assignment.membershipId!)}
                                   disabled={!isOrgAdmin || pendingAction !== null}
                                   title={assignDisabledReason ?? "Remove facility assignment"}
                                   className="rounded-full border border-slate-200 px-2 py-1 text-sm font-black uppercase tracking-widest text-slate-600 disabled:opacity-50"
                                 >
                                   Remove
                                 </button>
                               ) : (
                                 <span className="rounded-full border border-slate-200 px-2 py-1 text-sm font-black uppercase tracking-widest text-slate-500">
                                   Recipient
                                 </span>
                               )}
                             </div>
                           ))}
                         </div>
                       ) : null}
                       {operationMessage && (
                         <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-sm font-black text-slate-700 uppercase tracking-widest text-center animate-in fade-in zoom-in-95">
                           {operationMessage}
                         </div>
                       )}
                    </footer>
                    <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
                      setIsAssignDialogOpen(open);
                      if (!open) {
                        setAssignError(null);
                        setPendingAction(null);
                      }
                    }}>
                      <DialogContent className="sm:max-w-[520px]">
                        <DialogHeader>
                          <DialogTitle>Assign Facility</DialogTitle>
                          <DialogDescription>
                            Select a facility and attach it to the currently selected user.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-2">
                          {assignError ? (
                            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                              {assignError}
                            </div>
                          ) : null}
                          <div className="grid gap-2">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Facility</Label>
                            <FacilitySelector
                              facilities={facilities}
                              value={selectedAssignmentFacilityId}
                              onChange={setSelectedAssignmentFacilityId}
                              includeAllOption={false}
                              emptyLabel="No facilities available for assignment."
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="assignment-role">Role</Label>
                            <select
                              id="assignment-role"
                              value={selectedAssignmentRole}
                              onChange={(event) => setSelectedAssignmentRole(event.target.value)}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                              <option value="org_admin">Org Admin</option>
                              <option value="super_admin">Super Admin</option>
                              <option value="viewer">Viewer</option>
                            </select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAssignDialogOpen(false)}
                            disabled={pendingAction !== null}
                            className="border-slate-300 bg-slate-700 text-white hover:bg-slate-600 hover:text-white focus-visible:ring-slate-500/30"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={() => void handleAddFacilityAssignment()}
                            disabled={!selectedAssignmentFacilityId || pendingAction !== null || capabilities?.canAssignFacilities === false}
                            className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500/30"
                          >
                            {pendingAction === "identity" ? "Assigning..." : "Assign User"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                  <div className="py-20 text-center space-y-4">
                     <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto">
                        <User className="w-5 h-5" />
                     </div>
                     <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Select user registry</p>
                  </div>
                )}
             </div>
          </aside>
        </div>
      </PageSection>
    </article>
  );
}

