"use client";

import { useMemo, useRef } from "react";
import { MONTHS } from "@/data/taxonomy";
import { DESTINATIONS, MONTHLY_DESTINATION_SCORES, getScoreForDestinationMonth } from "@/data/music-travel";
import type { MonthNumber } from "@/types/content";

type MonthScrubberProps = {
  value: MonthNumber;
  onChange: (month: MonthNumber) => void;
  monthsInRange?: MonthNumber[];
  stayLength?: 1 | 2 | 3;
  onStayChange?: (next: 1 | 2 | 3) => void;
};

export function MonthScrubber({
  value,
  onChange,
  monthsInRange,
  stayLength = 1,
  onStayChange
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

  const rangeSet = useMemo(
    () => new Set(monthsInRange && monthsInRange.length > 1 ? monthsInRange : []),
    [monthsInRange]
  );

  const rangeCounts = useMemo(() => {
    if (!monthsInRange || monthsInRange.length <= 1) return null;
    const months = new Set<MonthNumber>(monthsInRange);
    let active = 0;
    let peak = 0;
    for (const destination of DESTINATIONS) {
      let bestScore = 0;
      for (const m of months) {
        const s = getScoreForDestinationMonth(destination.slug, m);
        if (s && s.overallScore > bestScore) bestScore = s.overallScore;
      }
      if (bestScore > 0) active += 1;
      if (bestScore >= 90) peak += 1;
    }
    return { active, peak };
  }, [monthsInRange]);

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

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, current: MonthNumber) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") {
      return;
    }
    event.preventDefault();
    let next = current;
    if (event.key === "ArrowLeft") next = (((current - 2 + 12) % 12) + 1) as MonthNumber;
    if (event.key === "ArrowRight") next = ((current % 12) + 1) as MonthNumber;
    if (event.key === "Home") next = 1;
    if (event.key === "End") next = 12;
    onChange(next);
    focusMonth(next);
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            {rangeLabel ? (
              <>
                month · <span className="text-[var(--foreground)]">{rangeLabel}</span>
              </>
            ) : (
              "month"
            )}
          </span>
          {onStayChange ? (
            <StayCycleButton stayLength={stayLength} onChange={onStayChange} />
          ) : null}
        </div>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <span className="text-[var(--foreground)]">
            {rangeCounts ? rangeCounts.active : counts.active[value - 1]}
          </span>{" "}
          cities ·{" "}
          <span className="text-[var(--signal)]">
            {rangeCounts ? rangeCounts.peak : counts.peak[value - 1]}
          </span>{" "}
          peak
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label="Select month"
        className="grid grid-cols-12 overflow-hidden rounded-md border border-[var(--border)]"
      >
        {MONTHS.map((month) => {
          const isActive = month.value === value;
          const isInRange = !isActive && rangeSet.has(month.value);
          const activeRatio = counts.active[month.value - 1] / maxActive;
          const peakRatio = counts.peak[month.value - 1] / maxActive;
          const peakHeight = peakRatio * 100;
          const stackHeight = Math.max(0, activeRatio - peakRatio) * 100;
          return (
            <button
              key={month.value}
              data-month={month.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(month.value)}
              onKeyDown={(event) => handleKeyDown(event, month.value)}
              className={`group relative flex flex-col items-center justify-end gap-2 px-1 pb-2.5 pt-3 transition focus:outline-none focus-visible:bg-[var(--surface)] ${
                isActive
                  ? "bg-[var(--surface-2)]"
                  : isInRange
                    ? "bg-[var(--signal)]/10"
                    : "bg-transparent hover:bg-[var(--surface)]"
              }`}
            >
              <div className="relative h-10 w-full">
                <span
                  aria-hidden
                  className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-sm transition-[height,opacity,background] duration-300"
                  style={{
                    bottom: 0,
                    height: `${peakHeight}%`,
                    background: "var(--signal)",
                    opacity: isActive ? 1 : isInRange ? 0.85 : 0.55
                  }}
                />
                <span
                  aria-hidden
                  className="absolute left-1/2 w-1.5 -translate-x-1/2 rounded-sm transition-[height,opacity,bottom,background] duration-300"
                  style={{
                    bottom: `${peakHeight}%`,
                    height: `${stackHeight}%`,
                    background: "var(--muted)",
                    opacity: isActive ? 0.7 : isInRange ? 0.55 : 0.3
                  }}
                />
              </div>
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                  isActive
                    ? "text-[var(--foreground)]"
                    : isInRange
                      ? "text-[var(--foreground)]"
                      : "text-[var(--muted)] group-hover:text-[var(--foreground)]"
                }`}
              >
                {month.shortLabel.toLowerCase()}
              </span>
              {isActive ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-px bg-[var(--signal)] shadow-[0_0_8px_var(--signal)]"
                />
              ) : isInRange ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 bottom-0 h-px bg-[var(--signal)]/45"
                />
              ) : null}
            </button>
          );
        })}
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
