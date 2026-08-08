import { Suspense } from "react";
import { LoginRedirectClient } from "./LoginRedirectClient";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginRedirectClient />
    </Suspense>
  );
}
