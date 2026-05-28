"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FacilityFormValue = {
  name: string;
  slug: string;
  region: string;
  active: boolean;
};

interface FacilityModalProps {
  trigger: ReactNode;
  title: string;
  description: string;
  submitLabel: string;
  facility?: FacilityFormValue | null;
  disabledReason?: string | null;
  onSubmit: (payload: FacilityFormValue) => Promise<void>;
}

const EMPTY_FORM: FacilityFormValue = {
  name: "",
  slug: "",
  region: "",
  active: true,
};

function slugifyFacilityName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function FacilityModal({
  trigger,
  title,
  description,
  submitLabel,
  facility,
  disabledReason,
  onSubmit,
}: FacilityModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<FacilityFormValue>(EMPTY_FORM);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(form.name.trim()) && Boolean(form.slug.trim()) && !isPending && !disabledReason;
  }, [disabledReason, form.name, form.slug, isPending]);

  const handleSubmit = async () => {
    if (!canSubmit) {
      return;
    }
    setIsPending(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        slug: form.slug.trim(),
        region: form.region.trim(),
        active: form.active,
      });
      setIsOpen(false);
      setForm(EMPTY_FORM);
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unable to save facility.");
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
          setForm(facility ?? EMPTY_FORM);
        } else {
          setError(null);
          setIsPending(false);
          setForm(EMPTY_FORM);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
          {disabledReason ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {disabledReason}
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="facility-name">Facility name</Label>
            <Input
              id="facility-name"
              type="text"
              placeholder="Facility name"
              value={form.name}
              onChange={(event) => {
                const nextName = event.target.value;
                setForm((current) => ({
                  ...current,
                  name: nextName,
                  slug: current.slug || slugifyFacilityName(nextName),
                }));
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="facility-slug">Facility slug</Label>
            <Input
              id="facility-slug"
              type="text"
              placeholder="facility-name"
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="facility-region">Region</Label>
            <Input
              id="facility-region"
              type="text"
              placeholder="Optional"
              value={form.region}
              onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
            />
          </div>
          <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span>
              <span className="block font-medium text-slate-900">Active</span>
              <span className="block text-xs text-slate-500">Disable to archive the facility in the control plane.</span>
            </span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
          </label>
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
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
