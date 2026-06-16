"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { publicBranding } from "@/lib/publicBranding";
import {
  AuthRedirectError,
  getPortalAuthDebugConfig,
  redirectToAuth0Login,
  resolveSafePortalReturnTo,
} from "@/lib/portalAuth";

export function LoginRedirectClient() {
  const searchParams = useSearchParams();
  const returnTo = resolveSafePortalReturnTo(searchParams?.get("returnTo"));
  const [status, setStatus] = useState<"starting" | "redirecting" | "failed">("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const debugConfig = useMemo(() => getPortalAuthDebugConfig(), []);

  useEffect(() => {
    let cancelled = false;
    const startRedirect = async () => {
      setStatus("redirecting");
      setErrorMessage(null);
      if (process.env.NODE_ENV !== "production") {
        console.debug("[Auth0] login page attempting redirect", {
          returnTo,
          debugConfig,
          href: window.location.href,
        });
      }
      try {
        await redirectToAuth0Login(returnTo);
      } catch (error) {
        if (error instanceof AuthRedirectError) {
          return;
        }
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown sign-in error";
        console.warn("[Auth0] login page redirect failed", error);
        setErrorMessage(message);
        setStatus("failed");
      }
    };

    void startRedirect();
    return () => {
      cancelled = true;
    };
  }, [returnTo, debugConfig]);

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 text-slate-900"
    >
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 px-8 py-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="flex justify-center">
          <span className="inline-flex rounded-2xl bg-[#0d2c71] px-4 py-3 shadow-[0_16px_36px_rgba(4,14,40,0.2)]">
            <img src={publicBranding.logoPath} alt={publicBranding.appName} className="h-10 w-auto object-contain sm:h-12" />
          </span>
        </div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">
          {publicBranding.appName} portal
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
          {status === "failed" ? "Sign-in could not start" : "Opening sign-in"}
        </h1>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          {status === "failed"
            ? "The portal could not start the Auth0 redirect. Check the details below."
            : "Redirecting to Auth0 so you can continue to the portal."}
        </p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400" data-login-status-text>
          {status}
        </p>
        {status === "failed" ? (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-600">
            <p className="font-black uppercase tracking-[0.24em] text-slate-400">Details</p>
            <p className="mt-2">
              Return target: <span className="font-semibold text-slate-800">{returnTo}</span>
            </p>
            <p className="mt-1">
              Auth0 domain:{" "}
              <span className="font-semibold text-slate-800">
                {debugConfig && "error" in debugConfig
                  ? "unavailable"
                  : (debugConfig as { domain?: string } | null)?.domain || "unknown"}
              </span>
            </p>
            {debugConfig ? (
              <pre className="mt-3 overflow-auto rounded-xl bg-white p-3 text-[11px] leading-relaxed text-slate-700">
                {JSON.stringify(debugConfig, null, 2)}
              </pre>
            ) : null}
            {errorMessage ? (
              <p className="mt-3 text-[11px] font-semibold text-rose-600">{errorMessage}</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
