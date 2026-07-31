"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReactNode } from "react";
import type { FacilitySummary } from "@/lib/types";

interface InviteUserModalProps {
  facilities: FacilitySummary[];
  trigger: ReactNode;
  canInviteUser: boolean;
  organizationMissingReason?: string | null;
  mode?: "invite" | "update";
  initialUser?: {
    email: string;
    displayName?: string;
    role?: string;
    facilityIds?: string[];
  } | null;
  onInvite: (payload: {
    email: string;
    display_name?: string;
    role: string;
    facility_ids: string[];
    invite: boolean;
  }) => Promise<void>;
}

const ROLE_OPTIONS = [
  { key: "user", label: "User" },
  { key: "admin", label: "Admin" },
  { key: "org_admin", label: "Org Admin" },
  { key: "super_admin", label: "Super Admin" },
];

const ORGANIZATION_OPTIONS = [
  { key: "awct", label: "AWCT.inc", locationGroups: ["JNAP", "Other", "SHAP"] },
  { key: "svl", label: "Signature Vehicle Logistics", locationGroups: ["SVL Main", "SVL Other"] },
] as const;

type OrganizationKey = (typeof ORGANIZATION_OPTIONS)[number]["key"];

function normalizedFacilityText(facility: FacilitySummary): string {
  return [facility.name, facility.slug, facility.id].filter(Boolean).join(" ").toLowerCase();
}

function getLocationGroup(organization: OrganizationKey, facility: FacilitySummary): string | null {
  const value = normalizedFacilityText(facility);
  const isSvl = /\bsvl\b|signature vehicle logistics/.test(value);

  if (organization === "svl") {
    if (!isSvl) return null;
    return /\bmain\b/.test(value) ? "SVL Main" : "SVL Other";
  }

  if (isSvl) return null;
  if (/\bjnap\b/.test(value)) return "JNAP";
  if (/\bshap\b/.test(value)) return "SHAP";
  return "Other";
}

export function InviteUserModal({
  facilities,
  trigger,
  canInviteUser,
  organizationMissingReason,
  mode = "invite",
  initialUser,
  onInvite,
}: InviteUserModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationKey>("awct");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => {
      const hasEmail = Boolean(email.trim());
      const inviteBlocked = !canInviteUser;
      return hasEmail && !isPending && !inviteBlocked && Boolean(selectedRole.trim());
    },
    [canInviteUser, email, isPending, selectedRole]
  );

  const toggleFacility = (facilityId: string) => {
    setSelectedFacilityIds((current) =>
      current.includes(facilityId) ? current.filter((id) => id !== facilityId) : [...current, facilityId]
    );
  };

  const resetForm = () => {
    setEmail(initialUser?.email ?? "");
    setDisplayName(initialUser?.displayName ?? "");
    setSelectedRole(initialUser?.role ?? "user");
    setSelectedFacilityIds(initialUser?.facilityIds ?? []);
    setSelectedOrganization("awct");
    setError(null);
  };

  const visibleLocationGroups = useMemo(() => {
    const organization = ORGANIZATION_OPTIONS.find((option) => option.key === selectedOrganization)!;
    return organization.locationGroups.map((group) => ({
      label: group,
      facilities: facilities.filter((facility) => getLocationGroup(selectedOrganization, facility) === group),
    }));
  }, [facilities, selectedOrganization]);

  const handleSubmit = async () => {
    const resolvedEmail = email.trim();
    if (!resolvedEmail || !selectedRole.trim() || !canInviteUser) {
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      await onInvite({
        email: resolvedEmail,
        display_name: displayName.trim() || undefined,
        role: selectedRole,
        facility_ids: selectedFacilityIds,
        invite: mode === "invite",
      });
      setIsOpen(false);
      resetForm();
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Unable to invite user.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (nextOpen) {
          resetForm();
        } else {
          setError(null);
          setIsPending(false);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{mode === "update" ? "Update User" : "Invite New User"}</DialogTitle>
          <DialogDescription>
            {mode === "update"
              ? "Update profile details and facility access for this user."
              : "Create a scoped invite and attach facility access in the same backend write."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly={mode === "update"}
              aria-readonly={mode === "update"}
            />
            {mode === "update" ? (
              <p className="text-xs text-slate-500">
                Email is the account identifier and cannot be changed by the user update endpoint.
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-display-name">Display name</Label>
            <Input
              id="invite-display-name"
              type="text"
              placeholder="Optional"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select onValueChange={setSelectedRole} value={selectedRole}>
              <SelectTrigger id="invite-role" className="bg-white text-slate-900 border-slate-200 shadow-sm">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.key} value={role.key}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-organization">Organization</Label>
            <Select value={selectedOrganization} onValueChange={(value) => setSelectedOrganization(value as OrganizationKey)}>
              <SelectTrigger id="invite-organization" className="bg-white text-slate-900 border-slate-200 shadow-sm">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZATION_OPTIONS.map((organization) => (
                  <SelectItem key={organization.key} value={organization.key}>
                    {organization.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="mt-2">Locations</Label>
            <div className="grid max-h-56 gap-3 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {visibleLocationGroups.map((group) => (
                <div key={group.label} className="grid gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group.label}</p>
                  {group.facilities.length ? (
                    group.facilities.map((facility) => {
                      const checked = selectedFacilityIds.includes(facility.id);
                      return (
                        <button
                          key={facility.id}
                          type="button"
                          onClick={() => toggleFacility(facility.id)}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                            checked ? "border-slate-900 bg-white text-slate-900" : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{facility.name}</span>
                            <span className="block truncate text-xs text-slate-500">{facility.slug || facility.id}</span>
                          </span>
                          <span className="ml-3 rounded-full border border-slate-200 px-2 py-0.5 text-xs font-semibold uppercase">
                            {checked ? "Selected" : "Add"}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">No backend locations in this group.</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="block font-medium text-slate-900">{mode === "update" ? "Save user changes" : "Send invite email"}</span>
            <span className="block text-xs text-slate-500">{mode === "update" ? "This updates the selected user without sending an invite." : "Always enabled."}</span>
          </div>
          {!canInviteUser ? (
            <p className="text-sm text-slate-500">
              Organization administrator permission is required to {mode === "update" ? "update this user" : "invite users"}.
            </p>
          ) : null}
          {organizationMissingReason ? <p className="text-sm text-slate-500">{organizationMissingReason}</p> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
            className="border-slate-300 bg-slate-700 text-white hover:bg-slate-600 hover:text-white focus-visible:ring-slate-500/30"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500/30"
          >
            {isPending ? (mode === "update" ? "Saving..." : "Inviting...") : mode === "update" ? "Save User" : "Invite User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
