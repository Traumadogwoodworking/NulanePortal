"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, LogIn, UserPlus } from "lucide-react";
import { FacilityStartupSteps } from "@/components/facilities/FacilityStartupSteps";
import { publicBranding } from "@/lib/publicBranding";
import {
  enrollInFacility,
  FacilityRegistrationError,
  fetchPublicFacilityRegistration,
  type FacilityEnrollmentResult,
  type PublicFacilityRegistration,
} from "@/lib/services/facilityOnboardingService";
import {
  AuthRedirectError,
  hasPersistedPortalToken,
  prepareExplicitAuthRetry,
  startFacilityRegistrationAuth,
} from "@/lib/portalAuth";

const EMAIL_STORAGE_PREFIX = "inspection-trac.facility-registration-email.";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isUsableEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function storedRegistrationEmail(slug: string) {
  if (!slug || typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(`${EMAIL_STORAGE_PREFIX}${slug}`) || "";
  } catch {
    return "";
  }
}

function slugFromPath(pathname: string | null) {
  const match = (pathname || "").match(/\/join\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

function friendlyField(field: string) {
  return field.replace(/_/g, " ");
}

export function FacilityJoinClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const slug = useMemo(
    () => (searchParams?.get("facility") || slugFromPath(pathname)).trim().toLowerCase(),
    [pathname, searchParams]
  );
  const [facility, setFacility] = useState<PublicFacilityRegistration | null>(null);
  const [enrollment, setEnrollment] = useState<FacilityEnrollmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [supportReference, setSupportReference] = useState("");
  const [emailState, setEmailState] = useState(() => ({
    slug,
    value: storedRegistrationEmail(slug),
  }));
  const email = emailState.slug === slug ? emailState.value : storedRegistrationEmail(slug);
  const setEmail = (value: string) => setEmailState({ slug, value });
  const attemptedEnrollment = useRef(false);

  const returnTo = typeof window === "undefined"
    ? `/join/?facility=${encodeURIComponent(slug)}`
    : `${window.location.pathname}${window.location.search}`;

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);
      setErrorCode("");
      setSupportReference("");
      setFacility(null);
      setEnrollment(null);
      attemptedEnrollment.current = false;
      if (!slug) {
        setError("This registration link does not identify a facility.");
        setLoading(false);
        return;
      }
      try {
        const value = await fetchPublicFacilityRegistration(slug);
        if (active) setFacility(value);
      } catch (lookupError) {
        if (active) setError(lookupError instanceof Error ? lookupError.message : "Facility registration is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  const completeEnrollment = async () => {
    if (!slug || enrolling) return;
    const expectedEmail = normalizeEmail(email);
    if (!isUsableEmail(expectedEmail)) {
      setError("Enter a valid email address before continuing.");
      setErrorCode("REGISTRATION_EMAIL_REQUIRED");
      return;
    }
    setEnrolling(true);
    setError(null);
    setErrorCode("");
    setSupportReference("");
    try {
      setEnrollment(await enrollInFacility(slug, expectedEmail));
    } catch (enrollError) {
      if (enrollError instanceof FacilityRegistrationError) {
        setErrorCode(enrollError.code);
        setSupportReference(enrollError.requestId);
      }
      setError(enrollError instanceof Error ? enrollError.message : "Unable to complete facility registration.");
    } finally {
      setEnrolling(false);
    }
  };

  useEffect(() => {
    if (!facility?.registrationEnabled || !hasPersistedPortalToken() || !isUsableEmail(email) || attemptedEnrollment.current) return;
    attemptedEnrollment.current = true;
    void completeEnrollment();
    // completeEnrollment is intentionally triggered once after lookup and callback return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, facility?.registrationEnabled, slug]);

  const startAuth = async (signup: boolean) => {
    const expectedEmail = normalizeEmail(email);
    if (!isUsableEmail(expectedEmail)) {
      setError("Enter a valid email address before continuing.");
      setErrorCode("REGISTRATION_EMAIL_REQUIRED");
      return;
    }
    setError(null);
    setErrorCode("");
    setSupportReference("");
    try {
      window.sessionStorage.setItem(`${EMAIL_STORAGE_PREFIX}${slug}`, expectedEmail);
    } catch {
      // Auth0 still receives login_hint when storage is unavailable.
    }
    try {
      await startFacilityRegistrationAuth(returnTo, { email: expectedEmail, signup });
    } catch (authError) {
      if (!(authError instanceof AuthRedirectError)) {
        setError(authError instanceof Error ? authError.message : "Unable to open secure sign in.");
      }
    }
  };

  const restartAuthForExpectedEmail = async () => {
    prepareExplicitAuthRetry();
    attemptedEnrollment.current = false;
    await startAuth(false);
  };

  const ready = enrollment?.onboardingStatus === "ready";
  const displayName = facility?.facilityName || "your facility";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <header className="bg-slate-950 px-6 py-7 text-white sm:px-10">
          <Image src={publicBranding.logoPath} alt={publicBranding.appName} width={240} height={48} priority className="h-10 w-auto object-contain" />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-slate-400">Facility Registration</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Join {displayName}</h1>
          {facility?.organizationName ? <p className="mt-2 text-sm font-semibold text-slate-300">{facility.organizationName}</p> : null}
        </header>

        <div className="space-y-6 p-6 sm:p-10">
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin" /> Loading facility registration…</div>
          ) : null}

          {!loading && facility && !facility.registrationEnabled ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-black">Registration is currently closed.</p>
              <p className="mt-1">This permanent link is valid, but the facility is not accepting new registration right now.</p>
            </div>
          ) : null}

          {error ? (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
              <div className="flex gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p className="font-bold">{error}</p></div>
              <p className="mt-2 text-xs">No facility assignment was silently created. Contact {facility?.support.displayName || "Inspection-Trac Support"}{facility?.support.email ? ` at ${facility.support.email}` : ""}.</p>
              {supportReference ? <p className="mt-2 text-xs font-bold">Support reference: {supportReference}</p> : null}
              {errorCode === "REGISTRATION_EMAIL_MISMATCH" ? (
                <button type="button" onClick={() => void restartAuthForExpectedEmail()} className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-950">
                  Sign in as {normalizeEmail(email)}
                </button>
              ) : null}
            </div>
          ) : null}

          {facility?.registrationEnabled && !enrollment ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-black">Secure your account</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">Enter the email that should receive access to {facility.facilityName}. Auth0 verifies that exact address before Inspection-Trac assigns the facility and approved base role.</p>
              <label htmlFor="facility-registration-email" className="mt-5 block text-sm font-black text-slate-800">Email address</label>
              <input
                id="facility-registration-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={enrolling}
                placeholder="name@company.com"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-950 outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200 disabled:opacity-60"
              />
              <p className="mt-2 text-xs font-semibold text-slate-500">The email is used as an Auth0 login hint and is checked again by the API. It is not placed in the QR code or URL.</p>
              {!hasPersistedPortalToken() ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => void startAuth(true)} disabled={!isUsableEmail(email)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><UserPlus className="h-4 w-4" /> Create account</button>
                  <button type="button" onClick={() => void startAuth(false)} disabled={!isUsableEmail(email)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-50"><LogIn className="h-4 w-4" /> Sign in</button>
                </div>
              ) : (
                <button type="button" onClick={() => void completeEnrollment()} disabled={enrolling || !isUsableEmail(email)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">
                  {enrolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {enrolling ? "Assigning facility…" : "Complete facility registration"}
                </button>
              )}
            </section>
          ) : null}

          {enrollment ? (
            <section className={`rounded-2xl border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex gap-3">
                {ready ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" /> : <AlertTriangle className="h-6 w-6 shrink-0 text-amber-700" />}
                <div>
                  <h2 className="text-xl font-black">{ready ? `You’re set up for ${enrollment.facility.name}.` : "Your account needs attention."}</h2>
                  <p className="mt-1 text-sm text-slate-700">Assigned role: {enrollment.role.name || enrollment.role.key}</p>
                  {enrollment.missingFields.length ? (
                    <p className="mt-3 text-sm font-semibold text-amber-950">Missing: {enrollment.missingFields.map(friendlyField).join(", ")}.</p>
                  ) : null}
                  {ready && enrollment.recommendedFields.length ? (
                    <p className="mt-3 text-sm text-emerald-950">You can add {enrollment.recommendedFields.map(friendlyField).join(" and ")} later in your profile. This does not block facility access.</p>
                  ) : null}
                  {enrollment.issues[0]?.reference_code ? <p className="mt-2 text-xs font-bold text-slate-600">Support reference: {enrollment.issues[0].reference_code}</p> : null}
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-black">Getting started</h2>
            <div className="mt-3"><FacilityStartupSteps /></div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <a href={publicBranding.appStoreUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900">Install for iPhone <ExternalLink className="h-4 w-4" /></a>
            <a href={publicBranding.googlePlayUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900">Install for Android <ExternalLink className="h-4 w-4" /></a>
            {enrollment ? <a href="inspectiontrac://" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white sm:col-span-2">Open Inspection-Trac</a> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
