import type { Metadata } from "next";
import Link from "next/link";
import { MONTHS, SUPPORTED_YEARS, getMonthLabel } from "@/data/taxonomy";
import { getDestinationBySlug, getEventsForYear } from "@/data/music-travel";
import type { Destination, Event, MonthNumber } from "@/types/content";
import { SiteFooter } from "@/components/discovery/SiteFooter";
import { pickHighlights } from "@/lib/event-highlights";
import { EventCard } from "@/components/events/EventCard";
import { SiteHeader } from "@/components/nav/SiteHeader";

export const metadata: Metadata = {
  title: "Music events calendar",
  description: "Festivals, club seasons, residencies, and major music moments around the world, month by month.",
  alternates: { canonical: "/events" }
};

export const revalidate = 3600;

function countByMonth(year: number): Map<MonthNumber, number> {
  const counts = new Map<MonthNumber, number>();
  for (const event of getEventsForYear(year)) {
    const start = new Date(event.startDate);
    if (Number.isNaN(start.getTime()) || start.getUTCFullYear() !== year) continue;
    const month = (start.getUTCMonth() + 1) as MonthNumber;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return counts;
}

const COMING_UP_DAYS = 21;
const COMING_UP_LIMIT = 12;
const PER_CITY = 2;

function comingUp(today: string): Array<{ event: Event; destination: Destination }> {
  const horizon = new Date(Date.parse(`${today}T00:00:00Z`) + COMING_UP_DAYS * 86_400_000).toISOString().slice(0, 10);
  const inWindow = SUPPORTED_YEARS.flatMap((year) => getEventsForYear(year)).filter(
    (event) => event.startDate >= today && event.startDate <= horizon && getDestinationBySlug(event.destinationSlug)
  );
  return pickHighlights(inWindow, { limit: COMING_UP_LIMIT, perCity: PER_CITY }).map((event) => ({
    event,
    destination: getDestinationBySlug(event.destinationSlug) as Destination
  }));
}

export default function EventsIndexPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const today = now.toISOString().slice(0, 10);
  const upcoming = comingUp(today);

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader />

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <h1 className=" max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Every month worth flying for.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          Festivals, club seasons, residencies, and carnivals across {SUPPORTED_YEARS.join(" and ")}, ordered by date.
        </p>

        {upcoming.length > 0 ? (
          <div className="mt-12">
            <div className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] pb-3">
              <h2 className="text-[20px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[24px]">Coming up</h2>
              <span className="text-[13px] text-[var(--muted)]">Top picks · next {COMING_UP_DAYS / 7} weeks</span>
            </div>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-8 lg:grid-cols-3">
              {upcoming.map(({ event, destination }) => {
                return (
                  <li key={event.id}>
                    <EventCard event={event} destination={destination} />
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <h2 className="mt-16 text-[20px] font-medium tracking-[-0.01em] text-[var(--foreground)] sm:text-[24px]">Browse by month</h2>

        {SUPPORTED_YEARS.map((year) => {
          const counts = countByMonth(year);
          const isPast = (month: number) => year < currentYear || (year === currentYear && month < currentMonth);
          const upcoming = MONTHS.filter((m) => !isPast(m.value));
          const past = MONTHS.filter((m) => isPast(m.value));
          return (
            <div key={year} className="mt-8">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{year}</h3>
              {upcoming.length > 0 ? (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {upcoming.map((m) => {
                    const count = counts.get(m.value) ?? 0;
                    const isNow = year === currentYear && m.value === currentMonth;
                    return (
                      <li key={m.value}>
                        <Link
                          href={`/events/${year}/${getMonthLabel(m.value).toLowerCase()}`}
                          className={`flex flex-col rounded-xl border px-4 py-3 transition hover:border-[var(--foreground)] ${
                            isNow
                              ? "border-[var(--foreground)] bg-[var(--surface)]"
                              : "border-[var(--border)] bg-[var(--surface)]"
                          }`}
                        >
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="text-[15px] font-medium text-[var(--foreground)]">{m.label}</span>
                            {isNow ? (
                              <span className="text-[12px] font-medium text-[var(--signal)]">Now</span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 text-[13px] text-[var(--muted)]">
                            {count === 0 ? "Dates TBA" : `${count} ${count === 1 ? "event" : "events"}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {past.length > 0 ? (
                <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[13px] text-[var(--muted-2)]">
                  <span>Earlier:</span>
                  {past.map((m) => (
                    <Link
                      key={m.value}
                      href={`/events/${year}/${getMonthLabel(m.value).toLowerCase()}`}
                      className="text-[var(--muted)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
                    >
                      {m.shortLabel}
                    </Link>
                  ))}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>
      <SiteFooter month={currentMonth as MonthNumber} year={currentYear} />
    </main>
  );
}
