// Weekend-by-weekend grouping for destination guides. People book weekends,
// not months — this gives the calendar a scannable rhythm the flat timeline
// can't. Pure date math over the already-filtered month event list.

import type { Event, MonthNumber } from "@/types/content";

export type WeekendGroup = {
  /** e.g. "aug 7–9" */
  label: string;
  fridayIso: string;
  sundayIso: string;
  /** Importance-sorted events overlapping Fri–Sun. */
  events: Event[];
};

const SHORT_MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"
] as const;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function overlaps(event: Event, fromIso: string, toIso: string): boolean {
  const end = event.endDate ?? event.startDate;
  return event.startDate <= toIso && end >= fromIso;
}

/**
 * All Fri→Sun windows whose Friday or Sunday falls inside (month, year),
 * with the month's events mapped onto them.
 */
export function groupEventsByWeekend(
  events: Event[],
  month: MonthNumber,
  year: number
): WeekendGroup[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const cursor = new Date(first);
  // Walk back to the Friday on/before the 1st so a weekend straddling the
  // month boundary still shows.
  while (cursor.getUTCDay() !== 5) cursor.setUTCDate(cursor.getUTCDate() - 1);

  const groups: WeekendGroup[] = [];
  while (true) {
    const friday = new Date(cursor);
    const sunday = new Date(cursor);
    sunday.setUTCDate(sunday.getUTCDate() + 2);
    const fridayInMonth =
      friday.getUTCMonth() === month - 1 && friday.getUTCFullYear() === year;
    const sundayInMonth =
      sunday.getUTCMonth() === month - 1 && sunday.getUTCFullYear() === year;
    if (!fridayInMonth && !sundayInMonth && friday > first) break;

    if (fridayInMonth || sundayInMonth) {
      const fridayIso = iso(friday);
      const sundayIso = iso(sunday);
      const weekendEvents = events
        .filter((event) => overlaps(event, fridayIso, sundayIso))
        .sort((a, b) => b.importanceScore - a.importanceScore);
      const sameMonth = friday.getUTCMonth() === sunday.getUTCMonth();
      const label = sameMonth
        ? `${SHORT_MONTHS[friday.getUTCMonth()]} ${friday.getUTCDate()}–${sunday.getUTCDate()}`
        : `${SHORT_MONTHS[friday.getUTCMonth()]} ${friday.getUTCDate()} – ${SHORT_MONTHS[sunday.getUTCMonth()]} ${sunday.getUTCDate()}`;
      groups.push({ label, fridayIso, sundayIso, events: weekendEvents });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 7);
    if (groups.length > 6) break;
  }
  return groups;
}
