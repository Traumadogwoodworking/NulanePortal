"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar } from "lucide-react";

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day);
}

function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(Math.round((endUtc - startUtc) / 86400000), 0);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function clampDate(date: Date, min: Date, max: Date): Date {
  return new Date(Math.min(Math.max(date.getTime(), min.getTime()), max.getTime()));
}

type Props = {
  value: {
    createdFrom: string;
    createdTo: string;
  };
  onChange: (next: { createdFrom: string; createdTo: string }) => void;
  label?: string;
  minDate?: string | null;
  maxDate?: string | null;
};

export function ReportDateRangeFilter({ value, onChange, label = "Date Range", minDate, maxDate }: Props) {
  const [dateFilterMode, setDateFilterMode] = useState<"single" | "range">("range");
  const [activeDateHandle, setActiveDateHandle] = useState<"start" | "end" | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const todayInputValue = toDateInputValue(new Date());
  const yesterdayInputValue = toDateInputValue(addDays(new Date(), -1));
  const formatSingleDayLabel = (dateValue: string): string => {
    if (dateValue === todayInputValue) return "Today";
    if (dateValue === yesterdayInputValue) return "Yesterday";
    return dateValue;
  };

  const dateBounds = useMemo(() => {
    const fallback = new Date();
    return {
      min: minDate ? parseDateInputValue(minDate) : fallback,
      max: maxDate ? parseDateInputValue(maxDate) : fallback,
    };
  }, [maxDate, minDate]);

  const presetRanges = useMemo(() => {
    const end = new Date();
    return [
      {
        key: "today",
        label: "Today",
        mode: "single" as const,
        range: {
          createdFrom: todayInputValue,
          createdTo: todayInputValue,
        },
      },
      {
        key: "yesterday",
        label: "Yesterday",
        mode: "single" as const,
        range: {
          createdFrom: yesterdayInputValue,
          createdTo: yesterdayInputValue,
        },
      },
      {
        key: "week_to_date",
        label: "Week to date",
        mode: "range" as const,
        range: {
          createdFrom: toDateInputValue(clampDate(addDays(end, -7), dateBounds.min, end)),
          createdTo: todayInputValue,
        },
      },
      {
        key: "month_to_date",
        label: "Month to date",
        mode: "range" as const,
        range: {
          createdFrom: toDateInputValue(clampDate(addMonths(end, -1), dateBounds.min, end)),
          createdTo: todayInputValue,
        },
      },
    ];
  }, [dateBounds.min, todayInputValue, yesterdayInputValue]);

  const dateRangeMax = useMemo(() => daysBetween(dateBounds.min, dateBounds.max), [dateBounds]);
  const createdFromOffset = value.createdFrom ? daysBetween(dateBounds.min, parseDateInputValue(value.createdFrom)) : 0;
  const createdToOffset = value.createdTo ? daysBetween(dateBounds.min, parseDateInputValue(value.createdTo)) : dateRangeMax;
  const dateStartOffset = Math.min(createdFromOffset, dateRangeMax);
  const dateEndOffset = Math.min(
    Math.max(createdToOffset, dateFilterMode === "range" && dateRangeMax > 0 ? dateStartOffset + 1 : dateStartOffset),
    dateRangeMax
  );
  const dateStartPercent = dateRangeMax ? (dateStartOffset / dateRangeMax) * 100 : 0;
  const dateEndPercent = dateRangeMax ? (dateEndOffset / dateRangeMax) * 100 : dateStartPercent;

  const clampRangeStartDate = (nextValue: string) => {
    onChange({ createdFrom: nextValue, createdTo: value.createdTo });
    if (!nextValue) return;
    const nextStartOffset = daysBetween(dateBounds.min, parseDateInputValue(nextValue));
    const currentEndOffset = value.createdTo ? daysBetween(dateBounds.min, parseDateInputValue(value.createdTo)) : dateRangeMax;
    if (dateFilterMode === "single") {
      onChange({ createdFrom: nextValue, createdTo: nextValue });
      return;
    }
    if (dateRangeMax > 0 && currentEndOffset <= nextStartOffset) {
      onChange({ createdFrom: nextValue, createdTo: toDateInputValue(addDays(dateBounds.min, Math.min(nextStartOffset + 1, dateRangeMax))) });
    }
  };

  const clampRangeEndDate = (nextValue: string) => {
    onChange({ createdFrom: value.createdFrom, createdTo: nextValue });
    if (!nextValue) return;
    const nextEndOffset = daysBetween(dateBounds.min, parseDateInputValue(nextValue));
    const currentStartOffset = value.createdFrom ? daysBetween(dateBounds.min, parseDateInputValue(value.createdFrom)) : 0;
    if (dateFilterMode === "single") {
      onChange({ createdFrom: nextValue, createdTo: nextValue });
      return;
    }
    if (dateRangeMax > 0 && nextEndOffset <= currentStartOffset) {
      onChange({ createdFrom: toDateInputValue(addDays(dateBounds.min, Math.max(nextEndOffset - 1, 0))), createdTo: nextValue });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [isOpen]);

  return (
    <div ref={rootRef} className="group relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex h-8 w-72 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm"
      >
        <span className="min-w-0 flex-1 truncate">
          {value.createdFrom || value.createdTo
            ? dateFilterMode === "single"
              ? formatSingleDayLabel(value.createdFrom || value.createdTo || todayInputValue)
              : `${value.createdFrom || toDateInputValue(dateBounds.min)} to ${value.createdTo || toDateInputValue(dateBounds.max)}`
            : label}
        </span>
        <Calendar className="h-4 w-4 text-slate-400" />
      </button>
      {isOpen ? (
      <div className="absolute right-0 top-10 z-50 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-3">
          <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Presets</div>
          <div className="flex flex-col gap-2">
            {presetRanges.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  setDateFilterMode(preset.mode);
                  onChange(preset.range);
                  setIsOpen(false);
                }}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[11px] font-black uppercase tracking-widest text-slate-700 transition hover:border-slate-300 hover:bg-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-3 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["single", "range"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setDateFilterMode(mode);
                if (mode === "single") {
                  const selected = value.createdFrom || value.createdTo || todayInputValue;
                  onChange({ createdFrom: selected, createdTo: selected });
                } else if (dateRangeMax > 0) {
                  const selectedStart = value.createdFrom || toDateInputValue(dateBounds.min);
                  const startOffset = daysBetween(dateBounds.min, parseDateInputValue(selectedStart));
                  const selectedEnd = value.createdTo || toDateInputValue(dateBounds.max);
                  const endOffset = daysBetween(dateBounds.min, parseDateInputValue(selectedEnd));
                  onChange({
                    createdFrom: selectedStart,
                    createdTo: endOffset <= startOffset ? toDateInputValue(addDays(dateBounds.min, Math.min(startOffset + 1, dateRangeMax))) : selectedEnd,
                  });
                }
              }}
              className={`flex-1 rounded-md px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${
                dateFilterMode === mode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {mode === "single" ? "Today" : "Range"}
            </button>
          ))}
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
              <span>{dateFilterMode === "single" ? "Day" : "Active range"}</span>
              <span>
                {dateFilterMode === "single"
                  ? value.createdFrom === todayInputValue || value.createdTo === todayInputValue
                    ? "Today"
                    : value.createdFrom || value.createdTo || todayInputValue
                  : `${value.createdFrom || toDateInputValue(dateBounds.min)} to ${value.createdTo || toDateInputValue(dateBounds.max)}`}
              </span>
            </div>
            <div
              className="relative h-10 touch-none select-none"
              onPointerDown={(event) => {
                const target = event.target as HTMLElement;
                const handle = target.dataset.dateHandle as "start" | "end" | undefined;
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = rect.width > 0 ? Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) : 0;
                const offset = Math.round(ratio * dateRangeMax);
                const nextDate = toDateInputValue(addDays(dateBounds.min, offset));
                event.currentTarget.setPointerCapture(event.pointerId);
                setActiveDateHandle(handle ?? "start");
                if (handle === "end") {
                  clampRangeEndDate(nextDate);
                } else {
                  clampRangeStartDate(nextDate);
                }
              }}
              onPointerMove={(event) => {
                if (!activeDateHandle || event.buttons !== 1) return;
                const rect = event.currentTarget.getBoundingClientRect();
                const ratio = rect.width > 0 ? Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1) : 0;
                const offset = Math.round(ratio * dateRangeMax);
                const nextDate = toDateInputValue(addDays(dateBounds.min, offset));
                if (activeDateHandle === "start") clampRangeStartDate(nextDate);
                else clampRangeEndDate(nextDate);
              }}
              onPointerUp={() => setActiveDateHandle(null)}
              onPointerCancel={() => setActiveDateHandle(null)}
            >
              <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
              <div
                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-blue-600"
                style={{
                  left: `${dateStartPercent}%`,
                  right: `${100 - (dateFilterMode === "single" ? dateStartPercent : dateEndPercent)}%`,
                  minWidth: dateFilterMode === "single" ? "0.75rem" : undefined,
                }}
              />
              <button
                type="button"
                data-date-handle="start"
                className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow outline-none ring-blue-200 focus-visible:ring-4"
                style={{ left: `${dateStartPercent}%` }}
                aria-label={dateFilterMode === "single" ? "Selected day" : "Beginning date"}
              />
              {dateFilterMode === "range" ? (
                <button
                  type="button"
                  data-date-handle="end"
                  className="absolute top-1/2 z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600 shadow outline-none ring-blue-200 focus-visible:ring-4"
                  style={{ left: `${dateEndPercent}%` }}
                  aria-label="End date"
                />
              ) : null}
            </div>
          </div>
          <div className={dateFilterMode === "single" ? "grid grid-cols-1" : "grid grid-cols-2 gap-2"}>
            <input type="date" value={value.createdFrom} onChange={(event) => clampRangeStartDate(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />
            {dateFilterMode === "range" ? (
              <input type="date" value={value.createdTo} onChange={(event) => clampRangeEndDate(event.target.value)} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />
            ) : null}
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
}
