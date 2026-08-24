import { Suspense } from "react";
import { SignupRedirectClient } from "./SignupRedirectClient";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupRedirectClient />
    </Suspense>
  );
}
