import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
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
  const dayGroups: { day: string; events: typeof events }[] = [];
  for (const event of ahead) {
    const day = event.startDate.slice(0, 10);
    const last = dayGroups[dayGroups.length - 1];
    if (last && last.day === day) last.events.push(event);
    else dayGroups.push({ day, events: [event] });
  }

  const renderEvent = (event: (typeof events)[number], compact = false) => {
    const destination = destinationsBySlug.get(event.destinationSlug);
    if (!destination) return null;
    return (
      <li key={event.id} className={compact ? "py-4" : "py-6 first:pt-0"}>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <span className="text-[var(--foreground)]">{destination.city}</span> · {destination.country} ·{" "}
          <span className="text-[var(--signal)]">{event.type.replaceAll("-", " ")}</span>
          {compact || (event.endDate && event.endDate !== event.startDate) ? (
            <> · {formatDateRange(event.startDate, event.endDate)}</>
          ) : null}
          {event.confirmed === false ? (
            <span className="ml-2 rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[9px] tracking-[0.18em]">
              expected · dates tbc
            </span>
          ) : null}
        </p>
        <h3 className={`mt-1.5 font-medium tracking-[-0.01em] text-[var(--foreground)] ${compact ? "text-[16px]" : "text-[20px] leading-snug sm:text-[22px]"}`}>
          {event.title}
        </h3>
        {compact ? null : (
          <p className="mt-2 max-w-2xl text-[14px] leading-7 text-[var(--muted)]">{event.summary}</p>
        )}
        <div className={`flex flex-wrap gap-x-5 gap-y-2 ${compact ? "mt-2" : "mt-3"}`}>
          <Link
            href={`/destinations/${destination.slug}?month=${month}${yearQueryFor(month, year)}`}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
          >
            {destination.city.toLowerCase()} guide →
          </Link>
          <TrackedOutboundLink
            href={event.ticketUrl ?? event.sourceUrl}
            eventLabel={event.title}
            destinationSlug={destination.slug}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            official source ↗
          </TrackedOutboundLink>
        </div>
      </li>
    );
  };

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

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          events calendar
        </p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Music events in {monthLabel} {year}.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          {events.length > 0
            ? `${startingHere.length} ${startingHere.length === 1 ? "event starts" : "events start"} this month${
                carriedOver.length > 0 ? `, plus ${carriedOver.length} season-long ${carriedOver.length === 1 ? "run" : "runs"}` : ""
              } — festivals, club nights, residencies, and concerts worth flying for.`
            : `Nothing confirmed for ${monthLabel} ${year} yet. We only list events with a confirmed source, and most organizers announce three to nine months out.`}
        </p>

        {dayGroups.length > 0 ? (
          <div className="mt-14 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {dayGroups.map((group) => (
              <section key={group.day} className="grid gap-3 py-8 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-8">
                <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] sm:sticky sm:top-6 sm:self-start">
                  <span className="block text-[28px] font-sans font-medium leading-none tracking-[-0.02em] text-[var(--foreground)] normal-case sm:text-[34px]">
                    {Number(group.day.slice(8, 10))}
                  </span>
                  <span className="mt-1.5 block">{formatWeekday(group.day)}</span>
                </h2>
                <ol className="divide-y divide-[var(--border)]">{group.events.map((event) => renderEvent(event))}</ol>
              </section>
            ))}
          </div>
        ) : null}

        {done.length > 0 ? (
          <details className="group mt-10 rounded-xl border border-[var(--border)]" open={dayGroups.length === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]">
              {done.length} already happened this month
              <span aria-hidden className="transition group-open:rotate-180">↓</span>
            </summary>
            <ol className="divide-y divide-[var(--border)] border-t border-[var(--border)] px-5 opacity-70">
              {done.map((event) => renderEvent(event, true))}
            </ol>
          </details>
        ) : null}

        {carriedOver.length > 0 ? (
          <div className="mt-14">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">running all month</h2>
            <ol className="mt-2 divide-y divide-[var(--border)]">{carriedOver.map((event) => renderEvent(event, true))}</ol>
          </div>
        ) : null}

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

function formatWeekday(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return `${weekday} · ${month}`.toLowerCase();
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
