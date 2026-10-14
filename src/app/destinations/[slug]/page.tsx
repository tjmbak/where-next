import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { EventList } from "@/components/destinations/EventList";
import { GuideVisitRecorder } from "@/components/destinations/GuideVisitRecorder";
import { HeroGallery } from "@/components/destinations/HeroGallery";
import { WatchButton } from "@/components/watch/WatchButton";
import { hasVariant, heroVariantUrl, type HeroVariant } from "@/lib/hero-images";
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
  const scoreDriver =
    !isYearView && upcomingThisMonth.length > 0
      ? [...upcomingThisMonth].sort((a, b) => b.importanceScore - a.importanceScore)[0]
      : null;

  const monthLabel = getMonthLabel(selectedMonth);
  const monthLabelLower = monthLabel.toLowerCase();
  const periodLabelWithYear = isYearView ? `All year ${selectedYear}` : `${monthLabel} ${selectedYear}`;
  const whyTitle = isYearView ? "Year overview" : `Why ${monthLabel}`;
  const eventsTitle = isYearView ? "Events all year" : `Events in ${monthLabel}`;
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
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/80" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1180px] px-5 pb-10 sm:px-10 sm:pb-14">
          <p className="text-[14px] font-medium text-white/80 sm:text-[15px]">
            {destination.country} · {periodLabelWithYear}
          </p>
          <h1 className="mt-5 break-words text-[clamp(2.75rem,11vw,10rem)] font-medium leading-[0.95] tracking-[-0.04em] text-white sm:mt-6 sm:leading-[0.92]">
            {destination.city}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-white/80 sm:mt-6 sm:text-lg sm:leading-8 md:text-xl md:leading-9">
            {destination.tagline}
          </p>

          <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-5 sm:mt-9 sm:gap-x-10 sm:gap-y-6">
            <Stat
              label={isYearView ? "Peak score" : "Activity score"}
              value={`${heroScore?.overallScore ?? 0}`}
              suffix="/100"
            />
            <Stat label="Budget" value={`${BUDGET_LABELS[destination.budget]}`} suffix={formatUsdRange(destination.averageDailySpendUsd)} />
          </div>

          {scoreDriver ? (
            <p className="mt-4 text-[13px] text-white/65">
              Score driven by{" "}
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
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-white/70 underline-offset-4 transition hover:text-white hover:underline"
            >
              How scores work
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ARTICLE BODY */}
      <section className="mx-auto w-full max-w-[1180px] px-5 pb-20 pt-14 sm:px-10 sm:pb-24 sm:pt-20">
        <div className="mb-12 flex flex-wrap items-baseline justify-between gap-2 text-[14px] text-[var(--muted)]">
          <nav aria-label="Breadcrumb">
            <Link href="/" className="font-medium transition hover:text-[var(--foreground)]">
              Explore
            </Link>
            <span aria-hidden> / </span>
            <span className="text-[var(--foreground)]">{destination.city}</span>
          </nav>
          <p>{lastEditedLabel ? `Updated ${lastEditedLabel}` : `${EDITION_YEAR} edition`}</p>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          {/* MAIN COLUMN */}
          <article className="space-y-16">
            <Section title={whyTitle}>
              <p className="text-[18px] leading-9 text-[var(--foreground)]">{introWhy}</p>
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

            <Section id="events" title={eventsTitle}>
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
                        className="text-[14px] font-medium text-[var(--foreground)] underline-offset-4 transition hover:text-[var(--signal)] hover:underline"
                      >
                        See {monthLabelLower} {selectedYear - 1} →
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {marqueeEvents.length > 0 ? (
                <div className="mb-12">
                  <h3 className="text-[17px] font-semibold text-[var(--foreground)]">Don&apos;t miss</h3>
                  <div className="mt-4 grid items-start gap-4 sm:grid-cols-3">
                    {marqueeEvents.map((event, index) => {
                      const preferred = marqueeVariants[index] ?? "peak";
                      const variant = hasVariant(destination.heroImage, preferred) ? preferred : "peak";
                      return (
                        <a key={event.id} href={`#event-${event.id}`} className="group block">
                          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[var(--surface-2)] transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-20px_rgba(28,22,18,0.45)] sm:aspect-[4/3]">
                            <Image
                              src={heroVariantUrl(destination.heroImage, variant)}
                              alt=""
                              fill
                              sizes="(max-width: 640px) 100vw, 320px"
                              className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                            />
                            <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-semibold capitalize text-[#1c1612] shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
                              <span className="tabular-nums text-[var(--signal)]">{index + 1}</span>
                              {event.type.replaceAll("-", " ")}
                              {event.confirmed === false ? " · expected" : ""}
                            </span>
                          </div>
                          <p className="mt-2.5 text-[13px] font-medium text-[var(--signal)]">
                            {formatEventDate(event.startDate, event.endDate)}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[14px] font-medium leading-snug text-[var(--foreground)]">
                            {event.title}
                          </p>
                        </a>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <EventList
                events={events}
                venues={venues}
                destinationSlug={destination.slug}
                today={today}
                groupByMonth={isYearView}
                periodLabel={isYearView ? "year" : "month"}
              />
            </Section>

            {popularItineraries.length > 0 ? (
              <PopularTrips
                itineraries={popularItineraries}
                destinationSlug={destination.slug}
                destinationCity={destination.city}
              />
            ) : null}

            <StayAndTravel destination={destination} month={isYearView ? undefined : selectedMonth} year={selectedYear} />

            <Section title="Venues & scenes">
              <div className={`grid gap-px overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--border)] ${venues.length > 1 ? "sm:grid-cols-2 sm:[&>*:last-child:nth-child(odd)]:col-span-2" : ""}`}>
                {venues.map((venue) => (
                  <TrackedOutboundLink
                    key={venue.id}
                    href={venue.officialUrl}
                    eventLabel={venue.name}
                    destinationSlug={destination.slug}
                    preview={{ kind: "venue", venueId: venue.id }}
                    className="group flex flex-col gap-2 bg-[var(--background)] p-6 transition hover:bg-[var(--surface)]"
                  >
                    <span className="text-[13px] capitalize text-[var(--muted)]">{venue.type.replace("-", " ")}</span>
                    <h3 className="text-[19px] font-medium text-[var(--foreground)]">{venue.name}</h3>
                    <p className="text-[13px] leading-6 text-[var(--muted)]">
                      {venue.sceneTags.map((tag) => VIBE_LABELS[tag]).join(" · ")}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--foreground)]/80 transition group-hover:text-[var(--signal)]">
                      Visit site
                      <span aria-hidden>↗</span>
                    </span>
                  </TrackedOutboundLink>
                ))}
              </div>
            </Section>

            <Section title="The full picture">
              <p className="text-[16px] leading-8 text-[var(--foreground)]/85">{destination.summary}</p>
              <p className="mt-5 text-[15px] leading-8 text-[var(--muted)]">{destination.travelNotes}</p>
            </Section>
          </article>

          {/* SIDEBAR */}
          <aside className="lg:sticky lg:top-12 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
            <div className="space-y-12 pt-2">
              <SidePanel title="At a glance">
                <dl className="grid grid-cols-1 gap-4 text-sm">
                  <Info label="Best for" value={destination.whoFor.join(", ")} />
                  <Info label="When to book" value={destination.whenToBook} />
                  <Info label="Sounds" value={destination.genres.map((g) => GENRE_LABELS[g]).join(", ")} />
                  <Info label="Vibe" value={destination.vibes.map((v) => VIBE_LABELS[v]).join(", ")} />
                </dl>
              </SidePanel>

              <SidePanel title="Pick a month">
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
                          className={`flex flex-1 items-center justify-center px-3 py-2 text-[14px] font-medium transition ${
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
                  className={`mb-2 flex min-h-11 items-center justify-center rounded-md border px-3 py-2.5 text-center text-[14px] font-medium transition sm:min-h-0 sm:py-2 ${
                    isYearView
                      ? "font-bold"
                      : "border-[var(--border)] text-[var(--muted-2)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]/85"
                  }`}
                >
                  {isYearView ? "Viewing the whole year" : "See the whole year"}
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
                        className={`flex min-h-11 items-center justify-center rounded-md border px-2 py-2.5 text-center text-[14px] font-medium transition sm:min-h-0 sm:py-2 ${
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
      <p className="text-[13px] font-medium text-white/65">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white md:text-3xl">
        {value}
        {suffix ? <span className="ml-1.5 text-base text-white/55">{suffix}</span> : null}
      </p>
    </div>
  );
}

function Section({
  title,
  id,
  children
}: {
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-20" : undefined}>
      <h2 className="mb-6 text-[24px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[28px]">{title}</h2>
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

function SidePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-4 border-b border-[var(--border)] pb-2 text-[16px] font-semibold text-[var(--foreground)]">{title}</h3>
      {children}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
      <dt className="text-[13px] font-medium text-[var(--muted)]">{label}</dt>
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
  const startLabel = startDate.toLocaleDateString("en-US", opts);
  if (!end) return startLabel;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startLabel;
  const endLabel = endDate.toLocaleDateString("en-US", opts);
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} → ${endLabel}`;
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
    });
}
