import { LoaderCircle } from "lucide-react";

type PageLoadingScreenProps = {
  title: string;
  description: string;
  detail?: string;
};

export function PageLoadingScreen({
  title,
  description,
  detail = "This should only take a moment.",
}: PageLoadingScreenProps) {
  return (
    <section
      className="flex min-h-[60vh] items-center justify-center"
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-5xl overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-[0_28px_90px_-48px_rgba(15,23,42,0.45)]">
        <div className="h-1.5 overflow-hidden bg-blue-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-600" />
        </div>
        <div className="flex flex-col items-center px-6 py-12 text-center sm:px-10">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-blue-200 bg-blue-50 shadow-inner">
            <div className="absolute inset-1 animate-ping rounded-full border border-blue-300/60" />
            <LoaderCircle className="relative h-8 w-8 animate-spin text-blue-700" aria-hidden="true" />
          </div>
          <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 max-w-xl text-base font-medium leading-6 text-slate-700">{description}</p>
          <p className="mt-1 text-sm text-slate-500">{detail}</p>
          <div className="mt-10 grid w-full gap-4 sm:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="h-3 w-2/5 animate-pulse rounded-full bg-slate-200" />
                <div className="mt-4 h-8 w-3/5 animate-pulse rounded-lg bg-slate-200" />
                <div className="mt-4 h-3 w-full animate-pulse rounded-full bg-slate-200/80" />
                <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-slate-200/80" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
