import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { getMonthLabel } from "@/data/taxonomy";
import type { Destination, MonthNumber } from "@/types/content";

type StayAndTravelProps = {
  destination: Destination;
  month?: MonthNumber;
  homeAirport?: string | null;
};

function bookingUrl(destination: Destination, month?: MonthNumber) {
  const checkin = month ? firstDayOfMonth(month) : null;
  const checkout = month ? firstDayOfNextMonth(month) : null;
  const params = new URLSearchParams({
    ss: `${destination.city}, ${destination.country}`,
    ...(checkin ? { checkin } : {}),
    ...(checkout ? { checkout } : {}),
    selected_currency: "USD"
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

function skyscannerUrl(destination: Destination, month?: MonthNumber, origin = "anywhere") {
  // Skyscanner browse URLs accept a city slug fragment; we degrade to a search
  // param if we don't have a verified slug.
  const yyyymm = month
    ? `${new Date().getUTCFullYear()}-${String(month).padStart(2, "0")}`
    : "";
  const dest = encodeURIComponent(destination.city);
  const path = `https://www.skyscanner.com/transport/flights/${origin}/${dest}/${yyyymm ? `?inboundaltsenddate=${yyyymm}-28&outboundaltstartdate=${yyyymm}-01` : ""}`;
  return path;
}

function gygUrl(destination: Destination) {
  const params = new URLSearchParams({ q: `${destination.city} music` });
  return `https://www.getyourguide.com/s/?${params.toString()}`;
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

export function StayAndTravel({ destination, month, homeAirport }: StayAndTravelProps) {
  const monthLabel = month ? getMonthLabel(month).toLowerCase() : null;

  return (
    <section>
      <div className="mb-7 flex items-center gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">stay & travel</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--foreground)]">
          {monthLabel ? `${destination.city.toLowerCase()} · ${monthLabel}` : destination.city.toLowerCase()}
        </h2>
      </div>

      <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--border)] sm:grid-cols-3">
        <Tile
          eyebrow="hotels"
          label="search booking.com"
          subtitle={monthLabel ? `${monthLabel} 2026 stays in ${destination.city}` : `Stays in ${destination.city}`}
          href={bookingUrl(destination, month)}
          provider="booking"
          destinationSlug={destination.slug}
          eventLabel="hotels-booking"
        />
        <Tile
          eyebrow="flights"
          label="search skyscanner"
          subtitle={`Flights to ${destination.city}${homeAirport ? ` from ${homeAirport}` : ""}`}
          href={skyscannerUrl(destination, month, homeAirport ?? "anywhere")}
          provider="skyscanner"
          destinationSlug={destination.slug}
          eventLabel="flights-skyscanner"
        />
        <Tile
          eyebrow="experiences"
          label="getyourguide"
          subtitle={`Day plans, transfers, music tours in ${destination.city}`}
          href={gygUrl(destination)}
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
