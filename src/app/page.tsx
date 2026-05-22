"use client";

import { redirect } from "next/navigation";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function HomePage() {
  const searchParams = useSearchParams();

  const hasAuth0CallbackParams = searchParams?.has("code") && searchParams?.has("state");

  useEffect(() => {
    if (!hasAuth0CallbackParams) {
      redirect("/dashboard");
    }
  }, [hasAuth0CallbackParams]);

  return null;
}
