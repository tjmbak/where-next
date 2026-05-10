"use client";

import { useEffect, useRef, useState } from "react";
import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnchorTypeIcon, anchorIconKindFor, gradientTokensFor } from "@/components/itineraries/canvas/AnchorTypeIcon";
import {
  getEventsForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import type { ItineraryDay } from "@/lib/itineraries/generate";
import type { Destination } from "@/types/content";

type DayCardCanvasProps = {
  day: ItineraryDay;
  destination: Destination;
  isLegStart: boolean;
  isFirstDay: boolean;
  isHighlighted: boolean;
  onHover?: (dayNumber: number | null) => void;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DayCardCanvas({
  day,
  destination,
  isLegStart,
  isFirstDay,
  isHighlighted,
  onHover
}: DayCardCanvasProps) {
  const sortableId = `day-${day.day}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver, over } = useSortable({
    id: sortableId,
    data: { kind: "day", dayNumber: day.day }
  });
  const { active } = useDndContext();
  const activeKind = active?.data?.current?.kind as "anchor" | "day" | undefined;
  const isAnchorOver = isOver && activeKind === "anchor" && over?.id === sortableId;

  // Track anchor swaps to animate the content. When `day.anchorId` changes,
  // we briefly trigger a "swap" state that fades the old content out and the
  // new content in, plus pulses the border in signal-orange.
  const [swapping, setSwapping] = useState(false);
  const previousAnchorIdRef = useRef<string | null>(day.anchorId);
  useEffect(() => {
    if (previousAnchorIdRef.current !== day.anchorId) {
      previousAnchorIdRef.current = day.anchorId;
      setSwapping(true);
      const handle = window.setTimeout(() => setSwapping(false), 600);
      return () => window.clearTimeout(handle);
    }
  }, [day.anchorId]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  const dateLabel = day.dateISO
    ? `${DOW[new Date(day.dateISO + "T12:00:00Z").getUTCDay()]} ${day.dateISO}`
    : `Day ${day.day}`;

  const event = day.anchorKind === "event" && day.anchorId
    ? getEventsForDestination(destination.slug).find((e) => e.id === day.anchorId) ?? null
    : null;
  const venue = day.anchorKind === "venue" && day.anchorId
    ? getVenuesForDestination(destination.slug).find((v) => v.id === day.anchorId) ?? null
    : null;

  const iconKind = anchorIconKindFor({
    kind: day.anchorKind,
    type: event?.type ?? venue?.type
  });
  const tokens = gradientTokensFor(iconKind);
  const isPeakNight = day.dateISO
    ? [4, 5, 6].includes(new Date(day.dateISO + "T12:00:00Z").getUTCDay())
    : false;

  return (
    <li
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => onHover?.(day.day)}
      onMouseLeave={() => onHover?.(null)}
      className={`relative ${isLegStart && !isFirstDay ? "mt-8" : ""}`}
    >
      {isLegStart ? (
        <div className="mb-4 flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
            {isFirstDay ? "starts in" : "next stop"}
          </span>
          <span className="h-px flex-1 bg-[var(--border)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
            {destination.city}
          </span>
        </div>
      ) : null}

      <div
        className={`group relative overflow-hidden rounded-2xl border bg-[var(--surface)] transition-all duration-200 ${
          isAnchorOver
            ? "border-[var(--signal)] ring-2 ring-[var(--signal)]/40 -translate-y-0.5"
            : swapping
              ? "border-[var(--signal)]/60 ring-1 ring-[var(--signal)]/30"
              : isHighlighted
                ? "border-[var(--foreground)]/30 -translate-y-0.5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.65)]"
                : "border-[var(--border)] hover:border-[var(--border-strong)] hover:-translate-y-0.5"
        }`}
      >
        {/* Tone-tinted gradient wash backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${tokens.from} 0%, ${tokens.via} 45%, ${tokens.to} 100%)`
          }}
        />

        <div className="relative grid grid-cols-[56px_1fr] gap-4 p-5 sm:grid-cols-[64px_1fr]">
          {/* Left rail: drag handle, day number, anchor icon */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              {...listeners}
              {...attributes}
              aria-label="Drag to reorder"
              className="grid h-7 w-7 cursor-grab touch-none place-items-center rounded-md text-[var(--muted-2)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)] active:cursor-grabbing"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <circle cx="3" cy="3" r="1" fill="currentColor" />
                <circle cx="9" cy="3" r="1" fill="currentColor" />
                <circle cx="3" cy="6" r="1" fill="currentColor" />
                <circle cx="9" cy="6" r="1" fill="currentColor" />
                <circle cx="3" cy="9" r="1" fill="currentColor" />
                <circle cx="9" cy="9" r="1" fill="currentColor" />
              </svg>
            </button>

            <div className="text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                d{String(day.day).padStart(2, "0")}
              </p>
              <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                {day.dateISO ? DOW[new Date(day.dateISO + "T12:00:00Z").getUTCDay()] : "—"}
              </p>
            </div>

            <div className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--background)]/50 text-[var(--foreground)]/80">
              <AnchorTypeIcon kind={iconKind} size={18} />
            </div>

            {isPeakNight && day.anchorKind !== "free" ? (
              <span className="rounded-full border border-[var(--signal)]/40 bg-[var(--signal)]/10 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-[var(--signal)]">
                peak
              </span>
            ) : null}
          </div>

          {/* Right column: content */}
          <div className="min-w-0">
            <p className="flex items-baseline gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              <span className="text-[var(--signal)]">
                {day.anchorKind === "event"
                  ? event?.type.replace("-", " ") ?? "event"
                  : day.anchorKind === "venue"
                    ? "venue"
                    : "open day"}
              </span>
              <span>{dateLabel}</span>
              <span className="ml-auto truncate text-[var(--muted-2)]">{day.neighborhood}</span>
            </p>

            <div
              key={`day-content-${day.anchorId ?? "free"}-${day.day}`}
              className="wn-day-content"
            >
              <h3 className="mt-2 line-clamp-2 text-[20px] font-medium leading-[1.2] tracking-[-0.01em] text-[var(--foreground)]">
                {day.anchorTitle}
              </h3>
              {day.anchorWhy ? (
                <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-[var(--muted)]">{day.anchorWhy}</p>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
              <span className="truncate">am · {day.meal_morning}</span>
              <span className="truncate">pm · {day.meal_evening}</span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <CostMeter low={day.costBandUsd.low} high={day.costBandUsd.high} />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                ${day.costBandUsd.low}–${day.costBandUsd.high}
              </span>
            </div>
          </div>
        </div>

        {/* Drop indicator overlay */}
        {isAnchorOver ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[var(--signal)]/12">
            <div className="flex items-center gap-2 rounded-full border border-[var(--signal)] bg-[var(--background)]/95 px-4 py-1.5 shadow-lg backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--signal)]" />
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--signal)]">
                drop to swap
              </span>
            </div>
          </div>
        ) : null}

        {/* Swap pulse ring */}
        {swapping && !isAnchorOver ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-[var(--signal)]/0 animate-[wn-swap-pulse_0.6s_ease-out]"
          />
        ) : null}
      </div>
    </li>
  );
}

function CostMeter({ low, high }: { low: number; high: number }) {
  // Map per-person daily cost band to a 0..6 scale for visual dots.
  const lowSegments = costToSegments(low);
  const highSegments = costToSegments(high);
  return (
    <div className="flex items-center gap-1" aria-label={`cost band $${low} to $${high}`}>
      {Array.from({ length: 6 }, (_, i) => {
        const filled = i < highSegments;
        const lit = i < lowSegments;
        return (
          <span
            key={i}
            className={`h-1 w-3 rounded-full transition ${
              lit ? "bg-[var(--signal)]" : filled ? "bg-[var(--foreground)]/55" : "bg-[var(--border-strong)]"
            }`}
          />
        );
      })}
    </div>
  );
}

function costToSegments(usd: number): number {
  if (usd < 80) return 1;
  if (usd < 150) return 2;
  if (usd < 230) return 3;
  if (usd < 350) return 4;
  if (usd < 500) return 5;
  return 6;
}
