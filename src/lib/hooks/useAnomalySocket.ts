"use client";

import { useEffect } from "react";
import { portalConfig } from "@/lib/config";
import type { MeasurementAnomalyPayload } from "@/lib/docufit/anomalyUtils";

const DEFAULT_WS_PATH = "/measurements/ws";

function buildAbsoluteBase(base: string, origin: string) {
  if (!base) return origin;
  if (base.startsWith("http")) {
    return base.replace(/\/+$/, "");
  }
  const normalized = base.startsWith("/") ? base : `/${base}`;
  return `${origin}${normalized.replace(/\/+$/, "")}`;
}

function resolveWebSocketUrl() {
  const overrideUrl = process.env.NEXT_PUBLIC_MEASUREMENT_WS_URL?.trim();
  if (overrideUrl) {
    return overrideUrl;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const origin = window.location.origin;
  const apiBase = portalConfig.apiBase ?? "";
  const absoluteBase = buildAbsoluteBase(apiBase, origin);
  const scheme = absoluteBase.startsWith("https") ? "wss" : "ws";
  const stripped = absoluteBase.replace(/^https?:/, "").replace(/\/+$/, "");
  return `${scheme}:${stripped}${DEFAULT_WS_PATH}`;
}

export function useAnomalySocket(callback: (payload: MeasurementAnomalyPayload) => void) {
  useEffect(() => {
    const url = resolveWebSocketUrl();
    if (!url) {
      return;
    }

    const socket = new WebSocket(url);
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const payload =
          data?.event === "measurement_anomaly" ? data.payload : data;
        const anomaly = payload?.measurement_anomaly ?? payload;
        if (anomaly && typeof anomaly.delta === "number") {
          callback(anomaly);
        }
      } catch {
        // ignore malformed events
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
      socket.close();
    };
  }, [callback]);
}
