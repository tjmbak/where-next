import { NextResponse } from "next/server";
import {
  getDestinationBySlug,
  getEventsForDestinationInMonth,
  getEventsForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import type { Event, MonthNumber, Venue } from "@/types/content";

export const runtime = "nodejs";

type AlternativeEvent = {
  kind: "event";
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate: string | null;
  importanceScore: number;
  summary: string;
  venueName: string | null;
};

type AlternativeVenue = {
  kind: "venue";
  id: string;
  name: string;
  type: string;
  sceneTags: string[];
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destinationSlug = url.searchParams.get("destination");
  const dateParam = url.searchParams.get("date");
  const exclude = (url.searchParams.get("exclude") ?? "").split(",").filter(Boolean);

  if (!destinationSlug) {
    return NextResponse.json({ error: "missing-destination" }, { status: 400 });
  }
  const destination = getDestinationBySlug(destinationSlug);
  if (!destination) return NextResponse.json({ error: "unknown-destination" }, { status: 404 });

  let month: MonthNumber | null = null;
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const parsed = new Date(dateParam + "T12:00:00Z");
    if (!Number.isNaN(parsed.getTime())) {
      month = (parsed.getUTCMonth() + 1) as MonthNumber;
    }
  }

  const venues = getVenuesForDestination(destinationSlug);
  const venueById = new Map(venues.map((v) => [v.id, v]));

  const monthEvents: Event[] = month ? [...getEventsForDestinationInMonth(destinationSlug, month)] : [];
  // Fall back to all destination events if the month is sparse (< 4 results)
  if (monthEvents.length < 4) {
    const all = getEventsForDestination(destinationSlug);
    const seen = new Set(monthEvents.map((e) => e.id));
    for (const event of all) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      monthEvents.push(event);
      if (monthEvents.length >= 12) break;
    }
  }

  const eventResults: AlternativeEvent[] = monthEvents
    .filter((event) => !exclude.includes(event.id))
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 10)
    .map((event) => ({
      kind: "event",
      id: event.id,
      title: event.title,
      type: event.type,
      startDate: event.startDate,
      endDate: event.endDate ?? null,
      importanceScore: event.importanceScore,
      summary: event.summary,
      venueName: event.venueId ? venueById.get(event.venueId)?.name ?? null : null
    }));

  const venueResults: AlternativeVenue[] = venues
    .filter((v) => !exclude.includes(v.id))
    .slice(0, 8)
    .map((v: Venue) => ({
      kind: "venue",
      id: v.id,
      name: v.name,
      type: v.type,
      sceneTags: v.sceneTags
    }));

  return NextResponse.json({
    ok: true,
    month,
    events: eventResults,
    venues: venueResults
  });
}
