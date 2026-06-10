"use client";

import { useEffect, useState } from "react";
import { completeAuth0Callback } from "@/lib/portalAuth";

type CallbackStatus = "starting" | "processing" | "redirecting" | "failed";

export function AuthCallbackClient() {
  const [status, setStatus] = useState<CallbackStatus>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [destination, setDestination] = useState("/home/");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setStatus("processing");
      setErrorMessage(null);
      console.debug("[Auth0] AuthCallbackClient starting callback exchange", {
        href: window.location.href,
        search: window.location.search,
      });
      try {
        const target = await completeAuth0Callback();
        if (cancelled) {
          return;
        }
        setDestination(target);
        setStatus("redirecting");
        window.location.replace(target);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown callback error";
        setErrorMessage(message);
        setStatus("failed");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.06),_transparent_42%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 text-slate-900">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white/85 px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Authentication</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          {status === "failed" ? "Sign-in callback failed" : "Completing sign-in"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {status === "failed"
            ? "Auth0 returned, but the portal could not finish the callback."
            : "Verifying your Auth0 response and opening the portal."}
        </p>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400" data-auth0-callback-status>
          {status}
        </p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600" data-auth0-callback-error>
          {errorMessage || ""}
        </p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-600">
          <p className="font-black uppercase tracking-[0.24em] text-slate-400">Debug</p>
          <p className="mt-2">
            Destination: <span className="font-semibold text-slate-800" data-auth0-callback-destination>{destination}</span>
          </p>
          <p className="mt-1">
            Location:{" "}
            <span className="font-semibold text-slate-800" suppressHydrationWarning>
              {typeof window !== "undefined" ? window.location.href : "server"}
            </span>
          </p>
          <button
            type="button"
            onClick={() => window.location.replace(destination)}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Try redirect again
          </button>
        </div>
      </div>
    </main>
  );
}
