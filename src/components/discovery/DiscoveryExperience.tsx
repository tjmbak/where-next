"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AuthModal } from "@/components/auth/AuthModal";
import { CommandBar } from "@/components/discovery/CommandBar";
import { CompareModal } from "@/components/discovery/CompareModal";
import { ComparePickerTray } from "@/components/discovery/ComparePickerTray";
import { DestinationRow } from "@/components/discovery/DestinationRow";
import { EditorsPickStrip } from "@/components/discovery/EditorsPickStrip";
import { WelcomeBack } from "@/components/home/WelcomeBack";
import { IntentChips } from "@/components/discovery/IntentChips";
import { SiteFooter } from "@/components/discovery/SiteFooter";
import { WorldMap } from "@/components/map/WorldMap";
import { usePreview } from "@/components/preview/PreviewContext";
import { useToast } from "@/components/toast/Toaster";
import {
  BUDGET_LABELS,
  GENRE_LABELS,
  REGIONS,
  SUPPORTED_YEARS,
  VIBE_LABELS,
  getCurrentMonth,
  getMonthLabel,
  isPastMonth,
  upcomingYearForMonth
} from "@/data/taxonomy";
import {
  DESTINATIONS,
  getDestinationBySlug,
  getFilteredDestinations,
  getHiddenGemSlugsForMonth,
  getMonthsInRange,
  getTrendingSlugsForMonth
} from "@/data/music-travel";
import { affinityScore, buildAffinity } from "@/lib/affinity";
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
import { SiteHeader } from "@/components/nav/SiteHeader";

type DestinationWithScore = {
  destination: Destination;
  score: MonthlyDestinationScore;
};

type InitialFilters = {
  month: string | null;
  year: string | null;
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

function parseYear(raw: string | null, fallback: number): number {
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && SUPPORTED_YEARS.includes(parsed)) return parsed;
  return fallback;
}

function rollForward(month: MonthNumber, year: number | undefined): number {
  if (!year || isPastMonth(month, year)) return upcomingYearForMonth(month);
  return year;
}

/** Serialize filters (and an optional selected city) into a query string. */
function filtersToParams(next: DiscoveryFiltersValue, city?: string): string {
  const params = new URLSearchParams();
  params.set("month", String(next.month));
  if (next.year && next.year !== upcomingYearForMonth(next.month)) params.set("year", String(next.year));
  if (next.stayLength && next.stayLength > 1) params.set("stay", String(next.stayLength));
  if (next.genre && next.genre !== "all") params.set("genre", next.genre);
  if (next.vibe && next.vibe !== "all") params.set("vibe", next.vibe);
  if (next.budget && next.budget !== "all") params.set("budget", next.budget);
  if (next.region && next.region !== "all") params.set("region", next.region);
  if (city) params.set("city", city);
  return params.toString();
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
    saved,
    savedSet,
    count: savedCount,
    isSaved,
    toggle: toggleSaved,
    isAuthenticated,
    isAuthReady
  } = useSavedDestinations();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [forYou, setForYou] = useState(false);
  // Snapshot of the filters in effect before a search intent was applied, so
  // dismissing the intent can restore them.
  const preIntentFiltersRef = useRef<DiscoveryFiltersValue | null>(null);
  const preview = usePreview();
  const toaster = useToast();

  const filters = useMemo<DiscoveryFiltersValue>(() => {
    // Default to the current month (not a hard-coded January) so the first
    // paint already shows the right month and there's no visible jump when
    // the URL-sync effect runs.
    const month = parseMonth(initial.month, getCurrentMonth());
    return {
      month,
      year: parseYear(initial.year, upcomingYearForMonth(month)),
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

  // "For you" needs at least a couple of saved cities to have any signal.
  // Derived (not stored) so it self-disables when the shortlist empties.
  const forYouAvailable = savedCount >= 2 && !savedOnly;
  const forYouActive = forYou && forYouAvailable;
  const affinity = useMemo(
    () => buildAffinity(saved.map((slug) => getDestinationBySlug(slug)).filter(Boolean) as Destination[]),
    [saved]
  );
  const displayedDestinations = useMemo(() => {
    if (!forYouActive) return filteredDestinations;
    return [...filteredDestinations].sort((a, b) => {
      const diff = affinityScore(b.destination, affinity) - affinityScore(a.destination, affinity);
      if (diff !== 0) return diff;
      return b.score.overallScore - a.score.overallScore;
    });
  }, [filteredDestinations, forYouActive, affinity]);

  const savedCities = useMemo(
    () => saved.map((slug) => getDestinationBySlug(slug)).filter(Boolean) as Destination[],
    [saved]
  );
  const tripSeedHref = useMemo(() => {
    if (savedCities.length === 0) return "/compose";
    const names = savedCities.map((d) => d.city);
    const list =
      names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    const seed =
      names.length === 1
        ? `Plan a music trip to ${list} around ${getMonthLabel(filters.month)}.`
        : `Plan a multi-city music trip across ${list} around ${getMonthLabel(filters.month)}.`;
    return `/compose?seed=${encodeURIComponent(seed)}`;
  }, [savedCities, filters.month]);

  const trendingSlugs = useMemo(() => getTrendingSlugsForMonth(filters.month), [filters.month]);
  const hiddenGemSlugs = useMemo(() => getHiddenGemSlugsForMonth(filters.month), [filters.month]);
  const writeFiltersToUrl = useCallback(
    (next: DiscoveryFiltersValue) => {
      const qs = filtersToParams(next);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  // Selecting a city updates the highlight and writes ?city= so the page can
  // be shared / restored. Filters are preserved.
  const handleSelect = useCallback(
    (slug?: string) => {
      setSelectedSlug(slug);
      const qs = filtersToParams(filters, slug);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router]
  );

  // Open the in-page quick-look sheet (also selects the city + syncs the URL).
  const openPreview = useCallback(
    (slug: string) => {
      handleSelect(slug);
      preview?.open({ kind: "destination", destinationSlug: slug, month: filters.month, year: filters.year });
      trackEvent("preview_open", { slug, month: filters.month });
    },
    [handleSelect, preview, filters.month, filters.year]
  );

  useEffect(() => {
    if (initial.month === null) {
      const current = getCurrentMonth();
      const params = new URLSearchParams();
      params.set("month", String(current));
      if (initial.year && Number(initial.year) !== upcomingYearForMonth(current)) params.set("year", initial.year);
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

  // Picking a month that's already behind us in the selected year rolls to its
  // next edition — nobody is planning a trip to last July.
  const handleMonthChange = useCallback(
    (month: MonthNumber) => {
      handleFilterChange({ ...filters, month, year: upcomingYearForMonth(month) });
    },
    [filters, handleFilterChange]
  );

  const clearAllFilters = useCallback(() => {
    handleFilterChange({
      month: filters.month,
      year: filters.year,
      stayLength: 1,
      genre: "all",
      vibe: "all",
      budget: "all",
      region: "all"
    });
    setSavedOnly(false);
  }, [filters.month, filters.year, handleFilterChange]);

  const handleToggleSavedOnly = useCallback(() => {
    setSavedOnly((current) => !current);
    setSelectedSlug(undefined);
  }, []);

  const handleToggleSaved = useCallback(
    (slug: string) => {
      const wasSaved = isSaved(slug);
      void toggleSaved(slug);
      trackEvent("destination_saved_toggle", { slug, action: wasSaved ? "unsave" : "save" });
      const city = getDestinationBySlug(slug)?.city ?? slug;
      if (!wasSaved) {
        toaster?.toast({
          message: `Saved ${city} — hearts build your shortlist and tune "for you".`,
          action: { label: "undo", onClick: () => void toggleSaved(slug) }
        });
      } else {
        toaster?.toast({
          message: `Removed ${city} from saved.`,
          action: { label: "undo", onClick: () => void toggleSaved(slug) }
        });
      }
      // Soft auth wall: prompt sign-in once a second save lands while anonymous.
      // This is best-effort UI nudging; saves still persist locally either way.
      if (!wasSaved && isAuthReady && !isAuthenticated && savedCount + 1 >= 2) {
        setAuthModalOpen(true);
      }
    },
    [isSaved, toggleSaved, isAuthReady, isAuthenticated, savedCount, toaster]
  );

  const handleSearchApply = useCallback(
    (action: SearchAction, query: string) => {
      trackEvent("search_apply", { query, kind: action.kind });
      if (action.kind === "selectDestination") {
        if (typeof action.month === "number") {
          handleFilterChange({ ...filters, month: action.month, year: rollForward(action.month, filters.year) });
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
      // Remember the pre-intent filters once, so dismissing reverts cleanly.
      if (!activeIntent) preIntentFiltersRef.current = filters;
      setActiveIntent(intent);
      const nextMonth = intent.month ?? filters.month;
      const next: DiscoveryFiltersValue = {
        month: nextMonth,
        year: rollForward(nextMonth, filters.year),
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
    [activeIntent, filters, handleFilterChange]
  );

  const clearActiveIntent = useCallback(() => {
    setActiveIntent(null);
    setSelectedSlug(undefined);
    // Revert to the filters that were in effect before the search applied.
    const restore = preIntentFiltersRef.current;
    preIntentFiltersRef.current = null;
    if (restore) handleFilterChange(restore);
  }, [handleFilterChange]);

  const togglePickForCompare = useCallback((slug: string) => {
    const city = getDestinationBySlug(slug)?.city ?? slug;
    setComparePicks((current) => {
      if (current.includes(slug)) {
        trackEvent("compare_pick", { slug, action: "remove" });
        return current.filter((s) => s !== slug);
      }
      const next = current.length >= 2 ? [current[1], slug] : [...current, slug];
      trackEvent("compare_pick", { slug, action: "add", size: next.length });
      toaster?.toast(
        next.length === 1
          ? { message: `${city} added to compare — pick one more city.` }
          : { message: `${city} added — ready to compare side by side.` }
      );
      return next;
    });
  }, [toaster]);

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

  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const effectiveSelectedSlug = selectedSlug ?? displayedDestinations[0]?.destination.slug;
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
      <SiteHeader bare className="border-b border-[var(--border)] pb-5" />

      <section className="pt-8 lg:pt-12">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:gap-14">
          <div>
            <p className="animate-fade-in font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]" style={{ animationDelay: "0.05s" }}>
              <span className="text-[var(--foreground)]">{getMonthLabel(filters.month).toLowerCase()} {filters.year ?? upcomingYearForMonth(filters.month)}</span>
              {"  ·  "}
              the music-travel index
            </p>
            <h1 className="animate-fade-in mt-5 text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]" style={{ animationDelay: "0.18s" }}>
              Where should
              <br />
              <span className="text-[var(--accent)]">you go next</span>
              <span className="text-[var(--signal)]">.</span>
            </h1>
          </div>
          <p className="animate-fade-in max-w-md text-[15px] leading-7 text-[var(--muted)] lg:justify-self-end lg:pb-2" style={{ animationDelay: "0.42s" }}>
            Festivals, club seasons, and cultural moments worth flying for &mdash; curated city by city, month by month.
          </p>
        </div>

        <div className="animate-fade-in relative -mx-6 mt-8 sm:-mx-10 lg:mx-0 lg:mt-10" style={{ animationDelay: "0.28s" }}>
          <WorldMap
            month={filters.month}
            destinations={filteredDestinations}
            selectedSlug={effectiveSelectedSlug}
            hoveredSlug={hoveredSlug}
            onSelect={openPreview}
            onHoverCity={setHoveredSlug}
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

      <section className="mt-6">
        <WelcomeBack />
      </section>

      {savedCount > 0 ? (
        <section className="mt-8">
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[13px] text-[var(--foreground)]/90">
              <span aria-hidden className="text-[var(--signal)]">♥</span>
              <span>
                <span className="font-medium">{savedCount}</span>{" "}
                {savedCount === 1 ? "city" : "cities"} saved
                {savedCities.length > 0 ? (
                  <span className="text-[var(--muted)]">
                    {" — "}
                    {savedCities.slice(0, 3).map((d) => d.city).join(", ")}
                    {savedCities.length > 3 ? ` +${savedCities.length - 3}` : ""}
                  </span>
                ) : null}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={tripSeedHref}
                onClick={() => trackEvent("trip_from_saved_click", { count: savedCount })}
                className="group inline-flex items-center gap-2 rounded-full border border-[var(--signal)]/50 bg-[var(--signal)]/10 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)] transition hover:bg-[var(--signal)]/15 hover:border-[var(--signal)]/70"
              >
                build a trip
                <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-8 pt-2">
        <DestinationRow
          destinations={displayedDestinations}
          selectedSlug={selectedSlug}
          hoveredSlug={hoveredSlug}
          onHoverCity={setHoveredSlug}
          month={filters.month}
          year={filters.year}
          monthsInRange={monthsInRange}
          isSaved={isSaved}
          onToggleSaved={handleToggleSaved}
          trendingSlugs={trendingSlugs}
          hiddenGemSlugs={hiddenGemSlugs}
          comparePickSet={comparePickSet}
          onToggleComparePick={togglePickForCompare}
          onOpen={openPreview}
          forYouAvailable={forYouAvailable}
          forYouActive={forYouActive}
          onToggleForYou={() => setForYou((v) => !v)}
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

      <section className="mt-10">
        <EditorsPickStrip month={filters.month} year={filters.year} onSelect={handleSelect} />
      </section>
    </main>
    <SiteFooter month={filters.month} year={filters.year} />
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
