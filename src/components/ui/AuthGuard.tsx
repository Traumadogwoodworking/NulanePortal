"use client";

import type { ComponentType } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isEmbeddedPortalContext, logAuthFlow } from "@/lib/portalAuth";
import { usePortalSession } from "@/lib/portalSession";

export function withSession<P extends object>(Component: ComponentType<P>) {
  function SessionGuard(props: P) {
    const router = useRouter();
    const { status, isPortalAccessAllowed } = usePortalSession();
    const embedded = isEmbeddedPortalContext();

    useEffect(() => {
      if (status === "unauthenticated" && !embedded) {
        logAuthFlow("withSession.useEffect", {
          reason: "unauthenticated_guard",
          status,
          redirectTarget: "/login",
        });
        router.replace("/login");
      }
    }, [embedded, router, status]);

    if (status === "loading") {
      return (
        <div className="flex min-h-[50vh] items-center justify-center text-sm font-semibold uppercase tracking-widest text-slate-400">
          Checking session...
        </div>
      );
    }

    if (!isPortalAccessAllowed) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center px-6">
          <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Access required</p>
            <h1 className="mt-2 text-lg font-black text-slate-950">You do not have portal access.</h1>
            <p className="mt-2 text-sm text-slate-500">
              Sign in with an authorized account or contact an org admin if this should be enabled.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  }

  SessionGuard.displayName = `withSession(${Component.displayName || Component.name || "Component"})`;
  return SessionGuard;
}
