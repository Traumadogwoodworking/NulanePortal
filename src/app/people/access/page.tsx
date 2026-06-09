"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PeopleAccessRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/users/access");
  }, [router]);

  return <main className="p-6 text-sm text-slate-500">Redirecting...</main>;
}
