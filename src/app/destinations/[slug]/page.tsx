import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { HeroGallery } from "@/components/destinations/HeroGallery";
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
import { BUDGET_LABELS, GENRE_LABELS, getMonthLabel, MONTHS, VIBE_LABELS } from "@/data/taxonomy";
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

type DestinationPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string }>;
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
  const { month: monthParam } = await searchParams;
  const destination = getDestinationBySlug(slug);

  if (!destination) notFound();

  const monthSelection = parseMonthSelection(monthParam);
  const isYearView = monthSelection === "year";
  const selectedMonth: MonthNumber =
    monthSelection && monthSelection !== "year"
      ? monthSelection
      : (destination.peakMonths[0] ?? destination.activeMonths[0] ?? 1);
  const score =
    getScoreForDestinationMonth(destination.slug, selectedMonth) ??
    getScoresForDestination(destination.slug)[0];
  const eventsThisMonth = getEventsForDestinationInMonth(destination.slug, selectedMonth);
  const allEvents = getEventsForDestination(destination.slug);
  const events = isYearView
    ? allEvents
    : eventsThisMonth.length > 0
      ? eventsThisMonth
      : allEvents;
  const isShowingFallbackEvents =
    !isYearView && eventsThisMonth.length === 0 && allEvents.length > 0;
  const venues = getVenuesForDestination(destination.slug);
  const popularItineraries = await loadPopularItinerariesForDestination(destination.slug, 3);

  const issueNumber = destination.slug.length.toString().padStart(2, "0");
  const monthLabelLower = getMonthLabel(selectedMonth).toLowerCase();
  const periodLabel = isYearView ? "year-round" : monthLabelLower;
  const periodLabelWithYear = isYearView ? "all year 2026" : `${monthLabelLower} 2026`;
  const whyTitle = isYearView ? "Year overview" : `Why ${monthLabelLower}`;
  const eventsTitle = isYearView ? "Events all year" : `Events in ${monthLabelLower}`;
  const introWhy = score?.whyNow?.[0] ?? destination.summary;
  const remainingWhy = (score?.whyNow ?? []).slice(1);
  const lastEditedRaw = getLastEditedForDestination(destination.slug);
  const lastEditedLabel = formatEditedDate(lastEditedRaw);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: destination.city, href: `/destinations/${destination.slug}` }
  ]);
  const destinationLd = destinationToJsonLd(destination);

  return (
    <main className="min-h-screen w-full">
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
      <header className="absolute left-0 right-0 top-0 z-30 mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-white font-mono text-[11px] font-bold text-black">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.22em] text-white/70">
          <Link href="/methodology" className="hidden transition hover:text-white sm:inline">
            methodology
          </Link>
          <Link href="/" className="transition hover:text-white">
            ← back to map
          </Link>
        </nav>
      </header>

      {/* CINEMATIC HERO */}
      <section className="relative h-[88vh] min-h-[640px] w-full overflow-hidden">
        <HeroGallery destination={destination} />
        <div className="pointer-events-none absolute inset-0 bg-[#08080a]/40 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-transparent to-transparent" />

        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1180px] px-6 pb-14 sm:px-10">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.24em] text-white/70">
            <span>issue {issueNumber}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>{destination.country}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>{destination.region}</span>
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span>{periodLabelWithYear}</span>
          </div>
          <h1 className="mt-6 text-[clamp(4rem,12vw,10rem)] font-medium leading-[0.92] tracking-[-0.04em] text-white">
            {destination.city}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80 md:text-xl md:leading-9">
            {destination.tagline}
          </p>

          <div className="mt-9 flex flex-wrap items-end gap-x-10 gap-y-6">
            <Stat
              label={isYearView ? `peak score · ${monthLabelLower}` : "activity"}
              value={`${score?.overallScore ?? 0}`}
              suffix="/100"
            />
            <Stat label="budget" value={`${BUDGET_LABELS[destination.budget]}`} suffix={formatUsdRange(destination.averageDailySpendUsd)} />
            <Stat label="confidence" value={(score?.confidence ?? "medium").toUpperCase()} />
            <Stat label="months" value={`${destination.activeMonths.length}`} suffix="active" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href={`/destinations/${destination.slug}/plan`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-[#0a0a0a] transition hover:bg-[var(--signal)] hover:text-white"
            >
              plan a trip
              <span aria-hidden>→</span>
            </Link>
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
      <section className="mx-auto w-full max-w-[1180px] px-6 pb-24 pt-20 sm:px-10">
        <div className="mb-14 flex items-baseline justify-between border-b border-[var(--border)] pb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="text-[var(--foreground)]">where next</span> / {destination.city.toLowerCase()} / {periodLabel}
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-[var(--signal)] shadow-[0_0_6px_var(--signal)]"
              />
              {lastEditedLabel ? `edited ${lastEditedLabel}` : "edition 2026"} · curated
            </span>
          </p>
        </div>

        <div className="grid gap-x-16 gap-y-16 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
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

            {score?.editorialSummary ? (
              <PullQuote>{score.editorialSummary}</PullQuote>
            ) : null}

            <Section eyebrow="02" id="events" title={eventsTitle}>
              {isShowingFallbackEvents ? (
                <p className="mb-7 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13px] leading-6 text-[var(--muted)]">
                  Nothing scheduled in {destination.city} for {monthLabelLower} 2026 yet — showing the rest of the year below.
                </p>
              ) : null}
              <ol className="wn-timeline">
                {events.map((event) => (
                  <li key={event.id} className="wn-timeline-item">
                    <span className="wn-timeline-dot" aria-hidden />
                    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                        {formatEventDate(event.startDate, event.endDate)}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                        {event.type.replace("-", " ")}
                      </span>
                      {(() => {
                        const span = formatRunLength(event.startDate, event.endDate, event.type);
                        return span ? (
                          <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-[var(--muted)]">
                            {span}
                          </span>
                        ) : null;
                      })()}
                    </div>
                    <h3 className="mt-2 text-[22px] font-medium leading-tight text-[var(--foreground)]">
                      {event.title}
                    </h3>
                    <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">{event.summary}</p>
                    <TrackedOutboundLink
                      href={event.ticketUrl ?? event.sourceUrl}
                      eventLabel={event.title}
                      destinationSlug={destination.slug}
                      provider={event.ticketUrl ? "viagogo" : "raw"}
                      preview={{ kind: "event", eventId: event.id }}
                      className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                    >
                      official source
                      <span aria-hidden>↗</span>
                    </TrackedOutboundLink>
                  </li>
                ))}
              </ol>
            </Section>

            {popularItineraries.length > 0 ? (
              <PopularTrips
                itineraries={popularItineraries}
                destinationSlug={destination.slug}
                destinationCity={destination.city}
              />
            ) : null}

            <StayAndTravel destination={destination} month={isYearView ? undefined : selectedMonth} />

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
                <Link
                  href={`/destinations/${destination.slug}?month=year#events`}
                  aria-current={isYearView ? "true" : undefined}
                  style={
                    isYearView
                      ? { color: "#0a0a0a", backgroundColor: "#ededeb", borderColor: "#ededeb" }
                      : undefined
                  }
                  className={`mb-2 block rounded-md border px-3 py-2 text-center font-mono text-[11px] uppercase tracking-[0.18em] transition ${
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
                        href={`/destinations/${destination.slug}?month=${month.value}#events`}
                        aria-current={isSelected ? "true" : undefined}
                        style={
                          isSelected
                            ? { color: "#0a0a0a", backgroundColor: "#ededeb", borderColor: "#ededeb" }
                            : undefined
                        }
                        className={`rounded-md border px-2 py-2 text-center font-mono text-[11px] uppercase tracking-[0.12em] transition ${
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
    <blockquote className="my-2 border-l-2 border-[var(--signal)] py-3 pl-7 text-[26px] font-medium leading-[1.3] tracking-[-0.01em] text-[var(--foreground)] md:text-[32px]">
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
