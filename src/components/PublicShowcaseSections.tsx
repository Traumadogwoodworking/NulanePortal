"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { appShowcaseShots, portalShowcaseShots } from "@/lib/publicShowcase";
import { publicBranding } from "@/lib/publicBranding";
import { ScreenshotCard } from "@/components/public-site";

const workflowBullets = [
  "Simple mobile workflow",
  "Centralized records and photos",
  "Clear reporting and review visibility",
];

function ProgressBar({
  emblaApi,
  theme,
}: {
  emblaApi: EmblaCarouselType | undefined;
  theme: "light" | "dark";
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const dragging = useRef(false);
  const isDark = theme === "dark";

  useEffect(() => {
    if (!emblaApi) return;
    const update = () => setProgress(Math.max(0, Math.min(1, emblaApi.scrollProgress())));
    update();
    emblaApi.on("scroll", update);
    emblaApi.on("select", update);
    emblaApi.on("resize", update);
    emblaApi.on("reInit", update);
    return () => {
      emblaApi.off("scroll", update);
      emblaApi.off("select", update);
      emblaApi.off("resize", update);
      emblaApi.off("reInit", update);
    };
  }, [emblaApi]);

  const slideCount = emblaApi ? emblaApi.slideNodes().length : 0;

  const indexFromClientX = (clientX: number) => {
    if (!emblaApi || !trackRef.current || slideCount <= 1) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.max(0, Math.min(slideCount - 1, Math.round(ratio * (slideCount - 1))));
  };

  const handleTrackPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !emblaApi || slideCount <= 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    emblaApi.scrollTo(indexFromClientX(event.clientX), false);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !emblaApi || slideCount <= 1) return;
    emblaApi.scrollTo(indexFromClientX(event.clientX), false);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const arrowBase = isDark
    ? "text-slate-400 hover:text-white disabled:text-slate-700"
    : "text-slate-400 hover:text-slate-900 disabled:text-slate-300";

  return (
    <div className="mt-5 flex items-center gap-3 sm:mt-6 sm:gap-4">
      <button
        type="button"
        aria-label="Previous screenshots"
        disabled={!emblaApi?.canScrollPrev()}
        onClick={() => emblaApi?.scrollPrev()}
        className={`rounded-full p-1 transition ${arrowBase}`}
      >
        <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>

      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative h-2 flex-1 cursor-pointer rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`}
      >
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${isDark ? "bg-white" : "bg-slate-900"}`}
          style={{ width: `${progress * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-8 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-red-700 bg-red-600 shadow-[0_6px_14px_rgba(239,68,68,0.22)]"
          style={{ left: `${progress * 100}%` }}
        />
      </div>

      <button
        type="button"
        aria-label="Next screenshots"
        disabled={!emblaApi?.canScrollNext()}
        onClick={() => emblaApi?.scrollNext()}
        className={`rounded-full p-1 transition ${arrowBase}`}
      >
        <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
      </button>
    </div>
  );
}

function ShowcaseEmblaCarousel({
  eyebrow,
  title,
  description,
  shots,
  variant,
  slideClassName,
  phoneFrame,
  settleGroupSize = 1,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  shots: { path: string; exists: boolean; featured?: boolean; kind?: "portrait" | "landscape" }[];
  variant: "light" | "dark";
  slideClassName?: string;
  phoneFrame?: boolean;
  settleGroupSize?: number;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    containScroll: "trimSnaps",
    dragFree: true,
    skipSnaps: true,
  });
  const dragging = useRef(false);
  const isDark = variant === "dark";
  const defaultSlideClass = "flex-[0_0_86%] sm:flex-[0_0_48%] lg:flex-[0_0_31%]";
  const groupedShots =
    phoneFrame
      ? null
      : settleGroupSize > 1
      ? Array.from({ length: Math.ceil(shots.length / settleGroupSize) }, (_, groupIndex) =>
          shots.slice(groupIndex * settleGroupSize, groupIndex * settleGroupSize + settleGroupSize)
        )
      : null;

  useEffect(() => {
    if (!emblaApi) return;
    const settleToGroup = () => {
      if (dragging.current || settleGroupSize <= 1) return;
      const currentSnap = emblaApi.selectedScrollSnap();
      const target = Math.max(
        0,
        Math.min(emblaApi.slideNodes().length - 1, Math.round(currentSnap / settleGroupSize) * settleGroupSize)
      );
      if (target !== currentSnap) {
        emblaApi.scrollTo(target, false);
      }
    };
    emblaApi.on("settle", settleToGroup);
    emblaApi.on("pointerUp", settleToGroup);
    return () => {
      emblaApi.off("settle", settleToGroup);
      emblaApi.off("pointerUp", settleToGroup);
    };
  }, [emblaApi, settleGroupSize]);

  return (
    <div
      className={`w-full rounded-[2rem] border p-4 sm:p-6 lg:p-8 ${
        isDark
          ? "border-slate-800 bg-slate-950 text-slate-100 shadow-[0_26px_72px_rgba(15,23,42,0.22)]"
          : "border-slate-200 bg-white shadow-[0_22px_64px_rgba(15,23,42,0.1)]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.32em] ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {eyebrow}
          </p>
          <h2 className={`mt-3 text-3xl font-black tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>{title}</h2>
        </div>
        {description ? (
          <div className={`max-w-xl text-sm leading-7 ${isDark ? "text-slate-300 sm:text-right" : "text-slate-600 sm:text-right"}`}>
            {description}
          </div>
        ) : null}
      </div>

      <div className="relative mt-4 sm:mt-6">
        <div
          className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r ${
            isDark ? "from-slate-950" : "from-white"
          } to-transparent`}
        />
        <div
          className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l ${
            isDark ? "from-slate-950" : "from-white"
          } to-transparent`}
        />

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 sm:gap-5">
            {groupedShots
              ? groupedShots.map((group, groupIndex) => (
                  <div key={group[0]?.path ?? groupIndex} className={`min-w-0 ${slideClassName ?? defaultSlideClass}`}>
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                      {group.map((shot) => (
                        <div key={shot.path} className="min-w-0">
                          {phoneFrame ? (
                            <AppScreenshotCard path={shot.path} exists={shot.exists} showIsland compact />
                          ) : (
                            <ScreenshotCard {...shot} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              : shots.map((shot) => (
                  <div key={shot.path} className={`min-w-0 ${slideClassName ?? defaultSlideClass}`}>
                    {phoneFrame ? (
                      <AppScreenshotCard path={shot.path} exists={shot.exists} showIsland />
                    ) : (
                      <ScreenshotCard {...shot} />
                    )}
                  </div>
                ))}
          </div>
        </div>
      </div>

      <ProgressBar emblaApi={emblaApi} theme={variant} />
    </div>
  );
}

export function PublicShowcaseSections() {
  if (publicBranding.mode === "definianInspection") {
    return null;
  }

  return (
    <>
      <section id="experience" className="mx-auto flex min-h-screen w-full max-w-[92rem] items-center bg-[#e9ebf2] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <ShowcaseEmblaCarousel
          eyebrow="Mobile app"
          title="Inspection experience"
          description={
            <ul className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1 sm:justify-end sm:overflow-visible sm:pb-0">
              {workflowBullets.map((item) => (
                <li
                  key={item}
                  className="shrink-0 whitespace-nowrap rounded-full bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-[0_4px_14px_rgba(15,23,42,0.22)] ring-1 ring-white/10 sm:px-5 sm:py-2.5 sm:text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          }
          shots={appShowcaseShots}
          variant="light"
          phoneFrame
          settleGroupSize={1}
          slideClassName="flex-[0_0_88%] sm:flex-[0_0_48%] lg:flex-[0_0_31%]"
        />
      </section>

      <section className="mx-auto flex min-h-screen w-full max-w-[92rem] items-center bg-[#e9ebf2] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <ShowcaseEmblaCarousel
          eyebrow="Portal"
          title="Review experience"
          shots={portalShowcaseShots}
          variant="dark"
          slideClassName="flex-[0_0_92%] sm:flex-[0_0_80%] lg:flex-[0_0_70%]"
        />
      </section>
    </>
  );
}

function AppScreenshotCard({
  path,
  exists,
  showIsland,
  compact = false,
}: {
  path: string;
  exists: boolean;
  showIsland: boolean;
  compact?: boolean;
}) {
  const frameClass = compact
    ? "flex h-[64svh] min-h-[430px] max-h-[600px] items-center justify-center bg-white"
    : "flex h-[78svh] max-h-[900px] min-h-[420px] items-center justify-center bg-white";
  const shellClass = compact
    ? "relative aspect-[430/932] h-full rounded-[2.1rem] bg-black p-[10px] shadow-[0_24px_54px_rgba(15,23,42,0.18)]"
    : "relative aspect-[430/932] h-full rounded-[2.6rem] bg-black p-[12px] shadow-[0_34px_76px_rgba(15,23,42,0.22)]";
  const bezelClass = compact
    ? "relative h-full w-full overflow-hidden rounded-[1.7rem] bg-white"
    : "relative h-full w-full overflow-hidden rounded-[2.1rem] bg-white";
  const islandClass = compact
    ? "pointer-events-none absolute left-1/2 top-[10px] z-20 h-[24px] w-[88px] -translate-x-1/2 rounded-full bg-black"
    : "pointer-events-none absolute left-1/2 top-[12px] z-20 h-[28px] w-[102px] -translate-x-1/2 rounded-full bg-black";
  const sideRailLeftClass = compact
    ? "pointer-events-none absolute left-[-4px] top-[18%] h-16 w-[4px] rounded-l bg-black"
    : "pointer-events-none absolute left-[-4px] top-[18%] h-20 w-[4px] rounded-l bg-black";
  const sideRailRightClass = compact
    ? "pointer-events-none absolute right-[-4px] top-[24%] h-24 w-[4px] rounded-r bg-black"
    : "pointer-events-none absolute right-[-4px] top-[24%] h-28 w-[4px] rounded-r bg-black";
  const screenClass = compact
    ? "absolute inset-0 overflow-hidden rounded-[1.7rem] bg-white"
    : "absolute inset-0 overflow-hidden rounded-[2.1rem] bg-white";
  const imageWrapClass = "absolute inset-0 overflow-hidden bg-white";
  return (
    <div className={frameClass}>
      <div className={shellClass}>
        <div className={bezelClass}>
          <div className={sideRailLeftClass} />
          <div className={sideRailRightClass} />
          <div className={screenClass}>
            <div className={imageWrapClass}>
              {exists ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={path}
                  alt=""
                  aria-hidden
                  draggable={false}
                  className="h-full w-full bg-transparent object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-400">App shot pending</p>
                    <p className="mt-2 text-[11px] text-slate-500">{path.replace("/images/", "")}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {showIsland ? <div className={islandClass} /> : null}
        </div>
      </div>
      <span className="sr-only">App screenshot</span>
    </div>
  );
}
