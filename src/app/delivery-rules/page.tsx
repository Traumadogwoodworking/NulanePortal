"use client";

import { useEffect, useMemo, useState } from "react";
import { CirclePlus, Lock, Search, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DAMAGE_AREAS, DAMAGE_SEVERITIES, getDamageTypeOptionsForArea } from "@/lib/docudent/damageTaxonomy";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import {
  createDeliveryRule,
  deleteDeliveryRule,
  fetchDeliveryRuleOptions,
  fetchDeliveryRules,
  updateDeliveryRule,
} from "@/lib/services/deliveryRulesService";
import type {
  DeliveryRule,
  DeliveryRuleCategory,
  DeliveryRuleDamageSelection,
  DeliveryRuleOptions,
  DeliveryRuleTriggerKind,
} from "@/lib/types";

type RuleDraft = {
  id: string;
  name: string;
  enabled: boolean;
  category: DeliveryRuleCategory;
  triggerKind: DeliveryRuleTriggerKind;
  facilityTrigger: { facilityId: string; facilityName?: string } | null;
  damageTrigger: DeliveryRuleDamageSelection | null;
  ccInput: string;
  source?: DeliveryRule["source"];
};

type RuleDraftSnapshot = Omit<RuleDraft, "source">;

const EMPTY_RULE_ID = "new-rule";

function normalizeEmailList(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function emailIsValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function displayCategory(category: DeliveryRuleCategory) {
  if (category === "facility") return "Facility";
  if (category === "general") return "General";
  return "Custom";
}

function displayTriggerKind(triggerKind: DeliveryRuleTriggerKind) {
  if (triggerKind === "facility") return "Facility only";
  if (triggerKind === "damage") return "Damage only";
  return "Facility + Damage";
}

function ruleTypeFromDraft(draft: Pick<RuleDraft, "category" | "triggerKind">) {
  return `${displayCategory(draft.category)} / ${displayTriggerKind(draft.triggerKind)}`;
}

function recipientCount(rule: DeliveryRule) {
  return [...(rule.actions?.cc || []), ...(rule.actions?.bcc || [])].filter(Boolean).length;
}

function triggerSummary(rule: DeliveryRule, options: DeliveryRuleOptions | null) {
  const facilityName =
    rule.facilityTrigger?.facilityName ||
    options?.facilities.find((facility) => facility.facilityId === rule.facilityTrigger?.facilityId)?.facilityName ||
    rule.facilityTrigger?.facilityId;
  const area = rule.damageTrigger?.area?.label;
  const damageType = rule.damageTrigger?.damageType?.label;
  const severity = rule.damageTrigger?.severity?.label;

  if (rule.triggerKind === "facility") {
    return facilityName ? `Facility: ${facilityName.toUpperCase()}` : "Facility trigger";
  }
  if (rule.triggerKind === "damage") {
    return `Damage: ${[area, damageType, severity].filter(Boolean).join(" / ") || "Any damage"}`;
  }
  return `Facility + Damage: ${(facilityName || "Selected facility").toUpperCase()} + ${[area, damageType, severity].filter(Boolean).join(" / ") || "Any damage"}`;
}

function buildAssignedUserLabels(emails: string[]) {
  return emails
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email, label: email }));
}

function makeDraft(rule: DeliveryRule): RuleDraft {
  const cc = rule.actions?.cc || [];
  return {
    id: rule.id,
    name: rule.name,
    enabled: rule.enabled,
    category: rule.category,
    triggerKind: rule.triggerKind,
    facilityTrigger: rule.facilityTrigger,
    damageTrigger: rule.damageTrigger,
    ccInput: cc.join(", "),
    source: rule.source,
  };
}

function buildPayload(draft: RuleDraft) {
  const cc = normalizeEmailList(draft.ccInput);
  return {
    name: (draft.name || "").trim(),
    enabled: Boolean(draft.enabled),
    category: draft.category || "facility",
    triggerKind: draft.triggerKind || "facility",
    facilityTrigger: draft.facilityTrigger && draft.triggerKind !== "damage" ? { facilityId: draft.facilityTrigger.facilityId } : null,
    damageTrigger: draft.damageTrigger && draft.triggerKind !== "facility" ? draft.damageTrigger : null,
    actions: { cc, bcc: [] },
  };
}

function validateDraft(draft: RuleDraft) {
  const errors: string[] = [];
  const cc = normalizeEmailList(draft.ccInput);

  if (!draft.name.trim()) errors.push("Name is required.");
  if (!draft.facilityTrigger && !draft.damageTrigger) errors.push("Add at least one trigger.");
  if (draft.facilityTrigger && !draft.facilityTrigger.facilityId) errors.push("Select a facility for the facility trigger.");
  if (draft.damageTrigger && !draft.damageTrigger.area && !draft.damageTrigger.damageType && !draft.damageTrigger.severity) {
    errors.push("Select at least one damage field for the damage trigger.");
  }
  if (!cc.length) errors.push("Add at least one CC email.");
  if (cc.some((email) => !emailIsValid(email))) errors.push("Enter valid email addresses.");

  return { errors, cc };
}

function sameSelection(a: DeliveryRule | ReturnType<typeof buildPayload>, b: DeliveryRule | ReturnType<typeof buildPayload>) {
  const aCc = a.actions.cc.join("|");
  const bCc = b.actions.cc.join("|");
  const aBcc = a.actions.bcc.join("|");
  const bBcc = b.actions.bcc.join("|");
  return (
    a.category === b.category &&
    a.triggerKind === b.triggerKind &&
    a.facilityTrigger?.facilityId === b.facilityTrigger?.facilityId &&
    a.damageTrigger?.area?.id === b.damageTrigger?.area?.id &&
    a.damageTrigger?.damageType?.id === b.damageTrigger?.damageType?.id &&
    a.damageTrigger?.severity?.id === b.damageTrigger?.severity?.id &&
    aCc === bCc &&
    aBcc === bBcc
  );
}

function snapshotDraft(draft: RuleDraft): RuleDraftSnapshot {
  const { source: _source, ...rest } = draft;
  return rest;
}

function draftsEqual(a: RuleDraft | null, b: RuleDraft | null) {
  if (!a || !b) return a === b;
  return JSON.stringify(snapshotDraft(a)) === JSON.stringify(snapshotDraft(b));
}

function isDraftDirty(draft: RuleDraft | null, selectedRule: DeliveryRule | null) {
  if (!draft) return false;
  if (!selectedRule) {
    return Boolean(draft.name.trim() || draft.facilityTrigger || draft.damageTrigger || draft.ccInput.trim());
  }
  return !draftsEqual(draft, makeDraft(selectedRule));
}

function isLockedRule(rule: DeliveryRule | null) {
  return Boolean(rule?.source?.readOnly || rule?.source?.migrationRequired);
}

export default function DeliveryRulesPage() {
  const { organizationId } = usePortalSession();
  const { data: directory } = usePortalDirectorySnapshot();
  const [rules, setRules] = useState<DeliveryRule[]>([]);
  const [options, setOptions] = useState<DeliveryRuleOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | DeliveryRuleCategory>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [ccEntry, setCcEntry] = useState("");

  useEffect(() => {
    if (!organizationId) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);
    Promise.all([fetchDeliveryRules(), fetchDeliveryRuleOptions()])
      .then(([ruleResponse, optionResponse]) => {
        if (!active) return;
        setRules(ruleResponse.delivery_rules || []);
        setOptions(optionResponse);
        setSelectedId((current) => current ?? ruleResponse.delivery_rules?.[0]?.id ?? null);
        setDraft((current) => {
          if (current) return current;
          const initial = ruleResponse.delivery_rules?.[0];
          return initial ? makeDraft(initial) : null;
        });
      })
      .catch((fetchError) => {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load delivery rules.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId]);

  const visibleRules = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesKind = kindFilter === "all" || rule.category === kindFilter;
      const matchesSearch =
        !needle ||
        [rule.name, rule.source?.displayLabel, rule.facilityTrigger?.facilityName, rule.damageTrigger?.area?.label, rule.damageTrigger?.damageType?.label, rule.damageTrigger?.severity?.label, ...rule.actions.cc, ...rule.actions.bcc]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      return matchesKind && matchesSearch;
    });
  }, [rules, search, kindFilter]);

  const selectedRule = useMemo(() => rules.find((rule) => rule.id === selectedId) ?? null, [rules, selectedId]);
  const selectedRuleLocked = isLockedRule(selectedRule);
  const draftDirty = isDraftDirty(draft, selectedRule) || Boolean(ccEntry.trim());
  useEffect(() => {
    if (draft || !selectedRule) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(makeDraft(selectedRule));
  }, [draft, selectedRule]);

  const duplicateWarning = useMemo(() => {
    if (!draft) return null;
    const payload = buildPayload(draft);
    const duplicate = rules.find((rule) => rule.id !== draft.id && sameSelection(rule, payload));
    return duplicate ? "A matching delivery rule already exists. Edit the existing rule instead." : null;
  }, [draft, rules]);

  const draftCcEmails = useMemo(() => normalizeEmailList(draft?.ccInput || ""), [draft?.ccInput]);
  const draftCcChipLabels = useMemo(
    () => draftCcEmails.map((email) => ({ email, label: email })),
    [draftCcEmails]
  );
  const selectedFacility = draft?.facilityTrigger?.facilityId
    ? directory?.facilities.find((facility) => facility.id === draft.facilityTrigger?.facilityId)
    : null;

  const damageTypeOptions = useMemo(
    () =>
      Array.from(
        new Map(
          DAMAGE_AREAS.flatMap((area) => getDamageTypeOptionsForArea(area.code)).map((item) => [
            item.code,
            {
              value: item.code,
              label: `${item.code} - ${item.name}`,
            },
          ])
        ).values()
      ).sort((left, right) => Number(left.value) - Number(right.value) || left.label.localeCompare(right.label)),
    []
  );

  const handleNewRule = () => {
    if (draftDirty && !window.confirm("You have unsaved changes. Continue with a new rule and discard your current changes?")) {
      return;
    }
    const next: RuleDraft = {
      id: EMPTY_RULE_ID,
      name: "",
      enabled: true,
      category: "facility",
      triggerKind: "facility",
      facilityTrigger: null,
      damageTrigger: null,
      ccInput: "",
    };
    setSelectedId(null);
    setDraft(next);
    setCcEntry("");
    setEditorError(null);
    setSaveMessage(null);
  };

  const addCcValue = (value: string) => {
    if (!draft) return false;
    const addedEmails = normalizeEmailList(value);
    if (!addedEmails.length) return false;
    if (addedEmails.some((email) => !emailIsValid(email))) {
      setEditorError("Enter a valid email address before adding it.");
      return false;
    }
    const nextEmails = normalizeEmailList([draft.ccInput, ...addedEmails].join("\n"));
    setDraft({ ...draft, ccInput: nextEmails.join(", ") });
    setCcEntry("");
    setEditorError(null);
    return true;
  };

  const removeCcEmail = (email: string) => {
    if (!draft) return;
    const nextEmails = normalizeEmailList(draft.ccInput).filter((current) => current !== email.toLowerCase());
    setDraft({ ...draft, ccInput: nextEmails.join(", ") });
  };

  const persistDraft = async (mode: "create" | "update") => {
    if (!draft) return;
    if (selectedRuleLocked) {
      setEditorError("Locked rules are managed by platform support and cannot be modified here.");
      return;
    }
    if (ccEntry.trim()) {
      setEditorError("Press Enter or Add to include the email you are typing before saving.");
      return;
    }
    setEditorError(null);
    const validation = validateDraft(draft);
    if (validation.errors.length) {
      setEditorError(validation.errors[0]);
      return;
    }
    if (duplicateWarning) {
      setEditorError(duplicateWarning);
      return;
    }
    const payload = buildPayload({ ...draft, ccInput: validation.cc.join(", ") });
    try {
      const result =
        mode === "create"
          ? await createDeliveryRule(payload)
          : await updateDeliveryRule(draft.id, payload);
      setRules((current) => {
        const next = mode === "create" ? [result, ...current] : current.map((rule) => (rule.id === result.id ? result : rule));
        return next;
      });
      setSelectedId(result.id);
      setDraft(makeDraft(result));
      setCcEntry("");
      setSaveMessage(mode === "create" ? "Rule created." : "Rule updated.");
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unable to save delivery rule.";
      if (message.toLowerCase().includes("read-only") || message.toLowerCase().includes("cannot be edited")) {
        setEditorError("This existing source cannot be edited from this screen yet.");
      } else {
        setEditorError(message);
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedRule) return;
    if (selectedRuleLocked) {
      setEditorError("Locked rules are managed by platform support and cannot be deleted here.");
      return;
    }
    if (!window.confirm(`Delete "${selectedRule.name}"?`)) return;
    try {
      await deleteDeliveryRule(selectedRule.id);
      setRules((current) => current.filter((rule) => rule.id !== selectedRule.id));
      setSelectedId(null);
      setDraft(null);
      setCcEntry("");
      setSaveMessage("Rule deleted.");
    } catch (deleteError) {
      setEditorError(deleteError instanceof Error ? deleteError.message : "Unable to delete delivery rule.");
    }
  };

  if (!organizationId) {
    return <EmptyState title="Organization context required" description="Select an organization to manage delivery rules." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={handleNewRule} className="bg-slate-900 text-white hover:bg-slate-800">
          <CirclePlus className="h-4 w-4" />
          + New Rule
        </Button>
        {saveMessage ? <span className="text-sm text-emerald-700">{saveMessage}</span> : null}
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="relative min-w-72 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search delivery rules" className="pl-9" />
          </div>
          <div className="w-56 space-y-1">
            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-500">Delivery Type</Label>
            <Select value={kindFilter} onValueChange={(value) => setKindFilter(value as "all" | DeliveryRuleCategory)}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="facility">Facility</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? <EmptyState title="Delivery Rules unavailable" description={error} tone="danger" /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="border-2 border-slate-300 bg-white shadow-sm">
          <CardContent className="space-y-3 p-4">
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-400">Loading delivery rules...</div>
            ) : visibleRules.length ? (
              visibleRules.map((rule) => {
                const locked = isLockedRule(rule);
                return (
	                <button
	                  key={rule.id}
	                  type="button"
	                  onClick={() => {
	                    if (locked) return;
	                    if (draftDirty && !window.confirm("You have unsaved changes. Continue to this rule and discard your current changes?")) {
	                      return;
	                    }
                    setSelectedId(rule.id);
                    setDraft(makeDraft(rule));
                    setCcEntry("");
                    setEditorError(null);
                  }}
	                  aria-disabled={locked}
	                  className={`relative w-full rounded-2xl border px-4 py-3 text-left transition ${
	                    locked
	                      ? "cursor-not-allowed border-blue-200 bg-blue-50/30"
	                      : selectedId === rule.id
	                        ? "border-slate-900 bg-slate-50"
	                        : "border-slate-200 hover:border-slate-300"
	                  }`}
                >
                  {locked ? (
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-black uppercase tracking-widest text-blue-700">
                      <Lock className="h-3 w-3" />
                      LOCKED RULES
                    </span>
                  ) : null}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{rule.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${rule.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">{displayCategory(rule.category)}</span>
                      </div>
                      <p className="text-sm text-slate-600">{triggerSummary(rule, options)}</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Email recipients: {recipientCount(rule)}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {buildAssignedUserLabels(rule.actions.cc).map((user) => (
                          <span key={`${rule.id}-${user.email}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                            {user.label}
                          </span>
                        ))}
                      </div>
                    </div>
	                    <div className="flex flex-col items-end gap-2 pr-28">
	                      <div className="flex flex-wrap justify-end gap-2">
	                        {!locked && rule.source?.migrationRequired ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Existing source</span> : null}
	                        {!locked && rule.source?.kind === "email_delivery_rules" ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Delivery rule</span> : null}
	                      </div>
                    </div>
                  </div>
                </button>
              );})
            ) : (
              <EmptyState title="No delivery rules found" description="Create a rule or widen the filters." />
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-slate-300 bg-white shadow-sm">
          <CardContent className="space-y-5 p-5">
            {!draft ? (
              <EmptyState title="Select a rule" description="Create a new rule or choose one from the list." />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Rule editor</p>
                          <p className="mt-1 text-sm text-slate-500">Changes are saved explicitly from the top-right action.</p>
                          {selectedRuleLocked ? (
                            <p className="mt-2 inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-black uppercase tracking-widest text-blue-700">
                              <Lock className="h-3 w-3" />
                              Locked rule
                            </p>
                          ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => persistDraft(draft.id === EMPTY_RULE_ID ? "create" : "update")} disabled={selectedRuleLocked} className="border-slate-200 bg-white">
                      Save
                    </Button>
                    {selectedRule ? (
                      <Button type="button" variant="destructive" onClick={handleDelete} disabled={selectedRuleLocked}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>

                {editorError ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{editorError}</div> : null}
                {duplicateWarning ? <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{duplicateWarning}</div> : null}

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-2">
                    <Label htmlFor="rule-name">Rule name</Label>
                    <Input id="rule-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Main Yard significant hood damage" />
                  </div>
                  <div className="space-y-2">
                    <Label>Rule type</Label>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900">{ruleTypeFromDraft(draft)}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => {
                        if (draft.facilityTrigger) return;
                        setDraft({
                          ...draft,
                          category: draft.damageTrigger ? "custom" : "facility",
                          triggerKind: draft.damageTrigger ? "facility_and_damage" : "facility",
                          facilityTrigger: { facilityId: "", facilityName: "" },
                        });
                      }}
                    >
                      <CirclePlus className="h-4 w-4" />
                      + Facility Trigger
                    </Button>
                    <Button
                      type="button"
                      className="bg-amber-600 text-white hover:bg-amber-700"
                      onClick={() => {
                        if (draft.damageTrigger) return;
                        setDraft({
                          ...draft,
                          category: draft.facilityTrigger ? "custom" : "general",
                          triggerKind: draft.facilityTrigger ? "facility_and_damage" : "damage",
                          damageTrigger: {},
                        });
                      }}
                    >
                      <CirclePlus className="h-4 w-4" />
                      + Damage Trigger
                    </Button>
                  </div>

                  {draft.facilityTrigger ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Facility trigger</p>
                          <p className="text-xs text-slate-500">Select one facility.</p>
                        </div>
                        <button
                          type="button"
                          className="text-sm font-medium text-slate-500 hover:text-slate-900"
                          onClick={() =>
                            setDraft({ ...draft, facilityTrigger: null, category: draft.damageTrigger ? "general" : "general", triggerKind: draft.damageTrigger ? "damage" : "damage" })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Facility</Label>
                        <Select
                          value={draft.facilityTrigger.facilityId}
                          onValueChange={(facilityId) => {
                            const selected = directory?.facilities.find((facility) => facility.id === facilityId);
                            setDraft({
                              ...draft,
                              facilityTrigger: facilityId ? { facilityId, facilityName: selected?.name } : null,
                              category: draft.damageTrigger ? "custom" : "facility",
                              triggerKind: draft.damageTrigger ? "facility_and_damage" : "facility",
                            });
                          }}
                        >
                          <SelectTrigger className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                            <SelectValue placeholder="Select a facility" />
                          </SelectTrigger>
                          <SelectContent position="popper" align="start">
                            {directory?.facilities.length ? (
                              directory.facilities.map((facility) => (
                                <SelectItem key={facility.id} value={facility.id}>
                                  {facility.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-slate-500">No facilities available</div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}

                  {draft.damageTrigger ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Damage trigger</p>
                          <p className="text-xs text-slate-500">Any selected field may be blank.</p>
                        </div>
                        <button
                          type="button"
                          className="text-sm font-medium text-slate-500 hover:text-slate-900"
                          onClick={() =>
                            setDraft({ ...draft, damageTrigger: null, category: draft.facilityTrigger ? "facility" : "facility", triggerKind: "facility" })
                          }
                        >
                          Remove
                        </button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Area</Label>
                          <Select
                            value={draft.damageTrigger.area?.id || ""}
                            onValueChange={(value) => {
                              const selectedArea = DAMAGE_AREAS.find((area) => area.code === value) || null;
                              setDraft({
                                ...draft,
                                damageTrigger: {
                                  ...(draft.damageTrigger || {}),
                                  area: selectedArea ? { id: selectedArea.code, code: selectedArea.code, label: selectedArea.name } : null,
                                },
                              });
                            }}
                          >
                            <SelectTrigger className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                              <SelectValue placeholder="Select an area" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                              {DAMAGE_AREAS.map((item) => (
                                <SelectItem key={`area-${item.code}-${item.name}`} value={item.code}>
                                  {item.code} - {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Damage Type</Label>
                          <Select
                            value={draft.damageTrigger.damageType?.id || ""}
                            onValueChange={(value) => {
                              const selectedType = damageTypeOptions.find((item) => item.value === value) || null;
                              setDraft({
                                ...draft,
                                damageTrigger: {
                                  ...(draft.damageTrigger || {}),
                                  damageType: selectedType ? { id: selectedType.value, code: selectedType.value, label: selectedType.label } : null,
                                },
                              });
                            }}
                          >
                            <SelectTrigger className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                              <SelectValue placeholder="Select a damage type" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                              {damageTypeOptions.map((item) => (
                                <SelectItem key={`damage-type-${item.value}-${item.label}`} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Severity</Label>
                          <Select
                            value={draft.damageTrigger.severity?.id || ""}
                            onValueChange={(value) => {
                              const selectedSeverity = DAMAGE_SEVERITIES.find((item) => item.value === value) || null;
                              setDraft({
                                ...draft,
                                damageTrigger: {
                                  ...(draft.damageTrigger || {}),
                                  severity: selectedSeverity ? { id: selectedSeverity.value, code: selectedSeverity.value, label: selectedSeverity.label } : null,
                                },
                              });
                            }}
                          >
                            <SelectTrigger className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900">
                              <SelectValue placeholder="Select a severity" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start">
                              {DAMAGE_SEVERITIES.map((item) => (
                                <SelectItem key={`severity-${item.value}-${item.label}`} value={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cc-emails">Assigned users</Label>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {draftCcChipLabels.map((entry) => (
                        <span key={entry.email} className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-800">
                          <span className="max-w-[18rem] truncate font-medium">{entry.label}</span>
                          <button
                            type="button"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 hover:bg-slate-300"
                            aria-label={`Remove ${entry.label}`}
                            onClick={() => removeCcEmail(entry.email)}
                          >
                            <span className="text-[12px] leading-none">x</span>
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input
                        id="cc-emails"
                        type="email"
                        value={ccEntry}
                        onChange={(event) => {
                          setCcEntry(event.target.value);
                          if (editorError?.startsWith("Enter a valid email")) setEditorError(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            addCcValue(ccEntry);
                          }
                        }}
                        onPaste={(event) => {
                          const paste = event.clipboardData.getData("text");
                          if (!/[\n,;]/.test(paste)) return;
                          event.preventDefault();
                          addCcValue(paste);
                        }}
                        disabled={selectedRuleLocked}
                        placeholder="claims@example.com"
                        className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addCcValue(ccEntry)}
                        disabled={selectedRuleLocked || !ccEntry.trim()}
                        className="h-10 shrink-0"
                      >
                        Add email
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Type one email and press Enter or Add email. Added recipients appear above; use x to remove one.</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
