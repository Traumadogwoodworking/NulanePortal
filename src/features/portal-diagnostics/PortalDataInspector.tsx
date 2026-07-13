"use client";

import type { CSSProperties } from "react";
import type { PortalDataInspectorInput } from "@/features/portal-diagnostics/portalDataInspectorModel";
import {
  isPortalDataInspectorRuntimeEnabled,
  normalizePortalDataInspectorInput,
} from "@/features/portal-diagnostics/portalDataInspectorNormalization";

const panelStyle: CSSProperties = {
  position: "fixed",
  left: 8,
  bottom: 8,
  zIndex: 2147483646,
  width: "min(520px, calc(100vw - 16px))",
  maxHeight: "min(480px, calc(100vh - 16px))",
  overflow: "auto",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.98)",
  color: "#0f172a",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.18)",
  fontSize: 12,
  lineHeight: 1.45,
};

const summaryStyle: CSSProperties = {
  cursor: "pointer",
  padding: "8px 10px",
  fontWeight: 600,
  userSelect: "none",
};

const outputStyle: CSSProperties = {
  margin: 0,
  padding: "0 10px 10px",
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};

export type PortalDataInspectorProps = {
  data: PortalDataInspectorInput;
  enabled?: boolean;
  defaultOpen?: boolean;
};

export function PortalDataInspector({
  data,
  enabled = true,
  defaultOpen = false,
}: PortalDataInspectorProps) {
  if (!enabled || !isPortalDataInspectorRuntimeEnabled()) return null;
  const snapshot = normalizePortalDataInspectorInput(data);

  return (
    <aside
      aria-label="Portal data inspector"
      data-portal-data-inspector
      style={panelStyle}
    >
      <details open={defaultOpen}>
        <summary style={summaryStyle}>Portal data inspector</summary>
        <pre style={outputStyle}>{JSON.stringify(snapshot, null, 2)}</pre>
      </details>
    </aside>
  );
}
