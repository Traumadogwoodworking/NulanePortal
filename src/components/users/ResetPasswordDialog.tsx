"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { resetUserPassword } from "@/lib/services/usersService";
import type { UserSummary } from "@/lib/types";

type ResetPasswordDialogProps = {
  organizationId: string | null | undefined;
  user: UserSummary | null;
  triggerLabel?: string;
  onSuccess: (message: string) => void | Promise<void>;
  onError: (message: string) => void;
  onPendingChange?: (isPending: boolean) => void;
};

function userHasDatabaseIdentity(user: UserSummary | null): boolean {
  if (!user) return false;
  const record = user as UserSummary & {
    isDeleted?: boolean;
    deleted?: boolean;
    deletedAt?: string | null;
    auth0Provider?: string;
    provider?: string;
    identityProvider?: string;
    identities?: Array<{ provider?: string; connection?: string; isSocial?: boolean }>;
  };
  const provider = record.auth0Provider || record.provider || record.identityProvider || record.identities?.[0]?.provider || "";
  const connection = record.identities?.[0]?.connection || "";
  if (provider && provider !== "auth0" && provider !== "database") {
    return false;
  }
  if (connection && connection !== "Username-Password-Authentication" && connection !== "email" && connection !== "database") {
    return false;
  }
  if (record.isDeleted || record.deleted || record.deletedAt) {
    return false;
  }
  return true;
}

export function canSendPasswordReset(user: UserSummary | null): boolean {
  if (!user) return false;
  if (!user.email.trim()) return false;
  if (!user.isActive) return false;
  if (user.status && ["deleted", "disabled", "inactive"].includes(user.status.toLowerCase())) return false;
  return userHasDatabaseIdentity(user);
}

export function ResetPasswordDialog({
  organizationId,
  user,
  triggerLabel = "Send reset email",
  onSuccess,
  onError,
  onPendingChange,
}: ResetPasswordDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUserId = user?.id ?? null;

  if (process.env.NODE_ENV !== "production") {
    console.info("[reset-password.trace] render", {
      dialogMounted: true,
      organizationId,
      userId: user?.id,
      emailPresent: Boolean(user?.email),
    });
  }

  const closeDialog = () => {
    setIsOpen(false);
    setError(null);
  };

  const handleConfirm = async () => {
    console.info("[reset-password.trace] confirm_clicked");
    console.info("[reset-password.trace] confirm_values", {
      organizationId,
      selectedUserId,
      selectedUserIdLooksAuth0: typeof selectedUserId === "string" && selectedUserId.startsWith("auth0|"),
      emailPresent: Boolean(user?.email),
    });
    if (!organizationId) {
      console.error("[reset-password.trace] blocked_missing_org");
      setError("Missing organization ID. Cannot send reset email.");
      return;
    }
    if (!selectedUserId) {
      console.error("[reset-password.trace] blocked_missing_user_id");
      setError("Missing backend user ID. Cannot send reset email.");
      return;
    }
    if (!user?.email) {
      console.error("[reset-password.trace] blocked_missing_email");
      setError("This user does not have an email address.");
      return;
    }
    setIsPending(true);
    onPendingChange?.(true);
    setError(null);
    try {
      console.info("[reset-password.trace] before_service_call", {
        organizationId,
        selectedUserId,
      });
      await resetUserPassword(organizationId, selectedUserId, "Portal admin requested password reset");
      console.info("[reset-password.trace] service_resolved");
      await onSuccess("Password reset email request sent.");
      closeDialog();
    } catch (resetError) {
      const message = resetError instanceof Error ? resetError.message : "Could not send password reset email.";
      console.error("[reset-password.trace] service_failed", {
        message,
      });
      setError(message);
      onError(message);
    } finally {
      setIsPending(false);
      onPendingChange?.(false);
    }
  };

  if (!organizationId || !user) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setIsOpen(nextOpen);
        if (!nextOpen) {
          setError(null);
        }
      }}
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          console.info("[reset-password.trace] open_clicked", {
            organizationId,
            userId: user?.id,
            emailPresent: Boolean(user?.email),
          });
          setIsOpen(true);
        }}
        disabled={isPending}
        title={`Send a password reset email to ${user.email}`}
        className="w-full py-2 rounded-lg border border-slate-200 text-sm font-black uppercase tracking-widest text-center justify-center text-slate-600 hover:bg-slate-50 transition-all disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Sending..." : triggerLabel}
      </Button>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Send password reset email?</DialogTitle>
          <DialogDescription>
            This will send a password reset email to {user.email}. The user will choose their own new password through Auth0.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-semibold text-slate-900">{user.name || "Selected user"}</p>
            <p className="text-slate-600">{user.email}</p>
          </div>
          {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={isPending}
            className="border-slate-300 bg-slate-700 text-white hover:bg-slate-600 hover:text-white focus-visible:ring-slate-500/30"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={isPending}
            className="bg-emerald-600 text-white hover:bg-emerald-500 focus-visible:ring-emerald-500/30"
          >
            {isPending ? "Sending..." : "Send reset email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
