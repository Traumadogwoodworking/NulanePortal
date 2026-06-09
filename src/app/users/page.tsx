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
import { ConfirmActionDialog } from "@/components/ui/ConfirmActionDialog";
import { InviteUserModal } from "@/components/users/InviteUserModal";
import { ResetPasswordDialog } from "@/components/users/ResetPasswordDialog";
import { UsersAdapter } from "@/lib/services/usersService";
import { usePortalSession } from "@/lib/portalSession";
import { refreshControlPlaneBootstrap, useControlPlaneBootstrap, usePortalDirectorySnapshot } from "@/lib/portalData";
import { RefreshCw, UserPlus, Search, Shield, ChevronDown, User, Pencil } from "lucide-react";
import type { ChangeEvent } from "react";
import type { DeletedUserSummary, FacilitySummary } from "@/lib/types";
import { selectedRowStrokeClass } from "@/lib/severityTheme";
import { Input } from "@/components/ui/input";
import { matchesAnySearchQuery } from "@/lib/searchText";

const columns = ["User Identity", "Security Role", "Status", "Last Login"];
const FACILITY_ALL = "all";
const VIEW_ACTIVE = "active";
const VIEW_DELETED = "deleted";
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
  source: "api" | "location";
  roleLabel: string;
  membershipId?: string;
};

type DeletedUserDetailSnapshot = DeletedUserSummary & {
  membershipStateLabel: string;
  facilityCount: number;
  priorRoleLabel: string;
  activeFlagLabel: string;
};

export default function UsersPage() {
  const { organizationId, isOrgAdmin } = usePortalSession();
  const searchParams = useSearchParams();
  const { data: bootstrap } = useControlPlaneBootstrap();
  const { data: directory, mutate: refreshDirectory, isLoading, error } = usePortalDirectorySnapshot();
  const [viewMode, setViewMode] = useState<typeof VIEW_ACTIVE | typeof VIEW_DELETED>(VIEW_ACTIVE);
  const [facilityFilter, setFacilityFilter] = useState<string>(FACILITY_ALL);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(searchParams?.get("user") ?? null);
  const [deletedUsers, setDeletedUsers] = useState<DeletedUserSummary[]>([]);
  const [deletedUsersLoading, setDeletedUsersLoading] = useState(true);
  const [deletedUsersError, setDeletedUsersError] = useState<string | null>(null);
  const [selectedDeletedUserId, setSelectedDeletedUserId] = useState<string | null>(null);
  const [restoreCandidate, setRestoreCandidate] = useState<DeletedUserSummary | null>(null);
  const [restorePendingUserId, setRestorePendingUserId] = useState<string | null>(null);
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
  const directoryPartialError = directory?.partialError ?? null;
  const capabilities = bootstrap?.capabilities;
  const inviteDisabledReason = !isOrgAdmin ? "Organization admin permission is required to add users." : null;
  const assignDisabledReason = !isOrgAdmin ? "Organization admin permission is required to assign facilities." : null;

  const loadDirectory = async () => {
    setStatusMessage(null);
    await refreshDirectory();
  };

  const loadDeletedUsers = async () => {
    if (!organizationId) {
      setDeletedUsers([]);
      return;
    }
    setDeletedUsersLoading(true);
    setDeletedUsersError(null);
    try {
      const records = await UsersAdapter.getDeletedUsers(organizationId);
      setDeletedUsers(records);
    } catch (error) {
      setDeletedUsersError(error instanceof Error ? error.message : "Deleted users could not be loaded.");
      setDeletedUsers([]);
    } finally {
      setDeletedUsersLoading(false);
    }
  };

  const facilityLookup = useMemo(() => {
    return facilities.reduce<Record<string, FacilitySummary>>((acc, facility) => {
      acc[facility.id] = facility;
      return acc;
    }, {});
  }, [facilities]);
  const facilityMembershipLookup = useMemo(() => {
    return locationMemberships.reduce<Record<string, Record<string, string>>>((acc, membership) => {
      if (!membership.user_id || !membership.location_id || membership.is_active === false) return acc;
      const userAssignments = acc[membership.user_id] ?? {};
      userAssignments[membership.location_id] = membership.location_membership_id;
      acc[membership.user_id] = userAssignments;
      return acc;
    }, {});
  }, [locationMemberships]);
  useEffect(() => {
    const userFromQuery = searchParams?.get("user");
    if (userFromQuery && userFromQuery !== selectedUserId) {
      startTransition(() => setSelectedUserId(userFromQuery));
    }
  }, [searchParams, selectedUserId]);

  useEffect(() => {
    void loadDeletedUsers();
  }, [organizationId]);

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

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = matchesAnySearchQuery([user.name, user.email].filter(Boolean).join(" "), searchTerm);
      const assignedFacilityIds = Array.from(userFacilityIdsByUserId.get(user.id) ?? []);
      const matchesFacility =
        facilityFilter === FACILITY_ALL || assignedFacilityIds.includes(facilityFilter);
      return matchesSearch && matchesFacility;
    });
  }, [facilityFilter, searchTerm, userFacilityIdsByUserId, users]);

  const selectedUser =
    filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;
  const selectedUserFacilityIds = useMemo(
    () => (selectedUser ? Array.from(userFacilityIdsByUserId.get(selectedUser.id) ?? []) : []),
    [selectedUser, userFacilityIdsByUserId]
  );
  const selectedUserIsActive = selectedUser
    ? selectedUser.isActive && (selectedUser.lastLogin ? isUserActiveFromLastLogin(selectedUser.lastLogin) : true)
    : false;
  const selectedFacilityAssignments = useMemo(() => {
    if (!selectedUser) return [];
    const facilityIds = selectedUserFacilityIds;
    if (!facilityIds.length) {
      return [];
    }
    return facilityIds
      .reduce<UserFacilityAssignmentDisplay[]>((acc, facilityId) => {
        const facility = facilityLookup[facilityId];
        if (!facility) {
          return acc;
        }
        const membershipId = facilityMembershipLookup[selectedUser.id]?.[facilityId];
        acc.push({
          facility,
          source: membershipId ? "location" : "api",
          roleLabel: "assigned",
          membershipId,
        });
        return acc;
      }, []);
  }, [facilityLookup, facilityMembershipLookup, facilities, selectedUser, selectedUserFacilityIds]);

  const deletedUserDetails = useMemo<DeletedUserDetailSnapshot | null>(() => {
    if (!selectedDeletedUserId) {
      return deletedUsers[0]
        ? {
            ...deletedUsers[0],
            membershipStateLabel: deletedUsers[0].organizationMembership?.is_active === false ? "Inactive membership" : "Membership snapshot",
            facilityCount: deletedUsers[0].locationMemberships.length,
            priorRoleLabel: deletedUsers[0].organizationMembership?.role || deletedUsers[0].role || "Unknown",
            activeFlagLabel: deletedUsers[0].isActive ? "Active" : "Inactive",
          }
        : null;
    }
    const match = deletedUsers.find((user) => user.id === selectedDeletedUserId) ?? null;
    if (!match) return null;
    return {
      ...match,
      membershipStateLabel: match.organizationMembership?.is_active === false ? "Inactive membership" : "Membership snapshot",
      facilityCount: match.locationMemberships.length,
      priorRoleLabel: match.organizationMembership?.role || match.role || "Unknown",
      activeFlagLabel: match.isActive ? "Active" : "Inactive",
    };
  }, [deletedUsers, selectedDeletedUserId]);

  const deletedUsersFiltered = useMemo(() => {
    return deletedUsers.filter((user) => {
      const matchesSearch = matchesAnySearchQuery([user.name, user.email, user.id].filter(Boolean).join(" "), searchTerm);
      return matchesSearch;
    });
  }, [deletedUsers, searchTerm]);

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

  const handleUpdateSelectedUser = async (payload: {
    email: string;
    display_name?: string;
    role: string;
    facility_ids: string[];
    invite: boolean;
  }) => {
    if (!organizationId || !selectedUser || !isOrgAdmin) {
      throw new Error("Organization admin permission is required.");
    }
    setOperationMessage(null);
    setPendingAction("identity");
    try {
      await UsersAdapter.updateUser(organizationId, selectedUser.id, {
        display_name: payload.display_name || selectedUser.name,
        email: selectedUser.email,
        role: payload.role,
        facility_ids: payload.facility_ids,
      });
      setOperationMessage(`${selectedUser.name} updated.`);
      await loadDirectory();
      await refreshControlPlaneBootstrap(organizationId);
    } catch {
      throw new Error("User update failed.");
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

  const handleSuspendUser = async () => {
    if (!organizationId || !selectedUser || !isOrgAdmin) return;
    if (!selectedUser.isActive) {
      setOperationMessage(`${selectedUser.name} is already inactive.`);
      return;
    }
    if (!window.confirm(`Suspend ${selectedUser.name}? This will set the user inactive.`)) return;
    setPendingAction("status");
    try {
      await UsersAdapter.updateUserStatusByEmail(organizationId, selectedUser.email, false);
      setOperationMessage(`${selectedUser.name} suspended.`);
      await loadDirectory();
      await refreshControlPlaneBootstrap(organizationId);
    } catch {
      setOperationMessage("Suspend user failed.");
    } finally {
      setPendingAction(null);
    }
  };

  const handlePasswordResetSuccess = async (message: string) => {
    setOperationMessage(message);
    await loadDirectory();
  };

  const handleRestoreDeletedUser = async (user: DeletedUserSummary) => {
    if (!organizationId || !isOrgAdmin) return;
    setRestorePendingUserId(user.id);
    try {
      await UsersAdapter.restoreUser(organizationId, user.id);
      setOperationMessage(`${user.email || user.name} restored to active access.`);
      setRestoreCandidate(null);
      setSelectedDeletedUserId(null);
      await Promise.all([loadDirectory(), loadDeletedUsers(), refreshControlPlaneBootstrap(organizationId)]);
    } catch (error) {
      setOperationMessage(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setRestorePendingUserId(null);
    }
  };

  const handleRoleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    if (!organizationId || !selectedUser || !isOrgAdmin) return;
    const nextRole = event.target.value;
    if (!nextRole || nextRole === selectedUser.role) return;
    setPendingAction("identity");
    try {
      await UsersAdapter.updateUser(organizationId, selectedUser.id, {
        display_name: selectedUser.name,
        email: selectedUser.email,
        role: nextRole,
        facility_ids: selectedUserFacilityIds,
      });
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
      const nextFacilityIds = Array.from(new Set([...selectedUserFacilityIds, selectedAssignmentFacilityId.trim()]));
      await UsersAdapter.updateUser(organizationId, selectedUser.id, {
        display_name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        facility_ids: nextFacilityIds,
      });
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

  const handleRemoveFacilityAssignment = async (assignment: UserFacilityAssignmentDisplay) => {
    if (!organizationId || !isOrgAdmin || !selectedUser) return;
    setPendingAction("identity");
    try {
      const nextFacilityIds = selectedUserFacilityIds.filter((facilityId) => facilityId !== assignment.facility.id);
      await UsersAdapter.updateUser(organizationId, selectedUser.id, {
        display_name: selectedUser.name,
        email: selectedUser.email,
        role: selectedUser.role,
        facility_ids: nextFacilityIds,
      });
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
  const canRestoreDeletedUser = isOrgAdmin;

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
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode(VIEW_ACTIVE)}
                className={`rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-widest ${
                  viewMode === VIEW_ACTIVE ? "bg-slate-900 text-white" : "text-slate-500"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setViewMode(VIEW_DELETED)}
                className={`rounded-md px-3 py-1.5 text-xs font-black uppercase tracking-widest ${
                  viewMode === VIEW_DELETED ? "bg-slate-900 text-white" : "text-slate-500"
                }`}
              >
                Deleted
              </button>
            </div>
            <div className="relative group">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
              <Input
                type="search"
                placeholder="Search registry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-300 transition-all shadow-sm"
              />
            </div>
            {viewMode === VIEW_ACTIVE ? (
              <FacilitySelector facilities={facilities} value={facilityFilter} onChange={setFacilityFilter} />
            ) : null}
            <button
              onClick={() => void loadDirectory()}
              disabled={isLoading}
              title={isLoading ? "Directory refresh already in progress" : "Refresh user directory"}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {viewMode === VIEW_ACTIVE ? (
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
            ) : null}
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {viewMode === VIEW_ACTIVE && isLoading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>
            ) : viewMode === VIEW_ACTIVE && statusMessage ? (
              <EmptyState title="Directory error" description={statusMessage} tone="danger" action={<button type="button" onClick={() => void loadDirectory()} className="rounded-full border border-current/20 px-4 py-2 text-sm font-black uppercase tracking-widest">Retry</button>} />
            ) : viewMode === VIEW_ACTIVE && showEmptyState ? (
              <EmptyState title="No users match the current view" description="Try adjusting search or facility filters. This is an empty filtered result, not a load failure." />
            ) : viewMode === VIEW_ACTIVE ? (
              <div className="-mx-4 -mb-4">
                <DataTableShell
                  title="Active Users"
                  description="Current users filtered by search and facility."
                  columns={columns}
                >
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
            ) : deletedUsersLoading ? (
              <div className="py-20 flex justify-center"><RefreshCw className="animate-spin text-slate-400" /></div>
            ) : deletedUsersError ? (
              <EmptyState title="Deleted users could not be loaded." description={deletedUsersError} tone="danger" action={<button type="button" onClick={() => void loadDeletedUsers()} className="rounded-full border border-current/20 px-4 py-2 text-sm font-black uppercase tracking-widest">Retry</button>} />
            ) : deletedUsersFiltered.length ? (
              <div className="-mx-4 -mb-4">
                <DataTableShell
                  title="Deleted Users"
                  description="Deleted and deactivated accounts in the organization."
                  columns={["Name", "Email", "Role", "Status", "Membership", "Facilities", "Deleted", "Actions"]}
                >
                  {deletedUsersFiltered.map((user) => {
                    const isSelected = user.id === selectedDeletedUserId;
                    const deletedLabel = user.deletedAt || user.deactivatedAt || user.suspendedAt || user.lastUpdated;
                    const membershipState = user.organizationMembership
                      ? (user.organizationMembership.is_active ? "Member snapshot" : "Membership inactive")
                      : "Membership unavailable";
                    return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedDeletedUserId(user.id)}
                        className={`group transition-all duration-150 cursor-pointer ${selectedRowStrokeClass(isSelected)} hover:bg-slate-50`}
                      >
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-sm font-black ${isSelected ? 'text-slate-900' : 'text-slate-500'}`}>
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-bold truncate text-slate-900">{user.name}</span>
                              <span className="text-sm text-slate-500 font-medium truncate">{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">{user.email}</td>
                        <td className="px-4 py-2">
                          <StatusBadge label={user.organizationMembership?.role || user.role || "unknown"} tone="neutral" />
                        </td>
                        <td className="px-4 py-2">
                          <StatusBadge label={user.isDeactivated ? "Deactivated" : user.isSuspended ? "Suspended" : user.isDeleted ? "Deleted" : user.status || "Inactive"} tone="danger" />
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-600">{membershipState}</td>
                        <td className="px-4 py-2 text-sm text-slate-600">{user.locationMemberships.length}</td>
                        <td className="px-4 py-2 text-sm font-bold text-slate-400 uppercase tracking-tighter">
                          {deletedLabel ? new Date(deletedLabel).toLocaleDateString([], { month: "short", day: "numeric" }) : "N/A"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedDeletedUserId(user.id);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
                            >
                              View details
                            </button>
                            {canRestoreDeletedUser ? (
                              <button
                                type="button"
                                disabled={restorePendingUserId === user.id}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setRestoreCandidate(user);
                                }}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50"
                              >
                                {restorePendingUserId === user.id ? "Restoring..." : "Restore access"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </DataTableShell>
              </div>
            ) : (
              <EmptyState title="No deleted users found for this organization." description="Deleted and deactivated accounts will appear here when the backend returns them." />
            )}
          </div>

          <aside className="lg:border-l border-slate-100 pl-4 py-2">
             <div className="sticky top-4 space-y-6">
                {viewMode === VIEW_ACTIVE && selectedUser ? (
                  <>
                    <header className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center text-xl font-black shadow-inner">
                            {selectedUser.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-black text-slate-950 leading-none truncate uppercase tracking-tight">{selectedUser.name}</h3>
                            <p className="text-sm text-slate-500 font-bold mt-1 truncate">{selectedUser.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <StatusBadge label={selectedUser.role} tone="neutral" />
                        <StatusBadge label={selectedUserIsActive ? "Sync: Active" : "Sync: Inactive"} tone={selectedUserIsActive ? "positive" : "danger"} />
                      </div>
                    </header>

                    <nav className="space-y-4">
                       <div className="space-y-2">
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Facility Assignments</p>
                          <div className="grid grid-cols-1 gap-1">
                             {selectedFacilityAssignments.length ? selectedFacilityAssignments.map((assignment) => {
                               const key = assignment.membershipId || assignment.facility.id;
                               return (
                               <div
                                 key={key}
                                 className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between gap-3"
                               >
                               <div className="min-w-0">
                                 <span className="block text-sm font-bold text-slate-800 truncate">{assignment.facility.name}</span>
                                 <span className="block text-[10px] text-slate-500 truncate">{assignment.facility.slug}</span>
                               </div>
                               <button
                                 type="button"
                                 onClick={() => void handleRemoveFacilityAssignment(assignment)}
                                 disabled={!isOrgAdmin || pendingAction !== null}
                                 title={!isOrgAdmin ? "Organization admin permission is required." : "Remove facility assignment"}
                                 className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                               >
                                 Unassign
                               </button>
                               </div>
                             ); }) : <div className="p-3 text-center border border-dashed border-slate-200 rounded-lg text-sm font-bold text-slate-400 uppercase">Universal access. No specific facility assignments.</div>}
                          </div>
                       </div>

                    </nav>

                    <footer className="space-y-3 pt-2">
                       {!isOrgAdmin ? (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 text-sm font-bold uppercase tracking-widest text-slate-500">
                          Organization admin permission is required for user changes.
                        </p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setIsAssignDialogOpen(true)}
                        disabled={!isOrgAdmin || pendingAction !== null}
                        title={assignDisabledReason ?? "Edit user facilities"}
                        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 text-sm font-black uppercase tracking-widest text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-slate-50"
                      >
                        Edit
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <ResetPasswordDialog
                        organizationId={organizationId}
                        user={selectedUser}
                        onSuccess={handlePasswordResetSuccess}
                         onError={setOperationMessage}
                         onPendingChange={(isPending) => setPendingAction(isPending ? "password-reset" : null)}
                       />
                       <button
                         type="button"
                         onClick={() => void handleSuspendUser()}
                         disabled={!isOrgAdmin || pendingAction !== null || !selectedUser.isActive}
                         title={!isOrgAdmin ? "Organization admin permission is required." : !selectedUser.isActive ? "User is already inactive" : "Suspend user"}
                         className="w-full py-2 rounded-lg border border-amber-200 text-sm font-black uppercase tracking-widest text-amber-700 hover:bg-amber-50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
                       >
                         {pendingAction === "status" ? "Suspending..." : "Suspend User"}
                       </button>
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
                       <InviteUserModal
                         facilities={facilities}
                         canInviteUser={isOrgAdmin}
                         mode="update"
                         initialUser={{
                           email: selectedUser.email,
                           displayName: selectedUser.name,
                           role: selectedUser.role,
                           facilityIds: selectedUserFacilityIds,
                         }}
                         organizationMissingReason={!organizationId ? "Organization context missing." : null}
                         onInvite={handleUpdateSelectedUser}
                         trigger={
                           <button
                             type="button"
                             disabled={!isOrgAdmin || pendingAction !== null}
                             title={assignDisabledReason ?? "Update user facilities"}
                             className="w-full flex items-center justify-between p-2.5 rounded-lg border border-slate-200 text-sm font-black uppercase tracking-widest text-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-white hover:bg-slate-50"
                           >
                             Add Facility Assignment
                             <ChevronDown className="w-3.5 h-3.5" />
                           </button>
                         }
                       />
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
                ) : viewMode === VIEW_DELETED && deletedUserDetails ? (
                  <section className="space-y-4">
                    <header className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center text-xl font-black shadow-inner">
                          {deletedUserDetails.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-slate-950 leading-none truncate uppercase tracking-tight">{deletedUserDetails.name}</h3>
                          <p className="text-sm text-slate-500 font-semibold mt-1 truncate">{deletedUserDetails.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        <StatusBadge label={deletedUserDetails.priorRoleLabel} tone="neutral" />
                        <StatusBadge label={deletedUserDetails.activeFlagLabel} tone="danger" />
                        <StatusBadge label={deletedUserDetails.membershipStateLabel} tone="neutral" />
                      </div>
                    </header>
                    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-sm font-black uppercase tracking-widest text-slate-400">Snapshot</p>
                      <div className="space-y-2 text-sm text-slate-700">
                        <p><span className="font-black text-slate-900">User ID:</span> {deletedUserDetails.id}</p>
                        <p><span className="font-black text-slate-900">Deleted/Deactivated:</span> {deletedUserDetails.deletedAt || deletedUserDetails.deactivatedAt || deletedUserDetails.suspendedAt || "Unavailable"}</p>
                        <p><span className="font-black text-slate-900">Org membership:</span> {deletedUserDetails.organizationMembership ? "Present" : "Unavailable"}</p>
                        <p><span className="font-black text-slate-900">Facility/location count:</span> {deletedUserDetails.facilityCount}</p>
                      </div>
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                        Reports by this user: backend endpoint not wired yet.
                      </div>
                    </div>
                    {canRestoreDeletedUser ? (
                      <button
                        type="button"
                        onClick={() => setRestoreCandidate(deletedUserDetails)}
                        disabled={restorePendingUserId === deletedUserDetails.id}
                        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {restorePendingUserId === deletedUserDetails.id ? "Restoring..." : "Restore access"}
                      </button>
                    ) : null}
                  </section>
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

      <ConfirmActionDialog
        isOpen={Boolean(restoreCandidate)}
        onClose={() => setRestoreCandidate(null)}
        onConfirm={() => {
          if (restoreCandidate) {
            void handleRestoreDeletedUser(restoreCandidate);
          }
        }}
        title="Restore access"
        message={
          restoreCandidate
            ? `Restore access for this user to this organization? This restores organization access only. Facility access may need to be reassigned separately.`
            : ""
        }
        confirmLabel="Restore access"
        isPending={Boolean(restoreCandidate && restorePendingUserId === restoreCandidate.id)}
      />
    </article>
  );
}

