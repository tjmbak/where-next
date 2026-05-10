"use client";

import type { Tier } from "./tiers";
import { TIER_COLORS } from "./tiers";

export type ClusterPreview = {
  x: number;
  y: number;
  total: number;
  items: Array<{
    slug: string;
    city: string;
    country: string;
    score: number;
    tier: Tier;
  }>;
  remaining: number;
  containerWidth: number;
  containerHeight: number;
};

export function ClusterPreviewCard({
  preview,
  onSelect,
  onMouseEnter,
  onMouseLeave
}: {
  preview: ClusterPreview;
  onSelect: (slug: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const cardWidth = 240;
  const baseHeight = 60;
  const itemHeight = 26;
  const remainderHeight = preview.remaining > 0 ? 22 : 0;
  const cardHeight = baseHeight + preview.items.length * itemHeight + remainderHeight;
  const margin = 12;
  const arrowGap = 18;

  const minLeft = margin;
  const maxLeft = Math.max(margin, preview.containerWidth - cardWidth - margin);
  const idealLeft = preview.x - cardWidth / 2;
  const left = Math.min(maxLeft, Math.max(minLeft, idealLeft));

  const arrowLeftPct = ((preview.x - left) / cardWidth) * 100;
  const clampedArrowPct = Math.min(95, Math.max(5, arrowLeftPct));

  const fitsAbove = preview.y - cardHeight - arrowGap >= margin;
  const fitsBelow = preview.y + cardHeight + arrowGap <= preview.containerHeight - margin;
  const placeAbove = fitsAbove || (!fitsBelow && preview.y > preview.containerHeight / 2);
  const top = placeAbove
    ? Math.max(margin, preview.y - arrowGap - cardHeight)
    : Math.min(preview.containerHeight - cardHeight - margin, preview.y + arrowGap);

  return (
    <div
      className="absolute z-[600]"
      style={{ left, top, width: cardWidth }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="rounded-lg border border-[var(--border-strong)] bg-[rgba(13,13,16,0.94)] p-2.5 shadow-[0_24px_64px_rgba(0,0,0,0.65)] backdrop-blur-md">
        <div className="mb-1.5 flex items-baseline justify-between gap-3 border-b border-[var(--border)] px-1 pb-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
          <span>
            <span className="text-[var(--foreground)]">{preview.total}</span> cities
          </span>
          <span>click to open</span>
        </div>
        <ul className="space-y-0.5">
          {preview.items.map((item) => (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => onSelect(item.slug)}
                className="flex w-full items-center gap-2 rounded px-1.5 py-1 font-mono text-[11px] text-[var(--foreground)]/90 transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
              >
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{
                    background: TIER_COLORS[item.tier],
                    boxShadow: `0 0 6px ${TIER_COLORS[item.tier]}`
                  }}
                />
                <span className="flex-1 truncate text-left lowercase">{item.city.toLowerCase()}</span>
                <span className="text-[var(--muted)]">{item.score}</span>
              </button>
            </li>
          ))}
          {preview.remaining > 0 ? (
            <li className="px-1.5 pt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
              +{preview.remaining} more · zoom in
            </li>
          ) : null}
        </ul>
      </div>
      <span
        aria-hidden
        className="absolute h-2 w-2 rotate-45 border border-[var(--border-strong)] bg-[rgba(13,13,16,0.94)]"
        style={{
          left: `${clampedArrowPct}%`,
          transform: "translateX(-50%)",
          ...(placeAbove
            ? { bottom: -5, borderTop: "0", borderLeft: "0" }
            : { top: -5, borderBottom: "0", borderRight: "0" })
        }}
      />
    </div>
  );
}
