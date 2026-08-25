import { Suspense } from "react";
import { DefinianStartClient } from "./DefinianStartClient";

export default function DefinianStartPage() {
  return (
    <Suspense fallback={null}>
      <DefinianStartClient />
    </Suspense>
  );
}
