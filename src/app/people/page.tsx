"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PeopleRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/users");
  }, [router]);

  return <main className="p-6 text-sm text-slate-500">Redirecting...</main>;
}
