"use client";

import { Children, type PointerEvent, type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { appShowcaseShots, portalShowcaseShots } from "@/lib/publicShowcase";
import { ScreenshotCard } from "@/components/public-site";

const workflowBullets = [
  "Simple mobile workflow",
  "Centralized records and photos",
  "Clear reporting and review visibility",
];

function chunk<T>(items: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push(items.slice(i, i + size));
  }
  return groups;
}

function useResponsiveGroupSize(): number {
  const [groupSize, setGroupSize] = useState(3);

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      if (width >= 1024) setGroupSize(3);
      else if (width >= 640) setGroupSize(2);
      else setGroupSize(1);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return groupSize;
}

function CarouselSlider({
  activePage,
  pageCount,
  onPageChange,
  theme = "light",
}: {
  activePage: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  theme?: "light" | "dark";
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef(false);
  const progress = pageCount <= 1 ? 0 : activePage / (pageCount - 1);
  const isDark = theme === "dark";

  const commitFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track || pageCount <= 1) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const page = Math.round(ratio * (pageCount - 1));
    onPageChange(page);
  };

  const handleTrackClick = (event: React.MouseEvent<HTMLDivElement>) => {
    commitFromClientX(event.clientX);
  };

  const handleThumbPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.button !== 0) return;
    dragRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleThumbPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    commitFromClientX(event.clientX);
  };

  const handleThumbPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const arrowBase = isDark
    ? "text-slate-400 hover:text-white disabled:text-slate-700"
    : "text-slate-400 hover:text-slate-900 disabled:text-slate-300";

  return (
    <div className="mt-5 flex items-center gap-3 sm:gap-4">
      <button
        type="button"
        aria-label="Previous screenshots"
        disabled={activePage <= 0}
        onClick={() => onPageChange(Math.max(0, activePage - 1))}
        className={`rounded-full p-1 transition ${arrowBase}`}
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className={`relative flex-1 cursor-pointer rounded-full ${
          isDark ? "bg-slate-800" : "bg-slate-200"
        } h-2 sm:h-2.5`}
      >
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${
            isDark ? "bg-white" : "bg-slate-900"
          }`}
          style={{ width: `${progress * 100}%` }}
        />
        <div
          onPointerDown={handleThumbPointerDown}
          onPointerMove={handleThumbPointerMove}
          onPointerUp={handleThumbPointerUp}
          onPointerCancel={handleThumbPointerUp}
          className={`absolute top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 rounded-full border-2 shadow-md transition-all ${
            isDark ? "border-slate-950 bg-white" : "border-white bg-slate-900"
          }`}
          style={{ left: `${progress * 100}%`, transform: "translate(-50%, -50%)" }}
        />
      </div>
      <button
        type="button"
        aria-label="Next screenshots"
        disabled={activePage >= pageCount - 1}
        onClick={() => onPageChange(Math.min(pageCount - 1, activePage + 1))}
        className={`rounded-full p-1 transition ${arrowBase}`}
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
    </div>
  );
}

function CarouselLane({
  children,
  theme = "light",
  groupSize = 1,
  groupClassName = "",
}: {
  children: ReactNode;
  theme?: "light" | "dark";
  groupSize?: number;
  groupClassName?: string;
}) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [activeGroup, setActiveGroup] = useState(0);
  const items = Children.toArray(children);
  const groups = chunk(items, Math.max(1, groupSize));

  const computeClosestGroup = () => {
    const lane = laneRef.current;
    const slides = slideRefs.current.filter(Boolean) as HTMLElement[];
    if (!lane || !slides.length) return 0;
    const laneCenter = lane.scrollLeft + lane.clientWidth / 2;
    return slides.reduce((closestIndex, slide, index) => {
      const currentSlide = slides[closestIndex];
      const currentDistance = Math.abs(currentSlide.offsetLeft + currentSlide.offsetWidth / 2 - laneCenter);
      const nextDistance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - laneCenter);
      return nextDistance < currentDistance ? index : closestIndex;
    }, 0);
  };

  const snapToGroup = (groupIndex: number) => {
    const target = slideRefs.current[groupIndex];
    target?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const snapBy = (direction: -1 | 1) => {
    snapToGroup(Math.max(0, Math.min(groups.length - 1, activeGroup + direction)));
  };

  useEffect(() => {
    const lane = laneRef.current;
    if (!lane) return;

    const handleScroll = () => {
      const next = computeClosestGroup();
      setActiveGroup((prev) => (prev !== next ? next : prev));
    };

    lane.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => lane.removeEventListener("scroll", handleScroll);
  }, [groups.length]);

  useEffect(() => {
    setActiveGroup((prev) => Math.min(prev, Math.max(0, groups.length - 1)));
  }, [groups.length]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.pointerType !== "mouse") return;
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
    snapToGroup(computeClosestGroup());
  };

  const isDark = theme === "dark";

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Previous group"
        disabled={activeGroup <= 0}
        onClick={() => snapBy(-1)}
        className={`absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full border p-2 shadow-md transition sm:left-3 sm:p-2.5 ${
          isDark
            ? "border-slate-700 bg-slate-900/90 text-white hover:border-slate-500 hover:bg-slate-800"
            : "border-slate-200 bg-white/95 text-slate-900 hover:border-slate-300 hover:bg-white"
        } ${activeGroup <= 0 ? "cursor-not-allowed opacity-40" : ""}`}
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
      <button
        type="button"
        aria-label="Next group"
        disabled={activeGroup >= groups.length - 1}
        onClick={() => snapBy(1)}
        className={`absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full border p-2 shadow-md transition sm:right-3 sm:p-2.5 ${
          isDark
            ? "border-slate-700 bg-slate-900/90 text-white hover:border-slate-500 hover:bg-slate-800"
            : "border-slate-200 bg-white/95 text-slate-900 hover:border-slate-300 hover:bg-white"
        } ${activeGroup >= groups.length - 1 ? "cursor-not-allowed opacity-40" : ""}`}
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

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
        className={`flex cursor-grab snap-x snap-mandatory gap-5 overflow-x-auto pb-3 outline-none [scrollbar-width:thin] select-none active:cursor-grabbing ${
          isDark ? "focus-visible:ring-2 focus-visible:ring-white/60" : "focus-visible:ring-2 focus-visible:ring-slate-900/30"
        }`}
      >
        {groups.map((group, groupIndex) => {
          const firstKey = (group[0] as ReactElement)?.key ?? groupIndex;
          return (
            <div
              key={firstKey}
              ref={(node) => {
                slideRefs.current[groupIndex] = node;
              }}
              className={`shrink-0 snap-center px-1 ${groupClassName}`}
            >
              <div
                className="grid gap-4 sm:gap-5"
                style={{ gridTemplateColumns: `repeat(${Math.min(groupSize, group.length)}, minmax(0, 1fr))` }}
              >
                {group.map((child, childIndex) => (
                  <div key={childIndex} className="min-w-0">
                    {child}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <CarouselSlider
        activePage={activeGroup}
        pageCount={groups.length}
        onPageChange={snapToGroup}
        theme={theme}
      />
    </div>
  );
}

export function PublicShowcaseSections() {
  const appGroupSize = useResponsiveGroupSize();

  return (
    <>
      <section id="experience" className="mx-auto flex min-h-screen w-full max-w-[92rem] items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_22px_64px_rgba(15,23,42,0.1)] sm:p-8 lg:p-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-500">Mobile app</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Inspection experience</h2>
            </div>
            <ul className="flex flex-wrap gap-2 sm:justify-end">
              {workflowBullets.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm sm:px-4 sm:py-2 sm:text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mt-6 sm:mt-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent" />
            <CarouselLane groupSize={appGroupSize} groupClassName="w-[min(92vw,64rem)]">
              {appShowcaseShots.map((shot, index) => (
                <div key={shot.path} aria-label={`Mobile screenshot ${index + 1}`}>
                  <AppScreenshotCard path={shot.path} exists={shot.exists} showIsland />
                </div>
              ))}
            </CarouselLane>
          </div>
        </div>
      </section>

      <section className="mx-auto flex min-h-screen w-full max-w-[92rem] items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full rounded-[2rem] border border-slate-800 bg-slate-950 p-5 text-slate-100 shadow-[0_26px_72px_rgba(15,23,42,0.22)] sm:p-8 lg:p-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-slate-400">Portal</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Review experience</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-right">
              Oversized framed slides keep reports, dashboards, and routing details readable.
            </p>
          </div>

          <div className="relative mt-6 sm:mt-8">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-slate-950 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-slate-950 to-transparent" />
            <CarouselLane theme="dark" groupSize={1} groupClassName="w-[min(92vw,72rem)]">
              {portalShowcaseShots.map((shot, index) => (
                <div key={shot.path} aria-label={`Portal screenshot ${index + 1}`}>
                  <ScreenshotCard {...shot} />
                </div>
              ))}
            </CarouselLane>
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
        {showIsland ? (
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)] sm:h-6 sm:w-24" />
        ) : null}
        {exists ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={path}
            alt=""
            aria-hidden
            className="aspect-[1206/2622] w-full rounded-[1.65rem] bg-white object-contain"
          />
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
