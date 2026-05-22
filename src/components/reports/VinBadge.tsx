"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";

type VinStatus = "verified" | "pending" | "flagged" | "unknown";

interface VinBadgeResponse {
  status?: VinStatus | string;
  label?: string;
  message?: string;
}

const badgeStyles: Record<VinStatus, string> = {
  verified: "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 ring-amber-500/20",
  flagged: "bg-rose-500/10 text-rose-600 ring-rose-500/20",
  unknown: "bg-slate-500/10 text-slate-500 ring-slate-500/20",
};

export function resolveVinBadgeStatus(input?: string | null): VinStatus {
  const normalized = input?.toLowerCase();
  if (normalized === "verified" || normalized === "pending" || normalized === "flagged") {
    return normalized;
  }
  return "unknown";
}

export function getVinBadgeClassName(status: VinStatus) {
  return badgeStyles[status];
}

export function VinBadge({ vin }: { vin: string }) {
  const [status, setStatus] = useState<VinStatus>(() => (vin ? "pending" : "unknown"));
  const [label, setLabel] = useState(() => (vin ? "VIN check" : "VIN"));

  useEffect(() => {
    let alive = true;
    if (!vin) {
      return;
    }

    void apiFetch<VinBadgeResponse>(`/vin/${encodeURIComponent(vin)}`)
      .then((payload) => {
        if (!alive) return;
        setStatus(resolveVinBadgeStatus(payload.status?.toString()));
        setLabel(payload.label || payload.message || "VIN");
      })
      .catch(() => {
        if (!alive) return;
        setStatus("unknown");
        setLabel("VIN");
      });

    return () => {
      alive = false;
    };
  }, [vin]);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ring-1 ${getVinBadgeClassName(status)}`}
      title={vin}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}
