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

export function InviteUserModal({
  facilities,
  trigger,
  canInviteUser,
  organizationMissingReason,
  onInvite,
}: InviteUserModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedRole, setSelectedRole] = useState("user");
  const [selectedFacilityIds, setSelectedFacilityIds] = useState<string[]>([]);
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
    setEmail("");
    setDisplayName("");
    setSelectedRole("user");
    setSelectedFacilityIds([]);
    setError(null);
  };

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
        invite: true,
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
        if (!nextOpen) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Create a scoped invite and attach facility access in the same backend write.
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
            />
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
            <Label>Facilities</Label>
            <div className="grid max-h-56 gap-2 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
              {facilities.length ? (
                facilities.map((facility) => {
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
                <p className="text-sm text-slate-500">No facilities available for this scope.</p>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <span className="block font-medium text-slate-900">Send invite email</span>
            <span className="block text-xs text-slate-500">Always enabled.</span>
          </div>
          {!canInviteUser ? <p className="text-sm text-slate-500">Invite access is disabled for this session.</p> : null}
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
            {isPending ? "Inviting..." : "Invite User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
