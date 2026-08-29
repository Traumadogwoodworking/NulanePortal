import { Suspense } from "react";
import { AuthCallbackClient } from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-100 px-6 text-slate-900">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white px-8 py-10 text-center shadow-lg">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-400">Authentication</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Completing sign-in</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Verifying your Auth0 response and opening the portal.</p>
          </div>
        </main>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
