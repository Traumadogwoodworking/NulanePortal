"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { FacilityStartupSteps, type RegistrationStartupStep } from "@/components/facilities/FacilityStartupSteps";
import { RegistrationInstallLinks, RegistrationPageFrame } from "@/components/registration/RegistrationPageFrame";
import {
  AuthRedirectError,
  resolveSafePortalReturnTo,
  startFacilityRegistrationAuth,
} from "@/lib/portalAuth";

export const DEFINIAN_SIGNAL_RETURN_URL = "https://www.definian.com/signal";
export const DEFINIAN_AUTH_BOOTSTRAP_ORIGIN = "https://signal.definian.com";
export const DEFINIAN_IOS_APP_URL = "https://apps.apple.com/us/app/inspection-trac/id6774376762";
export const DEFINIAN_ANDROID_APP_URL = "https://play.google.com/store/apps/details?id=com.nulanesystems.inspectiontrac";

const DEFINIAN_STARTUP_STEPS: readonly RegistrationStartupStep[] = [
  { title: "Open this registration page", detail: "Scan the QR or open the Definian registration link." },
  { title: "Enter your email", detail: "Use the email address you will use with Definian." },
  { title: "Create an account or sign in", detail: "Choose the secure Auth0 action that matches your account." },
  { title: "Verify your email", detail: "Open the verification message when Auth0 prompts you." },
  { title: "Install Definian Inspection", detail: "Use the iPhone or Android installation link below if you have not already installed the app." },
  { title: "Continue into Definian", detail: "Sign in with the same verified email and continue into Definian Signal or the app." },
];

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isUsableEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function buildDefinianAuthBootstrapUrl(email: string, signup: boolean, returnTo: string) {
  const url = new URL("/definian/start/", DEFINIAN_AUTH_BOOTSTRAP_ORIGIN);
  url.hash = new URLSearchParams({
    action: signup ? "signup" : "login",
    email: normalizeEmail(email),
    returnTo,
  }).toString();
  return url;
}

export function DefinianStartClient() {
  const searchParams = useSearchParams();
  const requestedReturnTo = searchParams?.get("returnTo");
  const returnTo = useMemo(
    () => typeof window === "undefined"
      ? DEFINIAN_SIGNAL_RETURN_URL
      : resolveSafePortalReturnTo(requestedReturnTo || DEFINIAN_SIGNAL_RETURN_URL),
    [requestedReturnTo],
  );
  const [email, setEmail] = useState("");
  const [startingAction, setStartingAction] = useState<"signup" | "login" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const launchAuth = useCallback(async (expectedEmail: string, signup: boolean, target: string) => {
    setError(null);
    setStartingAction(signup ? "signup" : "login");
    try {
      await startFacilityRegistrationAuth(target, { email: expectedEmail, signup });
    } catch (authError) {
      if (authError instanceof AuthRedirectError) return;
      setError(authError instanceof Error ? authError.message : "Unable to open secure authentication.");
      setStartingAction(null);
    }
  }, []);

  useEffect(() => {
    if (window.location.origin !== DEFINIAN_AUTH_BOOTSTRAP_ORIGIN || !window.location.hash) return;
    const bridgeParams = new URLSearchParams(window.location.hash.slice(1));
    const action = bridgeParams.get("action");
    const bridgedEmail = normalizeEmail(bridgeParams.get("email") || "");
    if ((action !== "signup" && action !== "login") || !isUsableEmail(bridgedEmail)) return;
    const bridgedReturnTo = resolveSafePortalReturnTo(
      bridgeParams.get("returnTo") || DEFINIAN_SIGNAL_RETURN_URL,
    );
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
    void launchAuth(bridgedEmail, action === "signup", bridgedReturnTo);
  }, [launchAuth]);

  const startAuth = async (signup: boolean) => {
    const expectedEmail = normalizeEmail(email);
    if (!isUsableEmail(expectedEmail)) {
      setError("Enter a valid email address before continuing.");
      return;
    }
    setStartingAction(signup ? "signup" : "login");
    const localDevelopmentOrigin = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
    if (window.location.origin !== DEFINIAN_AUTH_BOOTSTRAP_ORIGIN && !localDevelopmentOrigin) {
      window.location.assign(buildDefinianAuthBootstrapUrl(expectedEmail, signup, returnTo));
      return;
    }
    await launchAuth(expectedEmail, signup, returnTo);
  };

  return (
    <RegistrationPageFrame
      eyebrow="Definian Registration"
      title="Get Started with Definian"
      subtitle="Definian Inspection"
      headerClassName="bg-[#0d2c71]"
      eyebrowClassName="text-[#8ae1b8]"
    >
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-xl font-black">Secure your account</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Use the email address you will use with Definian. Create an account or sign in, then verify the address when prompted.
        </p>
        <label htmlFor="definian-registration-email" className="mt-5 block text-sm font-black text-slate-800">
          Email address
        </label>
        <input
          id="definian-registration-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={startingAction !== null}
          placeholder="name@company.com"
          className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
        />
        <p className="mt-2 text-xs font-semibold text-slate-500">Use this same email when you sign in.</p>
        {error ? <p role="alert" className="mt-3 text-sm font-bold text-rose-700">{error}</p> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void startAuth(true)}
            disabled={!isUsableEmail(email) || startingAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            {startingAction === "signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Create account
          </button>
          <button
            type="button"
            onClick={() => void startAuth(false)}
            disabled={!isUsableEmail(email) || startingAction !== null}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-50"
          >
            {startingAction === "login" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black">Getting started</h2>
        <div className="mt-3">
          <FacilityStartupSteps steps={DEFINIAN_STARTUP_STEPS} numbered />
        </div>
      </section>

      <RegistrationInstallLinks iosUrl={DEFINIAN_IOS_APP_URL} androidUrl={DEFINIAN_ANDROID_APP_URL} />
    </RegistrationPageFrame>
  );
}
