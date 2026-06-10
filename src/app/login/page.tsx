import { Suspense } from "react";
import { LoginRedirectClient } from "@/app/login/LoginRedirectClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginRedirectClient />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-slate-900">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
        <p className="text-sm font-semibold text-slate-600">Opening sign-in...</p>
      </div>
    </main>
  );
}
