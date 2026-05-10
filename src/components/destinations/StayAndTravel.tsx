import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { getMonthLabel } from "@/data/taxonomy";
import type { Destination, MonthNumber } from "@/types/content";

type StayAndTravelProps = {
  destination: Destination;
  month?: MonthNumber;
  // Explicit trip-date range (used by itinerary view). When provided, takes
  // precedence over `month` for hotel/flight URL building.
  startDate?: string | null;
  endDate?: string | null;
  homeAirport?: string | null;
};

function bookingUrl(
  destination: Destination,
  args: { startDate?: string | null; endDate?: string | null; month?: MonthNumber }
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
  args: { startDate?: string | null; endDate?: string | null; month?: MonthNumber; origin?: string }
) {
  const origin = args.origin ?? "anywhere";
  const dest = encodeURIComponent(destination.city);
  const range = resolveDateRange(args);
  // Skyscanner accepts depart/return as YYYY-MM-DD via query when the path
  // form lacks specifics. We use the search-style URL for reliability.
  const params = new URLSearchParams();
  if (range.checkin) params.set("outboundaltstartdate", range.checkin);
  if (range.checkout) params.set("inboundaltsenddate", range.checkout);
  const qs = params.toString();
  return `https://www.skyscanner.com/transport/flights/${origin}/${dest}/${qs ? `?${qs}` : ""}`;
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
}): { checkin: string | null; checkout: string | null } {
  if (args.startDate && args.endDate) {
    return { checkin: args.startDate, checkout: args.endDate };
  }
  if (args.startDate) {
    return { checkin: args.startDate, checkout: null };
  }
  if (args.month) {
    return {
      checkin: firstDayOfMonth(args.month),
      checkout: firstDayOfNextMonth(args.month)
    };
  }
  return { checkin: null, checkout: null };
}

function firstDayOfMonth(month: MonthNumber) {
  const year = new Date().getUTCFullYear();
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

function firstDayOfNextMonth(month: MonthNumber) {
  const year = new Date().getUTCFullYear();
  const nextMonth = ((month % 12) + 1) as MonthNumber;
  const nextYear = month === 12 ? year + 1 : year;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export function StayAndTravel({ destination, month, startDate, endDate, homeAirport }: StayAndTravelProps) {
  const monthLabel = month ? getMonthLabel(month).toLowerCase() : null;
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
              : monthLabel
                ? `${monthLabel} 2026 stays in ${destination.city}`
                : `Stays in ${destination.city}`
          }
          href={bookingUrl(destination, { startDate, endDate, month })}
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
              : `Flights to ${destination.city}${homeAirport ? ` from ${homeAirport}` : ""}`
          }
          href={skyscannerUrl(destination, { startDate, endDate, month, origin: homeAirport ?? "anywhere" })}
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
