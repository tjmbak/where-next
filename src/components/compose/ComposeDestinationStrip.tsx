"use client";

import type { ComposeDestinationCard } from "@/lib/compose/types";

type ComposeDestinationStripProps = {
  items: ComposeDestinationCard[];
  onSelect: (card: ComposeDestinationCard) => void;
};

export function ComposeDestinationStrip({ items, onSelect }: ComposeDestinationStripProps) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
        {items.length} {items.length === 1 ? "match" : "matches"}
      </p>
      <ol className="grid gap-3 sm:grid-cols-2">
        {items.map((card) => (
          <li key={card.slug}>
            <button
              type="button"
              onClick={() => onSelect(card)}
              className="group flex w-full flex-col items-start gap-1 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--foreground)]/55 hover:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.55)]"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                {card.region} · {card.budget}
              </p>
              <h3 className="text-[18px] font-medium tracking-[-0.01em] text-[var(--foreground)] transition group-hover:text-[var(--signal)]">
                {card.city}, {card.country}
              </h3>
              <p className="mt-1 text-[13px] leading-6 text-[var(--muted)]">{card.matchReason}</p>
              <span className="mt-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)] transition group-hover:text-[var(--foreground)]">
                plan around here →
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
