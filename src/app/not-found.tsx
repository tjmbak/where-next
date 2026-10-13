import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { DESTINATIONS, MONTHLY_DESTINATION_SCORES } from "@/data/music-travel";
import { getCurrentMonth, getMonthLabel } from "@/data/taxonomy";

export default function NotFound() {
  const month = getCurrentMonth();
  const picks = MONTHLY_DESTINATION_SCORES.filter((s) => s.month === month)
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, 3)
    .map((s) => DESTINATIONS.find((d) => d.slug === s.destinationSlug))
    .filter((d): d is (typeof DESTINATIONS)[number] => Boolean(d));

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader />
      <section className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-20 text-center sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--signal)]">404 · off the map</p>
        <h1 className="mt-5 text-[clamp(2.25rem,6vw,4rem)] font-medium leading-[1.02] tracking-[-0.03em] text-[var(--foreground)]">
          This page took a wrong turn.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-[var(--muted)]">
          The link may be old or the event may have moved. Here&apos;s where the world is loudest this {getMonthLabel(month).toLowerCase()}.
        </p>
        <ul className="mt-10 flex flex-wrap justify-center gap-2">
          {picks.map((d) => (
            <li key={d.slug}>
              <Link
                href={`/destinations/${d.slug}?month=${month}`}
                className="inline-flex h-11 items-center rounded-full border border-[var(--border-strong)] bg-[var(--surface)] px-5 text-[14px] font-medium text-[var(--foreground)] transition hover:border-[var(--foreground)]"
              >
                {d.city}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/"
          className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[var(--foreground)] px-7 text-[15px] font-medium text-[var(--background)] transition hover:opacity-90"
        >
          Back to the map <span aria-hidden>→</span>
        </Link>
      </section>
    </main>
  );
}
