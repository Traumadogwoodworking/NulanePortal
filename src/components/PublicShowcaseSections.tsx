"use client";

import { type PointerEvent, type ReactNode, useRef } from "react";
import { appShowcaseShots, portalShowcaseShots } from "@/lib/publicShowcase";
import { ScreenshotCard } from "@/components/public-site";

const workflowBullets = [
  "Simple mobile workflow",
  "Centralized records and photos",
  "Clear reporting and review visibility",
];

function groupShots<T>(shots: T[], groupSize: number): T[][] {
  const groups: T[][] = [];
  for (let index = 0; index < shots.length; index += groupSize) {
    groups.push(shots.slice(index, index + groupSize));
  }
  return groups;
}

function CarouselLane({ children, theme = "light" }: { children: ReactNode; theme?: "light" | "dark" }) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });

  const snapBy = (direction: -1 | 1) => {
    const lane = laneRef.current;
    if (!lane) return;
    const slides = Array.from(lane.children) as HTMLElement[];
    if (!slides.length) return;
    const laneCenter = lane.scrollLeft + lane.clientWidth / 2;
    const currentIndex = slides.reduce((closestIndex, slide, index) => {
      const currentSlide = slides[closestIndex];
      const currentDistance = Math.abs(currentSlide.offsetLeft + currentSlide.offsetWidth / 2 - laneCenter);
      const nextDistance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - laneCenter);
      return nextDistance < currentDistance ? index : closestIndex;
    }, 0);
    const target = slides[Math.max(0, Math.min(slides.length - 1, currentIndex + direction))];
    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const snapToClosest = () => {
    const lane = laneRef.current;
    if (!lane) return;
    const slides = Array.from(lane.children) as HTMLElement[];
    if (!slides.length) return;
    const laneCenter = lane.scrollLeft + lane.clientWidth / 2;
    const target = slides.reduce((closest, slide) => {
      const closestDistance = Math.abs(closest.offsetLeft + closest.offsetWidth / 2 - laneCenter);
      const slideDistance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - laneCenter);
      return slideDistance < closestDistance ? slide : closest;
    }, slides[0]);
    target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const lane = laneRef.current;
    if (!lane) return;
    dragRef.current = { active: true, startX: event.clientX, scrollLeft: lane.scrollLeft };
    lane.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const lane = laneRef.current;
    if (!lane || !dragRef.current.active) return;
    lane.scrollLeft = dragRef.current.scrollLeft - (event.clientX - dragRef.current.startX);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    const lane = laneRef.current;
    if (!lane || !dragRef.current.active) return;
    dragRef.current.active = false;
    if (lane.hasPointerCapture(event.pointerId)) {
      lane.releasePointerCapture(event.pointerId);
    }
    snapToClosest();
  };

  return (
    <div
      ref={laneRef}
      tabIndex={0}
      role="region"
      aria-label="Screenshot carousel"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          snapBy(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          snapBy(1);
        }
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className={`flex cursor-grab snap-x snap-mandatory gap-6 overflow-x-auto pb-4 outline-none [scrollbar-width:thin] active:cursor-grabbing ${
        theme === "dark" ? "focus-visible:ring-2 focus-visible:ring-white/60" : "focus-visible:ring-2 focus-visible:ring-slate-900/30"
      }`}
    >
      {children}
    </div>
  );
}

export function PublicShowcaseSections() {
  const appSlides = groupShots(appShowcaseShots, 3);
  const portalSlides = groupShots(portalShowcaseShots, 1);

  return (
    <>
      <section id="experience" className="mx-auto w-full max-w-[92rem] px-4 pb-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_64px_rgba(15,23,42,0.1)] sm:p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Mobile app</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Inspection experience</h2>
          <div className="relative mt-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />
            <CarouselLane>
              {appSlides.map((slide, index) => (
                <div
                  key={slide.map((shot) => shot.path).join("|")}
                  className="grid w-[min(1120px,calc(100vw-3rem))] shrink-0 snap-center scroll-mx-6 grid-cols-3 gap-3 sm:gap-5 lg:gap-6"
                  aria-label={`Mobile screenshots ${index * 3 + 1} through ${index * 3 + slide.length}`}
                >
                  {slide.map((shot, shotIndex) => (
                    <AppScreenshotCard key={shot.path} path={shot.path} exists={shot.exists} showIsland={shotIndex === 0} />
                  ))}
                  {Array.from({ length: 3 - slide.length }).map((_, emptyIndex) => (
                    <div key={`empty-${emptyIndex}`} aria-hidden />
                  ))}
                </div>
              ))}
            </CarouselLane>
            <div className="mt-2 flex justify-center gap-2" aria-hidden>
              {appSlides.map((slide, index) => (
                <span
                  key={slide.map((shot) => shot.path).join("|")}
                  className={`h-1.5 rounded-full ${index === 0 ? "w-8 bg-slate-950" : "w-3 bg-slate-300"}`}
                />
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {workflowBullets.map((item) => (
              <span
                key={item}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[92rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-[0_26px_72px_rgba(15,23,42,0.22)] sm:p-8 lg:p-10">
          <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-400">Portal</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Review experience</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            The portal captures sit in oversized framed slides so the report, dashboard, and routing details stay readable.
          </p>
          <div className="relative mt-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-slate-950 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-slate-950 to-transparent" />
            <CarouselLane theme="dark">
              {portalSlides.map((slide, index) => (
                <div
                  key={slide.map((shot) => shot.path).join("|")}
                  className="w-[min(1120px,calc(100vw-3rem))] shrink-0 snap-center"
                  aria-label={`Portal screenshot ${index + 1}`}
                >
                  {slide.map((shot) => (
                    <ScreenshotCard key={shot.path} {...shot} />
                  ))}
                </div>
              ))}
            </CarouselLane>
            <div className="mt-2 flex justify-center gap-2" aria-hidden>
              {portalSlides.map((slide, index) => (
                <span key={slide.map((shot) => shot.path).join("|")} className={`h-1.5 rounded-full ${index === 0 ? "w-8 bg-white" : "w-3 bg-slate-700"}`} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function AppScreenshotCard({ path, exists, showIsland }: { path: string; exists: boolean; showIsland: boolean }) {
  return (
    <div className="rounded-[2.35rem] border border-slate-800 bg-slate-950 p-2 shadow-[0_22px_54px_rgba(15,23,42,0.2)] sm:p-2.5">
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-700 bg-black p-1.5">
        {/* All app shots keep the phone border; only the first shot in each snapped group shows the island. */}
        {showIsland ? <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)] sm:h-6 sm:w-24" /> : null}
        {exists ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={path} alt="" aria-hidden className="aspect-[1206/2622] w-full rounded-[1.65rem] bg-white object-contain" />
        ) : (
          <div className="flex aspect-[1206/2622] items-center justify-center rounded-[1.65rem] border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">App shot pending</p>
              <p className="mt-2 text-[11px] text-slate-500">{path.replace("/images/", "")}</p>
            </div>
          </div>
        )}
      </div>
      <span className="sr-only">App screenshot</span>
    </div>
  );
}
