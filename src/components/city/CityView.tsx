"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode
} from "react";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { EventAudio } from "@/components/audio/EventAudio";
import { bookingUrl, gygUrl, resolveDateRange, skyscannerUrl } from "@/components/destinations/StayAndTravel";
import { WatchButton } from "@/components/watch/WatchButton";
import {
  getDestinationBySlug,
  getEventsForDestinationInMonth,
  getScoreForDestinationMonth,
  getVenuesForDestination
} from "@/data/music-travel";
import { BUDGET_LABELS, GENRE_LABELS, MONTHS, VIBE_LABELS, getMonthLabel, upcomingYearForMonth, yearQueryFor } from "@/data/taxonomy";
import { trackEvent } from "@/lib/analytics";
import { artistFromTitle } from "@/lib/artist-from-title";
import { pickHeroForMonth } from "@/lib/hero-images";
import { recordVisit } from "@/lib/last-visit";
import { useSavedDestinations } from "@/lib/saved-destinations";
import { TIER_COLORS, tierFromScore } from "@/lib/tiers";
import { formatUsdRange } from "@/lib/utils";
import type { Event, EventType, MonthNumber } from "@/types/content";

export const QUICK_LOOK_TITLE_ID = "quick-look-title";
export const QUICK_LOOK_DESC_ID = "quick-look-desc";

const TYPE_LABELS: Record<EventType, string> = {
  festival: "Festivals",
  "club-night": "Club nights",
  concert: "Concerts",
  residency: "Residencies",
  "beach-club": "Beach clubs",
  carnival: "Carnivals",
  conference: "Conferences"
};

const TYPE_SINGULAR: Record<EventType, string> = {
  festival: "Festival",
  "club-night": "Club night",
  concert: "Concert",
  residency: "Residency",
  "beach-club": "Beach club",
  carnival: "Carnival",
  conference: "Conference"
};

const TIER_NAMES: Record<string, string> = {
  peak: "Peak",
  "in-season": "In season",
  shoulder: "Shoulder",
  "off-season": "Off-season"
};

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 5;
const NON_VENUE_TYPES = ["festival", "conference", "carnival"];

export type CityViewProps = {
  slug: string;
  month: MonthNumber;
  year: number;
  variant: "sheet" | "page";
  onMonthChange: (month: MonthNumber) => void;
  /** Runs before following a link out of the view; the sheet uses it to dismiss itself. */
  onLeave?: () => void;
  /** Sheet-only top bar (step buttons, guide link, close). */
  header?: ReactNode;
  /** Page-only sections rendered after venues. */
  extras?: ReactNode;
};

export function CityView({ slug: destinationSlug, month, year, variant, onMonthChange, onLeave, header, extras }: CityViewProps) {
  const isPage = variant === "page";
  const initialCount = isPage ? 10 : 6;
  const destination = getDestinationBySlug(destinationSlug);
  const { isSaved, toggle } = useSavedDestinations();
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [showAll, setShowAll] = useState(false);
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    recordVisit({
      slug: destinationSlug,
      month,
      year,
      eventCount: getEventsForDestinationInMonth(destinationSlug, month, year).length
    });
  }, [destinationSlug, month, year]);

  const score = getScoreForDestinationMonth(destinationSlug, month);

  const { upcoming, endedCount, topIds } = useMemo(() => {
    const all = getEventsForDestinationInMonth(destinationSlug, month, year);
    const ahead = all
      .filter((event) => (event.endDate ?? event.startDate) >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
    const top = [...ahead].sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 3);
    return { upcoming: ahead, endedCount: all.length - ahead.length, topIds: new Set(top.map((event) => event.id)) };
  }, [destinationSlug, month, year, today]);

  // Deep links like /destinations/x?month=10#event-<id> open that row.
  useEffect(() => {
    const match = /^#event-(.+)$/.exec(window.location.hash);
    if (!match) return;
    const id = decodeURIComponent(match[1]);
    if (!upcoming.some((event) => event.id === id)) return;
    const frame = requestAnimationFrame(() => {
      setTypeFilter("all");
      setShowAll(true);
      setOpenEventId(id);
      requestAnimationFrame(() => document.getElementById(`event-${id}`)?.scrollIntoView({ block: "center" }));
    });
    return () => cancelAnimationFrame(frame);
  }, [upcoming]);

  const monthBars = useMemo(() => {
    const start = new Date().getMonth() + 1;
    return Array.from({ length: 12 }, (_, i) => {
      const m = (((start - 1 + i) % 12) + 1) as MonthNumber;
      return { month: m, score: getScoreForDestinationMonth(destinationSlug, m)?.overallScore ?? null };
    });
  }, [destinationSlug]);

  const bestWeek = useMemo(() => findBestWeek(upcoming, today), [upcoming, today]);

  if (!destination) return <div className="p-6 text-[var(--muted)]">City not found.</div>;

  const overall = score?.overallScore ?? 0;
  const tier = tierFromScore(overall);
  const tierColor = TIER_COLORS[tier];
  const monthLabel = getMonthLabel(month);
  const peakBar = monthBars.reduce<{ month: MonthNumber; score: number | null } | null>(
    (best, bar) => (bar.score != null && (best?.score == null || bar.score > best.score) ? bar : best),
    null
  );
  const nextBusyMonth = upcoming.length > 0 ? null : findNextBusyMonth(destinationSlug, month, today);
  const why = score
    ? (score.whyNow?.[0] ?? destination.summary)
    : `Line-ups for ${monthLabel} aren't out yet.${
        nextBusyMonth
          ? ` The next month with confirmed events is ${getMonthLabel(nextBusyMonth.month)}.`
          : peakBar
            ? ` ${getMonthLabel(peakBar.month)} is usually ${destination.city}'s strongest month.`
            : ""
      }`;
  const moreWhy = isPage && score ? (score.whyNow ?? []).slice(1).filter((line) => !/^best fit:|curated moments/i.test(line)) : [];
  const heroSrc = score ? pickHeroForMonth(destination, month) : destination.heroImage;
  const saved = isSaved(destination.slug);
  const allVenues = getVenuesForDestination(destination.slug);
  const venueById = new Map(allVenues.map((venue) => [venue.id, venue.name]));
  const venues = allVenues.filter((venue) => !NON_VENUE_TYPES.includes(venue.type)).slice(0, isPage ? 12 : 4);

  const types = Object.entries(
    upcoming.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] ?? 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]) as Array<[EventType, number]>;
  const filtered = typeFilter === "all" ? upcoming : upcoming.filter((event) => event.type === typeFilter);
  const visible = showAll ? filtered : filtered.slice(0, initialCount);
  const weeks = groupByWeek(visible, today);

  const stay = bestWeek ?? fallbackStay(month, year, today);
  const nights = Math.max(1, Math.round((Date.parse(stay.checkout) - Date.parse(stay.checkin)) / DAY_MS));
  const planHref = `/destinations/${destination.slug}/plan?start=${stay.checkin}&days=${nights}${bestWeek ? "&from=best-week" : ""}`;
  const source = isPage ? "city-page" : "preview-sheet";

  const switchMonth = (m: MonthNumber) => {
    if (m === month) return;
    setTypeFilter("all");
    setShowAll(false);
    setOpenEventId(null);
    onMonthChange(m);
    trackEvent("preview_month", { slug: destination.slug, month: m, source });
  };

  const hero = (
    <div
      className={`relative overflow-hidden bg-[var(--surface-2)] ${
        isPage ? "aspect-[4/3] rounded-3xl sm:aspect-[21/9]" : "aspect-[16/10] rounded-2xl"
      }`}
    >
      <Image
        src={heroSrc}
        alt=""
        fill
        priority
        sizes={isPage ? "(max-width: 1180px) 100vw, 1180px" : "(max-width: 640px) 100vw, 440px"}
        className="object-cover"
      />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
      {score ? (
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[13px] font-semibold text-[#1c1612] shadow-[0_2px_8px_rgba(0,0,0,0.18)] sm:left-4 sm:top-4">
          <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tierColor }} />
          {overall}
          <span className="font-medium text-[#1c1612]/65">{TIER_NAMES[tier] ?? tier}</span>
        </span>
      ) : null}
      <div className={`absolute ${isPage ? "inset-x-5 bottom-5 sm:inset-x-8 sm:bottom-7" : "inset-x-4 bottom-3.5"}`}>
        {isPage ? (
          <h1 className="text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-white">{destination.city}</h1>
        ) : (
          <h2 id={QUICK_LOOK_TITLE_ID} className="text-[30px] font-semibold leading-none tracking-[-0.02em] text-white">
            {destination.city}
          </h2>
        )}
        <p className={`text-white/90 ${isPage ? "mt-2.5 text-[15px] sm:text-[17px]" : "mt-1.5 text-[14px]"}`}>
          {destination.country} · {monthLabel} {year}
        </p>
      </div>
    </div>
  );

  const intro = (
    <>
      <p
        id={isPage ? undefined : QUICK_LOOK_DESC_ID}
        className={isPage ? "text-[19px] leading-8 text-[var(--foreground)] sm:text-[21px] sm:leading-9" : "text-[16px] leading-7 text-[var(--foreground)]"}
      >
        {why}
      </p>
      {moreWhy.map((line) => (
        <p key={line} className="mt-3 text-[16px] leading-7 text-[var(--foreground)]/80">
          {line}
        </p>
      ))}
      {bestWeek && !isPage ? null : (
        <p className="mt-3 text-[14px] text-[var(--muted)]">
          {destination.genres.slice(0, 3).map((g) => GENRE_LABELS[g]).join(" · ")}
          <span aria-hidden> · </span>
          <span className="font-medium text-[var(--foreground)]">{BUDGET_LABELS[destination.budget]}</span>{" "}
          {formatUsdRange(destination.averageDailySpendUsd)}
        </p>
      )}
    </>
  );

  const bestWeekCard = bestWeek ? (
    <section className="rounded-2xl bg-[var(--surface)] p-4 ring-1 ring-inset ring-[var(--border)] sm:p-5">
      <p className="text-[13px] font-semibold text-[var(--signal)]">
        Best week to go <span className="font-normal text-[var(--muted)]">· the busiest five days of {monthLabel}</span>
      </p>
      <p className="mt-0.5 text-[24px] font-semibold leading-tight tracking-[-0.01em] text-[var(--foreground)]">
        {rangeLabel(bestWeek.from, bestWeek.to)}
      </p>
      <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-6 text-[var(--foreground)]">{bestWeek.lead.title}</p>
      <p className="mt-0.5 text-[13px] leading-5 text-[var(--muted)]">{weekBreakdown(bestWeek.events)}</p>
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <BookButton
          label="Stays"
          partner="Booking.com"
          href={bookingUrl(destination, { startDate: stay.checkin, endDate: stay.checkout })}
          provider="booking"
          destinationSlug={destination.slug}
        />
        <BookButton
          label="Flights"
          partner="Skyscanner"
          href={skyscannerUrl(destination, { startDate: stay.checkin, endDate: stay.checkout })}
          provider="skyscanner"
          destinationSlug={destination.slug}
        />
        <BookButton
          label="Things to do"
          partner="GetYourGuide"
          href={gygUrl(destination, { startDate: stay.checkin, endDate: stay.checkout })}
          provider="gyg"
          destinationSlug={destination.slug}
        />
      </div>
      <p className="mt-2 text-[12px] text-[var(--muted)]">
        {nights} {nights === 1 ? "night" : "nights"}, {rangeLabel(stay.checkin, stay.checkout)} ·{" "}
        {BUDGET_LABELS[destination.budget]} {formatUsdRange(destination.averageDailySpendUsd)}
      </p>
    </section>
  ) : null;

  const actions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          void toggle(destination.slug);
          trackEvent("destination_saved_toggle", {
            slug: destination.slug,
            action: saved ? "unsave" : "save",
            source
          });
        }}
        className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition ${
          saved
            ? "border-[var(--signal)]/55 bg-[var(--signal)]/10 text-[var(--signal)]"
            : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--foreground)]"
        }`}
      >
        <span aria-hidden className="text-[16px] leading-none">
          {saved ? "♥" : "♡"}
        </span>
        {saved ? "Saved" : "Save"}
      </button>
      <WatchButton slug={destination.slug} month={month} year={year} variant="icon" />
      {nextBusyMonth ? (
        <button
          type="button"
          onClick={() => switchMonth(nextBusyMonth.month)}
          className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 text-[14px] font-semibold text-[var(--background)] transition hover:opacity-90"
        >
          <span className="truncate">
            See {getMonthLabel(nextBusyMonth.month)} · {nextBusyMonth.count} {nextBusyMonth.count === 1 ? "event" : "events"}
          </span>
          <span aria-hidden>→</span>
        </button>
      ) : (
        <Link
          href={planHref}
          onClick={() => {
            trackEvent("preview_plan", { slug: destination.slug, month, source });
            onLeave?.();
          }}
          className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-[var(--foreground)] px-4 text-[14px] font-semibold text-[var(--background)] transition hover:opacity-90"
        >
          <span className="truncate">Plan {rangeLabel(stay.checkin, stay.checkout)}</span>
          <span aria-hidden>→</span>
        </Link>
      )}
    </div>
  );

  const h3 = isPage
    ? "text-[22px] font-semibold tracking-[-0.01em] text-[var(--foreground)] sm:text-[26px]"
    : "text-[18px] font-semibold tracking-[-0.01em] text-[var(--foreground)]";

  const events = (
    <section id={isPage ? "events" : undefined} className={`scroll-mt-6 ${isPage ? "mt-12" : "mt-8"}`} aria-labelledby={`${source}-events`}>
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={`${source}-events`} className={h3}>
          {upcoming.length > 0 ? `What's on in ${monthLabel}` : `Nothing confirmed for ${monthLabel} yet`}
        </h3>
        {upcoming.length > 0 ? (
          <span className="text-[13px] text-[var(--muted)]">
            {upcoming.length} {upcoming.length === 1 ? "event" : "events"}
          </span>
        ) : null}
      </div>

      {types.length > 1 && upcoming.length > initialCount ? (
        <div className={`wn-swipe mt-3 flex gap-2 overflow-x-auto ${isPage ? "-mx-5 px-5 sm:mx-0 sm:flex-wrap sm:px-0" : "-mx-5 px-5 sm:-mx-6 sm:px-6"}`}>
          <TypeChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>
            All
          </TypeChip>
          {types.map(([type, count]) => (
            <TypeChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
              {TYPE_LABELS[type]} <span className="opacity-60">{count}</span>
            </TypeChip>
          ))}
        </div>
      ) : null}

      {upcoming.length > 0 ? (
        <div className="mt-3 space-y-5">
          {weeks.map((week) => {
            const isBest = bestWeek ? week.key === mondayOf(bestWeek.from) : false;
            return (
              <div key={week.key}>
                <p className="sticky top-0 z-10 flex items-center gap-2 border-b border-[var(--border-strong)] bg-[var(--background)] pb-1.5 pt-2 text-[13px] font-semibold text-[var(--foreground)]">
                  {week.label}
                  {isBest ? (
                    <span className="rounded-full bg-[var(--signal)]/10 px-2 py-px text-[12px] font-semibold text-[var(--signal)]">
                      Best week
                    </span>
                  ) : null}
                </p>
                <ol>
                  {week.events.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      today={today}
                      top={topIds.has(event.id)}
                      venue={event.venueId ? venueById.get(event.venueId) : undefined}
                      open={openEventId === event.id}
                      onToggle={() => setOpenEventId((id) => (id === event.id ? null : event.id))}
                      destinationSlug={destination.slug}
                    />
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <p className="text-[14px] leading-6 text-[var(--muted)]">
            Organizers usually announce three to nine months out. Get an alert when {destination.city}&apos;s {monthLabel} line-ups
            drop.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <WatchButton slug={destination.slug} month={month} year={year} variant="pill" />
            {nextBusyMonth ? (
              <Link
                href={planHref}
                onClick={() => {
                  trackEvent("preview_plan", { slug: destination.slug, month, source });
                  onLeave?.();
                }}
                className="inline-flex h-10 items-center px-1 text-[14px] font-semibold text-[var(--foreground)] underline-offset-4 hover:underline"
              >
                Plan anyway
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {filtered.length > initialCount ? (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-4 h-11 w-full rounded-full border border-[var(--border-strong)] text-[14px] font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]"
        >
          {showAll ? "Show fewer" : `Show all ${filtered.length} events`}
        </button>
      ) : null}
      {endedCount > 0 ? (
        <p className="mt-3 text-[13px] text-[var(--muted)]">
          {endedCount} earlier {monthLabel} {endedCount === 1 ? "event has" : "events have"} already happened.
        </p>
      ) : null}
    </section>
  );

  const venueList =
    venues.length > 0 ? (
      <section className={isPage ? "mt-12" : "mt-9"}>
        <h3 className={h3}>Where the nights happen</h3>
        <ul className={`mt-2 divide-y divide-[var(--border)] ${isPage ? "sm:grid sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0" : ""}`}>
          {venues.map((venue) => (
            <li key={venue.id} className={isPage ? "sm:border-b sm:border-[var(--border)]" : undefined}>
              <TrackedOutboundLink
                href={venue.officialUrl}
                eventLabel={venue.name}
                destinationSlug={destination.slug}
                target="_blank"
                rel="noreferrer"
                className="group flex min-h-12 items-center justify-between gap-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-[var(--foreground)] group-hover:text-[var(--signal)]">
                    {venue.name}
                  </span>
                  <span className="block truncate text-[13px] text-[var(--muted)]">
                    {capitalize(venue.type.replace("-", " "))}
                    {isPage && venue.sceneTags.length > 0 ? ` · ${venue.sceneTags.map((tag) => VIBE_LABELS[tag]).join(", ")}` : ""}
                  </span>
                </span>
                <span aria-hidden className="text-[var(--muted)]">
                  ↗
                </span>
              </TrackedOutboundLink>
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  const chart = <MonthChart bars={monthBars} month={month} onSelect={switchMonth} large={isPage} />;

  if (isPage) {
    return (
      <>
        {hero}
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-x-14 lg:mt-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            {intro}
            <div className="mt-6 space-y-3 lg:hidden">
              {bestWeekCard}
              {actions}
            </div>
            {chart}
            {events}
            {venueList}
            {extras}
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-6 space-y-3">
              {bestWeekCard}
              {actions}
              <dl className="mt-6 space-y-3 border-t border-[var(--border)] pt-5 text-[14px]">
                <Glance label="Best for" value={destination.whoFor.join(", ")} />
                <Glance label="When to book" value={destination.whenToBook} />
                <Glance label="Vibe" value={destination.vibes.map((v) => VIBE_LABELS[v]).join(", ")} />
              </dl>
            </div>
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="px-4 sm:px-5">{hero}</div>
        <div className="px-5 pb-10 pt-5 sm:px-6">
          {intro}
          {bestWeekCard ? <div className="mt-6">{bestWeekCard}</div> : null}
          {chart}
          {events}
          {venueList}
          <Link
            href={`/destinations/${destination.slug}?month=${month}${yearQueryFor(month, year)}`}
            replace
            onClick={() => {
              trackEvent("preview_open_guide", { slug: destination.slug, month });
              onLeave?.();
            }}
            className="mt-8 inline-flex min-h-11 items-center text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-4 transition hover:text-[var(--signal)]"
          >
            See the full {destination.city} guide →
          </Link>
        </div>
      </div>
      <footer className="border-t border-[var(--border)] bg-[var(--background)] px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-5">
        {actions}
      </footer>
    </>
  );
}

/** Client shell for the city page: month changes update the view and the URL in place. */
export function CityPageView({
  slug,
  month,
  year,
  extras
}: {
  slug: string;
  month: MonthNumber;
  year: number;
  extras?: ReactNode;
}) {
  const [selection, setSelection] = useState({ month, year });
  return (
    <CityView
      slug={slug}
      month={selection.month}
      year={selection.year}
      variant="page"
      extras={extras}
      onMonthChange={(m) => {
        const y = upcomingYearForMonth(m);
        setSelection({ month: m, year: y });
        window.history.replaceState(window.history.state, "", `/destinations/${slug}?month=${m}${yearQueryFor(m, y)}`);
      }}
    />
  );
}

function Glance({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] font-medium text-[var(--muted)]">{label}</dt>
      <dd className="mt-0.5 leading-6 text-[var(--foreground)]/90">{value}</dd>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function MonthChart({
  bars,
  month,
  onSelect,
  large = false
}: {
  bars: Array<{ month: MonthNumber; score: number | null }>;
  month: MonthNumber;
  onSelect: (month: MonthNumber) => void;
  large?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = bars.find((bar) => bar.month === month);
  const activeTier = active?.score != null ? TIER_NAMES[tierFromScore(active.score)] : "";
  const hasUnknown = bars.some((bar) => bar.score == null);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = bars.length - 1;
    const keys: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowDown: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last
    };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const nextIndex = keys[event.key];
    refs.current[nextIndex]?.focus();
    onSelect(bars[nextIndex].month);
  };

  return (
    <section className={large ? "mt-12" : "mt-8"}>
      <div className="flex items-baseline justify-between gap-3">
        <h3
          className={
            large
              ? "text-[22px] font-semibold tracking-[-0.01em] text-[var(--foreground)] sm:text-[26px]"
              : "text-[18px] font-semibold tracking-[-0.01em] text-[var(--foreground)]"
          }
        >
          Best music months
        </h3>
        {active ? (
          <span className="shrink-0 text-[13px] text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">{getMonthLabel(active.month)}</span> ·{" "}
            {active.score != null ? `${active.score} ${activeTier}` : "none confirmed"}
          </span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-12 items-end gap-1" role="radiogroup" aria-label="Activity by month. Pick a month to see its events.">
        {bars.map((bar, index) => {
          const selected = bar.month === month;
          const unknown = bar.score == null;
          return (
            <button
              key={bar.month}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              aria-label={`${getMonthLabel(bar.month)}, ${bar.score == null ? "no confirmed line-ups yet" : `score ${bar.score}, ${TIER_NAMES[tierFromScore(bar.score)]}`}`}
              onClick={() => onSelect(bar.month)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className="group flex min-h-11 flex-col items-center gap-1.5 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]/60"
            >
              <span className={`flex w-full items-end ${large ? "h-14 sm:h-20" : "h-10 sm:h-14"}`}>
                <span
                  className={`w-full rounded-[5px] transition-colors ${
                    unknown
                      ? `border border-dashed ${selected ? "border-[var(--signal)]" : "border-[var(--foreground)]/50 group-hover:border-[var(--foreground)]/70"}`
                      : selected
                        ? "bg-[var(--signal)]"
                        : "bg-[var(--foreground)]/25 group-hover:bg-[var(--foreground)]/45"
                  }`}
                  style={{ height: `${bar.score == null ? 30 : Math.max(14, bar.score)}%` }}
                />
              </span>
              <span className={`text-[11px] font-medium ${selected ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}>
                {MONTHS[bar.month - 1].shortLabel.charAt(0)}
              </span>
            </button>
          );
        })}
      </div>
      {hasUnknown ? (
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--muted)]">
          <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-[3px] border border-dashed border-[var(--foreground)]/50" />
          Dashed: line-ups not announced yet, not necessarily quiet
        </p>
      ) : null}
    </section>
  );
}

function EventRow({
  event,
  today,
  top,
  venue,
  open,
  onToggle,
  destinationSlug
}: {
  event: Event;
  today: string;
  top: boolean;
  venue?: string;
  open: boolean;
  onToggle: () => void;
  destinationSlug: string;
}) {
  const start = new Date(`${event.startDate}T00:00:00Z`);
  const ongoing = event.startDate < today;
  const weekday = start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const artist = artistFromTitle(event.title, event.type);
  const until = event.endDate && event.endDate !== event.startDate ? shortDay(event.endDate) : null;
  const sounds = event.genres
    .map((g) => GENRE_LABELS[g])
    .filter((label) => label.toLowerCase() !== TYPE_SINGULAR[event.type].toLowerCase())
    .slice(0, 1)
    .join("");
  const ticketHref = event.ticketUrl ?? event.sourceUrl;
  const ticketLabel = event.ticketUrl ? "Tickets" : "Info";
  const detailsId = `event-details-${event.id}`;
  const venueShown = venue && !event.title.toLowerCase().includes(venue.toLowerCase()) ? venue : null;

  return (
    <li id={`event-${event.id}`} className="scroll-mt-16 border-b border-[var(--border)] last:border-b-0">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={detailsId}
          onClick={onToggle}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3.5 py-3 text-left"
        >
          <span className="w-10 shrink-0 text-center">
            {ongoing ? (
              <>
                <span className="block text-[11px] font-semibold text-[var(--signal)]">On</span>
                <span className="block text-[13px] font-semibold leading-6 text-[var(--foreground)]">now</span>
              </>
            ) : (
              <>
                <span className="block text-[11px] font-medium text-[var(--muted)]">{weekday}</span>
                <span className="block text-[19px] font-semibold leading-6 text-[var(--foreground)]">{start.getUTCDate()}</span>
              </>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block text-[15px] font-medium leading-snug text-[var(--foreground)] ${open ? "" : "line-clamp-2"}`}>
              {event.title}
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-[var(--muted)]">
              {top ? <span className="font-semibold text-[var(--signal)]">Top pick · </span> : null}
              {TYPE_SINGULAR[event.type]}
              {sounds ? ` · ${sounds}` : ""}
              {until ? ` · until ${until}` : ""}
              {event.confirmed === false ? " · dates TBC" : ""}
            </span>
          </span>
        </button>
        {!open && (event.ticketUrl || top) ? (
          <TrackedOutboundLink
            href={ticketHref}
            eventLabel={event.title}
            destinationSlug={destinationSlug}
            provider={event.ticketUrl ? "viagogo" : "raw"}
            target="_blank"
            rel="noreferrer"
            aria-label={top ? undefined : `${ticketLabel} for ${event.title}`}
            title={top ? undefined : ticketLabel}
            className={`inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-full text-[13px] font-semibold transition hover:bg-[var(--surface-2)] ${
              top ? "px-2.5 text-[var(--foreground)]" : "w-10 text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {top ? ticketLabel : null}
            <span aria-hidden>↗</span>
          </TrackedOutboundLink>
        ) : (
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={onToggle}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[18px] text-[var(--muted)] transition ${open ? "rotate-45" : ""}`}
          >
            +
          </button>
        )}
      </div>
      {open ? (
        <div id={detailsId} className="pb-4 pl-[3.375rem]">
          {venueShown ? <p className="text-[13px] font-medium text-[var(--foreground)]">{venueShown}</p> : null}
          <p className={`text-[14px] leading-6 text-[var(--muted)] ${venueShown ? "mt-1" : ""}`}>{event.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TrackedOutboundLink
              href={ticketHref}
              eventLabel={event.title}
              destinationSlug={destinationSlug}
              provider={event.ticketUrl ? "viagogo" : "raw"}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--foreground)] px-4 text-[13px] font-semibold text-[var(--background)] transition hover:opacity-90"
            >
              {event.ticketUrl ? "Get tickets" : "Official page"}
              <span aria-hidden>↗</span>
            </TrackedOutboundLink>
            {artist ? <EventAudio artist={artist} /> : null}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function BookButton({
  label,
  partner,
  href,
  provider,
  destinationSlug,
  primary = false
}: {
  label: string;
  partner: string;
  href: string;
  provider: "booking" | "skyscanner" | "gyg";
  destinationSlug: string;
  primary?: boolean;
}) {
  return (
    <TrackedOutboundLink
      href={href}
      provider={provider}
      destinationSlug={destinationSlug}
      eventLabel={`preview-${provider}`}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label} on ${partner}`}
      className={`inline-flex h-11 items-center justify-center gap-1 rounded-full px-2 text-[14px] font-semibold transition ${
        primary
          ? "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90"
          : "bg-[var(--background)] text-[var(--foreground)] ring-1 ring-inset ring-[var(--border-strong)] hover:ring-[var(--foreground)]"
      }`}
    >
      <span className="truncate">{label}</span>
      <span aria-hidden className="opacity-70 max-[420px]:hidden">
        ↗
      </span>
    </TrackedOutboundLink>
  );
}

function TypeChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-10 shrink-0 rounded-full border px-4 text-[14px] font-medium transition ${
        active
          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
          : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--foreground)]"
      }`}
    >
      {children}
    </button>
  );
}

type Week = { key: string; label: string; events: Event[] };

function groupByWeek(events: Event[], today: string): Week[] {
  const weeks: Week[] = [];
  for (const event of events) {
    const anchor = event.startDate < today ? today : event.startDate;
    const key = mondayOf(anchor);
    const last = weeks[weeks.length - 1];
    if (last && last.key === key) last.events.push(event);
    else weeks.push({ key, label: weekLabel(key, today), events: [event] });
  }
  for (const week of weeks) {
    week.events.sort((a, b) => Number(a.startDate < today) - Number(b.startDate < today));
  }
  return weeks;
}

/**
 * The densest few days of the month: the window of WINDOW_DAYS that packs the most
 * event importance, trimmed to the first and last event start inside it.
 */
function findBestWeek(events: Event[], today: string) {
  const dated = events.filter((event) => event.startDate >= today);
  if (dated.length === 0) return null;
  let best: { from: string; to: string; count: number; lead: Event; weight: number; events: Event[] } | null = null;
  for (const anchor of dated) {
    const windowEnd = addDays(anchor.startDate, WINDOW_DAYS - 1);
    const inside = dated.filter((event) => event.startDate >= anchor.startDate && event.startDate <= windowEnd);
    const weight = inside.reduce((sum, event) => sum + event.importanceScore, 0);
    if (!best || weight > best.weight) {
      const lead = [...inside].sort((a, b) => b.importanceScore - a.importanceScore)[0];
      const lastStart = inside.reduce((max, event) => (event.startDate > max ? event.startDate : max), anchor.startDate);
      const leadEnd = lead.endDate && lead.endDate > lastStart ? lead.endDate : lastStart;
      best = {
        from: anchor.startDate,
        to: leadEnd < windowEnd ? leadEnd : windowEnd,
        count: inside.length,
        lead,
        weight,
        events: inside
      };
    }
  }
  if (!best) return null;
  const earliest = addDays(today, 2);
  const checkin = best.from < earliest ? earliest : best.from;
  const checkout = addDays(best.to > checkin ? best.to : checkin, 1);
  return { ...best, checkin, checkout: checkout > addDays(checkin, 1) ? checkout : addDays(checkin, 2) };
}

function weekBreakdown(events: Event[]) {
  const byType = new Map<EventType, number>();
  const byGenre = new Map<string, number>();
  for (const event of events) {
    byType.set(event.type, (byType.get(event.type) ?? 0) + 1);
    for (const genre of event.genres) byGenre.set(genre, (byGenre.get(genre) ?? 0) + 1);
  }
  const types = [...byType.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => `${count} ${(count === 1 ? TYPE_SINGULAR[type] : TYPE_LABELS[type]).toLowerCase()}`);
  const sounds = [...byGenre.entries()]
    .filter(([genre]) => genre !== "festival")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([genre]) => GENRE_LABELS[genre as keyof typeof GENRE_LABELS].toLowerCase());
  return [types.join(" · "), sounds.length ? `mostly ${sounds.join(" & ")}` : ""].filter(Boolean).join(" — ");
}

function fallbackStay(month: MonthNumber, year: number, today: string) {
  const range = resolveDateRange({ month, year });
  const checkin = range.checkin ?? addDays(today, 2);
  return { checkin, checkout: range.checkout ?? addDays(checkin, 3) };
}

function findNextBusyMonth(slug: string, month: MonthNumber, today: string) {
  for (let i = 1; i <= 11; i++) {
    const m = (((month - 1 + i) % 12) + 1) as MonthNumber;
    const count = getEventsForDestinationInMonth(slug, m, upcomingYearForMonth(m)).filter(
      (event) => (event.endDate ?? event.startDate) >= today
    ).length;
    if (count > 0) return { month: m, count };
  }
  return null;
}

function addDays(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function mondayOf(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  return addDays(iso, -((date.getUTCDay() + 6) % 7));
}

function weekLabel(mondayIso: string, today: string) {
  const weeksAway = Math.round((Date.parse(mondayIso) - Date.parse(mondayOf(today))) / (7 * DAY_MS));
  const range = `${shortDay(mondayIso)} – ${shortDay(addDays(mondayIso, 6))}`;
  if (weeksAway === 0) return `This week · ${range}`;
  if (weeksAway === 1) return `Next week · ${range}`;
  return range;
}

function rangeLabel(from: string, to: string) {
  if (from === to) return shortDay(from);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return sameMonth ? `${shortDay(from)}–${Number(to.slice(8, 10))}` : `${shortDay(from)} – ${shortDay(to)}`;
}

function shortDay(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
