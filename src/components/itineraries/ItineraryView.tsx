import { Fragment } from "react";
import {
  getDestinationBySlug,
  getEventsForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import { StayAndTravel } from "@/components/destinations/StayAndTravel";
import { BentoDayCard } from "@/components/itineraries/BentoDayCard";
import type { Itinerary, ItineraryDay } from "@/lib/itineraries/generate";
import type { Destination, Event, Venue } from "@/types/content";

type ItineraryViewProps = {
  itinerary: Itinerary;
  destination: Destination;
  // When provided, each day shows a swap-anchor affordance.
  onSwapDay?: (dayNumber: number, patch: Partial<ItineraryDay>) => void;
  // Hide the lightweight summary header. Used when the page already
  // renders a full-width BoardingPassHeader above this component.
  hideSummary?: boolean;
};

export function ItineraryView({ itinerary, destination, onSwapDay, hideSummary }: ItineraryViewProps) {
  // Build per-leg event/venue lookup so multi-city days find their anchors.
  const legSlugs = itinerary.legs?.map((l) => l.destinationSlug) ?? [destination.slug];
  const eventById = new Map<string, Event>();
  const venueById = new Map<string, Venue>();
  const destinationBySlug = new Map<string, Destination>();
  for (const slug of legSlugs) {
    const d = getDestinationBySlug(slug);
    if (d) destinationBySlug.set(slug, d);
    for (const e of getEventsForDestination(slug)) eventById.set(e.id, e);
    for (const v of getVenuesForDestination(slug)) venueById.set(v.id, v);
  }
  // Fallback legacy: if legs not present, single destination
  if (!destinationBySlug.has(destination.slug)) {
    destinationBySlug.set(destination.slug, destination);
    for (const e of getEventsForDestination(destination.slug)) eventById.set(e.id, e);
    for (const v of getVenuesForDestination(destination.slug)) venueById.set(v.id, v);
  }

  const isMultiCity = (itinerary.legs?.length ?? 1) > 1;

  const totalLow = itinerary.days.reduce((sum, d) => sum + d.costBandUsd.low, 0);
  const totalHigh = itinerary.days.reduce((sum, d) => sum + d.costBandUsd.high, 0);

  const allAnchorIds = itinerary.days
    .map((d) => d.anchorId)
    .filter((id): id is string => Boolean(id));

  return (
    <div>
      {hideSummary ? null : (
      <header className="border-b border-[var(--border)] pb-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
          {itinerary.durationDays}-day plan · {destination.city.toLowerCase()}
          {itinerary.startDate ? ` · ${itinerary.startDate} → ${itinerary.endDate}` : ""}
        </p>
        <h2 className="mt-3 text-[28px] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)] sm:text-[32px]">
          {itinerary.title}
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[var(--muted)]">
          Anchored on {itinerary.days.filter((d) => d.anchorKind === "event").length} events and{" "}
          {itinerary.days.filter((d) => d.anchorKind === "venue").length} venues from the curated calendar. Estimated all-in:{" "}
          <span className="text-[var(--foreground)]">${totalLow.toLocaleString()} – ${totalHigh.toLocaleString()}</span> per person.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {itinerary.vibeTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]"
            >
              {tag.replace("-", " ")}
            </span>
          ))}
          <span className="rounded-full border border-[var(--border)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            budget {itinerary.budgetBand}
          </span>
        </div>
      </header>
      )}

      <ol className={`${hideSummary ? "mt-12" : "mt-10"} space-y-5`}>
        {itinerary.days.map((day, index) => {
          const event: Event | null =
            day.anchorKind === "event" && day.anchorId ? eventById.get(day.anchorId) ?? null : null;
          const venue: Venue | null =
            day.anchorKind === "venue" && day.anchorId ? venueById.get(day.anchorId) ?? null : null;
          const dayDestination = day.legSlug ? destinationBySlug.get(day.legSlug) ?? destination : destination;
          const prevDay = index > 0 ? itinerary.days[index - 1] : null;
          const showLegHeader = isMultiCity && (!prevDay || prevDay.legSlug !== day.legSlug);

          return (
            <Fragment key={day.day}>
              {showLegHeader ? (
                <li
                  className="wn-itinerary-day relative pt-2"
                  style={{ animationDelay: `${(day.day - 1) * 0.1}s` }}
                >
                  <div className="flex items-center gap-3 border-t border-dashed border-[var(--border-strong)] pt-5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
                      {index === 0 ? "starts in" : "next stop"}
                    </span>
                    <span className="h-px flex-1 bg-[var(--border)]" />
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                      {dayDestination.city}
                    </span>
                  </div>
                </li>
              ) : null}
              <BentoDayCard
                day={day}
                event={event}
                venue={venue}
                dayDestination={dayDestination}
                onSwapDay={onSwapDay}
                excludeAnchorIds={allAnchorIds}
              />
            </Fragment>
          );
        })}
      </ol>

      <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
        anchors curated · suggested neighborhoods + meals from the destination guide
      </p>

      <div className="mt-14 border-t border-[var(--border)] pt-10">
        <StayAndTravel
          destination={destination}
          startDate={itinerary.startDate}
          endDate={itinerary.endDate}
        />
      </div>
    </div>
  );
}

