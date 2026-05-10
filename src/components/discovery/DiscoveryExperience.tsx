"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthModal } from "@/components/auth/AuthModal";
import { CommandBar } from "@/components/discovery/CommandBar";
import { CompareModal } from "@/components/discovery/CompareModal";
import { ComparePickerTray } from "@/components/discovery/ComparePickerTray";
import { DestinationRow } from "@/components/discovery/DestinationRow";
import { EditorsPickStrip } from "@/components/discovery/EditorsPickStrip";
import { IntentChips } from "@/components/discovery/IntentChips";
import { ActivityMap } from "@/components/map/ActivityMap";
import { WaitlistSection } from "@/components/waitlist/WaitlistSection";
import {
  BUDGET_LABELS,
  GENRE_LABELS,
  REGIONS,
  VIBE_LABELS,
  getCurrentMonth,
  getMonthLabel
} from "@/data/taxonomy";
import {
  DESTINATIONS,
  getFilteredDestinations,
  getHiddenGemSlugsForMonth,
  getMonthsInRange,
  getTrendingSlugsForMonth
} from "@/data/music-travel";
import { trackEvent } from "@/lib/analytics";
import { useSavedDestinations } from "@/lib/saved-destinations";
import type { SearchAction } from "@/lib/search";
import type { SearchIntent } from "@/lib/search-intent";
import type {
  Budget,
  Destination,
  DiscoveryFilters as DiscoveryFiltersValue,
  Genre,
  MonthNumber,
  MonthlyDestinationScore,
  Vibe
} from "@/types/content";

type DestinationWithScore = {
  destination: Destination;
  score: MonthlyDestinationScore;
};

type InitialFilters = {
  month: string | null;
  stay: string | null;
  genre: string | null;
  vibe: string | null;
  budget: string | null;
  region: string | null;
  city: string | null;
};

type DiscoveryExperienceProps = {
  initial: InitialFilters;
};

const GENRE_VALUES = Object.keys(GENRE_LABELS) as Genre[];
const VIBE_VALUES = Object.keys(VIBE_LABELS) as Vibe[];
const BUDGET_VALUES = Object.keys(BUDGET_LABELS) as Budget[];
const SSR_DEFAULT_MONTH: MonthNumber = 1;

function parseEnum<T extends string>(value: string | null, allowed: readonly T[]): T | "all" {
  if (!value) return "all";
  return (allowed as readonly string[]).includes(value) ? (value as T) : "all";
}

function parseMonth(raw: string | null, fallback: MonthNumber): MonthNumber {
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) {
    return parsed as MonthNumber;
  }
  return fallback;
}

function parseStayLength(raw: string | null): 1 | 2 | 3 {
  const parsed = Number(raw);
  if (parsed === 2 || parsed === 3) return parsed;
  return 1;
}

export function DiscoveryExperience({ initial }: DiscoveryExperienceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const initialCity = initial.city && DESTINATIONS.some((d) => d.slug === initial.city)
    ? initial.city
    : undefined;
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(initialCity);
  const [savedOnly, setSavedOnly] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparePicks, setComparePicks] = useState<string[]>([]);
  const [activeIntent, setActiveIntent] = useState<SearchIntent | null>(null);
  const {
    savedSet,
    count: savedCount,
    isSaved,
    toggle: toggleSaved,
    isAuthenticated,
    isAuthReady
  } = useSavedDestinations();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const filters = useMemo<DiscoveryFiltersValue>(() => {
    return {
      month: parseMonth(initial.month, SSR_DEFAULT_MONTH),
      stayLength: parseStayLength(initial.stay),
      genre: parseEnum(initial.genre, GENRE_VALUES),
      vibe: parseEnum(initial.vibe, VIBE_VALUES),
      budget: parseEnum(initial.budget, BUDGET_VALUES),
      region: parseEnum(initial.region, REGIONS)
    };
  }, [initial]);

  const monthsInRange = useMemo(
    () => getMonthsInRange(filters.month, filters.stayLength ?? 1),
    [filters.month, filters.stayLength]
  );

  const allFiltered = useMemo(() => {
    return getFilteredDestinations(filters).filter(
      (item): item is DestinationWithScore => Boolean(item.score)
    );
  }, [filters]);

  const filteredDestinations = useMemo(() => {
    if (!savedOnly) return allFiltered;
    return allFiltered.filter((item) => savedSet.has(item.destination.slug));
  }, [allFiltered, savedOnly, savedSet]);

  const trendingSlugs = useMemo(() => getTrendingSlugsForMonth(filters.month), [filters.month]);
  const hiddenGemSlugs = useMemo(() => getHiddenGemSlugsForMonth(filters.month), [filters.month]);

  const writeFiltersToUrl = useCallback(
    (next: DiscoveryFiltersValue) => {
      const params = new URLSearchParams();
      params.set("month", String(next.month));
      if (next.stayLength && next.stayLength > 1) params.set("stay", String(next.stayLength));
      if (next.genre && next.genre !== "all") params.set("genre", next.genre);
      if (next.vibe && next.vibe !== "all") params.set("vibe", next.vibe);
      if (next.budget && next.budget !== "all") params.set("budget", next.budget);
      if (next.region && next.region !== "all") params.set("region", next.region);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    if (initial.month === null) {
      const current = getCurrentMonth();
      const params = new URLSearchParams();
      params.set("month", String(current));
      if (initial.stay) params.set("stay", initial.stay);
      if (initial.genre) params.set("genre", initial.genre);
      if (initial.vibe) params.set("vibe", initial.vibe);
      if (initial.budget) params.set("budget", initial.budget);
      if (initial.region) params.set("region", initial.region);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [initial, pathname, router]);

  const handleFilterChange = useCallback(
    (next: DiscoveryFiltersValue) => {
      writeFiltersToUrl(next);
      setSelectedSlug(undefined);
      trackEvent("filter_change", {
        month: next.month,
        genre: next.genre,
        vibe: next.vibe,
        budget: next.budget,
        region: next.region
      });
    },
    [writeFiltersToUrl]
  );

  const handleMonthChange = useCallback(
    (month: MonthNumber) => {
      handleFilterChange({ ...filters, month });
    },
    [filters, handleFilterChange]
  );

  const clearAllFilters = useCallback(() => {
    handleFilterChange({
      month: filters.month,
      stayLength: 1,
      genre: "all",
      vibe: "all",
      budget: "all",
      region: "all"
    });
    setSavedOnly(false);
  }, [filters.month, handleFilterChange]);

  const handleToggleSavedOnly = useCallback(() => {
    setSavedOnly((current) => !current);
    setSelectedSlug(undefined);
  }, []);

  const handleToggleSaved = useCallback(
    (slug: string) => {
      const wasSaved = isSaved(slug);
      void toggleSaved(slug);
      trackEvent("destination_saved_toggle", { slug, action: wasSaved ? "unsave" : "save" });
      // Soft auth wall: prompt sign-in once a second save lands while anonymous.
      // This is best-effort UI nudging; saves still persist locally either way.
      if (!wasSaved && isAuthReady && !isAuthenticated && savedCount + 1 >= 2) {
        setAuthModalOpen(true);
      }
    },
    [isSaved, toggleSaved, isAuthReady, isAuthenticated, savedCount]
  );

  const handleSearchApply = useCallback(
    (action: SearchAction, query: string) => {
      trackEvent("search_apply", { query, kind: action.kind });
      if (action.kind === "selectDestination") {
        if (typeof action.month === "number") {
          handleFilterChange({ ...filters, month: action.month });
        }
        setSelectedSlug(action.slug);
        setSavedOnly(false);
      } else if (action.kind === "applyFilter") {
        if (action.field === "genre") {
          handleFilterChange({ ...filters, genre: action.value as Genre });
        } else if (action.field === "vibe") {
          handleFilterChange({ ...filters, vibe: action.value as Vibe });
        }
      }
    },
    [filters, handleFilterChange]
  );

  const handleSearchIntent = useCallback(
    (intent: SearchIntent) => {
      trackEvent("search_intent_apply", {
        query: intent.query,
        source: intent.source,
        confidence: intent.confidence
      });
      setActiveIntent(intent);
      const next: DiscoveryFiltersValue = {
        month: intent.month ?? filters.month,
        stayLength: (intent.stayLength as 1 | 2 | 3 | undefined) ?? filters.stayLength ?? 1,
        genre: intent.genre ?? "all",
        vibe: intent.vibe ?? "all",
        budget: intent.budget ?? "all",
        region: intent.region ?? "all"
      };
      handleFilterChange(next);
      const focusSlug =
        intent.cityFocus ?? intent.discovery?.citySlugs?.[0] ?? undefined;
      if (focusSlug) {
        setSelectedSlug(focusSlug);
      }
    },
    [filters.month, filters.stayLength, handleFilterChange]
  );

  const clearActiveIntent = useCallback(() => {
    setActiveIntent(null);
  }, []);

  const togglePickForCompare = useCallback((slug: string) => {
    setComparePicks((current) => {
      if (current.includes(slug)) {
        trackEvent("compare_pick", { slug, action: "remove" });
        return current.filter((s) => s !== slug);
      }
      const next = current.length >= 2 ? [current[1], slug] : [...current, slug];
      trackEvent("compare_pick", { slug, action: "add", size: next.length });
      return next;
    });
  }, []);

  const clearComparePicks = useCallback(() => {
    setComparePicks([]);
  }, []);

  const openCompareWithPicks = useCallback(() => {
    if (comparePicks.length === 2) {
      setCompareOpen(true);
    }
  }, [comparePicks.length]);

  const closeCompare = useCallback(() => {
    setCompareOpen(false);
  }, []);

  const effectiveSelectedSlug = selectedSlug ?? filteredDestinations[0]?.destination.slug;
  const liveCount = filteredDestinations.length;
  const peakCount = filteredDestinations.filter((item) => item.score.overallScore >= 90).length;

  const compareSlugs = useMemo<[string, string] | null>(() => {
    if (comparePicks.length === 2) return [comparePicks[0], comparePicks[1]];
    return null;
  }, [comparePicks]);

  const comparePickSet = useMemo(() => new Set(comparePicks), [comparePicks]);

  return (
    <>
    <main className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-6 pb-10 pt-6 sm:px-10">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
          <Link
            href="/methodology"
            className="hidden transition hover:text-[var(--foreground)] sm:inline"
          >
            methodology
          </Link>
          <a
            href="#waitlist"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-1.5 text-[var(--background)] transition hover:bg-transparent hover:text-[var(--foreground)]"
          >
            join waitlist
            <span aria-hidden>→</span>
          </a>
        </nav>
      </header>

      <section className="grid gap-8 pt-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-14">
        <div className="order-2 lg:order-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="text-[var(--foreground)]">{getMonthLabel(filters.month).toLowerCase()} 2026</span>
            {"  ·  "}
            {liveCount.toString().padStart(2, "0")} cities
            {"  ·  "}
            <span className="text-[var(--signal)]">{peakCount.toString().padStart(2, "0")} peak</span>
          </p>
          <h1 className="mt-5 text-[clamp(2.25rem,5.5vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
            Where should
            <br />
            <span className="text-[var(--muted)]">you go next</span>
            <span className="text-[var(--foreground)]">.</span>
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-7 text-[var(--muted)]">
            Festivals, club seasons, and cultural moments worth flying for &mdash; curated city by city, month by month.
          </p>
        </div>

        <div className="relative order-1 lg:order-2">
          <ActivityMap
            month={filters.month}
            destinations={filteredDestinations}
            selectedSlug={effectiveSelectedSlug}
            onSelect={setSelectedSlug}
          />
        </div>
      </section>

      <CommandBar
        value={filters}
        onChange={handleFilterChange}
        onMonthChange={handleMonthChange}
        monthsInRange={monthsInRange}
        liveCount={liveCount}
        peakCount={peakCount}
        savedCount={savedCount}
        savedOnly={savedOnly}
        onToggleSavedOnly={handleToggleSavedOnly}
        onClearAll={clearAllFilters}
        onSearchApply={handleSearchApply}
        onSearchIntent={handleSearchIntent}
      />

      {activeIntent ? (
        <IntentChips intent={activeIntent} onClear={clearActiveIntent} />
      ) : null}

      <section className="mt-8">
        <EditorsPickStrip month={filters.month} onSelect={setSelectedSlug} />
      </section>

      <section className="mt-8 pt-2">
        <DestinationRow
          destinations={filteredDestinations}
          selectedSlug={effectiveSelectedSlug}
          month={filters.month}
          monthsInRange={monthsInRange}
          isSaved={isSaved}
          onToggleSaved={handleToggleSaved}
          trendingSlugs={trendingSlugs}
          hiddenGemSlugs={hiddenGemSlugs}
          comparePickSet={comparePickSet}
          onToggleComparePick={togglePickForCompare}
          emptyKind={
            savedOnly && savedCount === 0
              ? "no-saved"
              : savedOnly
                ? "no-saved-match"
                : "no-match"
          }
          onClearFilters={!savedOnly ? clearAllFilters : undefined}
        />
      </section>
    </main>
    <WaitlistSection />
    <AuthModal
      open={authModalOpen}
      onClose={() => setAuthModalOpen(false)}
      reason="Saved twice. Lock these in."
    />
    <ComparePickerTray
      picks={comparePicks}
      onRemove={togglePickForCompare}
      onClear={clearComparePicks}
      onCompare={openCompareWithPicks}
    />
    <CompareModal
      open={compareOpen}
      slugs={compareSlugs}
      anchorMonth={filters.month}
      monthsInRange={monthsInRange}
      onClose={closeCompare}
    />
    </>
  );
}
