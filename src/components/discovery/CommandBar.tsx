"use client";

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

  return (
    <div className="sticky top-0 z-40 -mx-6 mt-12 border-y border-[var(--border)] bg-[var(--background)] px-6 py-4 sm:-mx-10 sm:px-10 lg:mt-14">
      <div className="flex flex-col gap-3">
        <MonthScrubber
          value={value.month}
          monthsInRange={monthsInRange}
          stayLength={stayLength}
          onStayChange={(next) => onChange({ ...value, stayLength: next })}
          onChange={onMonthChange}
        />

        <div className="flex flex-wrap items-center gap-2">
          <AskSearch onApply={onSearchApply} onIntent={onSearchIntent} />
          <span aria-hidden className="hidden h-5 w-px bg-[var(--border)] sm:inline-block" />
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

          {dirtyCount > 0 ? (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-1 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              <span aria-hidden>↺</span>
              clear all
            </button>
          ) : null}

          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="text-[var(--foreground)]">{liveCount.toString().padStart(2, "0")}</span> cities ·{" "}
            <span className="text-[var(--foreground)]">{peakCount.toString().padStart(2, "0")}</span> peak
          </span>
        </div>
      </div>
    </div>
  );
}
