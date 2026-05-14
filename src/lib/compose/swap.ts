import {
  getDestinationBySlug,
  getEventsForDestination,
  getEventsForDestinationInMonth,
  getVenuesForDestination
} from "@/data/music-travel";
import type { ComposeItineraryCard } from "@/lib/compose/types";
import type { Itinerary, ItineraryDay } from "@/lib/itineraries/generate";
import type { Event, MonthNumber, Venue } from "@/types/content";

const MODEL = "gpt-4o-mini";

export type SwapAnchorArgs = {
  dayNumber: number;
  criteria: string;
};

export type SwapAnchorResult =
  | { kind: "ok"; card: ComposeItineraryCard }
  | { kind: "error"; message: string };

/**
 * Mutate a single day's anchor in the current draft based on natural-language
 * criteria. Picks from the curated catalog only (event/venue/free) — never
 * hallucinates. Returns a fresh ComposeItineraryCard the client can render
 * in place of the previous one.
 */
export async function swapAnchorInDraft(args: {
  draft: Itinerary;
  dayNumber: number;
  criteria: string;
  apiKey: string;
}): Promise<SwapAnchorResult> {
  const dayIndex = args.draft.days.findIndex((d) => d.day === args.dayNumber);
  if (dayIndex === -1) return { kind: "error", message: `no day ${args.dayNumber} in draft` };
  const day = args.draft.days[dayIndex];
  const destinationSlug = day.legSlug ?? args.draft.destinationSlug;
  const destination = getDestinationBySlug(destinationSlug);
  if (!destination) return { kind: "error", message: `unknown destination ${destinationSlug}` };

  const month = parseMonth(day.dateISO);
  const allAnchorIds = collectAnchorIds(args.draft, args.dayNumber);

  const venues = getVenuesForDestination(destinationSlug);
  const venueById = new Map(venues.map((v) => [v.id, v] as const));

  const monthEvents: Event[] = month
    ? [...getEventsForDestinationInMonth(destinationSlug, month)]
    : [];
  if (monthEvents.length < 4) {
    const all = getEventsForDestination(destinationSlug);
    const seen = new Set(monthEvents.map((e) => e.id));
    for (const e of all) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      monthEvents.push(e);
      if (monthEvents.length >= 14) break;
    }
  }

  const candidateEvents = monthEvents
    .filter((e) => !allAnchorIds.includes(e.id))
    .sort((a, b) => b.importanceScore - a.importanceScore)
    .slice(0, 12);
  const candidateVenues = venues
    .filter((v) => !allAnchorIds.includes(v.id))
    .slice(0, 10);

  if (candidateEvents.length === 0 && candidateVenues.length === 0) {
    return { kind: "error", message: "no candidates left" };
  }

  const choice = await pickAnchorWithLLM({
    apiKey: args.apiKey,
    criteria: args.criteria,
    destinationCity: destination.city,
    currentAnchor: {
      kind: day.anchorKind,
      title: day.anchorTitle,
      why: day.anchorWhy
    },
    candidates: {
      events: candidateEvents,
      venues: candidateVenues,
      venueById
    }
  });

  if (!choice) return { kind: "error", message: "no match for criteria" };

  const updatedDay: ItineraryDay = { ...day, ...applyChoice(choice, destination.city) };
  const updatedItinerary: Itinerary = {
    ...args.draft,
    days: args.draft.days.map((d, i) => (i === dayIndex ? updatedDay : d))
  };

  return { kind: "ok", card: itineraryToCard(updatedItinerary, args.criteria) };
}

// ---------------------------------------------------------------------------
// LLM picker
// ---------------------------------------------------------------------------

type AnchorChoice =
  | { kind: "event"; id: string; title: string; why: string }
  | { kind: "venue"; id: string; name: string; why: string }
  | { kind: "free"; why: string };

async function pickAnchorWithLLM(args: {
  apiKey: string;
  criteria: string;
  destinationCity: string;
  currentAnchor: { kind: ItineraryDay["anchorKind"]; title: string; why: string };
  candidates: {
    events: Event[];
    venues: Venue[];
    venueById: Map<string, Venue>;
  };
}): Promise<AnchorChoice | null> {
  const eventLines = args.candidates.events.map(
    (e) =>
      `EVENT id=${e.id} type=${e.type} date=${e.startDate} importance=${e.importanceScore} venue=${
        e.venueId ? args.candidates.venueById.get(e.venueId)?.name ?? "" : ""
      } title="${truncate(e.title, 80)}" summary="${truncate(e.summary, 160)}"`
  );
  const venueLines = args.candidates.venues.map(
    (v) =>
      `VENUE id=${v.id} type=${v.type} name="${truncate(v.name, 60)}" tags=${v.sceneTags.join(",")}`
  );

  const prompt = `Replace day's anchor in ${args.destinationCity} with the best match for the user's criteria.

User criteria: "${args.criteria}"

Currently anchored on: ${args.currentAnchor.kind.toUpperCase()} — ${args.currentAnchor.title}
Why it was picked originally: ${args.currentAnchor.why}

Candidates (curated, real):
${eventLines.join("\n")}
${venueLines.join("\n")}

Pick the single best swap. Return JSON ONLY:
{
  "kind": "event" | "venue" | "free",
  "id": "<the id you picked, or empty string for free>",
  "why": "<one short sentence explaining why this matches the user's criteria>"
}

Rules:
- "free" only if NOTHING in the candidates matches and an open day is genuinely better.
- The "why" sentence must reference the criteria.
- Output strictly the JSON object, no prose.`;

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
        { role: "system", content: "You replace itinerary anchors. Return JSON only." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    console.warn("[swap] LLM pick failed:", response.status);
    return null;
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = json.choices?.[0]?.message?.content ?? "";
  let parsed: { kind?: string; id?: string; why?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  const why = typeof parsed.why === "string" ? parsed.why.slice(0, 220) : "swapped to better match the criteria.";

  if (parsed.kind === "free") {
    return { kind: "free", why };
  }
  if (parsed.kind === "event" && typeof parsed.id === "string") {
    const event = args.candidates.events.find((e) => e.id === parsed.id);
    if (!event) return null;
    return { kind: "event", id: event.id, title: event.title, why };
  }
  if (parsed.kind === "venue" && typeof parsed.id === "string") {
    const venue = args.candidates.venues.find((v) => v.id === parsed.id);
    if (!venue) return null;
    return { kind: "venue", id: venue.id, name: venue.name, why };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyChoice(choice: AnchorChoice, city: string): Partial<ItineraryDay> {
  if (choice.kind === "event") {
    return {
      anchorKind: "event",
      anchorId: choice.id,
      anchorTitle: choice.title,
      anchorWhy: choice.why
    };
  }
  if (choice.kind === "venue") {
    return {
      anchorKind: "venue",
      anchorId: choice.id,
      anchorTitle: choice.name,
      anchorWhy: choice.why
    };
  }
  return {
    anchorKind: "free",
    anchorId: null,
    anchorTitle: `Open day in ${city}`,
    anchorWhy: choice.why
  };
}

function itineraryToCard(itinerary: Itinerary, pitch: string): ComposeItineraryCard {
  const destination = getDestinationBySlug(itinerary.destinationSlug);
  const totalLow = itinerary.days.reduce((s, d) => s + d.costBandUsd.low, 0);
  const totalHigh = itinerary.days.reduce((s, d) => s + d.costBandUsd.high, 0);
  return {
    pitch: pitch.length > 0 ? `Swapped — ${pitch}` : itinerary.title,
    city: destination?.city ?? itinerary.destinationSlug,
    country: destination?.country ?? "",
    durationDays: itinerary.durationDays,
    vibeSummary: itinerary.vibeTags.slice(0, 3).join(" · ") || "curated",
    startDate: itinerary.startDate,
    endDate: itinerary.endDate,
    totalLow,
    totalHigh,
    itinerary
  };
}

function collectAnchorIds(draft: Itinerary, excludeDayNumber: number): string[] {
  const ids: string[] = [];
  for (const d of draft.days) {
    if (d.day === excludeDayNumber) continue;
    if (d.anchorId) ids.push(d.anchorId);
  }
  return ids;
}

function parseMonth(dateIso: string | null): MonthNumber | null {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const parsed = new Date(dateIso + "T12:00:00Z");
  if (Number.isNaN(parsed.getTime())) return null;
  return (parsed.getUTCMonth() + 1) as MonthNumber;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return value.slice(0, max - 1) + "…";
}
