import {
  getEventsForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { StayAndTravel } from "@/components/destinations/StayAndTravel";
import { ItineraryDayEditor } from "@/components/itineraries/ItineraryDayEditor";
import type { Itinerary, ItineraryDay } from "@/lib/itineraries/generate";
import type { Destination } from "@/types/content";

type ItineraryViewProps = {
  itinerary: Itinerary;
  destination: Destination;
  // When provided, each day shows a swap-anchor affordance.
  onSwapDay?: (dayNumber: number, patch: Partial<ItineraryDay>) => void;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ItineraryView({ itinerary, destination, onSwapDay }: ItineraryViewProps) {
  const events = getEventsForDestination(destination.slug);
  const venues = getVenuesForDestination(destination.slug);
  const eventById = new Map(events.map((e) => [e.id, e]));
  const venueById = new Map(venues.map((v) => [v.id, v]));

  const totalLow = itinerary.days.reduce((sum, d) => sum + d.costBandUsd.low, 0);
  const totalHigh = itinerary.days.reduce((sum, d) => sum + d.costBandUsd.high, 0);

  const allAnchorIds = itinerary.days
    .map((d) => d.anchorId)
    .filter((id): id is string => Boolean(id));

  return (
    <div>
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

      <ol className="mt-10 space-y-10">
        {itinerary.days.map((day) => {
          const event = day.anchorKind === "event" && day.anchorId ? eventById.get(day.anchorId) : null;
          const venue = day.anchorKind === "venue" && day.anchorId ? venueById.get(day.anchorId) : null;
          const dateLabel = day.dateISO
            ? `${DOW[new Date(day.dateISO + "T12:00:00Z").getUTCDay()]} ${day.dateISO}`
            : `Day ${day.day}`;

          return (
            <li key={day.day} className="grid gap-4 border-l border-[var(--border)] pl-5 sm:grid-cols-[120px_1fr] sm:gap-6 sm:pl-0 sm:border-l-0">
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                day {String(day.day).padStart(2, "0")}
                <br />
                <span className="text-[var(--muted-2)]">{dateLabel}</span>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--signal)]">
                  {day.anchorKind === "event"
                    ? event?.type.replace("-", " ") ?? "event"
                    : day.anchorKind === "venue"
                      ? venue?.type.replace("-", " ") ?? "venue"
                      : "open day"}
                  {" · "}
                  {day.neighborhood}
                </p>
                <h3 className="mt-2 text-[22px] font-medium leading-tight text-[var(--foreground)]">
                  {day.anchorTitle}
                </h3>
                {day.anchorWhy ? (
                  <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--foreground)]/85">{day.anchorWhy}</p>
                ) : null}

                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <Field label="morning">{day.meal_morning}</Field>
                  <Field label="evening">{day.meal_evening}</Field>
                  {day.transferNote ? <Field label="getting around">{day.transferNote}</Field> : null}
                  <Field label="cost band · per person">
                    ${day.costBandUsd.low.toLocaleString()} – ${day.costBandUsd.high.toLocaleString()}
                  </Field>
                </dl>

                {event?.ticketUrl ? (
                  <TrackedOutboundLink
                    href={event.ticketUrl}
                    eventLabel={`itinerary-${event.id}`}
                    destinationSlug={destination.slug}
                    provider="viagogo"
                    className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                  >
                    grab tickets ↗
                  </TrackedOutboundLink>
                ) : event?.sourceUrl ? (
                  <TrackedOutboundLink
                    href={event.sourceUrl}
                    eventLabel={`itinerary-${event.id}-source`}
                    destinationSlug={destination.slug}
                    className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                  >
                    official source ↗
                  </TrackedOutboundLink>
                ) : venue?.officialUrl ? (
                  <TrackedOutboundLink
                    href={venue.officialUrl}
                    eventLabel={`itinerary-venue-${venue.id}`}
                    destinationSlug={destination.slug}
                    className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--foreground)] transition hover:text-[var(--signal)]"
                  >
                    venue site ↗
                  </TrackedOutboundLink>
                ) : null}

                {onSwapDay ? (
                  <ItineraryDayEditor
                    destination={destination}
                    day={day}
                    excludeAnchorIds={allAnchorIds}
                    onSwap={(patch) => onSwapDay(day.day, patch)}
                  />
                ) : null}
              </div>
            </li>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-[14px] leading-6 text-[var(--foreground)]">{children}</dd>
    </div>
  );
}
