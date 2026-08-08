import { Suspense } from "react";
import ResourceGuidePageClient from "@/components/resources/ResourceGuidePageClient";

function GuideLoading() {
  return <main className="mx-auto max-w-4xl p-6 text-sm text-slate-500">Loading guide…</main>;
}

export default function ResourceGuidePage() {
  return (
    <Suspense fallback={<GuideLoading />}>
      <ResourceGuidePageClient />
    </Suspense>
  );
}
