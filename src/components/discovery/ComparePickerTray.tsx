"use client";

import { useMemo } from "react";
import { getDestinationBySlug } from "@/data/music-travel";

type ComparePickerTrayProps = {
  picks: string[];
  onRemove: (slug: string) => void;
  onClear: () => void;
  onCompare: () => void;
};

export function ComparePickerTray({ picks, onRemove, onClear, onCompare }: ComparePickerTrayProps) {
  const destinations = useMemo(
    () => picks.map((slug) => getDestinationBySlug(slug)).filter(Boolean) as NonNullable<
      ReturnType<typeof getDestinationBySlug>
    >[],
    [picks]
  );

  if (picks.length === 0) return null;

  const ready = picks.length === 2;

  return (
    <div
      role="region"
      aria-label="compare picker"
      className="fixed bottom-4 left-1/2 z-[850] w-[min(560px,calc(100%-2rem))] -translate-x-1/2 rounded-full border border-[var(--border-strong)] bg-[var(--surface)]/95 px-4 py-2 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          compare
        </span>
        <ul className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {destinations.map((destination) => (
            <li
              key={destination.slug}
              className="inline-flex max-w-[180px] items-center gap-1 truncate rounded-full border border-[var(--signal)]/40 bg-[var(--signal)]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--foreground)]"
            >
              <span className="truncate">{destination.city.toLowerCase()}</span>
              <button
                type="button"
                aria-label={`remove ${destination.city} from compare`}
                onClick={() => onRemove(destination.slug)}
                className="text-[var(--muted-2)] transition hover:text-[var(--signal)]"
              >
                ×
              </button>
            </li>
          ))}
          {!ready ? (
            <li className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
              · pick {2 - picks.length} more
            </li>
          ) : null}
        </ul>
        <button
          type="button"
          onClick={onClear}
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          clear
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={onCompare}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] transition ${
            ready
              ? "border-[var(--signal)]/60 bg-[var(--signal)]/15 text-[var(--signal)] hover:border-[var(--signal)] hover:bg-[var(--signal)]/25"
              : "cursor-not-allowed border-[var(--border)] bg-transparent text-[var(--muted-2)]"
          }`}
        >
          <span aria-hidden>⇄</span>
          compare
          <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}
