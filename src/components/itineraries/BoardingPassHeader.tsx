import { MiniMap } from "@/components/visual/MiniMap";
import type { Itinerary } from "@/lib/itineraries/generate";
import type { Destination } from "@/types/content";

type BoardingPassHeaderProps = {
  destination: Destination;
  itinerary: Itinerary;
  ticketNo?: string;
  totalLow: number;
  totalHigh: number;
};

export function BoardingPassHeader({
  destination,
  itinerary,
  ticketNo,
  totalLow,
  totalHigh
}: BoardingPassHeaderProps) {
  const dot = {
    lat: destination.coordinates.lat,
    lng: destination.coordinates.lng,
    label: destination.city,
    size: "peak" as const
  };
  const dateLabel =
    itinerary.startDate && itinerary.endDate
      ? `${formatDate(itinerary.startDate)} → ${formatDate(itinerary.endDate)}`
      : `${itinerary.durationDays} days`;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-6 sm:p-8">
      {/* Watermark wordmark behind everything */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-2 select-none font-mono text-[clamp(7rem,16vw,12rem)] font-medium leading-none tracking-[-0.04em] text-[var(--foreground)]/[0.03]"
      >
        WN
      </span>

      <div className="relative flex items-center justify-between gap-4 border-b border-dashed border-[var(--border-strong)] pb-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted)]">
          where next · boarding pass
        </p>
        {ticketNo ? (
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
            no. {ticketNo}
          </p>
        ) : null}
      </div>

      <div className="relative mt-6 grid gap-7 sm:grid-cols-[auto_1fr] sm:gap-8">
        <div className="flex flex-col items-center sm:items-start">
          <MiniMap dots={[dot]} size={104} />
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            {destination.region.toLowerCase()}
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              destination
            </p>
            <h1 className="mt-1 text-[clamp(2rem,5.5vw,3.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
              {destination.city}
            </h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
              {destination.country}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-dashed border-[var(--border)] pt-4 sm:grid-cols-3">
            <Stamp label="dates" value={dateLabel} />
            <Stamp label="duration" value={`${itinerary.durationDays} days`} />
            <Stamp label="budget" value={`${itinerary.budgetBand} · $${totalLow.toLocaleString()}–$${totalHigh.toLocaleString()}`} />
            <Stamp
              label="vibe"
              value={
                itinerary.vibeTags.length > 0
                  ? itinerary.vibeTags.map((t) => t.replace("-", " ")).join(" × ")
                  : "any"
              }
              fullWidth
            />
          </dl>
        </div>
      </div>

      {/* Perforated edge */}
      <div className="relative mt-7 flex items-center gap-3 border-t border-dashed border-[var(--border-strong)] pt-5">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[var(--muted-2)]">
          {itinerary.title}
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
          curated · stitched · saved
        </span>
      </div>
    </article>
  );
}

function Stamp({ label, value, fullWidth }: { label: string; value: string; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-2 sm:col-span-3" : ""}>
      <dt className="font-mono text-[9px] uppercase tracking-[0.28em] text-[var(--muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] leading-[1.4] text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toLowerCase();
}
