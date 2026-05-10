import Link from "next/link";
import type { Destination, MonthNumber, MonthlyDestinationScore } from "@/types/content";
import { BUDGET_LABELS, GENRE_LABELS, getMonthLabel } from "@/data/taxonomy";
import { formatUsdRange } from "@/lib/utils";

type AxisItem = {
  destination: Destination;
  score: MonthlyDestinationScore;
};

type AxisDestinationListProps = {
  items: AxisItem[];
  month: MonthNumber;
};

export function AxisDestinationList({ items, month }: AxisDestinationListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm leading-6 text-[var(--muted)]">
        Nothing curated for {getMonthLabel(month).toLowerCase()} yet. Try a different month or filter.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-[var(--border)]">
      {items.map(({ destination, score }, index) => {
        const href = `/destinations/${destination.slug}?month=${month}`;
        return (
          <li key={destination.slug} className="py-8">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")} · {destination.region} · {destination.country}
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em] text-[var(--foreground)]">
                  <Link href={href} className="transition hover:text-[var(--signal)]">
                    {destination.city}
                  </Link>
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--foreground)]/85">
                  {destination.tagline}
                </p>
                <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[var(--muted)]">
                  {score.editorialSummary}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono uppercase tracking-[0.16em]">
                    {BUDGET_LABELS[destination.budget]} {formatUsdRange(destination.averageDailySpendUsd)}
                  </span>
                  {destination.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono uppercase tracking-[0.16em]"
                    >
                      {GENRE_LABELS[genre]}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">activity</p>
                <p className="mt-1 font-mono text-3xl font-medium text-[var(--foreground)]">
                  {score.overallScore}
                  <span className="text-base text-[var(--muted-2)]">/100</span>
                </p>
                <Link
                  href={href}
                  className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                >
                  read the guide
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
