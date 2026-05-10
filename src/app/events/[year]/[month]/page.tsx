import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { MONTHS, getMonthLabel } from "@/data/taxonomy";
import { DESTINATIONS, EVENTS, getVenuesForDestination } from "@/data/music-travel";
import {
  breadcrumbJsonLd,
  eventToJsonLd,
  itemListJsonLd,
  jsonLdScript,
  siteUrl
} from "@/lib/structured-data";
import { ogImageUrl } from "@/lib/og";
import type { MonthNumber } from "@/types/content";

type RouteParams = { year: string; month: string };
type PageProps = { params: Promise<RouteParams> };

const SUPPORTED_YEARS = [2025, 2026, 2027];

function monthSlug(month: MonthNumber) {
  return getMonthLabel(month).toLowerCase();
}

function parseMonthSlug(value: string): MonthNumber | null {
  const found = MONTHS.find((m) => m.label.toLowerCase() === value.toLowerCase());
  return found ? found.value : null;
}

function parseYear(value: string): number | null {
  const year = Number(value);
  return SUPPORTED_YEARS.includes(year) ? year : null;
}

export function generateStaticParams() {
  return SUPPORTED_YEARS.flatMap((year) =>
    MONTHS.map((month) => ({ year: String(year), month: monthSlug(month.value) }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { year: yearParam, month: monthParam } = await params;
  const year = parseYear(yearParam);
  const month = parseMonthSlug(monthParam);
  if (!year || !month) return { robots: { index: false } };
  const monthLabel = getMonthLabel(month);
  const title = `Music events in ${monthLabel.toLowerCase()} ${year}`;
  const description = `Festivals, club seasons, residencies, and major music moments around the world in ${monthLabel} ${year}.`;
  const path = `/events/${year}/${monthSlug(month)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${siteUrl()}${path}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: `events · ${year}`,
            title: monthLabel,
            subtitle: "Festivals, club seasons, residencies, carnivals.",
            stat: "Where Next"
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

function eventsInMonth(month: MonthNumber, year: number) {
  return EVENTS.filter((event) => {
    const start = new Date(event.startDate);
    if (Number.isNaN(start.getTime())) return false;
    const end = event.endDate ? new Date(event.endDate) : start;
    if (Number.isNaN(end.getTime())) return false;
    const startsInOrBefore =
      start.getUTCFullYear() < year ||
      (start.getUTCFullYear() === year && start.getUTCMonth() + 1 <= month);
    const endsInOrAfter =
      end.getUTCFullYear() > year ||
      (end.getUTCFullYear() === year && end.getUTCMonth() + 1 >= month);
    return startsInOrBefore && endsInOrAfter;
  }).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
}

export default async function EventsArchivePage({ params }: PageProps) {
  const { year: yearParam, month: monthParam } = await params;
  const year = parseYear(yearParam);
  const month = parseMonthSlug(monthParam);
  if (!year || !month) notFound();

  const monthLabel = getMonthLabel(month);
  const events = eventsInMonth(month, year);
  const path = `/events/${year}/${monthSlug(month)}`;

  const destinationsBySlug = new Map(DESTINATIONS.map((d) => [d.slug, d]));

  const itemList = itemListJsonLd({
    name: `Music events in ${monthLabel} ${year}`,
    items: events.map((event) => ({
      name: event.title,
      url: event.ticketUrl ?? event.sourceUrl
    }))
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: "Events", href: "/events" },
    { name: `${monthLabel} ${year}`, href: path }
  ]);

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemList) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      {events.slice(0, 25).map((event) => {
        const destination = destinationsBySlug.get(event.destinationSlug);
        if (!destination) return null;
        const venue = event.venueId
          ? getVenuesForDestination(destination.slug).find((v) => v.id === event.venueId)
          : undefined;
        return (
          <script
            key={event.id}
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: jsonLdScript(eventToJsonLd(event, destination, venue)) }}
          />
        );
      })}

      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            ← back to map
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          events archive · {monthLabel.toLowerCase()} {year}
        </p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Music events in {monthLabel.toLowerCase()} {year}.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          {events.length} {events.length === 1 ? "event" : "events"} on the curated calendar — festivals, club seasons, residencies, carnivals, and concerts worth flying for.
        </p>

        <ol className="mt-12 divide-y divide-[var(--border)]">
          {events.map((event) => {
            const destination = destinationsBySlug.get(event.destinationSlug);
            if (!destination) return null;
            return (
              <li key={event.id} className="py-7">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {formatDateRange(event.startDate, event.endDate)} · {destination.city}, {destination.country} · {event.type.replace("-", " ")}
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em] text-[var(--foreground)]">
                  {event.title}
                </h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[var(--muted)]">{event.summary}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href={`/destinations/${destination.slug}?month=${month}`}
                    className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                  >
                    read the {destination.city.toLowerCase()} guide →
                  </Link>
                  <TrackedOutboundLink
                    href={event.ticketUrl ?? event.sourceUrl}
                    eventLabel={event.title}
                    destinationSlug={destination.slug}
                    className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
                  >
                    official source ↗
                  </TrackedOutboundLink>
                </div>
              </li>
            );
          })}
        </ol>

        <nav className="mt-16 grid gap-8 border-t border-[var(--border)] pt-10 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              other months in {year}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {MONTHS.filter((m) => m.value !== month).map((m) => (
                <li key={m.value}>
                  <Link
                    href={`/events/${year}/${monthSlug(m.value)}`}
                    className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  >
                    {m.shortLabel}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              {monthLabel.toLowerCase()} in other years
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SUPPORTED_YEARS.filter((y) => y !== year).map((y) => (
                <li key={y}>
                  <Link
                    href={`/events/${y}/${monthSlug(month)}`}
                    className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  >
                    {y}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </section>
    </main>
  );
}

function formatDateRange(start: string, end?: string) {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const startDate = new Date(start);
  const startLabel = Number.isNaN(startDate.getTime())
    ? "tba"
    : startDate.toLocaleDateString("en-US", opts).toLowerCase();
  if (!end) return startLabel;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return startLabel;
  const endLabel = endDate.toLocaleDateString("en-US", opts).toLowerCase();
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} → ${endLabel}`;
}
