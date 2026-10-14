import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { EventAudio } from "@/components/audio/EventAudio";
import { OpenEventOnHash } from "@/components/destinations/OpenEventOnHash";
import { artistFromTitle } from "@/lib/artist-from-title";
import type { Event, Venue } from "@/types/content";

type EventListProps = {
  events: Event[];
  venues: Venue[];
  destinationSlug: string;
  today: string;
  /** Group by month instead of week (all-year view). */
  groupByMonth?: boolean;
  periodLabel: "month" | "year";
};

const DAY_MS = 86_400_000;

export function EventList({ events, venues, destinationSlug, today, groupByMonth = false, periodLabel }: EventListProps) {
  const hasEnded = (event: Event) => (event.endDate ?? event.startDate) < today;
  const upcoming = events.filter((event) => !hasEnded(event));
  const ended = events.filter(hasEnded);
  const venueName = new Map(venues.map((venue) => [venue.id, venue.name]));

  const groups: Array<{ key: string; label: string; events: Event[] }> = [];
  for (const event of upcoming) {
    // Ongoing runs sit with the current week rather than the week they opened.
    const anchor = event.startDate < today ? today : event.startDate;
    const key = groupByMonth ? anchor.slice(0, 7) : mondayOf(anchor);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(event);
    else groups.push({ key, label: groupByMonth ? monthLabel(key) : weekLabel(key, today), events: [event] });
  }

  const row = (event: Event) => (
    <EventRow
      key={event.id}
      event={event}
      venue={event.venueId ? venueName.get(event.venueId) : undefined}
      destinationSlug={destinationSlug}
      ended={hasEnded(event)}
    />
  );

  return (
    <>
      <OpenEventOnHash />
      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.key}>
            <div className="mb-1 flex items-baseline justify-between border-b border-[var(--border-strong)] pb-2">
              <h3 className="text-[14px] font-semibold text-[var(--foreground)]">{group.label}</h3>
              <span className="text-[13px] text-[var(--muted)]">
                {group.events.length} {group.events.length === 1 ? "event" : "events"}
              </span>
            </div>
            <ol>{group.events.map(row)}</ol>
          </section>
        ))}
      </div>
      {ended.length > 0 ? (
        <details className="group/ended mt-8 rounded-xl border border-[var(--border)]" open={upcoming.length === 0}>
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-[14px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)] [&::-webkit-details-marker]:hidden">
            <span>
              {ended.length} already happened this {periodLabel}
            </span>
            <span aria-hidden className="transition group-open/ended:rotate-45">+</span>
          </summary>
          <ol className="px-5 pb-2">{ended.map(row)}</ol>
        </details>
      ) : null}
    </>
  );
}

function EventRow({
  event,
  venue,
  destinationSlug,
  ended
}: {
  event: Event;
  venue?: string;
  destinationSlug: string;
  ended: boolean;
}) {
  const start = new Date(`${event.startDate}T00:00:00Z`);
  const valid = !Number.isNaN(start.getTime());
  const weekday = valid ? start.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }) : "";
  const day = valid ? start.getUTCDate() : "—";
  const month = valid ? start.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }) : "";
  const run = formatRunLength(event.startDate, event.endDate, event.type);
  const until =
    event.endDate && event.endDate !== event.startDate && (!run || run.includes("week")) ? formatShort(event.endDate) : null;
  const artist = artistFromTitle(event.title, event.type);

  return (
    <li id={`event-${event.id}`} className={`scroll-mt-28 border-b border-[var(--border)] last:border-b-0 ${ended ? "opacity-55" : ""}`}>
      <details className="group/row">
        <summary className="flex cursor-pointer list-none items-start gap-4 py-3.5 transition-colors hover:bg-[var(--surface)]/60 sm:gap-5 sm:py-4 [&::-webkit-details-marker]:hidden">
          <div className="w-11 shrink-0 pt-0.5 text-center sm:w-12">
            <p className="text-[11px] font-medium text-[var(--muted)]">{weekday}</p>
            <p className="text-[20px] font-medium leading-6 text-[var(--foreground)]">{day}</p>
            <p className="text-[11px] text-[var(--muted)]">{month}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-[15px] font-medium leading-snug text-[var(--foreground)] sm:text-[17px]">
              {event.title}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-[var(--muted)]">
              <span className="font-medium capitalize text-[var(--signal)]">{event.type.replaceAll("-", " ")}</span>
              {venue ? <span>· {venue}</span> : null}
              {until ? <span>· until {until}</span> : null}
              {run ? <span>· {run}</span> : null}
              {event.confirmed === false ? (
                <span className="rounded-full border border-dashed border-[var(--border-strong)] px-2 py-px text-[12px]">Expected</span>
              ) : null}
              {ended ? <span className="rounded-full border border-[var(--border)] px-2 py-px text-[12px]">Ended</span> : null}
            </p>
          </div>
          <span
            aria-hidden
            className="mt-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition group-open/row:rotate-45 group-hover/row:border-[var(--border-strong)] group-hover/row:text-[var(--foreground)]"
          >
            +
          </span>
        </summary>
        <div className="pb-5 pl-[3.75rem] pr-2 sm:pl-[4.25rem]">
          <p className="max-w-2xl text-[14px] leading-6 text-[var(--muted)] sm:text-[15px] sm:leading-7">{event.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <TrackedOutboundLink
              href={event.ticketUrl ?? event.sourceUrl}
              eventLabel={event.title}
              destinationSlug={destinationSlug}
              provider={event.ticketUrl ? "viagogo" : "raw"}
              preview={{ kind: "event", eventId: event.id }}
              className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-4 transition hover:text-[var(--signal)] sm:min-h-0"
            >
              Official source
              <span aria-hidden>↗</span>
            </TrackedOutboundLink>
            {artist ? <EventAudio artist={artist} /> : null}
          </div>
        </div>
      </details>
    </li>
  );
}

function mondayOf(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return new Date(date.getTime() - offset * DAY_MS).toISOString().slice(0, 10);
}

function weekLabel(mondayIso: string, today: string): string {
  const weeksAway = Math.round((Date.parse(mondayIso) - Date.parse(mondayOf(today))) / (7 * DAY_MS));
  const sunday = new Date(Date.parse(mondayIso) + 6 * DAY_MS).toISOString().slice(0, 10);
  const range = `${formatShort(mondayIso)} – ${formatShort(sunday)}`;
  if (weeksAway === 0) return `This week · ${range}`;
  if (weeksAway === 1) return `Next week · ${range}`;
  return range;
}

function monthLabel(yearMonth: string): string {
  return new Date(`${yearMonth}-01T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}

function formatShort(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function formatRunLength(start: string, end: string | undefined, type: string): string | null {
  if (!end) return null;
  const s = new Date(start);
  const e = new Date(end);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  const days = Math.round((e.getTime() - s.getTime()) / DAY_MS) + 1;
  if (days <= 1) return null;
  if (days >= 14) {
    const weeks = Math.round(days / 7);
    return type === "residency" ? `${weeks}-week run` : `recurring · ${weeks} weeks`;
  }
  return `${days} days`;
}
