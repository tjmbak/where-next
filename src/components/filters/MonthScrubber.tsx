"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { MONTHS, getCurrentMonth } from "@/data/taxonomy";
import type { MonthNumber } from "@/types/content";

type MonthScrubberProps = {
  value: MonthNumber;
  onChange: (month: MonthNumber) => void;
  monthsInRange?: MonthNumber[];
  stayLength?: 1 | 2 | 3;
  onStayChange?: (next: 1 | 2 | 3) => void;
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
  onStayChange
}: MonthScrubberProps) {
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<HTMLSpanElement | null>(null);
  const hoverRef = useRef<HTMLSpanElement | null>(null);
  const placedRef = useRef(false);

  useLayoutEffect(() => {
    const place = (still: boolean) => {
      const lens = lensRef.current;
      const chip = innerRef.current?.querySelector<HTMLElement>(`[data-month="${value}"]`);
      if (!lens || !chip) return;
      if (still) lens.dataset.still = "";
      lens.style.left = `${chip.offsetLeft}px`;
      lens.style.width = `${chip.offsetWidth}px`;
      lens.style.opacity = "1";
      if (still) requestAnimationFrame(() => delete lens.dataset.still);
    };
    place(!placedRef.current);
    placedRef.current = true;
    if (typeof ResizeObserver === "undefined" || !innerRef.current) return;
    const observer = new ResizeObserver(() => place(true));
    observer.observe(innerRef.current);
    return () => observer.disconnect();
  }, [value]);

  useEffect(() => {
    const track = trackRef.current;
    const chip = innerRef.current?.querySelector<HTMLElement>(`[data-month="${value}"]`);
    if (!track || !chip) return;
    const left = chip.offsetLeft;
    const right = left + chip.offsetWidth;
    if (left < track.scrollLeft || right > track.scrollLeft + track.clientWidth) {
      track.scrollTo({ left: Math.max(0, left - 24), behavior: "smooth" });
    }
  }, [value]);

  function showHover(target: HTMLElement) {
    const hover = hoverRef.current;
    if (!hover) return;
    if (hover.style.opacity !== "1") hover.dataset.still = "";
    hover.style.left = `${target.offsetLeft}px`;
    hover.style.width = `${target.offsetWidth}px`;
    hover.style.opacity = "1";
    requestAnimationFrame(() => delete hover.dataset.still);
  }

  function hideHover() {
    if (hoverRef.current) hoverRef.current.style.opacity = "0";
  }

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
            <span className="text-[13px] font-medium text-[var(--muted)]">
              Months · <span className="text-[var(--foreground)]">{rangeLabel}</span>
            </span>
          ) : null}
          {onStayChange ? <StayCycleButton stayLength={stayLength} onChange={onStayChange} /> : null}
        </div>
      ) : null}

      <div className="-mx-6 px-6 sm:-mx-10 sm:px-10 lg:mx-0 lg:px-0">
        <div className="wn-glass w-fit max-w-full rounded-full p-1">
          <div
            ref={trackRef}
            role="radiogroup"
            aria-label="Select month"
            onMouseLeave={hideHover}
            className="wn-swipe overflow-x-auto rounded-full"
          >
            <div ref={innerRef} className="relative flex w-max gap-0.5">
              <span
                ref={hoverRef}
                aria-hidden
                className="wn-lens-hover pointer-events-none absolute inset-y-0 rounded-full bg-[var(--foreground)]/[0.06] opacity-0"
              />
              <span ref={lensRef} aria-hidden className="wn-lens pointer-events-none absolute inset-y-0 rounded-full opacity-0" />
              {slots.map((slot) => {
                const month = MONTHS[slot.month - 1];
                const isActive = slot.month === value;
                const isInRange = !isActive && rangeSet.has(slot.month);
                const startsYear = slot.index > 0 && slot.month === 1;
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
                    onMouseEnter={(event) => showHover(event.currentTarget)}
                    className={`relative z-10 inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-4 text-[14px] font-medium transition-[color,transform] duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60 active:scale-95 ${
                      isActive
                        ? "text-[var(--foreground)]"
                        : isInRange
                          ? "bg-[var(--signal)]/10 text-[var(--foreground)]"
                          : "text-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {slot.index === 0 ? "This month" : startsYear ? `${month.shortLabel} ${slot.year}` : month.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
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
      className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[13px] font-medium transition ${
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
