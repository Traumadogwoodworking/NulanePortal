"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FacilityRemovalTarget = {
  id: string;
  name: string;
};

interface RemoveFacilityDialogProps {
  open: boolean;
  facility: FacilityRemovalTarget | null;
  assignedUserCount: number;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (confirmationName: string) => Promise<void>;
}

export function isExactFacilityRemovalConfirmation(
  confirmationName: string,
  facilityName: string
) {
  const expectedName = facilityName.trim();
  return Boolean(expectedName) && confirmationName.trim() === expectedName;
}

export function RemoveFacilityDialog({
  open,
  facility,
  assignedUserCount,
  isPending,
  onOpenChange,
  onConfirm,
}: RemoveFacilityDialogProps) {
  const [confirmationName, setConfirmationName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = useMemo(
    () => isExactFacilityRemovalConfirmation(confirmationName, facility?.name ?? ""),
    [confirmationName, facility?.name]
  );

  const handleConfirm = async () => {
    if (!facility || !isConfirmed || isPending) return;
    setError(null);
    try {
      await onConfirm(confirmationName.trim());
    } catch (removalError) {
      setError(removalError instanceof Error ? removalError.message : "Unable to remove facility.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Remove facility?</DialogTitle>
          <DialogDescription>
            This permanently removes the facility record and its direct assignments. Facility-specific email,
            routing, and branding configuration will be disabled. Existing inspection and report records are retained.
          </DialogDescription>
        </DialogHeader>

        {facility ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              <p className="font-black">{facility.name}</p>
              <p className="mt-1 text-xs font-semibold">
                {assignedUserCount === 1
                  ? "1 directly assigned user will lose this facility assignment."
                  : `${assignedUserCount} directly assigned users will lose this facility assignment.`}
              </p>
            </div>

            {error ? (
              <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="remove-facility-confirmation">
                Type <span className="font-black">{facility.name}</span> to confirm
              </Label>
              <Input
                id="remove-facility-confirmation"
                type="text"
                autoComplete="off"
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-slate-500">The name must match exactly.</p>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!facility || !isConfirmed || isPending}
            className="bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500/30"
          >
            {isPending ? "Removing..." : "Remove facility"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
