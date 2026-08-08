"use client";

import { useMemo, useState } from "react";
import { REFERENCE_HOME_DASHBOARD, validateDashboardDefinition } from "../definition-schema";
import type { RuntimeDashboardDefinition } from "../types";

export function DashboardUploadPanel({ onValidDefinition }: { onValidDefinition: (definition: RuntimeDashboardDefinition) => void }) {
  const [text, setText] = useState(() => JSON.stringify(REFERENCE_HOME_DASHBOARD, null, 2));
  const parsed = useMemo(() => {
    try {
      const definition = JSON.parse(text) as RuntimeDashboardDefinition;
      return { definition, validation: validateDashboardDefinition(definition), error: "" };
    } catch (error) {
      return { definition: null, validation: null, error: error instanceof Error ? error.message : "Invalid JSON" };
    }
  }, [text]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Dashboard JSON</p>
          <p className="mt-1 text-sm font-semibold text-slate-600">Paste a definition, validate it, then register it with the runtime API.</p>
        </div>
        <button
          type="button"
          disabled={!parsed.definition || !parsed.validation?.valid}
          onClick={() => parsed.definition && onValidDefinition(parsed.definition)}
          className="inline-flex h-9 items-center rounded-lg bg-slate-950 px-4 text-xs font-black uppercase tracking-[0.16em] text-white disabled:opacity-40"
        >
          Register
        </button>
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-4 h-[420px] w-full rounded-lg border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100 outline-none focus:border-slate-400"
        spellCheck={false}
      />
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs font-semibold text-slate-700">
        {parsed.error ? parsed.error : parsed.validation?.valid ? "Definition is valid." : parsed.validation?.errors.map((issue) => `${issue.path}: ${issue.message}`).join(" | ")}
      </div>
    </div>
  );
}
