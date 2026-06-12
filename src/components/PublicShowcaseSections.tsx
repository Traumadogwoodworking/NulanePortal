import { appShowcaseShots, portalShowcaseShots } from "@/lib/publicShowcase";
import { ScreenshotCard } from "@/components/public-site";

export function PublicShowcaseSections() {
  return (
    <>
      <section id="screenshots" className="mx-auto w-full max-w-7xl px-6 pb-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">App photos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">App screenshots</h2>
          <div className="mx-auto mt-6 grid max-w-[680px] grid-cols-2 gap-4 sm:gap-5">
            {appShowcaseShots.map((shot) => (
              <div key={shot.path} className="w-full">
                <AppScreenshotCard path={shot.path} exists={shot.exists} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 py-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-slate-100 shadow-[0_18px_54px_rgba(15,23,42,0.16)]">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-400">Portal screenshots</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Portal screenshots</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            The PDF example gets its own oversized row at the top, and the portal captures below are widened so the details stay readable.
          </p>
          <div className="mt-6 space-y-5">
            {portalShowcaseShots.filter((shot) => shot.featured).map((shot) => (
              <div key={shot.path}>
                <ScreenshotCard {...shot} />
              </div>
            ))}
            <div className="grid gap-5 lg:grid-cols-2">
              {portalShowcaseShots.filter((shot) => !shot.featured).map((shot) => (
                <div key={shot.path} className="lg:col-span-1">
                  <ScreenshotCard {...shot} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function AppScreenshotCard({ path, exists }: { path: string; exists: boolean }) {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white p-1.5 shadow-[0_12px_28px_rgba(15,23,42,0.08)] sm:rounded-[1.5rem] sm:p-2">
      {exists ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={path} alt="" aria-hidden className="aspect-[1206/2622] w-full rounded-[1rem] bg-white object-contain sm:rounded-[1.15rem]" />
      ) : (
        <div className="flex aspect-[1206/2622] items-center justify-center rounded-[1rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-center sm:rounded-[1.15rem]">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">App shot pending</p>
            <p className="mt-2 text-[11px] text-slate-500">{path.replace("/images/", "")}</p>
          </div>
        </div>
      )}
      <span className="sr-only">App screenshot</span>
    </div>
  );
}
