"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BUDGET_LABELS, GENRE_LABELS, getMonthLabel, upcomingYearForMonth } from "@/data/taxonomy";
import {
  getDestinationMonthSummary,
  getDestinationRangeSummary,
  getEventsForDestinationInMonth,
  getEventsForDestinationInRange
} from "@/data/music-travel";
import { pickHeroForMonth } from "@/lib/hero-images";
import { TIER_COLORS, tierFromScore, type Tier } from "@/lib/tiers";
import type { Destination, Genre, MonthNumber, MonthlyDestinationScore } from "@/types/content";

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
  /** Active sound filter; cards lead with and count events in it. */
  genre?: Genre;
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
  genre,
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
  const [expanded, setExpanded] = useState(false);
  const effectiveLimit = expanded ? destinations.length : limit;
  const items = useMemo(
    () => destinations.slice(0, effectiveLimit),
    [destinations, effectiveLimit]
  );
  const canExpand = destinations.length > limit;

  if (items.length === 0) {
    return <RowEmptyState month={month} kind={emptyKind} onClearFilters={onClearFilters} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <h2 className="text-[20px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[22px]">
            Top cities in {getMonthLabel(month)}
          </h2>
          {forYouAvailable && onToggleForYou ? (
            <span className="inline-flex overflow-hidden rounded-full border border-[var(--border-strong)] text-[13px] font-medium">
              <button
                type="button"
                aria-pressed={!forYouActive}
                onClick={() => {
                  if (forYouActive) onToggleForYou();
                }}
                className={`px-3 py-1 transition ${
                  !forYouActive
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Top
              </button>
              <button
                type="button"
                aria-pressed={forYouActive}
                onClick={() => {
                  if (!forYouActive) onToggleForYou();
                }}
                className={`px-3 py-1 transition ${
                  forYouActive
                    ? "bg-[var(--signal)] text-white"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                For you
              </button>
            </span>
          ) : null}
        </span>
        <span className="flex items-baseline gap-3 whitespace-nowrap text-[13px] font-medium text-[var(--muted)]">
          <span className="hidden sm:inline">
            {items.length}
            {destinations.length > items.length ? `/${destinations.length}` : ""}{" "}
            {forYouActive ? "sorted for you" : "ranked by activity"}
          </span>
          {canExpand && expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-[var(--foreground)] transition hover:border-[var(--foreground)]"
            >
              Show less
            </button>
          ) : null}
        </span>
      </div>

      <ul className="grid grid-cols-1 gap-x-5 gap-y-8 pb-4 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-4">
        {items.map(({ destination, score }, index) => {
          const selected = destination.slug === selectedSlug;
          const tier = tierFromScore(score.overallScore);
          const summary = rangeMonths
            ? getDestinationRangeSummary(destination.slug, rangeMonths, year)
            : getDestinationMonthSummary(destination.slug, month, year);
          const events = rangeMonths
            ? getEventsForDestinationInRange(destination.slug, rangeMonths, year)
            : getEventsForDestinationInMonth(destination.slug, month, year);
          const genreEvents = genre ? events.filter((event) => event.genres.includes(genre)) : [];
          const anchorEvent = pickUpcoming(genreEvents) ?? pickAnchor(events);
          const countLabel =
            genre && genreEvents.length > 0
              ? `${genreEvents.length} ${GENRE_LABELS[genre]} ${genreEvents.length === 1 ? "event" : "events"}`
              : summary.count > 0
                ? `${summary.count} ${summary.count === 1 ? "event" : "events"}`
                : "quiet month";
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
              className="min-w-0"
            >
              <DestinationCard
                destination={destination}
                score={score}
                selected={selected}
                highlighted={!selected && hoveredSlug === destination.slug}
                tier={tier}
                countLabel={countLabel}
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
      {canExpand && !expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mx-auto inline-flex h-11 items-center rounded-full border border-[var(--border-strong)] px-5 text-[14px] font-medium text-[var(--foreground)] transition hover:border-[var(--foreground)] active:scale-95"
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
      <span className="text-[13px] font-medium text-[var(--muted-2)]">
        Nothing in {monthLabel}
      </span>
      <h3 className="text-base leading-tight text-[var(--foreground)] sm:text-lg">{copy.title}</h3>
      <p className="max-w-md text-[13px] leading-6 text-[var(--muted)]">{copy.body}</p>
      {onClearFilters ? (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[13px] font-medium text-[var(--foreground)] transition hover:border-[var(--foreground)]"
        >
          <span aria-hidden>↺</span>
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

function pickUpcoming<T extends { startDate: string; endDate?: string }>(events: T[]): T | null {
  const today = new Date().toISOString().slice(0, 10);
  return events.find((event) => (event.endDate ?? event.startDate) >= today) ?? null;
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
  countLabel,
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
  countLabel: string;
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
    <article className="group relative h-full">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Quick look at ${destination.city}`}
        className="block w-full rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--background)]"
      >
        <div
          className={`relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-[var(--surface-2)] transition-shadow duration-300 ${
            selected
              ? "shadow-[0_0_0_2px_var(--background),0_0_0_4px_var(--signal)]"
              : highlighted
                ? "shadow-[0_18px_40px_-20px_rgba(28,22,18,0.45)]"
                : "group-hover:shadow-[0_18px_40px_-20px_rgba(28,22,18,0.45)]"
          }`}
        >
          <Image
            src={pickHeroForMonth(destination, month)}
            alt={destination.city}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 280px"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            className={`object-cover transition duration-700 ease-out ${selected || highlighted ? "scale-[1.04]" : "scale-100 group-hover:scale-[1.04]"}`}
          />

          {trending || hiddenGem ? (
            <span
              title={trending ? "Biggest jump in activity from last month" : "Strong month, lower cost"}
              className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold text-[#1c1612] shadow-[0_2px_8px_rgba(0,0,0,0.18)]"
            >
              <span aria-hidden className={trending ? "text-[var(--signal)]" : "text-[9px] text-[var(--accent)]"}>
                {trending ? "↗" : "◆"}
              </span>
              {trending ? "Rising" : "Hidden gem"}
            </span>
          ) : null}
        </div>

        <div className="px-0.5 pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="min-w-0 truncate text-[15px] leading-5 text-[var(--foreground)]">
              <span className="font-semibold">{destination.city}</span>
              <span className="text-[var(--muted)]">, {destination.country}</span>
            </h3>
            <span
              title={`Activity score ${score.overallScore}/100 · ${tier}`}
              className="inline-flex shrink-0 items-center gap-1.5 text-[14px] font-semibold tabular-nums text-[var(--foreground)]"
            >
              <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
              {score.overallScore}
            </span>
          </div>
          <p className="mt-0.5 truncate text-[14px] leading-5 text-[var(--foreground)]/75">
            {anchorEventTitle ?? destination.tagline}
          </p>
          <p className="mt-0.5 truncate text-[13px] leading-5 text-[var(--muted)]">
            {anchorTiming ? (
              <span className={anchorTiming.live ? "font-semibold text-[var(--signal)]" : "font-medium text-[var(--signal)]"}>
                {anchorTiming.live ? "On now" : capitalize(anchorTiming.text)}
              </span>
            ) : (
              <span className="capitalize">{kicker}</span>
            )}
            {anchorEstimated ? <span title="Forward estimate — dates to confirm"> (est.)</span> : null}
            <span>
              {" · "}
              {countLabel}
              {" · "}
              {priceTier}
            </span>
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

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
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
const ICON_ON = "bg-[var(--signal)] text-white shadow-[0_6px_16px_-6px_rgba(232,89,12,0.6)]";
const ICON_OFF = "bg-white/90 text-[#1c1612] shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:bg-white active:scale-95";

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
