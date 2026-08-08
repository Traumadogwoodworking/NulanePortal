"use client";

import { useState } from "react";
import { isEmbeddedPortalContext, startAuth0Login } from "@/lib/portalAuth";
import { publicBranding } from "@/lib/publicBranding";

export function LoginCta() {
  const [isStarting, setIsStarting] = useState(false);
  const embedded = isEmbeddedPortalContext();

  return (
    <button
      type="button"
      onClick={async () => {
        setIsStarting(true);
        await startAuth0Login("/home");
      }}
      className="inline-flex items-center justify-center rounded-lg bg-slate-950 px-6 py-3 text-sm font-bold text-white no-underline transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
      disabled={isStarting}
    >
      {isStarting ? "Opening secure login..." : embedded ? "Open secure login" : publicBranding.loginButtonLabel}
    </button>
  );
}
