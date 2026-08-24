"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Loader2, UserPlus } from "lucide-react";
import { AuthRedirectError, startAuth0Signup } from "@/lib/portalAuth";
import { publicBranding } from "@/lib/publicBranding";

const signupReturnTo = "/home/";

export function SignupRedirectClient() {
  const [status, setStatus] = useState<"starting" | "redirecting" | "failed">("starting");
  const [error, setError] = useState<string | null>(null);

  const startSignup = useCallback(async () => {
    setStatus("redirecting");
    setError(null);
    try {
      await startAuth0Signup(signupReturnTo);
    } catch (signupError) {
      if (signupError instanceof AuthRedirectError) return;
      setStatus("failed");
      setError(signupError instanceof Error ? signupError.message : "Secure signup could not start.");
    }
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void startSignup(), 0);
    return () => window.clearTimeout(task);
  }, [startSignup]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(0,171,99,0.12),_transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eaf0fb_100%)] px-5 py-10 text-slate-950">
      <section className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_24px_80px_rgba(13,44,113,0.18)]">
        <header className="bg-[#0d2c71] px-7 py-8 text-white sm:px-10">
          <Image
            src={publicBranding.logoPath}
            alt={publicBranding.appName}
            width={260}
            height={72}
            priority
            className="h-14 w-auto object-contain"
          />
          <p className="mt-6 text-xs font-black uppercase tracking-[0.24em] text-[#8ae1b8]">Secure account setup</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Join Definian Inspection</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-200">
            Create your Definian account with Auth0, then use the same verified email in the Definian Inspection app.
          </p>
        </header>

        <div className="space-y-5 px-7 py-8 sm:px-10">
          {status !== "failed" ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-[#00ab63]" />
              Opening secure Definian signup...
            </div>
          ) : (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950">
              <p className="font-black">Signup did not open.</p>
              <p className="mt-1">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => void startSignup()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00ab63] px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-[#008f53]"
          >
            <UserPlus className="h-4 w-4" /> Create Definian account
          </button>

          <a
            href="/getting-started/"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50"
          >
            View the quick-start guide <ExternalLink className="h-4 w-4" />
          </a>

          <p className="text-center text-xs leading-relaxed text-slate-500">
            Existing users can use the sign-in option on the Auth0 screen. Need help?{" "}
            <a className="font-bold text-[#0d2c71] underline" href={`mailto:${publicBranding.supportEmail}`}>
              {publicBranding.supportEmail}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
