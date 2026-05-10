import { z } from "zod";
import {
  getDestinationBySlug,
  getEventsForDestination,
  getEventsForDestinationInMonth,
  getVenuesForDestination
} from "@/data/music-travel";
import type { Budget, Destination, Event, MonthNumber, Venue } from "@/types/content";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export const ITINERARY_DURATIONS = [3, 4, 5, 7] as const;
export type ItineraryDuration = (typeof ITINERARY_DURATIONS)[number];

export type ItineraryDay = {
  day: number;
  dateISO: string | null;
  anchorKind: "event" | "venue" | "free";
  anchorId: string | null;
  anchorTitle: string;
  anchorWhy: string;
  neighborhood: string;
  meal_morning: string;
  meal_evening: string;
  transferNote: string | null;
  costBandUsd: { low: number; high: number };
};

export type Itinerary = {
  destinationSlug: string;
  title: string;
  startDate: string | null;
  endDate: string | null;
  durationDays: ItineraryDuration;
  vibeTags: string[];
  budgetBand: Budget;
  days: ItineraryDay[];
  generatedAt: string;
  model: string;
};

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

export const generateItinerarySchema = z.object({
  destinationSlug: z.string().trim().min(1).max(80),
  durationDays: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(7)]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  vibeTags: z.array(z.string().trim().max(40)).max(6).optional(),
  budgetBand: z.enum(["low", "medium", "high", "luxury"]).optional()
});

export type GenerateItineraryInput = z.infer<typeof generateItinerarySchema>;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function generateItinerary(input: GenerateItineraryInput): Promise<Itinerary> {
  const destination = getDestinationBySlug(input.destinationSlug);
  if (!destination) {
    throw new Error(`unknown destination: ${input.destinationSlug}`);
  }

  const startDate = input.startDate ? new Date(input.startDate) : pickDefaultStartDate(destination);
  const dates = expandDates(startDate, input.durationDays);

  const months = uniqueMonths(dates);
  const events = collectRelevantEvents(destination.slug, months);
  const venues = getVenuesForDestination(destination.slug);

  const budgetBand = input.budgetBand ?? destination.budget;
  const vibeTags = input.vibeTags?.length ? input.vibeTags : destination.vibes.slice(0, 2);

  const apiKey = process.env.OPENAI_API_KEY;
  let days: ItineraryDay[];
  let model: string;

  if (apiKey) {
    const result = await callOpenAI({
      apiKey,
      destination,
      dates,
      events,
      venues,
      vibeTags,
      budgetBand,
      durationDays: input.durationDays
    });
    days = result.days;
    model = result.model;
  } else {
    days = fallbackHeuristicPlan({ destination, dates, events, venues });
    model = "heuristic-fallback";
  }

  const validated = days.map((d) => normalizeDay(d, destination, events, venues));

  return {
    destinationSlug: destination.slug,
    title: defaultTitle(destination, vibeTags, input.durationDays),
    startDate: dates[0]?.toISOString().slice(0, 10) ?? null,
    endDate: dates[dates.length - 1]?.toISOString().slice(0, 10) ?? null,
    durationDays: input.durationDays,
    vibeTags,
    budgetBand,
    days: validated,
    generatedAt: new Date().toISOString(),
    model
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function defaultTitle(d: Destination, vibe: string[], days: number) {
  const tag = vibe[0] ? `${vibe[0].replace("-", " ")} ` : "";
  return `${days}-day ${tag}trip · ${d.city}`.trim();
}

function pickDefaultStartDate(destination: Destination): Date {
  const peak = destination.peakMonths[0] ?? destination.activeMonths[0] ?? 6;
  const today = new Date();
  let year = today.getUTCFullYear();
  if (peak <= today.getUTCMonth() + 1) year++;
  const date = new Date(Date.UTC(year, peak - 1, 14));
  while (date.getUTCDay() !== 4) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return date;
}

function expandDates(start: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });
}

function uniqueMonths(dates: Date[]): MonthNumber[] {
  const set = new Set<number>();
  for (const d of dates) set.add(d.getUTCMonth() + 1);
  return Array.from(set) as MonthNumber[];
}

function collectRelevantEvents(slug: string, months: MonthNumber[]): Event[] {
  const seen = new Set<string>();
  const result: Event[] = [];
  for (const m of months) {
    for (const event of getEventsForDestinationInMonth(slug, m)) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      result.push(event);
    }
  }
  if (result.length < 6) {
    for (const event of getEventsForDestination(slug)) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      result.push(event);
    }
  }
  return result.sort((a, b) => b.importanceScore - a.importanceScore);
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

const MODEL = "gpt-4o-mini";
const SYSTEM_PROMPT = `You are a music-travel itinerary editor for Where Next.

You stitch a day-by-day trip plan from CURATED supply. You DO NOT invent events,
venues, or restaurants — every anchor MUST reference an id from the supplied
events[] or venues[] arrays. Meals, neighborhoods, and transfers describe real
districts in the destination using the travel notes for context.

VIBE MATCHING IS THE PRIMARY SELECTION CRITERION:
- Read the user's vibe tags carefully. Examples: "underground" + "late-night"
  means they want techno clubs, intimate basements, after-hours culture — NOT
  arena pop concerts, anime conventions, or commercial mainstage festivals.
- For each candidate event/venue, mentally score: "does this match the vibe?"
- An off-vibe anchor is WORSE than a free day or a repeated venue. If the
  best remaining anchor doesn't match the vibe, prefer:
    1. anchorKind="venue" with a venue you've already used another day (a
       repeat-visit framing — "second night at this venue, deeper crowd")
    2. anchorKind="free" with neighborhood-walk meal recs only

Each day must:
- Have one anchor (an event or venue) reflecting why someone is in town that day.
- Have a neighborhood (one of the city's known music-tourism districts).
- Have a meal_morning + meal_evening (cuisine + neighborhood, NOT specific
  restaurant names — say "small-batch coffee in Mitte" not "Bonanza Coffee").
- Have a transferNote when there's a meaningful logistics tip.
- Have a costBandUsd reflecting the destination's per-person daily spend.
- Have a one-sentence anchorWhy explaining what makes this anchor special and
  WHY IT MATCHES THE VIBE the user requested.

Spread anchors across days — don't pick the same anchorId twice unless framing
it as a deliberate repeat visit.

Return JSON matching the requested schema. No prose outside the JSON.`;

type OpenAICallArgs = {
  apiKey: string;
  destination: Destination;
  dates: Date[];
  events: Event[];
  venues: Venue[];
  vibeTags: string[];
  budgetBand: Budget;
  durationDays: number;
};

async function callOpenAI(args: OpenAICallArgs): Promise<{ days: ItineraryDay[]; model: string }> {
  const userPrompt = buildUserPrompt(args);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI ${response.status}: ${text.slice(0, 400)}`);
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    model?: string;
  };
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as { days?: ItineraryDay[] };
  const days = parsed.days ?? [];
  if (!Array.isArray(days) || days.length === 0) {
    throw new Error("OpenAI returned no days");
  }
  return { days, model: json.model ?? MODEL };
}

function buildUserPrompt(args: OpenAICallArgs): string {
  const { destination, dates, events, venues, vibeTags, budgetBand, durationDays } = args;
  const dayLines = dates.map((d, i) => {
    const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
    return `  Day ${i + 1} — ${dow} ${d.toISOString().slice(0, 10)}`;
  });

  const eventLines = events.slice(0, 18).map((e) => {
    const venueName = e.venueId
      ? venues.find((v) => v.id === e.venueId)?.name ?? "(unknown venue)"
      : "(no venue)";
    return `  - id="${e.id}" type=${e.type} importance=${e.importanceScore} dates=${e.startDate}${e.endDate ? "→" + e.endDate : ""} venue="${venueName}" title="${e.title}" summary="${e.summary.slice(0, 200)}"`;
  });

  const venueLines = venues.slice(0, 12).map((v) =>
    `  - id="${v.id}" type=${v.type} name="${v.name}" tags=[${v.sceneTags.join(",")}]`
  );

  return [
    `Destination: ${destination.city}, ${destination.country} (${destination.region})`,
    `Tagline: ${destination.tagline}`,
    `Summary: ${destination.summary}`,
    `Budget band: ${budgetBand} (per-person daily spend $${destination.averageDailySpendUsd.low}-$${destination.averageDailySpendUsd.high})`,
    `Vibe tags: ${vibeTags.join(", ") || "(none specified)"}`,
    `Travel notes: ${destination.travelNotes}`,
    ``,
    `Trip is ${durationDays} days:`,
    ...dayLines,
    ``,
    `Available events (use anchorId from these):`,
    eventLines.length ? eventLines.join("\n") : "  (none — fall back to venues)",
    ``,
    `Available venues (use anchorId from these when no event fits):`,
    venueLines.join("\n"),
    ``,
    `Return JSON with this exact shape:`,
    `{`,
    `  "days": [`,
    `    {`,
    `      "day": <int 1..N>,`,
    `      "dateISO": "<YYYY-MM-DD or null>",`,
    `      "anchorKind": "event" | "venue" | "free",`,
    `      "anchorId": "<id from events[] or venues[] or null>",`,
    `      "anchorTitle": "<readable title>",`,
    `      "anchorWhy": "<one sentence>",`,
    `      "neighborhood": "<district name>",`,
    `      "meal_morning": "<cuisine + neighborhood, no specific restaurant>",`,
    `      "meal_evening": "<same shape>",`,
    `      "transferNote": "<one-line tip or null>",`,
    `      "costBandUsd": { "low": <int>, "high": <int> }`,
    `    }`,
    `  ]`,
    `}`
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Heuristic fallback (no API key)
// ---------------------------------------------------------------------------

function fallbackHeuristicPlan(args: {
  destination: Destination;
  dates: Date[];
  events: Event[];
  venues: Venue[];
}): ItineraryDay[] {
  const { destination, dates, events, venues } = args;
  const used = new Set<string>();
  return dates.map((d, i) => {
    let anchor: { kind: "event" | "venue"; id: string; title: string; why: string } | null = null;
    const event = events.find((e) => !used.has(e.id));
    if (event) {
      used.add(event.id);
      anchor = {
        kind: "event",
        id: event.id,
        title: event.title,
        why: event.summary.split(".")[0] + "."
      };
    } else {
      const venue = venues.find((v) => !used.has(v.id));
      if (venue) {
        used.add(venue.id);
        anchor = {
          kind: "venue",
          id: venue.id,
          title: venue.name,
          why: `${venue.name} is one of ${destination.city}'s reference rooms tonight.`
        };
      }
    }
    return {
      day: i + 1,
      dateISO: d.toISOString().slice(0, 10),
      anchorKind: anchor ? anchor.kind : "free",
      anchorId: anchor?.id ?? null,
      anchorTitle: anchor?.title ?? `Free day in ${destination.city}`,
      anchorWhy: anchor?.why ?? `An open day to wander ${destination.city}.`,
      neighborhood: "(see destination guide)",
      meal_morning: "neighborhood breakfast",
      meal_evening: "local dinner near tonight's anchor",
      transferNote: i === 0 ? destination.travelNotes : null,
      costBandUsd: {
        low: destination.averageDailySpendUsd.low,
        high: destination.averageDailySpendUsd.high
      }
    };
  });
}

// ---------------------------------------------------------------------------
// Validation: ensure LLM output references real ids and has sane numbers
// ---------------------------------------------------------------------------

function normalizeDay(
  day: ItineraryDay,
  destination: Destination,
  events: Event[],
  venues: Venue[]
): ItineraryDay {
  const knownEventIds = new Set(events.map((e) => e.id));
  const knownVenueIds = new Set(venues.map((v) => v.id));

  let anchorKind: ItineraryDay["anchorKind"] = day.anchorKind ?? "free";
  let anchorId = day.anchorId ?? null;

  if (anchorKind === "event" && (!anchorId || !knownEventIds.has(anchorId))) {
    if (anchorId && knownVenueIds.has(anchorId)) {
      anchorKind = "venue";
    } else {
      anchorKind = "free";
      anchorId = null;
    }
  } else if (anchorKind === "venue" && (!anchorId || !knownVenueIds.has(anchorId))) {
    anchorKind = "free";
    anchorId = null;
  }

  const cost = day.costBandUsd ?? destination.averageDailySpendUsd;
  return {
    day: Number.isInteger(day.day) ? day.day : 1,
    dateISO: day.dateISO ?? null,
    anchorKind,
    anchorId,
    anchorTitle: (day.anchorTitle ?? "").slice(0, 200) || `Day in ${destination.city}`,
    anchorWhy: (day.anchorWhy ?? "").slice(0, 400),
    neighborhood: (day.neighborhood ?? "").slice(0, 80) || "—",
    meal_morning: (day.meal_morning ?? "").slice(0, 160) || "neighborhood breakfast",
    meal_evening: (day.meal_evening ?? "").slice(0, 160) || "local dinner near tonight's anchor",
    transferNote: day.transferNote ? day.transferNote.slice(0, 300) : null,
    costBandUsd: {
      low: clampInt(cost.low ?? destination.averageDailySpendUsd.low, 20, 5000),
      high: clampInt(cost.high ?? destination.averageDailySpendUsd.high, 20, 8000)
    }
  };
}

function clampInt(n: number, min: number, max: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}
