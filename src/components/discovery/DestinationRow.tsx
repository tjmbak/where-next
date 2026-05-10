"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BUDGET_LABELS, getMonthLabel } from "@/data/taxonomy";
import {
  getDestinationMonthSummary,
  getDestinationRangeSummary,
  getEventsForDestinationInMonth,
  getEventsForDestinationInRange
} from "@/data/music-travel";
import { trackEvent } from "@/lib/analytics";
import { pickHeroForMonth } from "@/lib/hero-images";
import type { Destination, MonthNumber, MonthlyDestinationScore } from "@/types/content";

type Tier = "peak" | "in season" | "shoulder" | "warm";

type EmptyKind = "no-saved" | "no-saved-match" | "no-match";

type DestinationRowProps = {
  destinations: Array<{
    destination: Destination;
    score: MonthlyDestinationScore;
  }>;
  selectedSlug?: string;
  month: MonthNumber;
  monthsInRange?: MonthNumber[];
  isSaved: (slug: string) => boolean;
  onToggleSaved: (slug: string) => void;
  trendingSlugs?: ReadonlySet<string>;
  hiddenGemSlugs?: ReadonlySet<string>;
  comparePickSet?: ReadonlySet<string>;
  onToggleComparePick?: (slug: string) => void;
  emptyKind?: EmptyKind;
  onClearFilters?: () => void;
  limit?: number;
};

function tierFromScore(score: number): Tier {
  if (score >= 90) return "peak";
  if (score >= 80) return "in season";
  if (score >= 70) return "shoulder";
  return "warm";
}

function tierColor(tier: Tier) {
  switch (tier) {
    case "peak":
      return "var(--signal)";
    case "in season":
      return "#f5d971";
    case "shoulder":
      return "#9aa0a6";
    case "warm":
    default:
      return "#5b5e62";
  }
}

export function DestinationRow({
  destinations,
  selectedSlug,
  month,
  monthsInRange,
  isSaved,
  onToggleSaved,
  trendingSlugs,
  hiddenGemSlugs,
  comparePickSet,
  onToggleComparePick,
  emptyKind,
  onClearFilters,
  limit = 12
}: DestinationRowProps) {
  const hasRange = (monthsInRange?.length ?? 0) > 1;
  const rangeMonths = hasRange ? (monthsInRange as MonthNumber[]) : null;
  const trackRef = useRef<HTMLUListElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const items = useMemo(() => destinations.slice(0, limit), [destinations, limit]);

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

  if (items.length === 0) {
    return <RowEmptyState month={month} kind={emptyKind} onClearFilters={onClearFilters} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          shortlist · {getMonthLabel(month).toLowerCase()}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          {items.length}
          {destinations.length > items.length ? `/${destinations.length}` : ""} ranked by activity
        </span>
      </div>

      <div className="-mx-6 sm:-mx-10">
        <div className="group/row relative">
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 left-0 z-20 w-10 bg-gradient-to-r from-[var(--background)] via-[var(--background)]/70 to-transparent transition-opacity duration-200 sm:w-14 ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
          />
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-y-0 right-0 z-20 w-10 bg-gradient-to-l from-[var(--background)] via-[var(--background)]/70 to-transparent transition-opacity duration-200 sm:w-14 ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
          />

          <button
            type="button"
            aria-label="scroll left"
            onClick={() => nudge(-1)}
            tabIndex={canScrollLeft ? 0 : -1}
            className={`absolute left-2 top-[42%] z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/95 font-mono text-base text-[var(--foreground)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur transition hover:border-[var(--foreground)] sm:left-4 ${
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
            className={`absolute right-2 top-[42%] z-30 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/95 font-mono text-base text-[var(--foreground)] shadow-[0_8px_24px_rgba(0,0,0,0.5)] backdrop-blur transition hover:border-[var(--foreground)] sm:right-4 ${
              canScrollRight
                ? "sm:flex sm:opacity-0 sm:group-hover/row:opacity-100"
                : "sm:flex sm:opacity-0"
            } sm:focus-visible:opacity-100`}
          >
            ›
          </button>

          <ul
            ref={trackRef}
            className="wn-row flex snap-x items-stretch gap-4 overflow-x-auto scroll-px-6 px-6 pb-4 sm:scroll-px-10 sm:px-10"
          >
            {items.map(({ destination, score }, index) => {
              const selected = destination.slug === selectedSlug;
              const tier = tierFromScore(score.overallScore);
              const summary = rangeMonths
                ? getDestinationRangeSummary(destination.slug, rangeMonths)
                : getDestinationMonthSummary(destination.slug, month);
              const anchorEvent = rangeMonths
                ? getEventsForDestinationInRange(destination.slug, rangeMonths)[0] ?? null
                : getEventsForDestinationInMonth(destination.slug, month)[0] ?? null;
              const saved = isSaved(destination.slug);
              const trending = trendingSlugs?.has(destination.slug) ?? false;
              const hiddenGem = !trending && (hiddenGemSlugs?.has(destination.slug) ?? false);
              const inCompare = comparePickSet?.has(destination.slug) ?? false;
              const eager = index < 6;
              return (
                <li
                  key={destination.slug}
                  data-slug={destination.slug}
                  className="snap-start shrink-0 basis-[260px] min-w-0 overflow-hidden sm:basis-[280px]"
                >
                  <DestinationCard
                    destination={destination}
                    score={score}
                    selected={selected}
                    tier={tier}
                    spanLabel={summary.spanLabel}
                    eventCount={summary.count}
                    month={month}
                    saved={saved}
                    onToggleSaved={() => onToggleSaved(destination.slug)}
                    anchorEventTitle={anchorEvent?.title ?? null}
                    anchorEventType={anchorEvent?.type ?? null}
                    trending={trending}
                    hiddenGem={hiddenGem}
                    eager={eager}
                    inCompare={inCompare}
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
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[var(--border-strong)] bg-[var(--surface)]/40 px-6 py-10 text-center">
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

function DestinationCard({
  destination,
  score,
  selected,
  tier,
  spanLabel,
  eventCount,
  month,
  saved,
  onToggleSaved,
  anchorEventTitle,
  anchorEventType,
  trending,
  hiddenGem,
  inCompare,
  onToggleCompare,
  eager
}: {
  destination: Destination;
  score: MonthlyDestinationScore;
  selected: boolean;
  tier: Tier;
  spanLabel: string | null;
  eventCount: number;
  month: MonthNumber;
  saved: boolean;
  onToggleSaved: () => void;
  anchorEventTitle: string | null;
  anchorEventType: string | null;
  trending: boolean;
  hiddenGem: boolean;
  inCompare: boolean;
  onToggleCompare?: () => void;
  eager?: boolean;
}) {
  const dotColor = tierColor(tier);
  const priceTier = BUDGET_LABELS[destination.budget];

  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-lg border bg-[var(--surface)] transition-colors duration-200 ${
        selected
          ? "border-[var(--signal)]/60 shadow-[0_0_0_1px_var(--signal),0_18px_48px_rgba(255,139,61,0.18)]"
          : "border-[var(--border)] hover:border-[var(--border-strong)]"
      }`}
    >
      <Link
        href={`/destinations/${destination.slug}?month=${month}`}
        aria-label={`Open ${destination.city} guide`}
        className="flex h-full flex-col rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <Image
            src={pickHeroForMonth(destination, month)}
            alt={destination.city}
            fill
            sizes="(max-width: 640px) 260px, 280px"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            className={`object-cover transition duration-500 ${selected ? "scale-105" : "scale-100 group-hover:scale-105"}`}
          />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30" />

          {spanLabel || trending || hiddenGem ? (
            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              {spanLabel ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/85 backdrop-blur">
                  {spanLabel}
                </span>
              ) : null}
              {trending ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] backdrop-blur"
                  style={{
                    borderColor: "rgba(255, 139, 61, 0.55)",
                    color: "var(--signal)",
                    boxShadow: "0 0 12px rgba(255, 139, 61, 0.35)"
                  }}
                >
                  <span aria-hidden>↗</span>
                  trending
                </span>
              ) : hiddenGem ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                  <span aria-hidden className="text-[8px]">◆</span>
                  hidden gem
                </span>
              ) : null}
            </div>
          ) : null}

          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
            <span
              aria-hidden
              className="h-1 w-1 rounded-full"
              style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }}
            />
            <span className="text-white">{score.overallScore}</span>
            <span className="text-white/60">{tier}</span>
          </span>

          <div className="absolute inset-x-3 bottom-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/65">
              {destination.country.toLowerCase()}
            </p>
            <h3 className="text-lg font-medium leading-tight text-white">{destination.city}</h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2.5 px-4 pb-3 pt-3">
          <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-[var(--foreground)]/85">
            {destination.tagline}
          </p>

          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
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

          <div
            className={`mt-auto flex items-start gap-2 border-t pt-2.5 transition-colors ${
              selected ? "border-[var(--signal)]/35" : "border-[var(--border)]"
            }`}
          >
            <span
              aria-hidden
              className={`mt-1 h-1 w-1 shrink-0 rounded-full transition-shadow ${
                selected
                  ? "bg-[var(--signal)] shadow-[0_0_6px_var(--signal)]"
                  : "bg-[var(--muted-2)]"
              }`}
            />
            <div className="min-w-0 flex-1">
              <p
                className={`font-mono text-[9px] uppercase tracking-[0.2em] ${
                  selected ? "text-[var(--signal)]" : "text-[var(--muted)]"
                }`}
              >
                {anchorEventTitle
                  ? anchorEventType
                    ? anchorEventType.replace("-", " ")
                    : "anchor"
                  : "anchor"}
              </p>
              <p className="truncate text-[13px] leading-5 text-[var(--foreground)]">
                {anchorEventTitle ?? "lineups still coming together"}
              </p>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex items-center justify-end gap-1.5 border-t border-[var(--border)] bg-[var(--surface)]/40 px-3 py-2">
        <ShareButton destination={destination} month={month} />
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `Unsave ${destination.city}` : `Save ${destination.city}`}
          title={saved ? "Remove from saved" : "Save to your shortlist (stored on this device)"}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleSaved();
          }}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
            saved
              ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--signal)]"
              : "border-[var(--border-strong)] bg-transparent text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          <span aria-hidden className="text-[14px] leading-none">
            {saved ? "♥" : "♡"}
          </span>
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
            className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 font-mono text-[9px] uppercase tracking-[0.18em] transition ${
              inCompare
                ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--signal)]"
                : "border-[var(--border-strong)] bg-transparent text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            <span aria-hidden>⇄</span>
            {inCompare ? "added" : "compare"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function ShareButton({ destination, month }: { destination: Destination; month: MonthNumber }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleShare = useCallback(
    async (event: React.MouseEvent | React.KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/?month=${month}&city=${destination.slug}`;
      let didCopy = false;
      try {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(url);
          didCopy = true;
        }
      } catch {
        didCopy = false;
      }
      trackEvent("destination_share", { slug: destination.slug, month, copied: didCopy });
      if (didCopy) {
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), 1600);
      }
    },
    [destination.slug, month]
  );

  return (
    <button
      type="button"
      aria-label={`Share ${destination.city} link`}
      title={copied ? "Link copied" : "Copy a shareable link to this city + month"}
      onClick={handleShare}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleShare(event);
        }
      }}
      className={`inline-flex items-center justify-center rounded-full border transition ${
        copied
          ? "h-7 gap-1 border-[var(--signal)]/55 bg-[var(--signal)]/10 px-2.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--signal)]"
          : "h-7 w-7 border-[var(--border-strong)] bg-transparent text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
      }`}
    >
      <span aria-hidden className="text-[12px] leading-none">
        {copied ? "copied" : "↗"}
      </span>
    </button>
  );
}
