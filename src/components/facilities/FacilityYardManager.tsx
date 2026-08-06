"use client";

import { useMemo, useState } from "react";
import { Check, MapPin, Minus, Pencil, Plus, Trash2 } from "lucide-react";
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
import type { FacilityYard } from "@/lib/types";

export type FacilityYardDraft = {
  name: string;
  code: string;
  active: boolean;
  areaNames: string[];
};

interface FacilityYardManagerProps {
  yards: FacilityYard[];
  disabledReason?: string | null;
  onSave: (yardId: string | null, draft: FacilityYardDraft) => Promise<void>;
  onRemove: (yard: FacilityYard) => Promise<void>;
}

type YardFormState = {
  name: string;
  code: string;
  active: boolean;
  areasText: string;
};

const EMPTY_FORM: YardFormState = {
  name: "",
  code: "",
  active: true,
  areasText: "",
};

function codeFromName(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function normalizeYardAreaNames(value: string) {
  const seen = new Set<string>();
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => {
      const key = entry.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function FacilityYardManager({
  yards,
  disabledReason,
  onSave,
  onRemove,
}: FacilityYardManagerProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingYard, setEditingYard] = useState<FacilityYard | null>(null);
  const [form, setForm] = useState<YardFormState>(EMPTY_FORM);
  const [removeTarget, setRemoveTarget] = useState<FacilityYard | null>(null);
  const [removeConfirmation, setRemoveConfirmation] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const duplicateCode = useMemo(() => {
    const normalizedCode = form.code.trim().toLowerCase();
    if (!normalizedCode) return false;
    return yards.some(
      (yard) => yard.yardId !== editingYard?.yardId && yard.code.trim().toLowerCase() === normalizedCode
    );
  }, [editingYard?.yardId, form.code, yards]);

  const canSave = Boolean(form.name.trim() && form.code.trim())
    && !duplicateCode
    && !disabledReason
    && !isPending;
  const canRemove = Boolean(
    removeTarget && removeConfirmation.trim() === removeTarget.name.trim() && !isPending
  );

  const openAdd = () => {
    setEditingYard(null);
    setForm(EMPTY_FORM);
    setCodeManuallyEdited(false);
    setError(null);
    setIsEditorOpen(true);
  };

  const openEdit = (yard: FacilityYard) => {
    setEditingYard(yard);
    setForm({
      name: yard.name,
      code: yard.code,
      active: yard.active,
      areasText: yard.areas.map((area) => area.name).join("\n"),
    });
    setCodeManuallyEdited(true);
    setError(null);
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    if (isPending) return;
    setIsEditorOpen(false);
    setEditingYard(null);
    setForm(EMPTY_FORM);
    setCodeManuallyEdited(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setIsPending(true);
    setError(null);
    try {
      await onSave(editingYard?.yardId ?? null, {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        active: form.active,
        areaNames: normalizeYardAreaNames(form.areasText),
      });
      setIsEditorOpen(false);
      setEditingYard(null);
      setForm(EMPTY_FORM);
      setCodeManuallyEdited(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save yard.");
    } finally {
      setIsPending(false);
    }
  };

  const requestRemove = (yard: FacilityYard) => {
    setRemoveTarget(yard);
    setRemoveConfirmation("");
    setError(null);
  };

  const closeRemove = () => {
    if (isPending) return;
    setRemoveTarget(null);
    setRemoveConfirmation("");
    setError(null);
  };

  const handleRemove = async () => {
    if (!removeTarget || !canRemove) return;
    setIsPending(true);
    setError(null);
    try {
      await onRemove(removeTarget);
      setRemoveTarget(null);
      setRemoveConfirmation("");
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Unable to remove yard.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="space-y-2" aria-labelledby="facility-yards-heading">
      <div className="flex items-center justify-between gap-2 px-1">
        <div>
          <p id="facility-yards-heading" className="text-xs font-black uppercase tracking-widest text-slate-400">
            Yards &amp; Areas
          </p>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-300">
            {yards.length} configured
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          disabled={Boolean(disabledReason) || isPending}
          title={disabledReason || "Add a yard to this facility"}
          className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          Add Yard
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-2">
        {yards.length ? (
          <div className="space-y-2">
            {yards.map((yard) => (
              <div key={yard.yardId} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-slate-900">{yard.name}</p>
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{yard.code}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-black uppercase tracking-widest text-slate-500">
                    {yard.active ? <Check className="h-3 w-3 text-emerald-500" /> : <Minus className="h-3 w-3 text-slate-300" />}
                    {yard.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Areas</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {yard.areas.length ? yard.areas.map((area) => (
                      <span
                        key={area.areaId}
                        className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-600"
                      >
                        {area.name}
                      </span>
                    )) : (
                      <span className="text-xs font-medium text-slate-400">No areas configured</span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(yard)}
                    disabled={Boolean(disabledReason) || isPending}
                    aria-label={`Edit ${yard.name}`}
                    className="rounded-full border border-slate-200 bg-white p-1.5 text-slate-500 hover:text-brand disabled:opacity-50"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => requestRemove(yard)}
                    disabled={Boolean(disabledReason) || isPending}
                    aria-label={`Remove ${yard.name}`}
                    className="rounded-full border border-rose-200 bg-white p-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No yards configured</p>
          </div>
        )}
      </div>

      <Dialog open={isEditorOpen} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingYard ? "Edit yard" : "Add yard"}</DialogTitle>
            <DialogDescription>
              Configure a yard and its named operating areas for this facility.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
            <div className="grid gap-2">
              <Label htmlFor="yard-name">Yard name</Label>
              <Input
                id="yard-name"
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  setForm((current) => ({
                    ...current,
                    name,
                    code: codeManuallyEdited ? current.code : codeFromName(name),
                  }));
                }}
                placeholder="North Storage Yard"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yard-code">Yard code</Label>
              <Input
                id="yard-code"
                value={form.code}
                onChange={(event) => {
                  setCodeManuallyEdited(true);
                  setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }));
                }}
                placeholder="NORTH"
              />
              {duplicateCode ? <p className="text-xs font-semibold text-rose-600">Yard codes must be unique within this facility.</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yard-areas">Areas</Label>
              <textarea
                id="yard-areas"
                value={form.areasText}
                onChange={(event) => setForm((current) => ({ ...current, areasText: event.target.value }))}
                placeholder={"Inbound\nInspection\nOutbound"}
                rows={5}
                className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-brand/30"
              />
              <p className="text-xs text-slate-500">Enter one area per line or separate names with commas.</p>
            </div>
            <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <span>
                <span className="block font-medium text-slate-900">Active</span>
                <span className="block text-xs text-slate-500">Inactive yards remain configured but are not available for new work.</span>
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
            <Button type="button" variant="outline" onClick={closeEditor} disabled={isPending}>Cancel</Button>
            <Button type="button" onClick={() => void handleSave()} disabled={!canSave}>
              {isPending ? "Saving..." : editingYard ? "Save yard" : "Add yard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(removeTarget)} onOpenChange={(open) => !open && closeRemove()}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Remove yard?</DialogTitle>
            <DialogDescription>
              This removes the yard and its {removeTarget?.areas.length ?? 0} configured areas from the facility.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            {error ? <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
            <Label htmlFor="remove-yard-confirmation">
              Type <span className="font-black">{removeTarget?.name}</span> to confirm
            </Label>
            <Input
              id="remove-yard-confirmation"
              value={removeConfirmation}
              onChange={(event) => setRemoveConfirmation(event.target.value)}
              disabled={isPending}
              autoComplete="off"
            />
            <p className="text-xs text-slate-500">The yard name must match exactly.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeRemove} disabled={isPending}>Cancel</Button>
            <Button
              type="button"
              onClick={() => void handleRemove()}
              disabled={!canRemove}
              className="bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500/30"
            >
              {isPending ? "Removing..." : "Remove yard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
