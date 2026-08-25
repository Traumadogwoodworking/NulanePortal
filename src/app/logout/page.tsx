import { Suspense } from "react";
import { LogoutRedirectClient } from "./LogoutRedirectClient";

export default function LogoutPage() {
  return (
    <Suspense fallback={null}>
      <LogoutRedirectClient />
    </Suspense>
  );
}
