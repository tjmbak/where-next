import type { Metadata } from "next";
import Link from "next/link";
import { MONTHS, SUPPORTED_YEARS, getMonthLabel } from "@/data/taxonomy";
import { getEventsForYear } from "@/data/music-travel";
import type { MonthNumber } from "@/types/content";
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

export default function EventsIndexPage() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader />

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">events calendar</p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Every month worth flying for.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          Festivals, club seasons, residencies, and carnivals across {SUPPORTED_YEARS.join(" and ")}, ordered by date.
        </p>

        {SUPPORTED_YEARS.map((year) => {
          const counts = countByMonth(year);
          const isPast = (month: number) => year < currentYear || (year === currentYear && month < currentMonth);
          const upcoming = MONTHS.filter((m) => !isPast(m.value));
          const past = MONTHS.filter((m) => isPast(m.value));
          return (
            <div key={year} className="mt-14">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{year}</h2>
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
                              <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--signal)]">now</span>
                            ) : null}
                          </span>
                          <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                            {count === 0 ? "dates tba" : `${count} ${count === 1 ? "event" : "events"}`}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {past.length > 0 ? (
                <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                  <span>earlier</span>
                  {past.map((m) => (
                    <Link
                      key={m.value}
                      href={`/events/${year}/${getMonthLabel(m.value).toLowerCase()}`}
                      className="text-[var(--muted)] underline-offset-4 transition hover:text-[var(--foreground)] hover:underline"
                    >
                      {m.shortLabel.toLowerCase()}
                    </Link>
                  ))}
                </p>
              ) : null}
            </div>
          );
        })}
      </section>
    </main>
  );
}
