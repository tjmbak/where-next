import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { EventAudio } from "@/components/audio/EventAudio";
import { GuideVisitRecorder } from "@/components/destinations/GuideVisitRecorder";
import { HeroGallery } from "@/components/destinations/HeroGallery";
import { WatchButton } from "@/components/watch/WatchButton";
import { artistFromTitle } from "@/lib/artist-from-title";
import { hasVariant, heroVariantUrl, type HeroVariant } from "@/lib/hero-images";
import { groupEventsByWeekend } from "@/lib/weekends";
import { PopularTrips } from "@/components/destinations/PopularTrips";
import { StayAndTravel } from "@/components/destinations/StayAndTravel";
import { loadPopularItinerariesForDestination } from "@/lib/itineraries/popular";
import {
  DESTINATIONS,
  getDestinationBySlug,
  getEventsForDestination,
  getEventsForDestinationInMonth,
  getLastEditedForDestination,
  getScoreForDestinationMonth,
  getScoresForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import {
  BUDGET_LABELS,
  EDITION_YEAR,
  GENRE_LABELS,
  getCurrentMonth,
  getMonthLabel,
  isPastMonth,
  MONTHS,
  SUPPORTED_YEARS,
  upcomingYearForMonth,
  VIBE_LABELS,
  yearQueryFor
} from "@/data/taxonomy";
import { ogImageUrl } from "@/lib/og";
import {
  breadcrumbJsonLd,
  destinationToJsonLd,
  eventToJsonLd,
  jsonLdScript,
  siteUrl
} from "@/lib/structured-data";
import { formatUsdRange } from "@/lib/utils";
import type { MonthNumber } from "@/types/content";
import { SiteHeader } from "@/components/nav/SiteHeader";

type DestinationPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
};

export function generateStaticParams() {
  return DESTINATIONS.map((destination) => ({ slug: destination.slug }));
}

// ISR: refresh popular trips + counts every 10 minutes
export const revalidate = 600;

export async function generateMetadata({ params }: DestinationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);

  if (!destination) return {};

  const path = `/destinations/${destination.slug}`;
  const subtitle = destination.tagline.length > 120
    ? `${destination.tagline.slice(0, 117)}…`
    : destination.tagline;

  return {
    title: `${destination.city} Music Travel Guide`,
    description: `${destination.city}, ${destination.country}: ${destination.tagline}`,
    alternates: { canonical: path },
    openGraph: {
      title: `${destination.city} · Music Travel Guide`,
      description: destination.tagline,
      type: "article",
      url: `${siteUrl()}${path}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: `${destination.region} · ${destination.country}`,
            title: destination.city,
            subtitle,
            stat: `${destination.activeMonths.length} active months`
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps) {
  const { slug } = await params;
  const { month: monthParam, year: yearParam } = await searchParams;
  const destination = getDestinationBySlug(slug);

  if (!destination) notFound();

  const monthSelection = parseMonthSelection(monthParam);
  const isYearView = monthSelection === "year";
  const selectedMonth: MonthNumber =
    monthSelection && monthSelection !== "year"
      ? monthSelection
      : hasUpcomingThisMonth(destination.slug)
        ? getCurrentMonth()
        : nextSeasonMonth(destination.peakMonths.length > 0 ? destination.peakMonths : destination.activeMonths);
  const selectedYear = parseYearSelection(yearParam, selectedMonth);
  const isPastView = !isYearView && isPastMonth(selectedMonth, selectedYear);
  const monthYearQuery = (m: number) =>
    yearQueryFor(m, isPastMonth(m, selectedYear) ? upcomingYearForMonth(m) : selectedYear);
  const score =
    getScoreForDestinationMonth(destination.slug, selectedMonth) ??
    getScoresForDestination(destination.slug)[0];
  // In the all-year view the hero stat should reflect the year's best month,
  // not whichever month happened to be the fallback selection.
  const yearScores = getScoresForDestination(destination.slug);
  const heroScore =
    isYearView && yearScores.length > 0
      ? yearScores.reduce((best, current) => (current.overallScore > best.overallScore ? current : best))
      : score;
  const eventsThisMonth = getEventsForDestinationInMonth(destination.slug, selectedMonth, selectedYear);
  const allEvents = getEventsForDestination(destination.slug, selectedYear);
  const events = (isYearView
    ? allEvents
    : eventsThisMonth.length > 0
      ? eventsThisMonth
      : allEvents
  )
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const estimateCount = events.filter((event) => event.confirmed === false).length;
  const isShowingFallbackEvents =
    !isYearView && eventsThisMonth.length === 0 && allEvents.length > 0;
  const venues = getVenuesForDestination(destination.slug);
  const popularItineraries = await loadPopularItinerariesForDestination(destination.slug, 3);

  // Editorial hierarchy: the three highest-signal moments this month get
  // marquee treatment; the flat timeline stays below as the full calendar.
  const today = new Date().toISOString().slice(0, 10);
  const hasEnded = (event: { startDate: string; endDate?: string }) => (event.endDate ?? event.startDate) < today;
  const upcomingThisMonth = eventsThisMonth.filter((event) => !hasEnded(event));
  const marqueeEvents =
    !isYearView && upcomingThisMonth.length >= 4
      ? [...upcomingThisMonth].sort((a, b) => b.importanceScore - a.importanceScore).slice(0, 3)
      : [];
  const marqueeVariants: HeroVariant[] = ["peak", "detail", "shoulder"];
  const weekendGroups =
    !isYearView && eventsThisMonth.length > 0
      ? groupEventsByWeekend(eventsThisMonth, selectedMonth, selectedYear)
      : [];
  const scoreDriver =
    !isYearView && upcomingThisMonth.length > 0
      ? [...upcomingThisMonth].sort((a, b) => b.importanceScore - a.importanceScore)[0]
      : null;

  const issueNumber = destination.slug.length.toString().padStart(2, "0");
  const monthLabelLower = getMonthLabel(selectedMonth).toLowerCase();
  const periodLabel = isYearView ? "year-round" : monthLabelLower;
  const periodLabelWithYear = isYearView ? `all year ${selectedYear}` : `${monthLabelLower} ${selectedYear}`;
  const whyTitle = isYearView ? "Year overview" : `Why ${monthLabelLower}`;
  const eventsTitle = isYearView ? "Events all year" : `Events in ${monthLabelLower}`;
  const introWhy = score?.whyNow?.[0] ?? destination.summary;
  const remainingWhy = (score?.whyNow ?? []).slice(1).filter((line) => !/^best fit:/i.test(line));
  const normalizeLine = (line: string) => line.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const pullQuote =
    score?.editorialSummary &&
    ![introWhy, ...remainingWhy].some((line) => normalizeLine(line) === normalizeLine(score.editorialSummary))
      ? score.editorialSummary
      : null;
  const lastEditedRaw = getLastEditedForDestination(destination.slug);
  const lastEditedLabel = formatEditedDate(lastEditedRaw);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: destination.city, href: `/destinations/${destination.slug}` }
  ]);
  const destinationLd = destinationToJsonLd(destination);

  return (
    <main className="min-h-screen w-full">
      <GuideVisitRecorder
        slug={destination.slug}
        month={selectedMonth}
        year={selectedYear}
        eventCount={eventsThisMonth.length}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(destinationLd) }}
      />
      {events.slice(0, 12).map((event) => {
        const venue = event.venueId ? venues.find((v) => v.id === event.venueId) : undefined;
        return (
          <script
            key={event.id}
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: jsonLdScript(eventToJsonLd(event, destination, venue)) }}
          />
        );
      })}
      <SiteHeader tone="overlay" />

      {/* CINEMATIC HERO */}
      <section className="relative h-[88vh] min-h-[640px] w-full overflow-hidden">
        <HeroGallery
          key={isYearView ? "year" : selectedMonth}
          destination={destination}
          month={isYearView ? undefined : selectedMonth}
        />
        <div className="pointer-events-none absolute inset-0 bg-[#08080a]/40 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1180px] px-5 pb-10 sm:px-10 sm:pb-14">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/70 sm:gap-x-3 sm:text-[11px] sm:tracking-[0.24em]">
            <span>issue {issueNumber}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-white/40" />
            <span>{destination.country}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-white/40" />
            <span>{destination.region}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-white/40" />
            <span>{periodLabelWithYear}</span>
          </div>
          <h1 className="mt-5 break-words text-[clamp(2.75rem,11vw,10rem)] font-medium leading-[0.95] tracking-[-0.04em] text-white sm:mt-6 sm:leading-[0.92]">
            {destination.city}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/80 sm:mt-6 sm:text-lg sm:leading-8 md:text-xl md:leading-9">
            {destination.tagline}
          </p>

          <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-5 sm:mt-9 sm:gap-x-10 sm:gap-y-6">
            <Stat
              label={isYearView ? "peak score" : "activity"}
              value={`${heroScore?.overallScore ?? 0}`}
              suffix="/100"
            />
            <Stat label="budget" value={`${BUDGET_LABELS[destination.budget]}`} suffix={formatUsdRange(destination.averageDailySpendUsd)} />
            <Stat label="confidence" value={(heroScore?.confidence ?? "medium").toUpperCase()} />
            <Stat label="months" value={`${destination.activeMonths.length}`} suffix="active" />
          </div>

          {scoreDriver ? (
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
              score driven by{" "}
              <span className="text-white/85">{scoreDriver.title}</span>
              {upcomingThisMonth.length > 1 ? (
                <span> + {upcomingThisMonth.length - 1} more this month</span>
              ) : null}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={`/destinations/${destination.slug}/plan`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition hover:bg-[var(--signal)] hover:text-white"
            >
              Build an itinerary
              <span aria-hidden>→</span>
            </Link>
            {isYearView || eventsThisMonth.length > 0 ? (
              <WatchButton
                slug={destination.slug}
                month={selectedMonth}
                year={selectedYear}
                variant="pill"
                tone="dark"
              />
            ) : null}
            <Link
              href="/methodology"
              className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55 transition hover:text-white"
            >
              how scores work
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 right-6 z-10 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-white/50 md:block">
          scroll ↓
        </div>
      </section>

      {/* ARTICLE BODY */}
      <section className="mx-auto w-full max-w-[1180px] px-5 pb-20 pt-14 sm:px-10 sm:pb-24 sm:pt-20">
        <div className="mb-14 flex flex-col gap-2 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-baseline sm:justify-between">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="text-[var(--foreground)]">where next</span> / {destination.city.toLowerCase()} / {periodLabel}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[var(--signal)] shadow-[0_0_6px_var(--signal)]"
              />
              {lastEditedLabel ? `edited ${lastEditedLabel}` : `edition ${EDITION_YEAR}`} · curated
            </span>
          </p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* MAIN COLUMN */}
          <article className="space-y-16">
            <Section eyebrow="01" title={whyTitle}>
              <p className="wn-dropcap text-[18px] leading-9 text-[var(--foreground)]">{introWhy}</p>
              {remainingWhy.length > 0 ? (
                <div className="mt-7 grid gap-4">
                  {remainingWhy.map((line) => (
                    <p key={line} className="text-[16px] leading-8 text-[var(--foreground)]/85">
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}
            </Section>

            {pullQuote ? <PullQuote>{pullQuote}</PullQuote> : null}

            <Section eyebrow="02" id="events" title={eventsTitle}>
              {isPastView && SUPPORTED_YEARS.includes(selectedYear + 1) ? (
                <p className="mb-7 rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-3 text-[13px] leading-6 text-[var(--muted)]">
                  <span className="font-medium text-[var(--foreground)]">{getMonthLabel(selectedMonth)} {selectedYear} has passed.</span>{" "}
                  <Link
                    href={`/destinations/${destination.slug}?month=${selectedMonth}${yearQueryFor(selectedMonth, selectedYear + 1)}#events`}
                    className="text-[var(--foreground)] underline decoration-[var(--signal)] underline-offset-4 transition hover:text-[var(--signal)]"
                  >
                    See {monthLabelLower} {selectedYear + 1} →
                  </Link>
                </p>
              ) : estimateCount > 0 ? (
                <p className="mb-7 rounded-md border border-[var(--border-strong)] bg-[var(--surface-2)] px-4 py-3 text-[13px] leading-6 text-[var(--muted)]">
                  <span className="font-medium text-[var(--foreground)]">
                    {estimateCount === events.length ? "Forward look." : `${estimateCount} of ${events.length} still expected.`}
                  </span>{" "}
                  Events marked &ldquo;expected&rdquo; are recurring fixtures {destination.city} runs every year — exact {selectedYear} dates harden as organizers announce.
                </p>
              ) : null}
              {!isYearView && eventsThisMonth.length === 0 ? (
                <div className="mb-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-[13px] leading-6 text-[var(--muted)]">
                  <p>
                    <span className="font-medium text-[var(--foreground)]">
                      No {monthLabelLower} {selectedYear} dates confirmed yet.
                    </span>{" "}
                    {selectedYear > EDITION_YEAR
                      ? `Organizers haven't announced ${destination.city}'s ${selectedYear} calendar — we only list events with a confirmed source.`
                      : `Nothing on ${destination.city}'s calendar for ${monthLabelLower} yet.`}
                    {isShowingFallbackEvents ? " Here's what is confirmed for the rest of the year." : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <WatchButton slug={destination.slug} month={selectedMonth} year={selectedYear} variant="pill" />
                    {selectedYear > EDITION_YEAR ? (
                      <Link
                        href={`/destinations/${destination.slug}?month=${selectedMonth}&year=${selectedYear - 1}#events`}
                        className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                      >
                        see {monthLabelLower} {selectedYear - 1} →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {marqueeEvents.length > 0 ? (
                <div className="mb-12">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--signal)]">
                    if you only book around three things
                  </p>
                  <div className="mt-4 grid items-start gap-4 sm:grid-cols-3">
                    {marqueeEvents.map((event, index) => {
                      const preferred = marqueeVariants[index] ?? "peak";
                      const variant = hasVariant(destination.heroImage, preferred) ? preferred : "peak";
                      return (
                        <div
                          key={event.id}
                          className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(28,22,18,0.04)] transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(28,22,18,0.28)]"
                        >
                          <a href={`#event-${event.id}`} className="block">
                            <div className="relative aspect-[16/7] overflow-hidden sm:aspect-[16/10]">
                              <Image
                                src={heroVariantUrl(destination.heroImage, variant)}
                                alt=""
                                fill
                                sizes="(max-width: 640px) 100vw, 320px"
                                className="object-cover transition duration-500 group-hover:scale-105"
                              />
                              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
                              <span className="absolute left-3 top-3 inline-flex items-center rounded-full border border-white/20 bg-black/55 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                                {String(index + 1).padStart(2, "0")} · {event.type.replaceAll("-", " ")}
                                {event.confirmed === false ? " · expected" : ""}
                              </span>
                              <div className="absolute inset-x-3 bottom-2.5">
                                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/70">
                                  {formatEventDate(event.startDate, event.endDate)}
                                </p>
                                <p className="line-clamp-2 text-[14px] font-medium leading-5 text-white">
                                  {event.title}
                                </p>
                              </div>
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {weekendGroups.length > 0 ? (
                <div className="mb-10">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted)]">
                    weekend by weekend
                  </p>
                  <div className="wn-swipe -mx-5 mt-3 flex snap-x gap-2.5 overflow-x-auto scroll-px-5 px-5 sm:mx-0 sm:px-0">
                    {(() => {
                      const isPastWeekend = (fridayIso: string) => {
                        const sunday = new Date(`${fridayIso}T00:00:00Z`);
                        sunday.setUTCDate(sunday.getUTCDate() + 2);
                        return sunday.toISOString().slice(0, 10) < today;
                      };
                      const ahead = weekendGroups.filter((weekend) => !isPastWeekend(weekend.fridayIso));
                      return ahead.length > 0 ? ahead : weekendGroups;
                    })().map((weekend) => {
                      const headline = weekend.events[0] ?? null;
                      const sunday = new Date(`${weekend.fridayIso}T00:00:00Z`);
                      sunday.setUTCDate(sunday.getUTCDate() + 2);
                      const weekendPast = sunday.toISOString().slice(0, 10) < today;
                      return headline ? (
                        <a
                          key={weekend.fridayIso}
                          href={`#event-${headline.id}`}
                          className={`min-w-[190px] shrink-0 snap-start rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 transition-colors hover:border-[var(--border-strong)] ${
                            weekendPast ? "opacity-50" : ""
                          }`}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--signal)]">
                            {weekend.label}
                          </p>
                          <p className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-5 text-[var(--foreground)]">
                            {headline.title}
                          </p>
                          {weekend.events.length > 1 ? (
                            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted)]">
                              +{weekend.events.length - 1} more
                            </p>
                          ) : null}
                        </a>
                      ) : (
                        <div
                          key={weekend.fridayIso}
                          className={`min-w-[190px] shrink-0 snap-start rounded-xl border border-dashed border-[var(--border)] bg-transparent px-3.5 py-3 ${
                            weekendPast ? "opacity-50" : ""
                          }`}
                        >
                          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                            {weekend.label}
                          </p>
                          <p className="mt-1.5 text-[13px] leading-5 text-[var(--muted-2)]">
                            quiet weekend
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {(() => {
                const upcomingFirst = events.filter((event) => !hasEnded(event));
                const endedEvents = events.filter((event) => hasEnded(event));
                const renderItem = (event: (typeof events)[number]) => (
                  <li
                    key={event.id}
                    id={`event-${event.id}`}
                    className={`wn-timeline-item scroll-mt-24 ${hasEnded(event) ? "opacity-55" : ""}`}
                  >
                    <span className="wn-timeline-dot" aria-hidden />
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                        {formatEventDate(event.startDate, event.endDate)}
                      </span>
                      {hasEnded(event) ? (
                        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">
                          ended
                        </span>
                      ) : null}
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                        {event.type.replaceAll("-", " ")}
                      </span>
                      {event.confirmed === false ? (
                        <span className="rounded-full border border-dashed border-[var(--border-strong)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">
                          expected
                        </span>
                      ) : null}
                      {(() => {
                        const span = formatRunLength(event.startDate, event.endDate, event.type);
                        return span ? (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">
                            {span}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <h3 className="mt-2 text-[18px] font-medium leading-snug text-[var(--foreground)] sm:text-[22px] sm:leading-tight">
                      {event.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--muted)] sm:mt-3 sm:text-[15px] sm:leading-7">{event.summary}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                      <TrackedOutboundLink
                        href={event.ticketUrl ?? event.sourceUrl}
                        eventLabel={event.title}
                        destinationSlug={destination.slug}
                        provider={event.ticketUrl ? "viagogo" : "raw"}
                        preview={{ kind: "event", eventId: event.id }}
                        className="inline-flex min-h-11 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:text-[var(--signal)] sm:min-h-0"
                      >
                        official source
                        <span aria-hidden>↗</span>
                      </TrackedOutboundLink>
                      {(() => {
                        const artist = artistFromTitle(event.title, event.type);
                        return artist ? <EventAudio artist={artist} /> : null;
                      })()}
                    </div>
                  </li>
                );
                return (
                  <>
                    {upcomingFirst.length > 0 ? <ol className="wn-timeline">{upcomingFirst.map(renderItem)}</ol> : null}
                    {endedEvents.length > 0 ? (
                      <details className="group mt-6 rounded-xl border border-[var(--border)]" open={upcomingFirst.length === 0}>
                        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]">
                          <span>
                            {endedEvents.length} already happened this {isYearView ? "year" : "month"}
                          </span>
                          <span aria-hidden className="transition group-open:rotate-45">+</span>
                        </summary>
                        <ol className="wn-timeline px-5 pb-2">{endedEvents.map(renderItem)}</ol>
                      </details>
                    ) : null}
                  </>
                );
              })()}
            </Section>

            {popularItineraries.length > 0 ? (
              <PopularTrips
                itineraries={popularItineraries}
                destinationSlug={destination.slug}
                destinationCity={destination.city}
              />
            ) : null}

            <StayAndTravel destination={destination} month={isYearView ? undefined : selectedMonth} year={selectedYear} />

            <Section eyebrow="04" title="Venues & scenes">
              <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--border)] sm:grid-cols-2">
                {venues.map((venue) => (
                  <TrackedOutboundLink
                    key={venue.id}
                    href={venue.officialUrl}
                    eventLabel={venue.name}
                    destinationSlug={destination.slug}
                    preview={{ kind: "venue", venueId: venue.id }}
                    className="group flex flex-col gap-2 bg-[var(--background)] p-6 transition hover:bg-[var(--surface)]"
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                      {venue.type.replace("-", " ")}
                    </span>
                    <h3 className="text-[19px] font-medium text-[var(--foreground)]">{venue.name}</h3>
                    <p className="text-[13px] leading-6 text-[var(--muted)]">
                      {venue.sceneTags.map((tag) => VIBE_LABELS[tag]).join(" · ")}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)]/70 transition group-hover:text-[var(--signal)]">
                      visit
                      <span aria-hidden>↗</span>
                    </span>
                  </TrackedOutboundLink>
                ))}
              </div>
            </Section>

            <Section eyebrow="05" title="The full picture">
              <p className="text-[16px] leading-8 text-[var(--foreground)]/85">{destination.summary}</p>
              <p className="mt-5 text-[15px] leading-8 text-[var(--muted)]">{destination.travelNotes}</p>
            </Section>
          </article>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <div className="space-y-12 pt-2">
              <SidePanel title="Snapshot" index="A">
                <dl className="grid grid-cols-1 gap-4 text-sm">
                  <Info label="best for" value={destination.whoFor.join(", ")} />
                  <Info label="when to book" value={destination.whenToBook} />
                  <Info label="genre signature" value={destination.genres.map((g) => GENRE_LABELS[g]).join(", ")} />
                  <Info label="vibe" value={destination.vibes.map((v) => VIBE_LABELS[v]).join(", ")} />
                </dl>
              </SidePanel>

              <SidePanel title="Active months" index="B">
                {SUPPORTED_YEARS.length > 1 ? (
                  <div className="mb-3 inline-flex w-full items-center overflow-hidden rounded-md border border-[var(--border)]">
                    {SUPPORTED_YEARS.map((y) => {
                      const monthQuery = isYearView ? "month=year" : `month=${selectedMonth}`;
                      const yq = `&year=${y}`;
                      const active = y === selectedYear;
                      return (
                        <Link
                          key={y}
                          href={`/destinations/${destination.slug}?${monthQuery}${yq}#events`}
                          aria-current={active ? "true" : undefined}
                          style={active ? { color: "#f7f0e1", backgroundColor: "#2a1c12" } : undefined}
                          className={`flex flex-1 items-center justify-center px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition ${
                            active ? "font-bold" : "text-[var(--muted-2)] hover:text-[var(--foreground)]/85"
                          }`}
                        >
                          {y}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
                <Link
                  href={`/destinations/${destination.slug}?month=year&year=${selectedYear}#events`}
                  aria-current={isYearView ? "true" : undefined}
                  style={
                    isYearView
                      ? { color: "#f7f0e1", backgroundColor: "#2a1c12", borderColor: "#2a1c12" }
                      : undefined
                  }
                  className={`mb-2 flex min-h-11 items-center justify-center rounded-md border px-3 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.18em] transition sm:min-h-0 sm:py-2 ${
                    isYearView
                      ? "font-bold"
                      : "border-[var(--border)] text-[var(--muted-2)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]/85"
                  }`}
                >
                  {isYearView ? "all year · viewing" : "view all year"}
                </Link>
                <div className="grid grid-cols-4 gap-1.5">
                  {MONTHS.map((month) => {
                    const isActive = destination.activeMonths.includes(month.value);
                    const isPeak = destination.peakMonths.includes(month.value);
                    const isSelected = !isYearView && selectedMonth === month.value;
                    return (
                      <Link
                        key={month.value}
                        href={`/destinations/${destination.slug}?month=${month.value}${monthYearQuery(month.value)}#events`}
                        aria-current={isSelected ? "true" : undefined}
                        style={
                          isSelected
                            ? { color: "#f7f0e1", backgroundColor: "#2a1c12", borderColor: "#2a1c12" }
                            : undefined
                        }
                        className={`flex min-h-11 items-center justify-center rounded-md border px-2 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.12em] transition sm:min-h-0 sm:py-2 ${
                          isSelected
                            ? "font-bold"
                            : isPeak
                              ? "border-[var(--signal)]/40 bg-[var(--signal)]/10 text-[var(--signal)] hover:border-[var(--signal)]/70"
                              : isActive
                                ? "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--foreground)]/60"
                                : "border-[var(--border)] text-[var(--muted-2)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]/70"
                        }`}
                      >
                        {month.shortLabel}
                      </Link>
                    );
                  })}
                </div>
              </SidePanel>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-medium text-white md:text-3xl">
        {value}
        {suffix ? <span className="ml-1.5 text-base text-white/55">{suffix}</span> : null}
      </p>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  id,
  children
}: {
  eyebrow: string;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-20" : undefined}>
      <div className="mb-7 flex items-center gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-l-2 border-[var(--signal)] py-3 pl-7 text-[26px] font-medium leading-[1.3] tracking-[-0.01em] text-[var(--foreground)] md:text-[32px]">
      &ldquo;{children}&rdquo;
    </blockquote>
  );
}

function SidePanel({ title, index, children }: { title: string; index: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3 border-b border-[var(--border)] pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{index}</span>
        <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</dt>
      <dd className="text-sm leading-6 text-[var(--foreground)]/95">{value}</dd>
    </div>
  );
}

function parseMonthSelection(value?: string): MonthNumber | "year" | undefined {
  if (value === "year") return "year";
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) return parsed as MonthNumber;
  return undefined;
}

function parseYearSelection(value: string | undefined, month: MonthNumber): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && SUPPORTED_YEARS.includes(parsed)) return parsed;
  return upcomingYearForMonth(month);
}

function hasUpcomingThisMonth(slug: string): boolean {
  const month = getCurrentMonth();
  const today = new Date().toISOString().slice(0, 10);
  return getEventsForDestinationInMonth(slug, month, upcomingYearForMonth(month)).some(
    (event) => (event.endDate ?? event.startDate) >= today
  );
}

/** The season month that comes around soonest from today (this month counts). */
function nextSeasonMonth(months: MonthNumber[]): MonthNumber {
  if (months.length === 0) return getCurrentMonth();
  const current = getCurrentMonth();
  return [...months].sort((a, b) => ((a - current + 12) % 12) - ((b - current + 12) % 12))[0];
}

function formatEventDate(start: string, end?: string) {
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return "tba";
  // ISO date strings (YYYY-MM-DD) parse as UTC midnight; we render in UTC to
  // avoid timezone-shift drift (e.g. "2026-07-03" displayed as "jul 2" for a
  // viewer in PDT).
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  };
  const startLabel = startDate.toLocaleDateString("en-US", opts).toLowerCase();
  if (!end) return startLabel;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startLabel;
  const endLabel = endDate.toLocaleDateString("en-US", opts).toLowerCase();
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} → ${endLabel}`;
}

function formatRunLength(start: string, end: string | undefined, type: string): string | null {
  if (!end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  if (days <= 1) return null;
  if (type === "residency" && days >= 14) {
    const weeks = Math.round(days / 7);
    return `${weeks}-week run`;
  }
  if (days >= 7 && days < 14) return `${days} days`;
  if (days >= 2 && days < 7) return `${days} days`;
  if (days >= 14) {
    const weeks = Math.round(days / 7);
    return `recurring · ${weeks} weeks`;
  }
  return null;
}

function formatEditedDate(raw: string | null): string | null {
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    })
    .toLowerCase();
}
