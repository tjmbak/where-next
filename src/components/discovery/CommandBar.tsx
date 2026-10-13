"use client";

import { useEffect, useRef, useState } from "react";
import { MonthScrubber } from "@/components/filters/MonthScrubber";
import { FilterPopover } from "@/components/filters/FilterPopover";
import { ScenePopover } from "@/components/filters/ScenePopover";
import { AskSearch } from "@/components/discovery/AskSearch";
import { BUDGET_LABELS, REGIONS } from "@/data/taxonomy";
import type { SearchAction } from "@/lib/search";
import type { SearchIntent } from "@/lib/search-intent";
import type {
  Budget,
  DiscoveryFilters as DiscoveryFiltersValue,
  Genre,
  MonthNumber,
  Region,
  Vibe
} from "@/types/content";

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
  onSearchIntent
}: CommandBarProps) {
  const budgetOptions = (Object.keys(BUDGET_LABELS) as Budget[]).map((budget) => ({
    label: `${BUDGET_LABELS[budget]} ${budget}`,
    value: budget
  }));
  const regionOptions = (REGIONS as Region[]).map((region) => ({
    label: region,
    value: region
  }));

  const stayLength = (value.stayLength ?? 1) as 1 | 2 | 3;
  const dirtyCount =
    [value.genre, value.vibe, value.budget, value.region].filter((v) => v && v !== "all")
      .length + (stayLength > 1 ? 1 : 0);

  // Progressive disclosure: power filters stay hidden until asked for (or
  // until any of them is active, e.g. arriving via a filtered URL).
  const [refineOpen, setRefineOpen] = useState(false);
  const showRefine = refineOpen || dirtyCount > 0;

  const nextStay = (stayLength === 3 ? 1 : ((stayLength + 1) as 1 | 2 | 3));

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
    <div ref={sentinelRef} aria-hidden className="mt-12 h-px lg:mt-14" />
    <div
      className={`sticky top-0 z-40 -mx-6 border-y border-[var(--border)] px-6 transition-[padding,background-color,box-shadow] duration-300 sm:-mx-10 sm:px-10 ${
        stuck
          ? "border-b-white/60 bg-[var(--background)]/70 py-2.5 shadow-[inset_0_-1px_0_rgba(28,22,18,0.05),0_14px_32px_-18px_rgba(28,22,18,0.35)] backdrop-blur-2xl backdrop-saturate-[1.8]"
          : "bg-[var(--background)] py-4"
      }`}
    >
      <div className={`flex flex-col transition-[gap] duration-300 ${stuck ? "gap-2" : "gap-3"}`}>
        <MonthScrubber
          compact={stuck}
          value={value.month}
          monthsInRange={monthsInRange}
          onChange={onMonthChange}
        />

        <div className="flex flex-wrap items-center gap-2">
          <AskSearch onApply={onSearchApply} onIntent={onSearchIntent} />
          <span aria-hidden className="hidden h-5 w-px bg-[var(--border)] sm:inline-block" />

          <button
            type="button"
            aria-expanded={showRefine}
            onClick={() => setRefineOpen((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
              showRefine
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
              <circle cx="16" cy="7" r="2" />
              <circle cx="10" cy="17" r="2" />
            </svg>
            refine
            {dirtyCount > 0 ? (
              <span
                className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] ${
                  showRefine
                    ? "bg-[var(--background)] text-[var(--foreground)]"
                    : "bg-[var(--signal)] text-white"
                }`}
              >
                {dirtyCount}
              </span>
            ) : null}
          </button>

          {savedCount > 0 ? (
            <button
              type="button"
              aria-pressed={savedOnly}
              onClick={onToggleSavedOnly}
              className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                savedOnly
                  ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--foreground)] hover:border-[var(--signal)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <span aria-hidden className={savedOnly ? "text-[var(--signal)]" : "text-[var(--muted)]"}>
                {savedOnly ? "♥" : "♡"}
              </span>
              <span>saved</span>
              <span className="text-[var(--foreground)]">{savedCount}</span>
            </button>
          ) : null}

          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] sm:inline">
            <span className="text-[var(--foreground)]">{liveCount.toString().padStart(2, "0")}</span> cities ·{" "}
            <span className="text-[var(--foreground)]">{peakCount.toString().padStart(2, "0")}</span> peak
          </span>
        </div>

        {showRefine ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
            <ScenePopover
              value={{
                genre: (value.genre ?? "all") as Genre | "all",
                vibe: (value.vibe ?? "all") as Vibe | "all"
              }}
              onChange={(next) =>
                onChange({ ...value, genre: next.genre, vibe: next.vibe })
              }
            />
            <FilterPopover
              label="budget"
              value={value.budget ?? "all"}
              defaultValue="all"
              defaultLabel="any"
              options={budgetOptions}
              onChange={(v) => onChange({ ...value, budget: v as Budget | "all" })}
            />
            <FilterPopover
              label="region"
              value={value.region ?? "all"}
              defaultValue="all"
              options={regionOptions}
              onChange={(v) => onChange({ ...value, region: v as Region | "all" })}
            />
            <button
              type="button"
              onClick={() => onChange({ ...value, stayLength: nextStay })}
              aria-label={`stay length: ${stayLength} ${stayLength === 1 ? "month" : "months"}, click to change`}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                stayLength > 1
                  ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--foreground)] hover:border-[var(--signal)]"
                  : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="text-[var(--muted)]">stay</span>
              <span className="text-[var(--foreground)]">
                {stayLength} {stayLength === 1 ? "month" : "months"}
              </span>
              <span aria-hidden className="text-[var(--muted-2)] group-hover:text-[var(--foreground)]">↻</span>
            </button>

            {dirtyCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setRefineOpen(false);
                }}
                className="ml-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
              >
                <span aria-hidden>↺</span>
                clear all
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}
