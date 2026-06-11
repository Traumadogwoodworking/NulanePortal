import { appShowcaseShots, portalShowcaseShots } from "@/lib/publicShowcase";
import { ScreenshotCard } from "@/components/public-site";

export function PublicShowcaseSections() {
  return (
    <>
      <section id="screenshots" className="mx-auto w-full max-w-7xl px-6 pb-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">App photos</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">App screenshots</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Each screen is shown in a tall framed card so the app flow stays visible and readable.
          </p>
          <div className="mt-6 grid gap-5">
            {appShowcaseShots.map((shot) => (
              <div key={shot.path} className="mx-auto w-full max-w-3xl">
                <ScreenshotCard {...shot} />
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
