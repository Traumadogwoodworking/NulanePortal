"use client";

import { useEffect, useState } from "react";
import {
  AuthRedirectError,
  cleanAuthCallbackUrl,
  clearPortalAuthStorage,
  completeAuth0Callback,
  hasPersistedPortalToken,
  logAuthFlow,
  prepareExplicitAuthRetry,
  readStoredPortalLoginReturnTo,
  startAuth0Login,
} from "@/lib/portalAuth";

type CallbackStatus = "starting" | "processing" | "redirecting" | "failed";

function classifyCallbackError(errorCode: string | null, message: string) {
  if (errorCode) return `provider_error:${errorCode}`;
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid state")) return "invalid_state";
  if (normalized.includes("token")) return "token_rejection";
  return "callback_failure";
}

export function AuthCallbackClient() {
  const [status, setStatus] = useState<CallbackStatus>("starting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [destination, setDestination] = useState("/home/");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setStatus("processing");
      setErrorMessage(null);
      const callbackParams = new URLSearchParams(window.location.search);
      const authError = callbackParams.get("error");
      const authErrorDescription = callbackParams.get("error_description");
      if (authError) {
        const recoveryDestination = readStoredPortalLoginReturnTo("/home/");
        setDestination(recoveryDestination);
        clearPortalAuthStorage();
        cleanAuthCallbackUrl();
        logAuthFlow("AuthCallbackClient.run", {
          reason: "provider_error",
          error: authError,
          tokenExists: false,
        });
        setErrorMessage(authErrorDescription || authError);
        setStatus("failed");
        return;
      }
      logAuthFlow("AuthCallbackClient.run", {
        reason: "start",
        hasCode: new URLSearchParams(window.location.search).has("code"),
        hasState: new URLSearchParams(window.location.search).has("state"),
        tokenExists: hasPersistedPortalToken(),
      });
      try {
        const target = await completeAuth0Callback();
        if (cancelled) {
          return;
        }
        setDestination(target);
        setStatus("redirecting");
        cleanAuthCallbackUrl();
        logAuthFlow("AuthCallbackClient.run", {
          reason: "redirecting",
          redirectTarget: target,
          tokenExists: hasPersistedPortalToken(),
        });
        window.location.replace(target);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : "Unknown callback error";
        clearPortalAuthStorage();
        cleanAuthCallbackUrl();
        logAuthFlow("AuthCallbackClient.run", {
          reason: classifyCallbackError(authError, message),
          tokenExists: hasPersistedPortalToken(),
        });
        setErrorMessage(authErrorDescription || message);
        setStatus("failed");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-lg">
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
        {status === "failed" ? <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-relaxed text-slate-600">
          <p className="font-black uppercase tracking-[0.24em] text-slate-400">Sign-in recovery</p>
          <p className="mt-2">
            Your original destination is preserved. Retrying sign-in will return you to the same registration or portal page.
          </p>
          <span className="sr-only" data-auth0-callback-destination>{destination}</span>
          <button
            type="button"
            onClick={() => {
              prepareExplicitAuthRetry();
              setStatus("processing");
              setErrorMessage(null);
              void startAuth0Login(destination).catch((error) => {
                if (error instanceof AuthRedirectError) return;
                setErrorMessage(error instanceof Error ? error.message : "Unable to restart sign in.");
                setStatus("failed");
              });
            }}
            className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Try sign in again
          </button>
        </div> : null}
      </div>
    </main>
  );
}
