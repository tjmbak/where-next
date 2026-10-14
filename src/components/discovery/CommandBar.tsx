"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MonthScrubber } from "@/components/filters/MonthScrubber";
import { BUDGET_NAMES, FiltersSheet, countActiveFilters } from "@/components/filters/FiltersSheet";
import { AskSearch, type PopularCity } from "@/components/discovery/AskSearch";
import { BUDGET_LABELS, GENRE_LABELS, VIBE_LABELS, getMonthLabel } from "@/data/taxonomy";
import type { SearchAction } from "@/lib/search";
import type { SearchIntent } from "@/lib/search-intent";
import type { DiscoveryFilters as DiscoveryFiltersValue, MonthNumber } from "@/types/content";

type CommandBarProps = {
  value: DiscoveryFiltersValue;
  onChange: (next: DiscoveryFiltersValue) => void;
  onMonthChange: (month: MonthNumber) => void;
  monthsInRange: MonthNumber[];
  liveCount: number;
  peakCount: number;
  savedCount: number;
  savedOnly: boolean;
  onToggleSavedOnly: () => void;
  onClearAll: () => void;
  onSearchApply: (action: SearchAction, query: string) => void;
  onSearchIntent: (intent: SearchIntent) => void;
  popularCities?: PopularCity[];
};

export function CommandBar({
  value,
  onChange,
  onMonthChange,
  monthsInRange,
  liveCount,
  peakCount,
  savedCount,
  savedOnly,
  onToggleSavedOnly,
  onClearAll,
  onSearchApply,
  onSearchIntent,
  popularCities
}: CommandBarProps) {
  const dirtyCount = countActiveFilters(value);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);
  const stayLength = value.stayLength ?? 1;

  const activeChips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (value.genre && value.genre !== "all") {
    activeChips.push({ key: "genre", label: GENRE_LABELS[value.genre], clear: () => onChange({ ...value, genre: "all" }) });
  }
  if (value.vibe && value.vibe !== "all") {
    activeChips.push({ key: "vibe", label: VIBE_LABELS[value.vibe], clear: () => onChange({ ...value, vibe: "all" }) });
  }
  if (value.budget && value.budget !== "all") {
    activeChips.push({
      key: "budget",
      label: `${BUDGET_LABELS[value.budget]} ${BUDGET_NAMES[value.budget]}`,
      clear: () => onChange({ ...value, budget: "all" })
    });
  }
  if (value.region && value.region !== "all") {
    activeChips.push({ key: "region", label: value.region, clear: () => onChange({ ...value, region: "all" }) });
  }
  if (stayLength > 1) {
    activeChips.push({ key: "stay", label: `${stayLength} months`, clear: () => onChange({ ...value, stayLength: 1 }) });
  }

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <div ref={sentinelRef} aria-hidden className="mt-5 h-px sm:mt-10" />
    <div
      className={`sticky top-0 z-40 -mx-6 px-6 py-3 before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:-z-10 before:w-screen before:-translate-x-1/2 before:border-y before:border-[var(--border)] before:transition-[background-color,box-shadow] before:duration-300 sm:-mx-10 sm:px-10 ${
        stuck
          ? "before:border-t-transparent before:bg-[var(--background)]/75 before:shadow-[0_14px_32px_-18px_rgba(28,22,18,0.35)] before:backdrop-blur-2xl before:backdrop-saturate-[1.8]"
          : ""
      }`}
    >
      <div className="flex flex-col gap-3">
        <MonthScrubber
          value={value.month}
          monthsInRange={monthsInRange}
          onChange={onMonthChange}
        />

        <div className="flex flex-wrap items-center gap-2">
          <AskSearch
            onApply={onSearchApply}
            onIntent={onSearchIntent}
            popular={popularCities}
            monthLabel={getMonthLabel(value.month)}
          />

          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen(true)}
            className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition active:scale-95 ${
              dirtyCount > 0
                ? "border-[var(--foreground)] bg-[var(--surface-2)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--foreground)]"
                : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--foreground)]"
            }`}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="10" cy="17" r="2" />
            </svg>
            Filters
            {dirtyCount > 0 ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--foreground)] px-1.5 text-[11px] font-semibold text-[var(--background)]">
                {dirtyCount}
              </span>
            ) : null}
          </button>

          {savedCount > 0 ? (
            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={onToggleSavedOnly}
              className={`group inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[14px] font-medium transition active:scale-95 ${
                savedOnly
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--foreground)]"
              }`}
            >
              <span aria-hidden className={savedOnly ? "" : "text-[var(--signal)]"}>{savedOnly ? "♥" : "♡"}</span>
              Saved
              <span className={savedOnly ? "opacity-70" : "text-[var(--muted)]"}>{savedCount}</span>
            </button>
          ) : null}

          <span className="ml-auto hidden text-[13px] text-[var(--muted)] lg:inline">
            <span className="font-medium text-[var(--foreground)]">{liveCount}</span> cities ·{" "}
            <span className="font-medium text-[var(--foreground)]">{peakCount}</span> at their peak
          </span>
        </div>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.clear}
                aria-label={`Remove ${chip.label} filter`}
                className="group inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--surface-2)] pl-3 pr-2 text-[13px] font-medium text-[var(--foreground)] transition hover:bg-[var(--border)]"
              >
                {chip.label}
                <span aria-hidden className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[var(--muted)] group-hover:text-[var(--foreground)]">
                  ×
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={onClearAll}
              className="ml-1 text-[13px] font-medium text-[var(--muted)] underline underline-offset-4 transition hover:text-[var(--foreground)]"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>
    </div>
    <FiltersSheet
      open={sheetOpen}
      onClose={closeSheet}
      value={value}
      onChange={onChange}
      onClearAll={onClearAll}
      resultCount={liveCount}
    />
    </>
  );
}
