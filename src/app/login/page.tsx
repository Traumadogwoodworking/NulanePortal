"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { publicBranding } from "@/lib/publicBranding";
import { persistPortalToken, resolveSafePortalReturnTo } from "@/lib/portalAuth";

type LoginResponse = {
  ok?: boolean;
  returnTo?: string;
  accessToken?: string;
  error?: string;
};

export default function LoginPage() {
  const brand = publicBranding;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    if (typeof window === "undefined") return "/home/";
    return resolveSafePortalReturnTo(new URL(window.location.href).searchParams.get("returnTo"));
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/embedded-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password, returnTo }),
      });
      const payload = (await response.json()) as LoginResponse;
      if (!response.ok || !payload.ok || !payload.accessToken) {
        throw new Error(payload.error || "Unable to sign in.");
      }
      persistPortalToken(payload.accessToken);
      window.location.replace(resolveSafePortalReturnTo(payload.returnTo || returnTo));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 text-slate-900 shadow-[0_28px_80px_rgba(15,23,42,0.24)]">
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="rounded-3xl bg-[#0d2c71] px-6 py-5">
              <Image src={brand.logoPath} alt={brand.appName} width={260} height={92} className="h-20 w-auto object-contain" priority />
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-black tracking-tight">{brand.appName}</h1>
            <p className="text-sm leading-6 text-slate-600">Sign in to access your inspection portal.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                type="email"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0d2c71] focus:ring-4 focus:ring-[#0d2c71]/10"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Password</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                type="password"
                required
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-[#0d2c71] focus:ring-4 focus:ring-[#0d2c71]/10"
              />
            </label>
            {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0d2c71] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0a2359] disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
