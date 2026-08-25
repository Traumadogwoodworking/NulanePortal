"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { finishPortalLogout, resolveSafePortalReturnTo } from "@/lib/portalAuth";

export function LogoutRedirectClient() {
  const searchParams = useSearchParams();
  const returnTo = resolveSafePortalReturnTo(searchParams?.get("returnTo"));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void finishPortalLogout(returnTo).catch((error) => {
      console.warn("[Auth0] top-level logout failed", error);
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [returnTo]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 px-8 py-10 text-center shadow-2xl">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-300">Definian Signal</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">
          {failed ? "Sign-out needs another try" : "Signing you out"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {failed
            ? "The Auth0 sign-out handoff did not complete. You can safely return to Definian Signal and try again."
            : "Ending the portal session, then returning to the embedded Signal page."}
        </p>
        {failed ? (
          <a
            href={returnTo}
            className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950"
          >
            Return to Definian Signal
          </a>
        ) : null}
      </div>
    </main>
  );
}
