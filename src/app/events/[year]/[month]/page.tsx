import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { MONTHS, SUPPORTED_YEARS, getMonthLabel, yearQueryFor } from "@/data/taxonomy";
import { DESTINATIONS, getEventsForYear, getVenuesForDestination } from "@/data/music-travel";
import {
  breadcrumbJsonLd,
  eventToJsonLd,
  itemListJsonLd,
  jsonLdScript,
  siteUrl
} from "@/lib/structured-data";
import { ogImageUrl } from "@/lib/og";
import type { MonthNumber } from "@/types/content";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { EventCard } from "@/components/events/EventCard";
import { MonthEventBrowser, type BrowserEvent } from "@/components/events/MonthEventBrowser";
import { pickHighlights } from "@/lib/event-highlights";

type RouteParams = { year: string; month: string };

export const revalidate = 3600;
type PageProps = { params: Promise<RouteParams> };

function monthSlug(month: MonthNumber) {
  return getMonthLabel(month).toLowerCase();
}

function parseMonthSlug(value: string): MonthNumber | null {
  const found = MONTHS.find((m) => m.label.toLowerCase() === value.toLowerCase());
  return found ? found.value : null;
}

function parseMonthLoose(value: string): MonthNumber | null {
  const lower = value.toLowerCase();
  const n = Number(lower);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n as MonthNumber;
  const found = MONTHS.find((m) => m.shortLabel.toLowerCase() === lower.slice(0, 3));
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
  return getEventsForYear(year).filter((event) => {
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
  if (year && !month) {
    const loose = parseMonthLoose(monthParam);
    if (loose) permanentRedirect(`/events/${year}/${monthSlug(loose)}`);
  }
  if (!year || !month) notFound();

  const monthLabel = getMonthLabel(month);
  const events = eventsInMonth(month, year);
  const path = `/events/${year}/${monthSlug(month)}`;

  const destinationsBySlug = new Map(DESTINATIONS.map((d) => [d.slug, d]));
  const monthStartIso = `${year}-${String(month).padStart(2, "0")}-01`;
  const today = new Date().toISOString().slice(0, 10);
  const endIso = (event: (typeof events)[number]) => (event.endDate ?? event.startDate).slice(0, 10);
  const startingHere = events.filter((event) => event.startDate.slice(0, 10) >= monthStartIso);
  const carriedOver = events.filter((event) => event.startDate.slice(0, 10) < monthStartIso);
  const ahead = startingHere.filter((event) => endIso(event) >= today);
  const done = startingHere.filter((event) => endIso(event) < today);

  const toBrowserEvent = (event: (typeof events)[number]): BrowserEvent | null => {
    const destination = destinationsBySlug.get(event.destinationSlug);
    if (!destination) return null;
    const eventMonth = Number(event.startDate.slice(5, 7)) as MonthNumber;
    const eventYear = Number(event.startDate.slice(0, 4));
    const linkMonth = event.startDate.slice(0, 10) < monthStartIso ? month : eventMonth;
    const linkYear = event.startDate.slice(0, 10) < monthStartIso ? year : eventYear;
    return {
      id: event.id,
      title: event.title,
      type: event.type,
      startDate: event.startDate.slice(0, 10),
      endDate: event.endDate?.slice(0, 10),
      city: destination.city,
      href: `/destinations/${destination.slug}?month=${linkMonth}${yearQueryFor(linkMonth, linkYear)}#event-${event.id}`,
      confirmed: event.confirmed !== false
    };
  };
  const listed = [...carriedOver.filter((event) => endIso(event) >= today), ...ahead]
    .map(toBrowserEvent)
    .filter((event): event is BrowserEvent => event !== null);
  const ended = [...carriedOver.filter((event) => endIso(event) < today), ...done]
    .map(toBrowserEvent)
    .filter((event): event is BrowserEvent => event !== null);
  const picks = pickHighlights(ahead, { limit: 6, perCity: 1 }).flatMap((event) => {
    const destination = destinationsBySlug.get(event.destinationSlug);
    return destination ? [{ event, destination }] : [];
  });
  const floor = today > monthStartIso ? today : monthStartIso;

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

      <SiteHeader />

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-10 sm:px-10">
        <Link href="/events" className="text-[14px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]">
          ← All events
        </Link>
        <h1 className="mt-4 max-w-3xl text-[clamp(2.25rem,5.5vw,4rem)] font-medium leading-[1.02] tracking-[-0.03em] text-[var(--foreground)]">
          Music events in {monthLabel} {year}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          {events.length > 0
            ? `${startingHere.length} ${startingHere.length === 1 ? "event starts" : "events start"} this month${
                carriedOver.length > 0 ? `, plus ${carriedOver.length} season-long ${carriedOver.length === 1 ? "run" : "runs"}` : ""
              }.`
            : `Nothing confirmed for ${monthLabel} ${year} yet. We only list events with a confirmed source, and most organizers announce three to nine months out.`}
        </p>

        <nav aria-label="Months" className="wn-swipe -mx-6 mt-6 flex gap-2 overflow-x-auto px-6 sm:mx-0 sm:flex-wrap sm:px-0">
          {MONTHS.map((m) => {
            const active = m.value === month;
            return (
              <Link
                key={m.value}
                href={`/events/${year}/${monthSlug(m.value)}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex h-9 shrink-0 items-center rounded-full border px-4 text-[14px] font-medium transition ${
                  active
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border-strong)] text-[var(--foreground)] hover:border-[var(--foreground)]"
                }`}
              >
                {m.shortLabel}
              </Link>
            );
          })}
          {SUPPORTED_YEARS.filter((y) => y !== year).map((y) => (
            <Link
              key={y}
              href={`/events/${y}/${monthSlug(month)}`}
              className="inline-flex h-9 shrink-0 items-center rounded-full px-3 text-[14px] font-medium text-[var(--muted)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
            >
              {monthLabel.slice(0, 3)} {y} →
            </Link>
          ))}
        </nav>

        {picks.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-[20px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[24px]">Top picks</h2>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3">
              {picks.map(({ event, destination }) => (
                <li key={event.id}>
                  <EventCard event={event} destination={destination} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {listed.length > 0 || ended.length > 0 ? (
          <div className="mt-14">
            <h2 className="mb-4 text-[20px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[24px]">
              Every event
            </h2>
            <MonthEventBrowser events={listed} ended={ended} today={today} floor={floor} />
          </div>
        ) : null}
      </section>
    </main>
  );
}
