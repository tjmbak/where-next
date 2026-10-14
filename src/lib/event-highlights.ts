import type { Event } from "@/types/content";

type HighlightOptions = {
  limit: number;
  perCity: number;
};

/**
 * The highest-importance confirmed events, capped per city, returned in date order.
 * Multi-night runs of one show (e.g. two "BTS World Tour — São Paulo" dates) take a single slot.
 */
export function pickHighlights(events: Event[], { limit, perCity }: HighlightOptions): Event[] {
  const seen = new Set<string>();
  const ranked = events
    .filter((event) => {
      if (event.confirmed === false || seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    })
    .sort((a, b) => b.importanceScore - a.importanceScore);

  const cityCounts = new Map<string, number>();
  const shows = new Set<string>();
  const picked: Event[] = [];
  for (const event of ranked) {
    const count = cityCounts.get(event.destinationSlug) ?? 0;
    const show = `${event.destinationSlug}:${titleStem(event.title)}`;
    if (count >= perCity || shows.has(show)) continue;
    shows.add(show);
    cityCounts.set(event.destinationSlug, count + 1);
    picked.push(event);
    if (picked.length === limit) break;
  }
  return picked.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

function titleStem(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").slice(0, 3).join(" ");
}

export function formatEventDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`)
    .toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    .toLowerCase();
}
