"use client";

import Link from "next/link";
import type { Destination, MonthNumber, MonthlyDestinationScore } from "@/types/content";
import { BUDGET_LABELS, GENRE_LABELS } from "@/data/taxonomy";
import { trackEvent } from "@/lib/analytics";
import { cn, formatUsdRange } from "@/lib/utils";

type DestinationCardProps = {
  destination: Destination;
  score: MonthlyDestinationScore;
  month: MonthNumber;
  selected?: boolean;
  onSelect?: (slug: string) => void;
};

export function DestinationCard({ destination, score, month, selected, onSelect }: DestinationCardProps) {
  const href = `/destinations/${destination.slug}?month=${month}`;

  return (
    <article
      className={cn(
        "group flex flex-col gap-4 rounded-xl border bg-[var(--surface)] p-5 transition hover:bg-[var(--surface-2)]",
        selected ? "border-[var(--foreground)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            {destination.country}
          </p>
          <h3 className="mt-1.5 truncate text-xl font-medium text-[var(--foreground)]">{destination.city}</h3>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">activity</p>
          <p className="font-mono text-2xl font-medium text-[var(--foreground)]">
            {score.overallScore}
            <span className="text-[var(--muted-2)]">/100</span>
          </p>
        </div>
      </div>

      <p className="text-sm leading-6 text-[var(--muted)]">{score.editorialSummary}</p>

      <div className="flex flex-wrap gap-1.5">
        {destination.genres.slice(0, 4).map((genre) => (
          <span
            key={genre}
            className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
          >
            {GENRE_LABELS[genre]}
          </span>
        ))}
      </div>

      <dl className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 text-sm">
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">budget</dt>
          <dd className="mt-1 text-[var(--foreground)]">
            {BUDGET_LABELS[destination.budget]} {formatUsdRange(destination.averageDailySpendUsd)}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">best for</dt>
          <dd className="mt-1 text-[var(--foreground)]">{destination.whoFor[0]}</dd>
        </div>
      </dl>

      <div className="mt-1 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSelect?.(destination.slug)}
          className="flex-1 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
        >
          show on map
        </button>
        <Link
          href={href}
          onClick={() => trackEvent("destination_card_click", { slug: destination.slug, month, score: score.overallScore })}
          className="flex-1 rounded-full bg-[var(--foreground)] px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--background)] transition hover:bg-[var(--signal)] hover:text-[var(--background)]"
        >
          guide ↗
        </Link>
      </div>
    </article>
  );
}
