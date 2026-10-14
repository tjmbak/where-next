"use client";

import { useEffect, useRef, useState } from "react";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { AnchorTypeIcon, anchorIconKindFor, gradientTokensFor } from "@/components/itineraries/AnchorTypeIcon";
import { ItineraryDayEditor } from "@/components/itineraries/ItineraryDayEditor";
import type { ItineraryDay } from "@/lib/itineraries/generate";
import type { Destination, Event, Venue } from "@/types/content";


const GENERIC_MEALS = new Set(["neighborhood breakfast", "local dinner near tonight's anchor"]);

type BentoDayCardProps = {
  day: ItineraryDay;
  event: Event | null;
  venue: Venue | null;
  dayDestination: Destination;
  onSwapDay: ((dayNumber: number, patch: Partial<ItineraryDay>) => void) | undefined;
  excludeAnchorIds: string[];
};

export function BentoDayCard({ day, event, venue, dayDestination, onSwapDay, excludeAnchorIds }: BentoDayCardProps) {
  const iconKind = anchorIconKindFor({
    kind: day.anchorKind,
    type: event?.type ?? venue?.type
  });
  const tokens = gradientTokensFor(iconKind);
  const isPeakNight = day.dateISO
    ? [4, 5, 6].includes(new Date(day.dateISO + "T12:00:00Z").getUTCDay())
    : false;
  const dateLabel = day.dateISO
    ? new Date(day.dateISO + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      })
    : `Day ${day.day}`;
  const neighborhood = day.neighborhood && !day.neighborhood.startsWith("(") ? day.neighborhood : null;
  const kindLabel = capitalize(
    day.anchorKind === "event"
      ? (event?.type.replace("-", " ") ?? "event")
      : day.anchorKind === "venue"
        ? (venue?.type.replace("-", " ") ?? "venue")
        : "open day"
  );

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

  return (
    <li
      className="wn-itinerary-day relative"
      style={{ animationDelay: `${(day.day - 1) * 0.1}s` }}
    >
      <div
        className={`group relative overflow-hidden rounded-2xl border bg-[var(--surface)] transition-all duration-200 ${
          swapping
            ? "border-[var(--signal)]/60 ring-1 ring-[var(--signal)]/30"
            : "border-[var(--border)] hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(0,0,0,0.55)]"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${tokens.from} 0%, ${tokens.via} 45%, ${tokens.to} 100%)`
          }}
        />

        <div className="relative grid grid-cols-[56px_1fr] gap-3 p-4 sm:grid-cols-[88px_1fr] sm:gap-5 sm:p-6">
          <div className="flex flex-col items-center gap-2 sm:gap-3">
            <div className="text-center">
              <p className="text-[11px] font-medium text-[var(--muted)]">Day</p>
              <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums text-[var(--foreground)] sm:text-3xl">
                {day.day}
              </p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--background)]/65 text-[var(--foreground)]/85 sm:h-11 sm:w-11">
              <AnchorTypeIcon kind={iconKind} size={20} />
            </div>
            {isPeakNight && day.anchorKind !== "free" ? (
              <span className="rounded-full bg-[var(--signal)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--signal)]">
                Peak night
              </span>
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] text-[var(--muted)]">
              <span className="font-semibold text-[var(--signal)]">{kindLabel}</span>
              <span aria-hidden>·</span>
              <span>{dateLabel}</span>
              {neighborhood ? (
                <span className="basis-full truncate sm:ml-auto sm:basis-auto">{neighborhood}</span>
              ) : null}
            </p>

            <div key={`day-content-${day.anchorId ?? "free"}-${day.day}`} className="wn-day-content">
              <h3 className="mt-2 break-words text-[clamp(1.15rem,4vw,1.6rem)] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--foreground)] sm:mt-3">
                {day.anchorTitle}
              </h3>
              {day.anchorWhy ? (
                <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--foreground)]/85">
                  {day.anchorWhy}
                </p>
              ) : null}
            </div>

            <dl className="mt-4 grid gap-x-6 gap-y-2.5 text-[14px] sm:grid-cols-2">
              {GENERIC_MEALS.has(day.meal_morning) ? null : (
                <div>
                  <dt className="text-[12px] font-medium text-[var(--muted)]">Morning</dt>
                  <dd className="mt-0.5 truncate text-[var(--foreground)]/85">{capitalize(day.meal_morning)}</dd>
                </div>
              )}
              {GENERIC_MEALS.has(day.meal_evening) ? null : (
                <div>
                  <dt className="text-[12px] font-medium text-[var(--muted)]">Evening</dt>
                  <dd className="mt-0.5 truncate text-[var(--foreground)]/85">{capitalize(day.meal_evening)}</dd>
                </div>
              )}
              {day.transferNote ? (
                <div className="sm:col-span-2">
                  <dt className="text-[12px] font-medium text-[var(--muted)]">Getting around</dt>
                  <dd className="mt-0.5 text-[var(--foreground)]/85">{day.transferNote}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-[var(--border)] pt-4">
              <div className="flex items-center gap-2.5">
                <CostMeter low={day.costBandUsd.low} high={day.costBandUsd.high} />
                <span className="text-[13px] tabular-nums text-[var(--muted)]">
                  ${day.costBandUsd.low}–${day.costBandUsd.high}/day
                </span>
              </div>

              <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
                {event?.ticketUrl ? (
                  <TrackedOutboundLink
                    href={event.ticketUrl}
                    eventLabel={`itinerary-${event.id}`}
                    destinationSlug={dayDestination.slug}
                    provider="viagogo"
                    preview={{ kind: "event", eventId: event.id }}
                    className="inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-[var(--foreground)] transition hover:text-[var(--signal)]"
                  >
                    Get tickets ↗
                  </TrackedOutboundLink>
                ) : event?.sourceUrl ? (
                  <TrackedOutboundLink
                    href={event.sourceUrl}
                    eventLabel={`itinerary-${event.id}-source`}
                    destinationSlug={dayDestination.slug}
                    preview={{ kind: "event", eventId: event.id }}
                    className="inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-[var(--foreground)] transition hover:text-[var(--signal)]"
                  >
                    Official page ↗
                  </TrackedOutboundLink>
                ) : venue?.officialUrl ? (
                  <TrackedOutboundLink
                    href={venue.officialUrl}
                    eventLabel={`itinerary-venue-${venue.id}`}
                    destinationSlug={dayDestination.slug}
                    preview={{ kind: "venue", venueId: venue.id }}
                    className="inline-flex h-10 items-center gap-1.5 text-[14px] font-semibold text-[var(--foreground)] transition hover:text-[var(--signal)]"
                  >
                    Venue site ↗
                  </TrackedOutboundLink>
                ) : null}
              </div>
            </div>

            {onSwapDay ? (
              <div className="mt-3">
                <ItineraryDayEditor
                  destination={dayDestination}
                  day={day}
                  excludeAnchorIds={excludeAnchorIds}
                  onSwap={(patch) => onSwapDay(day.day, patch)}
                />
              </div>
            ) : null}
          </div>
        </div>

        {swapping ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl animate-[wn-swap-pulse_0.6s_ease-out]"
          />
        ) : null}
      </div>
    </li>
  );
}

function CostMeter({ low, high }: { low: number; high: number }) {
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

function capitalize(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
