"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { BUDGET_LABELS, getMonthLabel, upcomingYearForMonth } from "@/data/taxonomy";
import {
  getDestinationMonthSummary,
  getDestinationRangeSummary,
  getEventsForDestinationInMonth,
  getEventsForDestinationInRange
} from "@/data/music-travel";
import { pickHeroForMonth } from "@/lib/hero-images";
import { TIER_COLORS, tierFromScore, type Tier } from "@/lib/tiers";
import type { Destination, MonthNumber, MonthlyDestinationScore } from "@/types/content";

type EmptyKind = "no-saved" | "no-saved-match" | "no-match";

type DestinationRowProps = {
  destinations: Array<{
    destination: Destination;
    score: MonthlyDestinationScore;
  }>;
  selectedSlug?: string;
  hoveredSlug?: string | null;
  onHoverCity?: (slug: string | null) => void;
  month: MonthNumber;
  year?: number;
  monthsInRange?: MonthNumber[];
  isSaved: (slug: string) => boolean;
  onToggleSaved: (slug: string) => void;
  trendingSlugs?: ReadonlySet<string>;
  hiddenGemSlugs?: ReadonlySet<string>;
  comparePickSet?: ReadonlySet<string>;
  onToggleComparePick?: (slug: string) => void;
  onOpen?: (slug: string) => void;
  forYouAvailable?: boolean;
  forYouActive?: boolean;
  onToggleForYou?: () => void;
  emptyKind?: EmptyKind;
  onClearFilters?: () => void;
  limit?: number;
};

export function DestinationRow({
  destinations,
  selectedSlug,
  hoveredSlug,
  onHoverCity,
  month,
  year = upcomingYearForMonth(month),
  monthsInRange,
  isSaved,
  onToggleSaved,
  trendingSlugs,
  hiddenGemSlugs,
  comparePickSet,
  onToggleComparePick,
  onOpen,
  forYouAvailable,
  forYouActive,
  onToggleForYou,
  emptyKind,
  onClearFilters,
  limit = 12
}: DestinationRowProps) {
  const hasRange = (monthsInRange?.length ?? 0) > 1;
  const rangeMonths = hasRange ? (monthsInRange as MonthNumber[]) : null;
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const effectiveLimit = expanded ? destinations.length : limit;
  const items = useMemo(
    () => destinations.slice(0, effectiveLimit),
    [destinations, effectiveLimit]
  );
  const canExpand = destinations.length > limit;

  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(track.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      track.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, items.length]);

  function nudge(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const cardWidth = 280 + 16;
    track.scrollBy({ left: direction * cardWidth * 2, behavior: "smooth" });
  }

  // Keep the selected card in view when the selection changes from elsewhere
  // (e.g. a map marker click). `block: "nearest"` keeps the page from jumping.
  const mountedRef = useRef(false);
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !selectedSlug) return;
    // Phones stack cards vertically; scrolling there would yank the page.
    if (track.scrollWidth <= track.clientWidth) return;
    const el = track.querySelector<HTMLElement>(`[data-slug="${CSS.escape(selectedSlug)}"]`);
    if (!el) return;
    el.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: mountedRef.current ? "smooth" : "auto"
    });
    mountedRef.current = true;
  }, [selectedSlug]);

  if (items.length === 0) {
    return <RowEmptyState month={month} kind={emptyKind} onClearFilters={onClearFilters} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          shortlist · {getMonthLabel(month).toLowerCase()}
          {forYouAvailable && onToggleForYou ? (
            <span className="inline-flex overflow-hidden rounded-full border border-[var(--border-strong)]">
              <button
                type="button"
                aria-pressed={!forYouActive}
                onClick={() => {
                  if (forYouActive) onToggleForYou();
                }}
                className={`px-2 py-0.5 tracking-[0.16em] transition ${
                  !forYouActive
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                ranked
              </button>
              <button
                type="button"
                aria-pressed={forYouActive}
                onClick={() => {
                  if (!forYouActive) onToggleForYou();
                }}
                className={`px-2 py-0.5 tracking-[0.16em] transition ${
                  forYouActive
                    ? "bg-[var(--signal)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                for you
              </button>
            </span>
          ) : null}
        </span>
        <span className="flex items-baseline gap-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <span className="hidden sm:inline">
            {items.length}
            {destinations.length > items.length ? `/${destinations.length}` : ""}{" "}
            {forYouActive ? "sorted for you" : "ranked by activity"}
          </span>
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-full border border-[var(--border-strong)] px-2.5 py-1 tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
            >
              {expanded ? "show less" : `view all ${destinations.length}`}
            </button>
          ) : null}
        </span>
      </div>

      <div className="-mx-6 sm:-mx-10">
        <div className="group/row relative">
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-10 sm:block bg-gradient-to-r from-[var(--background)] via-[var(--background)]/70 to-transparent transition-opacity duration-200 sm:w-14 ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-10 sm:block bg-gradient-to-l from-[var(--background)] via-[var(--background)]/70 to-transparent transition-opacity duration-200 sm:w-14 ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
          />

          <button
            type="button"
            aria-label="scroll left"
            onClick={() => nudge(-1)}
            tabIndex={canScrollLeft ? 0 : -1}
            className={`absolute left-2 top-[42%] z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/95 font-mono text-base text-[var(--foreground)] shadow-[0_8px_24px_-8px_rgba(28,22,18,0.35)] backdrop-blur transition hover:border-[var(--foreground)] sm:left-4 ${
              canScrollLeft
                ? "sm:flex sm:opacity-0 sm:group-hover/row:opacity-100"
                : "sm:flex sm:opacity-0"
            } sm:focus-visible:opacity-100`}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="scroll right"
            onClick={() => nudge(1)}
            tabIndex={canScrollRight ? 0 : -1}
            className={`absolute right-2 top-[42%] z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/95 font-mono text-base text-[var(--foreground)] shadow-[0_8px_24px_-8px_rgba(28,22,18,0.35)] backdrop-blur transition hover:border-[var(--foreground)] sm:right-4 ${
              canScrollRight
                ? "sm:flex sm:opacity-0 sm:group-hover/row:opacity-100"
                : "sm:flex sm:opacity-0"
            } sm:focus-visible:opacity-100`}
          >
            ›
          </button>

          <ul
            ref={trackRef}
            className="wn-row flex flex-col gap-5 px-6 pb-4 sm:snap-x sm:flex-row sm:items-stretch sm:gap-4 sm:overflow-x-auto sm:scroll-px-10 sm:px-10"
          >
            {items.map(({ destination, score }, index) => {
              const selected = destination.slug === selectedSlug;
              const tier = tierFromScore(score.overallScore);
              const summary = rangeMonths
                ? getDestinationRangeSummary(destination.slug, rangeMonths, year)
                : getDestinationMonthSummary(destination.slug, month, year);
              const anchorEvent = pickAnchor(
                rangeMonths
                  ? getEventsForDestinationInRange(destination.slug, rangeMonths, year)
                  : getEventsForDestinationInMonth(destination.slug, month, year)
              );
              const saved = isSaved(destination.slug);
              const trending = trendingSlugs?.has(destination.slug) ?? false;
              const hiddenGem = !trending && (hiddenGemSlugs?.has(destination.slug) ?? false);
              const inCompare = comparePickSet?.has(destination.slug) ?? false;
              const eager = index < 6;
              return (
                <li
                  key={destination.slug}
                  data-slug={destination.slug}
                  onMouseEnter={onHoverCity ? () => onHoverCity(destination.slug) : undefined}
                  onMouseLeave={onHoverCity ? () => onHoverCity(null) : undefined}
                  className="min-w-0 overflow-hidden sm:shrink-0 sm:snap-start sm:basis-[280px]"
                >
                  <DestinationCard
                    destination={destination}
                    score={score}
                    selected={selected}
                    highlighted={!selected && hoveredSlug === destination.slug}
                    tier={tier}
                    eventCount={summary.count}
                    month={month}
                    saved={saved}
                    onToggleSaved={() => onToggleSaved(destination.slug)}
                    anchorEventTitle={anchorEvent?.title ?? null}
                    anchorEventType={anchorEvent?.type ?? null}
                    anchorEstimated={anchorEvent ? anchorEvent.confirmed === false : false}
                    anchorTiming={anchorEvent ? timingLabel(anchorEvent.startDate, anchorEvent.endDate) : null}
                    trending={trending}
                    hiddenGem={hiddenGem}
                    eager={eager}
                    inCompare={inCompare}
                    onOpen={onOpen ? () => onOpen(destination.slug) : undefined}
                    onToggleCompare={
                      onToggleComparePick
                        ? () => onToggleComparePick(destination.slug)
                        : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      {canExpand && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mx-auto inline-flex h-11 items-center rounded-full border border-[var(--border-strong)] px-5 text-[14px] font-medium text-[var(--foreground)] active:scale-95 sm:hidden"
        >
          Show all {destinations.length} cities
        </button>
      ) : null}
    </div>
  );
}

function RowEmptyState({
  month,
  kind,
  onClearFilters
}: {
  month: MonthNumber;
  kind?: EmptyKind;
  onClearFilters?: () => void;
}) {
  const monthLabel = getMonthLabel(month).toLowerCase();
  const copy = (() => {
    switch (kind) {
      case "no-saved":
        return {
          title: "no saved cities yet",
          body: "tap the heart on any card to start a personal shortlist. it stays on this device — no account needed."
        };
      case "no-saved-match":
        return {
          title: `none of your saved cities are live in ${monthLabel}`,
          body: "try a different month or clear the filters."
        };
      default:
        return {
          title: `nothing matches in ${monthLabel}`,
          body: "this combo is too narrow. try a different month, drop a filter, or widen the region."
        };
    }
  })();

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/40 px-6 py-10 text-center">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
        empty · {monthLabel}
      </span>
      <h3 className="text-base leading-tight text-[var(--foreground)] sm:text-lg">{copy.title}</h3>
      <p className="max-w-md text-[13px] leading-6 text-[var(--muted)]">{copy.body}</p>
      {onClearFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
        >
          <span aria-hidden>↺</span>
          clear filters
        </button>
      ) : null}
    </div>
  );
}

/** Highest-ranked event that hasn't ended yet; falls back to the top event. */
function pickAnchor<T extends { startDate: string; endDate?: string }>(events: T[]): T | null {
  const today = new Date().toISOString().slice(0, 10);
  return events.find((event) => (event.endDate ?? event.startDate) >= today) ?? events[0] ?? null;
}

function DestinationCard({
  destination,
  score,
  selected,
  highlighted = false,
  tier,
  eventCount,
  month,
  saved,
  onToggleSaved,
  anchorEventTitle,
  anchorEventType,
  anchorEstimated,
  anchorTiming,
  trending,
  hiddenGem,
  inCompare,
  onToggleCompare,
  onOpen,
  eager
}: {
  destination: Destination;
  score: MonthlyDestinationScore;
  selected: boolean;
  highlighted?: boolean;
  tier: Tier;
  eventCount: number;
  month: MonthNumber;
  saved: boolean;
  onToggleSaved: () => void;
  anchorEventTitle: string | null;
  anchorEventType: string | null;
  anchorEstimated?: boolean;
  anchorTiming?: { text: string; live: boolean } | null;
  trending: boolean;
  hiddenGem: boolean;
  inCompare: boolean;
  onToggleCompare?: () => void;
  onOpen?: () => void;
  eager?: boolean;
}) {
  const dotColor = TIER_COLORS[tier];
  const priceTier = BUDGET_LABELS[destination.budget];
  const kicker = anchorEventTitle
    ? anchorEventType
      ? anchorEventType.replaceAll("-", " ")
      : "headline"
    : "the scene";

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] transition-[transform,box-shadow,border-color] duration-300 ${
        selected
          ? "border-[var(--signal)]/60 shadow-[0_0_0_1px_var(--signal),0_18px_40px_-16px_rgba(232,89,12,0.35)]"
          : highlighted
            ? "-translate-y-0.5 border-[var(--border-strong)] shadow-[0_18px_40px_-18px_rgba(28,22,18,0.28)]"
            : "border-[var(--border)] shadow-[0_1px_2px_rgba(28,22,18,0.04)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(28,22,18,0.28)]"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Quick look at ${destination.city}`}
        className="flex h-full flex-col rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[16/10]">
          <Image
            src={pickHeroForMonth(destination, month)}
            alt={destination.city}
            fill
            sizes="(max-width: 640px) 100vw, 280px"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            className={`object-cover transition duration-500 ${selected ? "scale-105" : "scale-100 group-hover:scale-105"}`}
          />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

          {trending || hiddenGem ? (
            <span
              title={trending ? "Biggest jump in activity from last month" : "Strong month, lower cost"}
              className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur"
            >
              <span aria-hidden className={trending ? "text-[var(--signal)]" : "text-[8px]"}>
                {trending ? "↗" : "◆"}
              </span>
              {trending ? "rising" : "hidden gem"}
            </span>
          ) : null}

          <div className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">
                {destination.country.toLowerCase()}
              </p>
              <h3 className="truncate text-lg font-medium leading-tight text-white">{destination.city}</h3>
            </div>
            <span className="flex shrink-0 flex-col items-end leading-none">
              <span className="font-mono text-[22px] font-medium tracking-[-0.02em] text-white">
                {score.overallScore}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/70">
                <span
                  aria-hidden
                  className="h-1 w-1 rounded-full"
                  style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
                />
                {tier}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-4 pb-3.5 pt-3">
          <p
            className={`flex items-center font-mono text-[9px] uppercase tracking-[0.2em] ${
              selected ? "text-[var(--signal)]" : "text-[var(--muted)]"
            }`}
          >
            {kicker}
            {anchorEstimated ? (
              <span className="ml-1.5 text-[var(--muted-2)]" title="Forward estimate — dates to confirm">· est</span>
            ) : null}
            {anchorTiming ? (
              <span
                className={`ml-1.5 rounded-full px-1.5 py-px ${
                  anchorTiming.live ? "bg-[var(--signal)] text-white" : "bg-[var(--signal)]/10 text-[var(--signal)]"
                }`}
              >
                {anchorTiming.text}
              </span>
            ) : null}
          </p>
          <p
            className={`mt-1.5 line-clamp-2 min-h-[2.5rem] text-[14px] leading-5 ${
              anchorEventTitle ? "font-medium text-[var(--foreground)]" : "text-[var(--foreground)]/80"
            }`}
          >
            {anchorEventTitle ?? destination.tagline}
          </p>

          <p className="mt-auto pt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            {eventCount > 0 ? (
              <>
                <span className="text-[var(--foreground)]">{eventCount}</span> {eventCount === 1 ? "event" : "events"}
              </>
            ) : (
              <span>quiet month</span>
            )}
            <span className="mx-1.5 text-[var(--muted-2)]">·</span>
            <span className="text-[var(--foreground)]">{priceTier}</span>
          </p>
        </div>
      </button>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${destination.city}` : `Save ${destination.city}`}
          title={saved ? "Remove from saved" : "Save to your shortlist"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSaved();
          }}
          className={`${ICON_BUTTON} ${saved ? ICON_ON : ICON_OFF}`}
        >
          <HeartIcon filled={saved} />
        </button>
        {onToggleCompare ? (
          <button
            type="button"
            aria-pressed={inCompare}
            aria-label={inCompare ? `Remove ${destination.city} from compare` : `Add ${destination.city} to compare`}
            title={inCompare ? "Remove from compare" : "Add to compare (pick 2)"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleCompare();
            }}
            className={`${ICON_BUTTON} ${inCompare ? ICON_ON : ICON_OFF}`}
          >
            <CompareIcon />
          </button>
        ) : null}
      </div>
    </article>
  );
}

const DAY_MS = 86_400_000;

function timingLabel(startDate: string, endDate?: string | null): { text: string; live: boolean } | null {
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00Z`).getTime();
  const end = new Date(`${(endDate ?? startDate).slice(0, 10)}T00:00:00Z`).getTime();
  if (Number.isNaN(start)) return null;
  if (start <= todayUtc && end >= todayUtc) return { text: "on now", live: true };
  const days = Math.round((start - todayUtc) / DAY_MS);
  if (days < 0) return null;
  if (days === 1) return { text: "tomorrow", live: false };
  if (days <= 13) return { text: `in ${days} days`, live: false };
  if (days <= 56) return { text: `in ${Math.round(days / 7)} wks`, live: false };
  return null;
}

const ICON_BUTTON = "inline-flex h-8 w-8 items-center justify-center rounded-full transition";
const ICON_ON = "border border-[var(--signal)] bg-[var(--signal)] text-white shadow-[0_6px_16px_-6px_rgba(232,89,12,0.6)]";
const ICON_OFF = "wn-glass-dark text-white/90 hover:text-white active:scale-95";

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
      <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10Z" />
    </svg>
  );
}

function CompareIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" />
    </svg>
  );
}
