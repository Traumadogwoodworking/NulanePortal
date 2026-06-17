"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function PublicRedirect({ to }: { to: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center px-6 py-16 text-slate-600">
      <p className="text-sm font-medium">Redirecting to {to}…</p>
    </main>
  );
}
