"use client";

import { useEffect, useRef, useState } from "react";
import { WorldMap, toPercent } from "@/components/map/WorldMap";
import { getMonthLabel } from "@/data/taxonomy";
import type { Destination, MonthNumber, MonthlyDestinationScore } from "@/types/content";

type MapSheetProps = {
  month: MonthNumber;
  destinations: Array<{ destination: Destination; score: MonthlyDestinationScore }>;
  selectedSlug?: string;
  onSelect: (slug: string) => void;
  /** Hide the floating pill, e.g. while the compare tray occupies the same spot. */
  pillHidden?: boolean;
};

// A world map is ~2.5:1, so at phone width it's a strip with unreadable dots.
// Below `lg` render it at this width and let it pan; above, it fits the screen.
const MAP_WIDTH = 900;

export function MapSheet({ month, destinations, selectedSlug, onSelect, pillHidden = false }: MapSheetProps) {
  const [open, setOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openSheet = () => {
    setOpen(true);
    requestAnimationFrame(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const focus = destinations.find((d) => d.destination.slug === selectedSlug) ?? destinations[0];
      const x = focus ? toPercent(focus.destination.coordinates.lat, focus.destination.coordinates.lng).x / 100 : 0.5;
      scroller.scrollLeft = Math.max(0, x * MAP_WIDTH - scroller.clientWidth / 2);
    });
  };

  return (
    <>
      {!pillHidden && !open ? (
        <button
          type="button"
          onClick={openSheet}
          className="wn-hide-while-searching fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 z-40 inline-flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--foreground)] px-5 text-[14px] font-medium text-[var(--background)] shadow-[0_12px_30px_-10px_rgba(28,22,18,0.6)] transition hover:scale-105 active:scale-95 md:bottom-8"
        >
          Map
          <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
            <path d="m9 4-5 2v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
            <path d="M9 4v14M15 6v14" />
          </svg>
        </button>
      ) : null}

      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Map of cities" className="fixed inset-0 z-[60] flex flex-col bg-[var(--background)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 pb-3 pt-[calc(env(safe-area-inset-top)+0.875rem)] sm:px-10">
            <div>
              <p className="text-[16px] font-medium text-[var(--foreground)]">{getMonthLabel(month)}</p>
              <p className="text-[13px] font-medium text-[var(--muted)]">
                {destinations.length} cities<span className="lg:hidden"> · Drag to explore</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close map"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-strong)] text-[var(--foreground)] active:scale-95"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div ref={scrollerRef} className="wn-swipe flex flex-1 items-center overflow-x-auto overscroll-contain">
            <div style={{ "--map-w": `${MAP_WIDTH}px` } as React.CSSProperties} className="w-[var(--map-w)] shrink-0 px-4 lg:mx-auto lg:w-full lg:max-w-[1280px] lg:px-10">
              <WorldMap
                month={month}
                destinations={destinations}
                selectedSlug={selectedSlug}
                onSelect={(slug) => {
                  setOpen(false);
                  onSelect(slug);
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mx-auto mb-[calc(env(safe-area-inset-bottom)+1.25rem)] inline-flex h-11 items-center gap-2 rounded-full bg-[var(--foreground)] px-5 text-[14px] font-medium text-[var(--background)] active:scale-95"
          >
            Show list
          </button>
        </div>
      ) : null}
    </>
  );
}
