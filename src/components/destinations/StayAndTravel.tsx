import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { getMonthLabel } from "@/data/taxonomy";
import { airportForDestination } from "@/lib/airports";
import type { Destination, MonthNumber } from "@/types/content";

type StayAndTravelProps = {
  destination: Destination;
  month?: MonthNumber;
  year?: number;
  // Explicit trip-date range (used by itinerary view). When provided, takes
  // precedence over `month` for hotel/flight URL building.
  startDate?: string | null;
  endDate?: string | null;
  homeAirport?: string | null;
};

function bookingUrl(
  destination: Destination,
  args: { startDate?: string | null; endDate?: string | null; month?: MonthNumber; year?: number }
) {
  const range = resolveDateRange(args);
  const params = new URLSearchParams({
    ss: `${destination.city}, ${destination.country}`,
    ...(range.checkin ? { checkin: range.checkin } : {}),
    ...(range.checkout ? { checkout: range.checkout } : {}),
    selected_currency: "USD"
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function skyscannerUrl(
  destination: Destination,
  args: { startDate?: string | null; endDate?: string | null; month?: MonthNumber; year?: number; origin?: string | null }
) {
  const dest = airportForDestination(destination.slug);
  if (!dest) return "https://www.skyscanner.net/";
  const range = resolveDateRange(args);
  // Skyscanner's partner referral deeplink; origin is optional (they geolocate).
  const params = new URLSearchParams({ destination: dest });
  if (args.origin) params.set("origin", args.origin.toUpperCase());
  if (range.checkin) params.set("outboundDate", range.checkin);
  if (range.checkout) params.set("inboundDate", range.checkout);
  return `https://www.skyscanner.net/g/referrals/v1/flights/day-view/?${params.toString()}`;
}

function gygUrl(destination: Destination, args: { startDate?: string | null; endDate?: string | null }) {
  const params = new URLSearchParams({ q: `${destination.city} music` });
  if (args.startDate) params.set("date_from", args.startDate);
  if (args.endDate) params.set("date_to", args.endDate);
  return `https://www.getyourguide.com/s/?${params.toString()}`;
}

function resolveDateRange(args: {
  startDate?: string | null;
  endDate?: string | null;
  month?: MonthNumber;
  year?: number;
}): { checkin: string | null; checkout: string | null } {
  if (args.startDate && args.endDate) {
    return { checkin: args.startDate, checkout: args.endDate };
  }
  if (args.startDate) {
    return { checkin: args.startDate, checkout: null };
  }
  if (args.month) {
    return nextOpenWeekend(args.month, args.year ?? new Date().getUTCFullYear());
  }
  return { checkin: null, checkout: null };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * A Fri→Mon stay on the first weekend of the month that's still bookable
 * (≥2 days out). If the month has already passed, roll to next year's edition.
 */
function nextOpenWeekend(month: MonthNumber, year: number): { checkin: string; checkout: string } {
  const earliest = new Date();
  earliest.setUTCHours(0, 0, 0, 0);
  earliest.setUTCDate(earliest.getUTCDate() + 2);
  for (const y of [year, year + 1]) {
    const day = new Date(Date.UTC(y, month - 1, 1));
    while (day.getUTCMonth() === month - 1) {
      if (day.getUTCDay() === 5 && day >= earliest) {
        const checkout = new Date(day);
        checkout.setUTCDate(day.getUTCDate() + 3);
        return { checkin: iso(day), checkout: iso(checkout) };
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }
  }
  const fallback = new Date(earliest);
  fallback.setUTCDate(fallback.getUTCDate() + 3);
  return { checkin: iso(earliest), checkout: iso(fallback) };
}

function shortDate(isoDate: string) {
  return new Date(`${isoDate}T00:00:00Z`)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
    .toLowerCase();
}

export function StayAndTravel({ destination, month, year, startDate, endDate, homeAirport }: StayAndTravelProps) {
  const monthLabel = month ? getMonthLabel(month).toLowerCase() : null;
  const weekend = !startDate && month ? resolveDateRange({ month, year }) : null;
  const dateLabel =
    startDate && endDate
      ? `${startDate} → ${endDate}`
      : monthLabel
        ? `${destination.city.toLowerCase()} · ${monthLabel}`
        : destination.city.toLowerCase();

  return (
    <section>
      <div className="mb-7 flex items-center gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">stay & travel</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)]">
          {dateLabel}
        </h2>
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--border)] sm:grid-cols-3">
        <Tile
          eyebrow="hotels"
          label="search booking.com"
          subtitle={
            startDate && endDate
              ? `${startDate} → ${endDate} in ${destination.city}`
              : weekend?.checkin && weekend.checkout
                ? `${shortDate(weekend.checkin)} → ${shortDate(weekend.checkout)} · first open ${monthLabel} weekend`
                : `Stays in ${destination.city}`
          }
          href={bookingUrl(destination, { startDate, endDate, month, year })}
          provider="booking"
          destinationSlug={destination.slug}
          eventLabel="hotels-booking"
        />
        <Tile
          eyebrow="flights"
          label="search skyscanner"
          subtitle={
            startDate && endDate
              ? `Flights ${homeAirport ? `from ${homeAirport} ` : ""}for ${startDate} → ${endDate}`
              : `Flights into ${airportForDestination(destination.slug) ?? destination.city}${homeAirport ? ` from ${homeAirport}` : ""}`
          }
          href={skyscannerUrl(destination, { startDate, endDate, month, year, origin: homeAirport })}
          provider="skyscanner"
          destinationSlug={destination.slug}
          eventLabel="flights-skyscanner"
        />
        <Tile
          eyebrow="experiences"
          label="getyourguide"
          subtitle={`Day plans, transfers, music tours in ${destination.city}`}
          href={gygUrl(destination, { startDate, endDate })}
          provider="gyg"
          destinationSlug={destination.slug}
          eventLabel="experiences-gyg"
        />
      </div>

      <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
        bookings made through these links support Where Next at no cost to you.
      </p>
    </section>
  );
}

function Tile({
  eyebrow,
  label,
  subtitle,
  href,
  provider,
  destinationSlug,
  eventLabel
}: {
  eyebrow: string;
  label: string;
  subtitle: string;
  href: string;
  provider: "booking" | "skyscanner" | "gyg";
  destinationSlug: string;
  eventLabel: string;
}) {
  return (
    <TrackedOutboundLink
      href={href}
      provider={provider}
      destinationSlug={destinationSlug}
      eventLabel={eventLabel}
      className="group flex flex-col gap-2 bg-[var(--background)] p-6 transition hover:bg-[var(--surface)]"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{eyebrow}</span>
      <h3 className="text-[19px] font-medium text-[var(--foreground)]">{label}</h3>
      <p className="text-[13px] leading-6 text-[var(--muted)]">{subtitle}</p>
      <span className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)]/70 transition group-hover:text-[var(--signal)]">
        open
        <span aria-hidden>↗</span>
      </span>
    </TrackedOutboundLink>
  );
}
