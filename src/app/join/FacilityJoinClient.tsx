"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogIn,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { FacilityStartupSteps } from "@/components/facilities/FacilityStartupSteps";
import { getFacilityQuickStartAsset } from "@/components/facilities/facilityQuickStartAsset";
import { withPortalBasePath } from "@/lib/config";
import { publicBranding } from "@/lib/publicBranding";
import { formatOrganizationDisplayName } from "@/lib/facilityDisplay";
import {
  createFacilityEnrollmentSession,
  enrollInFacility,
  FacilityRegistrationError,
  fetchFacilityEnrollmentSession,
  recordFacilityEnrollmentEvent,
  submitFacilityEnrollmentEmail,
  type FacilityEnrollmentResult,
  type FacilityEnrollmentSession,
} from "@/lib/services/facilityOnboardingService";
import {
  AuthRedirectError,
  hasPersistedPortalToken,
  prepareExplicitAuthRetry,
  startFacilityRegistrationAuth,
} from "@/lib/portalAuth";

const sessionCreationPromises = new Map<
  string,
  Promise<FacilityEnrollmentSession>
>();

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isUsableEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function isExistingAccountConflict(message: string | null, code: string) {
  const value = `${code} ${message || ""}`.toLowerCase();
  return value.includes("existing account") && value.includes("verified email");
}

function slugFromPath(pathname: string | null) {
  const match = (pathname || "").match(/\/join\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]) : "";
}

function slugFromRegistrationUrl(value?: string | null) {
  if (!value) return "";
  try {
    const url = new URL(value, "https://inspection-trac.com");
    return (url.searchParams.get("facility") || slugFromPath(url.pathname))
      .trim()
      .toLowerCase();
  } catch {
    return "";
  }
}

function friendlyField(field: string) {
  return field.replace(/_/g, " ");
}

function createSessionOnce(
  slug: string,
  source: "facility_qr" | "portal_test",
) {
  const key = `${source}:${slug}`;
  const existing = sessionCreationPromises.get(key);
  if (existing) return existing;
  const promise = createFacilityEnrollmentSession(slug, source);
  sessionCreationPromises.set(key, promise);
  void promise.catch(() => sessionCreationPromises.delete(key));
  return promise;
}

export function FacilityJoinClient() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialToken = (searchParams?.get("enrollment") || "").trim();
  const initialSource =
    searchParams?.get("source") === "portal_test"
      ? "portal_test"
      : "facility_qr";
  const slug = useMemo(
    () =>
      (searchParams?.get("facility") || slugFromPath(pathname))
        .trim()
        .toLowerCase(),
    [pathname, searchParams],
  );
  const [session, setSession] = useState<FacilityEnrollmentSession | null>(
    null,
  );
  const [enrollment, setEnrollment] = useState<FacilityEnrollmentResult | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [supportReference, setSupportReference] = useState("");
  const attemptedEnrollment = useRef(false);
  const existingAccountRecoveryStarted = useRef(false);

  const enrollmentToken = session?.enrollmentToken || initialToken;
  const returnTo = enrollmentToken
    ? withPortalBasePath(
        `/join/?enrollment=${encodeURIComponent(enrollmentToken)}`,
      )
    : withPortalBasePath("/join/");

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);
      setErrorCode("");
      setSupportReference("");
      setEnrollment(null);
      attemptedEnrollment.current = false;
      existingAccountRecoveryStarted.current = false;
      if (!initialToken && !slug) {
        setSession(null);
        setError("This registration link does not identify a facility.");
        setLoading(false);
        return;
      }
      try {
        const value = initialToken
          ? await fetchFacilityEnrollmentSession(initialToken)
          : await createSessionOnce(slug, initialSource);
        if (!active) return;
        setSession(value);
        if (value.enrollmentResult) setEnrollment(value.enrollmentResult);
        if (!initialToken && value.enrollmentToken) {
          const nextUrl = withPortalBasePath(
            `/join/?enrollment=${encodeURIComponent(value.enrollmentToken)}`,
          );
          window.history.replaceState({}, document.title, nextUrl);
        }
      } catch (lookupError) {
        if (!active) return;
        if (lookupError instanceof FacilityRegistrationError) {
          setErrorCode(lookupError.code);
          setSupportReference(lookupError.requestId);
        }
        setError(
          lookupError instanceof Error
            ? lookupError.message
            : "Facility registration is unavailable.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [initialSource, initialToken, slug]);

  const completeEnrollment = async (token = enrollmentToken) => {
    if (!token || enrolling) return;
    setEnrolling(true);
    setError(null);
    setErrorCode("");
    setSupportReference("");
    try {
      const result = await enrollInFacility(token);
      setEnrollment(result);
      setSession((current) =>
        current
          ? { ...current, status: "completed", enrollmentResult: result }
          : current,
      );
    } catch (enrollError) {
      if (enrollError instanceof FacilityRegistrationError) {
        setErrorCode(enrollError.code);
        setSupportReference(enrollError.requestId);
      }
      setError(
        enrollError instanceof Error
          ? enrollError.message
          : "Unable to complete facility registration.",
      );
    } finally {
      setEnrolling(false);
    }
  };

  useEffect(() => {
    if (
      !session?.registrationEnabled ||
      !session.enrollmentToken ||
      !hasPersistedPortalToken() ||
      !["email_entered", "auth_started", "authenticated", "enrolling"].includes(
        session.status,
      ) ||
      attemptedEnrollment.current
    )
      return;
    attemptedEnrollment.current = true;
    void completeEnrollment(session.enrollmentToken);
    // The session status is the server-owned callback continuation signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.enrollmentToken, session?.registrationEnabled, session?.status]);

  const startAuth = async (signup: boolean) => {
    const expectedEmail = normalizeEmail(email);
    if (!session?.enrollmentToken || !isUsableEmail(expectedEmail)) {
      setError("Enter a valid email address before continuing.");
      setErrorCode("REGISTRATION_EMAIL_REQUIRED");
      return;
    }
    setError(null);
    setErrorCode("");
    setSupportReference("");
    try {
      const updated = await submitFacilityEnrollmentEmail(
        session.enrollmentToken,
        expectedEmail,
      );
      setSession(updated);
      if (hasPersistedPortalToken()) {
        attemptedEnrollment.current = true;
        await completeEnrollment(session.enrollmentToken);
        return;
      }
      await recordFacilityEnrollmentEvent(
        session.enrollmentToken,
        "registration.auth_started",
      );
      await startFacilityRegistrationAuth(returnTo, {
        email: expectedEmail,
        signup,
      });
    } catch (authError) {
      if (authError instanceof AuthRedirectError) return;
      if (authError instanceof FacilityRegistrationError) {
        setErrorCode(authError.code);
        setSupportReference(authError.requestId);
      }
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to open secure sign in.",
      );
    }
  };

  const restartAuth = () => {
    prepareExplicitAuthRetry();
    attemptedEnrollment.current = false;
    setEmail("");
    setError(
      "Enter the facility-registration email again, then sign in with that exact account.",
    );
    setErrorCode("REGISTRATION_EMAIL_REQUIRED");
  };

  const signInWithExistingAccount = async () => {
    const expectedEmail = normalizeEmail(email);
    setEnrolling(true);
    setError(null);
    setErrorCode("");
    setSupportReference("");
    prepareExplicitAuthRetry();
    attemptedEnrollment.current = false;
    try {
      if (enrollmentToken) {
        await recordFacilityEnrollmentEvent(
          enrollmentToken,
          "registration.auth_started",
        ).catch(() => undefined);
      }
      await startFacilityRegistrationAuth(returnTo, {
        email: expectedEmail,
        signup: false,
      });
    } catch (authError) {
      if (authError instanceof AuthRedirectError) return;
      if (authError instanceof FacilityRegistrationError) {
        setErrorCode(authError.code);
        setSupportReference(authError.requestId);
      }
      setError(
        authError instanceof Error
          ? authError.message
          : "Unable to open secure sign in.",
      );
    } finally {
      setEnrolling(false);
    }
  };

  const existingAccountConflict = isExistingAccountConflict(error, errorCode);

  useEffect(() => {
    if (
      !existingAccountConflict ||
      existingAccountRecoveryStarted.current ||
      !enrollmentToken
    )
      return;
    existingAccountRecoveryStarted.current = true;
    void signInWithExistingAccount();
    // The identity-conflict response is an automatic sign-in continuation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingAccountConflict, enrollmentToken]);

  const recordClick = (
    eventKey: "registration.app_open_clicked" | "registration.install_clicked",
    platform: string,
  ) => {
    if (!enrollmentToken) return;
    void recordFacilityEnrollmentEvent(enrollmentToken, eventKey, {
      platform,
    }).catch(() => undefined);
  };

  const ready = enrollment?.onboardingStatus === "ready";
  const displayName = session?.facilityName || "your facility";
  const support = session?.support;
  const iosUrl = session?.stores.ios || publicBranding.appStoreUrl;
  const androidUrl = session?.stores.android || publicBranding.googlePlayUrl;
  const publishedQuickStart = getFacilityQuickStartAsset(
    slug || slugFromRegistrationUrl(session?.restartUrl),
  );
  const closedSession =
    session?.status === "expired" ||
    session?.status === "failed" ||
    session?.status === "cancelled";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <header className="bg-slate-950 px-6 py-7 text-white sm:px-10">
          <Image
            src={publicBranding.logoPath}
            alt={publicBranding.appName}
            width={240}
            height={48}
            priority
            className="h-10 w-auto object-contain"
          />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.25em] text-slate-400">
            Facility Registration
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Join {displayName}
          </h1>
          {session?.organizationName ? (
            <p className="mt-2 text-sm font-semibold text-slate-300">
              {formatOrganizationDisplayName(session.organizationName)}
            </p>
          ) : null}
        </header>

        <div className="space-y-6 p-6 sm:p-10">
          {loading ? (
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              <Loader2 className="h-5 w-5 animate-spin" /> Starting secure
              facility registration…
            </div>
          ) : null}

          {!loading &&
          session &&
          !session.registrationEnabled &&
          !enrollment ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-black">Registration is currently closed.</p>
              <p className="mt-1">
                The facility link is valid, but it is not accepting new
                registrations right now.
              </p>
            </div>
          ) : null}

          {closedSession && !enrollment ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-black">
                This registration session is no longer active.
              </p>
              <p className="mt-1">
                No facility assignment was created. Restart from the facility
                link to create a new secure session.
              </p>
              {session?.restartUrl ? (
                <a
                  href={session.restartUrl}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-950 px-3 py-2 text-xs font-black text-white"
                >
                  <RotateCcw className="h-4 w-4" /> Restart registration
                </a>
              ) : null}
            </div>
          ) : null}

          {error && !existingAccountConflict ? (
            <div
              role={existingAccountConflict ? "status" : "alert"}
              className={`rounded-xl border p-4 text-sm ${existingAccountConflict ? "border-amber-200 bg-amber-50 text-amber-950" : "border-rose-200 bg-rose-50 text-rose-950"}`}
            >
              <div className="flex gap-2">
                {existingAccountConflict ? (
                  <LogIn className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div>
                  <p className="font-bold">
                    {existingAccountConflict
                      ? "This email already has an Inspection-Trac account."
                      : error}
                  </p>
                  {existingAccountConflict ? (
                    <p className="mt-1 text-xs leading-5">
                      Sign in to that existing account to continue. We will not
                      create a duplicate account or assign the facility until
                      the verified identity matches.
                    </p>
                  ) : null}
                </div>
              </div>
              {!existingAccountConflict &&
              errorCode === "USER_EMAIL_UNVERIFIED" ? (
                <p className="mt-2 text-xs">
                  Open the verification email, verify the address, then return
                  to this page. The button below retries this same secure
                  registration.
                </p>
              ) : !existingAccountConflict ? (
                <p className="mt-2 text-xs">
                  No facility assignment was silently created. Contact{" "}
                  {support?.displayName || "Inspection-Trac Support"}
                  {support?.email ? ` at ${support.email}` : ""}.
                </p>
              ) : null}
              {supportReference ? (
                <p className="mt-2 text-xs font-bold">
                  Support reference: {supportReference}
                </p>
              ) : null}
              {existingAccountConflict ? (
                <button
                  type="button"
                  onClick={() => void signInWithExistingAccount()}
                  disabled={enrolling || !isUsableEmail(email)}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-950 disabled:opacity-60"
                >
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {enrolling
                    ? "Opening secure sign in..."
                    : "Sign in with existing account"}
                </button>
              ) : errorCode === "REGISTRATION_EMAIL_MISMATCH" ? (
                <button
                  type="button"
                  onClick={restartAuth}
                  className="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-950"
                >
                  Use the facility-registration email
                </button>
              ) : null}
              {errorCode === "USER_EMAIL_UNVERIFIED" && enrollmentToken ? (
                <button
                  type="button"
                  onClick={() => void completeEnrollment(enrollmentToken)}
                  disabled={enrolling}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-950 disabled:opacity-60"
                >
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {enrolling
                    ? "Checking verification..."
                    : "I verified my email - finish access"}
                </button>
              ) : null}
            </div>
          ) : null}

          {session?.registrationEnabled && !closedSession && !enrollment ? (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-xl font-black">Secure your account</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Use the email address you will use with Inspection-Trac. Create
                an account or sign in, then verify the address when prompted
                before {session.facilityName} can be added.
              </p>
              <label
                htmlFor="facility-registration-email"
                className="mt-5 block text-sm font-black text-slate-800"
              >
                Email address
              </label>
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
              <p className="mt-2 text-xs font-semibold text-slate-500">
                Use this same email when you sign in.
              </p>
              {hasPersistedPortalToken() ? (
                <button
                  type="button"
                  onClick={() => void startAuth(false)}
                  disabled={enrolling || !isUsableEmail(email)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60"
                >
                  {enrolling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}{" "}
                  {enrolling
                    ? "Assigning facility…"
                    : "Continue with signed-in account"}
                </button>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void startAuth(true)}
                    disabled={!isUsableEmail(email)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                  >
                    <UserPlus className="h-4 w-4" /> Create account
                  </button>
                  <button
                    type="button"
                    onClick={() => void startAuth(false)}
                    disabled={!isUsableEmail(email)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-50"
                  >
                    <LogIn className="h-4 w-4" /> Sign in
                  </button>
                </div>
              )}
            </section>
          ) : null}

          {enrollment ? (
            <section
              className={`rounded-2xl border p-5 ${ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}
            >
              <div className="flex gap-3">
                {ready ? (
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" />
                ) : (
                  <AlertTriangle className="h-6 w-6 shrink-0 text-amber-700" />
                )}
                <div>
                  <h2 className="text-xl font-black">
                    {ready
                      ? enrollment.alreadyMember
                        ? `You already have access to ${enrollment.facility.name}.`
                        : `You’re set up for ${enrollment.facility.name}.`
                      : "Your account needs attention."}
                  </h2>
                  {enrollment.signedInEmail ? (
                    <p className="mt-1 text-sm text-slate-700">
                      Signed in as {enrollment.signedInEmail}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-slate-700">
                    Assigned role: {enrollment.role.name || enrollment.role.key}
                  </p>
                  {enrollment.missingFields.length ? (
                    <p className="mt-3 text-sm font-semibold text-amber-950">
                      Missing:{" "}
                      {enrollment.missingFields.map(friendlyField).join(", ")}.
                    </p>
                  ) : null}
                  {ready && enrollment.recommendedFields.length ? (
                    <p className="mt-3 text-sm text-emerald-950">
                      You can add{" "}
                      {enrollment.recommendedFields
                        .map(friendlyField)
                        .join(" and ")}{" "}
                      later in your profile. This does not block facility
                      access.
                    </p>
                  ) : null}
                  {enrollment.issues[0]?.reference_code ? (
                    <p className="mt-2 text-xs font-bold text-slate-600">
                      Support reference: {enrollment.issues[0].reference_code}
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <section>
            <h2 className="text-lg font-black">Getting started</h2>
            <div className="mt-3">
              <FacilityStartupSteps steps={publishedQuickStart?.steps} />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <a
              href={iosUrl}
              onClick={() => recordClick("registration.install_clicked", "ios")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900"
            >
              Install for iPhone <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={androidUrl}
              onClick={() =>
                recordClick("registration.install_clicked", "android")
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900"
            >
              Install for Android <ExternalLink className="h-4 w-4" />
            </a>
            {enrollment ? (
              <a
                href="inspectiontrac://"
                onClick={() =>
                  recordClick("registration.app_open_clicked", "app")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white sm:col-span-2"
              >
                Open Inspection-Trac
              </a>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
