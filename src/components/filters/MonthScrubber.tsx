"use client";

import { useMemo, useRef } from "react";
import { MONTHS, getCurrentMonth } from "@/data/taxonomy";
import { MONTHLY_DESTINATION_SCORES } from "@/data/music-travel";
import type { MonthNumber } from "@/types/content";

type MonthScrubberProps = {
  value: MonthNumber;
  onChange: (month: MonthNumber) => void;
  monthsInRange?: MonthNumber[];
  stayLength?: 1 | 2 | 3;
  onStayChange?: (next: 1 | 2 | 3) => void;
  compact?: boolean;
};

/**
 * A rolling twelve months starting now. Every slot is still ahead, so the
 * year is implied by position — no year toggle, no greyed-out past months.
 */
export function MonthScrubber({
  value,
  onChange,
  monthsInRange,
  stayLength = 1,
  onStayChange,
  compact = false
}: MonthScrubberProps) {
  const counts = useMemo(() => {
    const active = new Array(12).fill(0);
    const peak = new Array(12).fill(0);
    for (const score of MONTHLY_DESTINATION_SCORES) {
      const idx = score.month - 1;
      active[idx] += 1;
      if (score.overallScore >= 90) peak[idx] += 1;
    }
    return { active, peak };
  }, []);

  const slots = useMemo(() => {
    const start = getCurrentMonth();
    const startYear = new Date().getFullYear();
    return Array.from({ length: 12 }, (_, i) => {
      const offset = start - 1 + i;
      return {
        month: ((offset % 12) + 1) as MonthNumber,
        year: startYear + Math.floor(offset / 12),
        index: i
      };
    });
  }, []);

  const rangeSet = useMemo(
    () => new Set(monthsInRange && monthsInRange.length > 1 ? monthsInRange : []),
    [monthsInRange]
  );

  const rangeLabel = useMemo(() => {
    if (!monthsInRange || monthsInRange.length <= 1) return null;
    const start = MONTHS[monthsInRange[0] - 1].shortLabel.toLowerCase();
    const end = MONTHS[monthsInRange[monthsInRange.length - 1] - 1].shortLabel.toLowerCase();
    return `${start} – ${end}`;
  }, [monthsInRange]);

  const maxActive = Math.max(1, ...counts.active);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function focusMonth(month: MonthNumber) {
    const target = containerRef.current?.querySelector<HTMLButtonElement>(`[data-month="${month}"]`);
    target?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowLeft") nextIndex = Math.max(0, index - 1);
    if (event.key === "ArrowRight") nextIndex = Math.min(slots.length - 1, index + 1);
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = slots.length - 1;
    const next = slots[nextIndex].month;
    onChange(next);
    focusMonth(next);
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      {rangeLabel || onStayChange ? (
        <div className="flex items-center gap-3">
          {rangeLabel ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              months · <span className="text-[var(--foreground)]">{rangeLabel}</span>
            </span>
          ) : null}
          {onStayChange ? <StayCycleButton stayLength={stayLength} onChange={onStayChange} /> : null}
        </div>
      ) : null}

      <div className="wn-swipe -mx-1 overflow-x-auto px-1 sm:mx-0 sm:overflow-visible sm:px-0">
      <div
        role="radiogroup"
        aria-label="Select month"
        className="grid min-w-[620px] grid-cols-12 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 sm:min-w-0"
      >
        {slots.map((slot) => {
          const month = MONTHS[slot.month - 1];
          const isActive = slot.month === value;
          const isInRange = !isActive && rangeSet.has(slot.month);
          const startsYear = slot.index > 0 && slot.month === 1;
          const activeRatio = counts.active[slot.month - 1] / maxActive;
          const peakRatio = counts.peak[slot.month - 1] / maxActive;
          const peakHeight = peakRatio * 100;
          const stackHeight = Math.max(0, activeRatio - peakRatio) * 100;
          return (
            <button
              key={`${slot.year}-${slot.month}`}
              data-month={slot.month}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={`${month.label} ${slot.year}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(slot.month)}
              onKeyDown={(event) => handleKeyDown(event, slot.index)}
              className={`group relative flex flex-col items-center justify-end px-1 transition-[padding,background-color] duration-300 focus:outline-none ${
                compact ? "gap-0 py-2" : "gap-2 pb-2.5 pt-3"
              }  focus-visible:bg-[var(--surface)] ${
                startsYear ? "border-l border-[var(--border)] " : ""
              }${
                isActive
                  ? "bg-[var(--surface-2)]"
                  : isInRange
                    ? "bg-[var(--signal)]/10"
                    : "bg-transparent hover:bg-[var(--surface)]"
              }`}
            >
              {startsYear ? (
                <span
                  aria-hidden
                  className="absolute left-1.5 top-1 font-mono text-[8px] tracking-[0.12em] text-[var(--muted-2)]"
                >
                  &rsquo;{String(slot.year).slice(2)}
                </span>
              ) : null}
              <div
                aria-hidden={compact}
                className={`relative w-full overflow-hidden transition-[height,opacity] duration-300 ${
                  compact ? "h-0 opacity-0" : "h-9 opacity-100"
                }`}
              >
                <span
                  aria-hidden
                  className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full transition-[height,opacity,background] duration-300"
                  style={{
                    bottom: 0,
                    height: `${peakHeight}%`,
                    background: "var(--signal)",
                    opacity: isActive ? 1 : isInRange ? 0.85 : 0.5
                  }}
                />
                <span
                  aria-hidden
                  className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full transition-[height,opacity,bottom,background] duration-300"
                  style={{
                    bottom: `${peakHeight}%`,
                    height: `${stackHeight}%`,
                    background: "var(--muted)",
                    opacity: isActive ? 0.7 : isInRange ? 0.55 : 0.25
                  }}
                />
              </div>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  isActive || isInRange
                    ? "text-[var(--foreground)]"
                    : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
                }`}
              >
                {slot.index === 0 ? "now" : month.shortLabel.toLowerCase()}
              </span>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[var(--signal)] shadow-[0_0_8px_var(--signal)]"
                />
              ) : isInRange ? (
                <span aria-hidden className="absolute inset-x-2 bottom-0 h-px bg-[var(--signal)]/45" />
              ) : null}
            </button>
          );
        })}
      </div>
      </div>
    </div>
  );
}

function StayCycleButton({
  stayLength,
  onChange
}: {
  stayLength: 1 | 2 | 3;
  onChange: (next: 1 | 2 | 3) => void;
}) {
  const isDirty = stayLength > 1;
  const next = (stayLength === 3 ? 1 : ((stayLength + 1) as 1 | 2 | 3));
  const label = stayLength === 1 ? "1 month" : `${stayLength} months`;
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`stay length: ${label}, click to change`}
      className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.22em] transition ${
        isDirty
          ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--foreground)] hover:border-[var(--signal)]"
          : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      <span className="text-[var(--muted)]">stay</span>
      <span className="text-[var(--foreground)]">{label}</span>
      <span aria-hidden className="text-[var(--muted-2)] group-hover:text-[var(--foreground)]">↻</span>
    </button>
  );
}
