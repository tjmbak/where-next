"use client";

import Link from "next/link";
import { getDestinationBySlug } from "@/data/music-travel";
import { getMonthLabel, yearQueryFor } from "@/data/taxonomy";
import { useWatches } from "@/lib/watches";

export function WatchList() {
  const { watches, toggle } = useWatches();

  if (watches.length === 0) {
    return (
      <p className="mt-3 max-w-xl text-[14px] leading-7 text-[var(--muted)]">
        Nothing watched yet. Tap the bell on any city&apos;s quick look or guide to get
        an email when new events are confirmed for that month.
      </p>
    );
  }

  const sorted = [...watches].sort((a, b) =>
    a.year === b.year
      ? a.month === b.month
        ? a.slug.localeCompare(b.slug)
        : a.month - b.month
      : a.year - b.year
  );

  return (
    <ul className="mt-4 divide-y divide-[var(--border)]">
      {sorted.map((watch) => {
        const destination = getDestinationBySlug(watch.slug);
        if (!destination) return null;
        const monthLabel = getMonthLabel(watch.month).toLowerCase();
        const href = `/destinations/${watch.slug}?month=${watch.month}${yearQueryFor(watch.month, watch.year)}`;
        return (
          <li key={`${watch.slug}:${watch.month}:${watch.year}`} className="flex items-center justify-between gap-3 py-3">
            <Link href={href} className="group min-w-0">
              <p className="truncate text-[14px] font-medium text-[var(--foreground)] transition group-hover:text-[var(--signal)]">
                {destination.city}, {destination.country}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {monthLabel} {watch.year}
              </p>
            </Link>
            <button
              type="button"
              onClick={() => void toggle(watch)}
              className="shrink-0 rounded-full border border-[var(--border-strong)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            >
              unwatch
            </button>
          </li>
        );
      })}
    </ul>
  );
}
