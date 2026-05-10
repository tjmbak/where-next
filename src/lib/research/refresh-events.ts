import { researchJSON } from "./openai-research";
import {
  researchedEventsResponseSchema,
  type ResearchedEventsResponse
} from "./schemas";
import type { CitationRef } from "./openai-research";
import { DESTINATIONS, VENUES } from "@/data/music-travel";
import { getMonthLabel } from "@/data/taxonomy";
import type { Destination, MonthNumber, Venue } from "@/types/content";

const RESEARCH_YEAR_DEFAULT = 2026;

export type RefreshEventsArgs = {
  slug: string;
  month: MonthNumber;
  year?: number;
  /**
   * Optional caller-supplied scene-specific guidance appended to the user
   * prompt. Used by `rerun-empty.ts` to coax the model into accepting
   * shoulder-month programming (e.g. après-ski, mid-summer techno) when the
   * generic prompt returned nothing.
   */
  extraGuidance?: string;
};

export type RefreshEventsResult = {
  destination: Destination;
  month: MonthNumber;
  year: number;
  data: ResearchedEventsResponse;
  citations: CitationRef[];
  searchCalls: number;
  generatedAt: string;
  responseId: string;
};

function buildSystemPrompt(destination: Destination, knownVenues: Venue[]): string {
  const venueList = knownVenues
    .map((v) => `${v.id} = ${v.name}`)
    .join("\n  ");

  return `You are a music-travel research analyst. Your job is to produce a verified calendar of music events for one city in one month. Every claim must be backed by a current source URL.

Hard rules:
- USE the web_search tool. Make multiple searches if useful (artist tour pages, venue calendars, festival sites, ticket platforms). Cross-check at least one official or primary source per event.
- Only include events that are CONFIRMED on a primary source (venue website, festival site, official artist page) or a reputable secondary (Resident Advisor, Boiler Room, Pitchfork, Pollstar, official Beatport, Songkick, Bandsintown, ticketing platforms like Shotgun/DICE/Pacha/Ticketmaster).
- Skip rumors, "expected lineup", and unannounced events. If unsure → omit.
- Each event MUST have a working sourceUrl. If you cannot find a source URL, do not include the event.
- Prefer flagship recurring residencies, festivals, and signature parties (e.g. Hi Ibiza opening, Movement Detroit, Afro Nation Portimão). Don't pad with random small bar gigs.
- Maximum 12 events. Be selective — quality over quantity.
- importance: 95–100 = global flagship (Coachella, Movement, Afro Nation), 85–94 = major recurring (Hi Ibiza opening, Pacha residencies), 70–84 = strong scene events, 60–69 = solid local picks. Below 60 → omit.
- Dates in YYYY-MM-DD format. endDate equals startDate for single-day events; null only if truly open-ended.
- The startDate / endDate MUST come directly from the source URL. Do NOT estimate, infer, or interpolate. If the source page does not state a specific date, omit the event.
- Recurring residencies (e.g. "Solomun+1 every Sunday") → pick ONE representative date that the source explicitly lists, not the first Sunday of the month by guess.
- id format: \`${destination.slug}-<short-slug>-<year>\` e.g. \`ibiza-hi-residency-jul-2026\`.
- venueId: ONLY use if it matches one from the known list below. Otherwise null and put the venue name in venueName.
- type must be one of: festival, club-night, residency, beach-club, carnival, concert, conference.
- genres: pick the 1–3 that actually describe the music. Don't fabricate.
- summary: factual, 1–2 sentences. Mention the headliner(s) if known. Never write filler ("an exciting event").

Known venues for ${destination.city} (use venueId only when matching one of these by name; otherwise leave venueId null):
  ${venueList || "(none curated yet)"}

Output a single JSON object matching the provided schema. No prose outside it.`;
}

function buildUserPrompt(
  destination: Destination,
  month: MonthNumber,
  year: number,
  extraGuidance?: string
): string {
  const monthName = getMonthLabel(month);
  const guidance = extraGuidance ? `\nScene context: ${extraGuidance}\n` : "";
  return `Research music events confirmed for ${destination.city}, ${destination.country} during ${monthName} ${year}.

Search for: festival lineups, club residencies, signature parties, major concerts, and recurring nights happening at venues in or very near ${destination.city} during ${monthName} ${year}.${guidance}
Return a JSON object with:
- destinationSlug: "${destination.slug}"
- month: ${month}
- year: ${year}
- notes: optional 1-sentence editorial note about the scene this month, or null
- events: array of confirmed events with full source URLs

Only include events you can verify with a citation. Empty events array is acceptable if nothing solid is confirmed yet.`;
}

export async function refreshEvents(args: RefreshEventsArgs): Promise<RefreshEventsResult> {
  const destination = DESTINATIONS.find((d) => d.slug === args.slug);
  if (!destination) {
    throw new Error(`Unknown destination slug: ${args.slug}`);
  }

  const month = args.month;
  const year = args.year ?? RESEARCH_YEAR_DEFAULT;
  const knownVenues = VENUES.filter((v) => v.destinationSlug === destination.slug);

  const result = await researchJSON({
    systemPrompt: buildSystemPrompt(destination, knownVenues),
    userPrompt: buildUserPrompt(destination, month, year, args.extraGuidance),
    schema: researchedEventsResponseSchema,
    schemaName: "events_research",
    webSearch: true,
    timeoutMs: 240_000
  });

  // Sanity-check the model didn't drift on slug/month.
  if (result.data.destinationSlug !== destination.slug) {
    result.data.destinationSlug = destination.slug;
  }
  if (result.data.month !== month) {
    result.data.month = month;
  }
  if (result.data.year !== year) {
    result.data.year = year;
  }

  return {
    destination,
    month,
    year,
    data: result.data,
    citations: result.citations,
    searchCalls: result.searchCalls,
    generatedAt: new Date().toISOString(),
    responseId: result.responseId
  };
}
