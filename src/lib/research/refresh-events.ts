import { addUsage, researchJSON } from "./openai-research";
import { dedupeListings, isSearchResultsUrl } from "./event-identity";
import {
  researchedEventsResponseSchema,
  type ResearchedEvent,
  type ResearchedEventsResponse
} from "./schemas";
import type { CitationRef, ResearchUsage } from "./openai-research";
import { DESTINATIONS, VENUES } from "@/data/music-travel";
import { GENRE_LABELS, getMonthLabel } from "@/data/taxonomy";
import type { Destination, MonthNumber, Venue } from "@/types/content";

const RESEARCH_YEAR_DEFAULT = 2026;

// Always-on metros run hundreds of shows a month; an 18-event cap there spends
// every slot on arena tours and silently drops marquee club nights.
const DENSE_SLUGS = new Set([
  "new-york", "london", "berlin", "los-angeles", "paris", "amsterdam", "miami", "tokyo",
  "mexico-city", "sao-paulo", "sydney", "melbourne", "las-vegas", "dubai", "seoul",
  "toronto", "buenos-aires", "rio-de-janeiro", "barcelona", "ibiza"
]);
const ELECTRONIC_GENRES = new Set(["house", "techno", "afro-house", "amapiano", "electronic"]);

export function maxEventsFor(slug: string): number {
  return DENSE_SLUGS.has(slug) ? 36 : 24;
}

export function monthsAhead(year: number, month: number, now = new Date()): number {
  return year * 12 + month - 1 - (now.getUTCFullYear() * 12 + now.getUTCMonth());
}

// Club nights and brand parties are rarely announced 6+ months out, so far
// months get the general pass only.
const NEAR_TERM_MONTHS = 6;
const SEARCHES_PER_PASS = { general: 12, scene: 8, brands: 10 } as const;
const searchesFor = (pass: keyof typeof SEARCHES_PER_PASS) => Number(process.env.WN_MAX_SEARCHES ?? SEARCHES_PER_PASS[pass]);

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
  /**
   * Run a second, scene-specific research pass targeting the city's core
   * genres (afro house, amapiano, techno, etc.) and merge the results.
   * This surfaces promoter-led / diaspora / club-scale events that the
   * generic "what's on" pass tends to crowd out with arena headliners.
   * Defaults to true for months less than 6 months out.
   */
  scenePass?: boolean;
  /**
   * Run a third pass that searches touring party brands and headline DJs by
   * name. Defaults to true for dense electronic cities less than 6 months out.
   */
  brandPass?: boolean;
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
  /** Unmerged output of each pass, kept so dropped events can be traced. */
  passes: Record<"general" | "scene" | "brands", ResearchedEvent[] | null>;
  usage: ResearchUsage;
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
- Scope is contemporary music people travel for: electronic, house, techno, afro, amapiano, hip-hop, R&B, pop, latin, reggaeton, soca, dancehall, rock/indie festivals, and jazz festivals. EXCLUDE classical, opera, orchestral, chamber, choral, ballet, and musical theatre — even at famous venues. If only out-of-scope events are confirmed, return fewer events or an empty array.
- Each event MUST have a working sourceUrl. If you cannot find a source URL, do not include the event.
- sourceUrl and ticketUrl must point at the specific event (or venue/festival) page — NEVER a search-results page (no google.com, no ticketmaster.com/search?q=…, no "?q=" listing searches).
- Cover the FULL picture for the month: flagship festivals AND the city's signature scene. Include major recurring residencies, festivals, and signature parties (e.g. Hi Ibiza opening, Movement Detroit, Afro Nation Portimão) — but do NOT let arena headliners crowd out the underground / diaspora / genre nights that define the city's culture.
- Promoter-led parties and club nights are valid and wanted when confirmed on a real source. Ticketing platforms like Resident Advisor, DICE, Shotgun, Eventbrite, Fixr, and Boiler Room count as primary sources for these. A confirmed 1,000–2,000 cap Amapiano/Afrobeats/techno party is exactly the kind of event a traveler flies for — include it.
- Maximum ${maxEventsFor(destination.slug)} events. Be selective on quality, but if a month genuinely has many confirmed events, return more rather than dropping the city's defining scene.
- importance: 95–100 = global flagship (Coachella, Movement, Afro Nation), 88–94 = major recurring moments AND flagship touring party brands or headline DJ nights (Circoloco, Afterlife, Keinemusik, Hï Ibiza opening, a sold-out Black Coffee show) — rank these level with arena concerts, 70–87 = strong scene events / notable touring parties, 60–69 = solid local picks. Below 60 → omit. Do not penalize an event just because it is a club party rather than a festival. Holiday-weekend editions (Halloween, NYE, Pride) of big brands are high priority.
- type: "festival" ONLY for events branded as a festival with multiple acts (usually multi-stage or multi-day). A single headliner or brand night at a venue is "club-night"; a seated or arena show by one artist is "concert"; a repeating weekly or seasonal night is "residency".
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

function buildSceneSystemPrompt(destination: Destination, knownVenues: Venue[]): string {
  const venueList = knownVenues.map((v) => `${v.id} = ${v.name}`).join("\n  ");
  const scenes = destination.genres.map((g) => GENRE_LABELS[g] ?? g).join(", ");

  return `You are a club-and-scene specialist for ${destination.city}. The generic "what's on" calendar already captured the big festivals and arena shows. Your job is the OTHER half: the underground, diaspora, and genre-scene events that mainstream searches miss.

Hard rules:
- USE the web_search tool aggressively. Search ticketing/listing platforms by genre: Resident Advisor, DICE, Shotgun, Eventbrite, Fixr, Boiler Room, plus promoter and club Instagram/linktree pages.
- Focus on these scenes for ${destination.city}: ${scenes}. Also include adjacent diaspora sounds (afrobeats, amapiano, gqom, dancehall) when they have a real presence in this city.
- Every event MUST have a working sourceUrl (the listing/ticket page is fine). No source → omit.
- Prefer touring party brands, recurring club nights, day parties, boat parties, warehouse events, and diaspora festivals that a music traveler would plan a weekend around.
- Do NOT repeat the obvious arena headliners or mega-festivals — assume those are already covered. If you only find the same big names, return fewer events rather than padding.
- Skip rumors and unannounced events. Dates MUST come from the source page in YYYY-MM-DD format.
- importance: 88–94 = flagship touring brand or headline DJ night, 70–87 = strong scene event / notable touring party, 60–69 = solid local night. Below 60 → omit. A confirmed 1,000+ cap genre party belongs at 75–87.
- type: "festival" only for multi-act events branded as a festival; one-night parties are "club-night".
- id format: \`${destination.slug}-<short-slug>-<year>\`. type ∈ {festival, club-night, residency, beach-club, carnival, concert, conference}.
- venueId: only if it matches a known venue below; otherwise null + venueName.

Known venues for ${destination.city}:
  ${venueList || "(none curated yet)"}

Output a single JSON object matching the provided schema. No prose outside it.`;
}

function buildSceneUserPrompt(destination: Destination, month: MonthNumber, year: number): string {
  const monthName = getMonthLabel(month);
  const scenes = destination.genres.map((g) => GENRE_LABELS[g] ?? g).join(", ");
  return `Find scene-defining club nights, promoter parties, and diaspora/genre events confirmed for ${destination.city}, ${destination.country} during ${monthName} ${year}.

Run separate searches per scene (e.g. "${scenes}" + "${destination.city} ${monthName} ${year}") and on ticket platforms (Resident Advisor, DICE, Shotgun, Eventbrite). Include touring party brands (e.g. AmapianoLand, Afro Nation-style events), recurring residencies, day/boat parties, and warehouse nights.

Return a JSON object with destinationSlug "${destination.slug}", month ${month}, year ${year}, an optional 1-sentence notes field, and an events array. Only include events you can verify with a citation. Empty array is acceptable.`;
}

export const TOURING_BRANDS = [
  "Circoloco", "Afterlife", "Keinemusik", "elrow", "ANTS", "Music On", "Defected", "Glitterbox",
  "Solid Grooves", "Paradise", "Cercle", "Boiler Room", "Drumcode", "HYTE", "Cityfox", "Awakenings",
  "Time Warp", "Teksupport", "Insomniac", "Afro Nation", "AmapianoLand", "Everyday People", "Hï Ibiza",
  "Ushuaïa", "Pacha", "Elsewhere", "Brooklyn Storehouse", "Knockdown Center", "Printworks", "fabric"
];
const TOURING_HEADLINERS = [
  "Black Coffee", "Solomun", "Fred again..", "FISHER", "John Summit", "Peggy Gou", "Charlotte de Witte",
  "Amelie Lens", "Anyma", "Dom Dolla", "Chris Lake", "Mochakk", "Keinemusik (&ME, Rampa, Adam Port)",
  "Carl Cox", "Jamie Jones", "Seth Troxler", "Honey Dijon", "Skrillex", "Four Tet", "The Martinez Brothers"
];

function buildBrandSystemPrompt(destination: Destination, knownVenues: Venue[]): string {
  const venueList = knownVenues.map((v) => `${v.id} = ${v.name}`).join("\n  ");
  return `You are a nightlife booker tracking global touring party brands and headline DJs. The city's calendar is already partly filled; your job is to catch the marquee electronic events a music traveler would fly for that a generic search misses — especially sold-out or Halloween / New Year / holiday-weekend editions.

Hard rules:
- USE the web_search tool. For ${destination.city}, explicitly search each touring brand and headliner below with the city and month (e.g. "Circoloco ${destination.city}", "Afterlife ${destination.city}"), plus the city's biggest promoters and warehouse venues. Check DICE, Resident Advisor, Shotgun, Ticketmaster, and the brand's own site.
- Brands: ${TOURING_BRANDS.join(", ")}.
- Headliners: ${TOURING_HEADLINERS.join(", ")}.
- Only include events confirmed on a real listing or official page with an exact date in YYYY-MM-DD. Sold-out events still count — travelers buy resale.
- Each event MUST have a working sourceUrl for that specific event. No search-result pages.
- Skip anything not in ${destination.city} or its immediate metro.
- importance: 90–96 = flagship brand night or headline DJ show (e.g. Circoloco Halloween, Afterlife, Keinemusik), 80–89 = strong touring party, 70–79 = notable club headliner. Below 70 → omit.
- id format: \`${destination.slug}-<short-slug>-<year>\`. type ∈ {festival, club-night, residency, beach-club, carnival, concert, conference}; a one-night brand party is club-night.
- venueId: only if it matches a known venue below; otherwise null + venueName.

Known venues for ${destination.city}:
  ${venueList || "(none curated yet)"}

Output a single JSON object matching the provided schema. No prose outside it.`;
}

function buildBrandUserPrompt(destination: Destination, month: MonthNumber, year: number): string {
  const monthName = getMonthLabel(month);
  return `Find touring party brands and headline DJ shows confirmed in ${destination.city}, ${destination.country} during ${monthName} ${year}.

Return a JSON object with destinationSlug "${destination.slug}", month ${month}, year ${year}, an optional 1-sentence notes field, and an events array. Only include events you can verify with a citation. Empty array is acceptable.`;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Merge event lists, cap by importance.
 * Two rows are the same event when they share `id@startDate` OR
 * `normalizedTitle@startDate` (catches title-casing / type variants of the
 * same party on the same day). Date-qualified keys preserve genuinely
 * different shows that reuse an id (e.g. a tour playing twice in a month) —
 * the downstream overlay disambiguates those by startDate.
 */
function mergeEvents(lists: ResearchedEvent[][], cap: number, city: string): ResearchedEvent[] {
  const chosen: ResearchedEvent[] = [];
  const indexByKey = new Map<string, number>();
  const keysFor = (ev: ResearchedEvent) => [
    `id:${ev.id}@${ev.startDate}`,
    `ts:${normalizeTitle(ev.title)}@${ev.startDate}`
  ];

  for (const ev of lists.flat()) {
    const keys = keysFor(ev);
    const matchKey = keys.find((k) => indexByKey.has(k));
    if (matchKey !== undefined) {
      const idx = indexByKey.get(matchKey)!;
      if (ev.importance > chosen[idx].importance) chosen[idx] = ev;
      // Point all aliases (old + new) at the same slot so later rows collapse too.
      for (const k of [...keys, ...keysFor(chosen[idx])]) indexByKey.set(k, idx);
      continue;
    }
    const idx = chosen.length;
    chosen.push(ev);
    for (const k of keys) indexByKey.set(k, idx);
  }

  const { events } = dedupeListings(
    chosen.filter((ev) => !isSearchResultsUrl(ev.sourceUrl)).map((ev) => (isSearchResultsUrl(ev.ticketUrl) ? { ...ev, ticketUrl: null } : ev)),
    city
  );
  events.sort((a, b) => b.importance - a.importance);
  return events.slice(0, cap);
}

function dedupeCitations(citations: CitationRef[]): CitationRef[] {
  const seen = new Set<string>();
  const out: CitationRef[] = [];
  for (const c of citations) {
    if (seen.has(c.url)) continue;
    seen.add(c.url);
    out.push(c);
  }
  return out;
}

export type ScenePassResult = {
  destination: Destination;
  month: MonthNumber;
  year: number;
  events: ResearchedEvent[];
  notes: string | null;
  citations: CitationRef[];
  searchCalls: number;
  generatedAt: string;
  responseId: string;
};

/**
 * Run ONLY the scene-specific pass for a (city, month). Used by the additive
 * augment runner to discover the underground / diaspora / genre layer without
 * touching (or regenerating) the existing general-calendar entry.
 */
export async function researchScenePass(args: {
  slug: string;
  month: MonthNumber;
  year?: number;
  /** "scene" = genre / diaspora sweep; "brands" = touring party brands and headline DJs. */
  focus?: "scene" | "brands";
}): Promise<ScenePassResult> {
  const destination = DESTINATIONS.find((d) => d.slug === args.slug);
  if (!destination) throw new Error(`Unknown destination slug: ${args.slug}`);

  const month = args.month;
  const year = args.year ?? RESEARCH_YEAR_DEFAULT;
  const knownVenues = VENUES.filter((v) => v.destinationSlug === destination.slug);
  const brands = args.focus === "brands";

  const scene = await researchJSON({
    systemPrompt: brands
      ? buildBrandSystemPrompt(destination, knownVenues)
      : buildSceneSystemPrompt(destination, knownVenues),
    userPrompt: brands
      ? buildBrandUserPrompt(destination, month, year)
      : buildSceneUserPrompt(destination, month, year),
    schema: researchedEventsResponseSchema,
    schemaName: "events_research",
    webSearch: true,
    timeoutMs: 240_000,
    cost: { maxSearches: searchesFor(brands ? "brands" : "scene") }
  });

  return {
    destination,
    month,
    year,
    events: scene.data.events,
    notes: scene.data.notes ?? null,
    citations: scene.citations,
    searchCalls: scene.searchCalls,
    generatedAt: new Date().toISOString(),
    responseId: scene.responseId
  };
}

/**
 * Additively merge newly-discovered scene events into an existing event list.
 * Existing events are NEVER dropped — only de-duplicated against and topped up
 * with new rows (lowest-importance new rows trimmed first if we exceed `cap`).
 */
export function augmentEvents(
  existing: ResearchedEvent[],
  discovered: ResearchedEvent[],
  cap = 20,
  city = ""
): { events: ResearchedEvent[]; added: ResearchedEvent[] } {
  const keysFor = (ev: ResearchedEvent) => [
    `id:${ev.id}@${ev.startDate}`,
    `ts:${normalizeTitle(ev.title)}@${ev.startDate}`
  ];
  const seen = new Set<string>();
  for (const ev of existing) for (const k of keysFor(ev)) seen.add(k);

  const fresh: ResearchedEvent[] = [];
  for (const ev of discovered) {
    const keys = keysFor(ev);
    if (keys.some((k) => seen.has(k))) continue;
    if (isSearchResultsUrl(ev.sourceUrl)) continue;
    const before = dedupeListings([...existing, ...fresh], city).removed.length;
    if (dedupeListings([...existing, ...fresh, ev], city).removed.length > before) continue;
    for (const k of keys) seen.add(k);
    fresh.push(ev);
  }
  fresh.sort((a, b) => b.importance - a.importance);

  const room = Math.max(0, cap - existing.length);
  const added = fresh.slice(0, room);
  const events = [...existing, ...added].sort((a, b) => b.importance - a.importance);
  return { events, added };
}

export async function refreshEvents(args: RefreshEventsArgs): Promise<RefreshEventsResult> {
  const destination = DESTINATIONS.find((d) => d.slug === args.slug);
  if (!destination) {
    throw new Error(`Unknown destination slug: ${args.slug}`);
  }

  const month = args.month;
  const year = args.year ?? RESEARCH_YEAR_DEFAULT;
  const nearTerm = monthsAhead(year, month) < NEAR_TERM_MONTHS;
  const scenePass = args.scenePass ?? nearTerm;
  const brandPass =
    args.brandPass ?? (nearTerm && DENSE_SLUGS.has(destination.slug) && destination.genres.some((g) => ELECTRONIC_GENRES.has(g)));
  const knownVenues = VENUES.filter((v) => v.destinationSlug === destination.slug);
  const cap = maxEventsFor(destination.slug);

  const run = (pass: keyof typeof SEARCHES_PER_PASS, systemPrompt: string, userPrompt: string) =>
    researchJSON({
      systemPrompt,
      userPrompt,
      schema: researchedEventsResponseSchema,
      schemaName: "events_research",
      webSearch: true,
      timeoutMs: 240_000,
      cost: { maxSearches: searchesFor(pass) }
    });

  // Optional passes are non-fatal, except for billing errors, which must stop
  // the batch rather than silently produce a thinner calendar.
  const optional = async (label: "scene" | "brands", enabled: boolean, systemPrompt: string, userPrompt: string) => {
    if (!enabled) return null;
    try {
      return await run(label, systemPrompt, userPrompt);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/no credits|insufficient_quota|billing/i.test(msg)) throw err;
      process.stderr?.write?.(`   [${label}-pass] ${destination.slug} m=${month} failed: ${msg.slice(0, 120)}\n`);
      return null;
    }
  };

  const [general, scene, brands] = await Promise.all([
    run("general", buildSystemPrompt(destination, knownVenues), buildUserPrompt(destination, month, year, args.extraGuidance)),
    optional("scene", scenePass, buildSceneSystemPrompt(destination, knownVenues), buildSceneUserPrompt(destination, month, year)),
    optional("brands", brandPass, buildBrandSystemPrompt(destination, knownVenues), buildBrandUserPrompt(destination, month, year))
  ]);

  const passes = [general, scene, brands].filter((p): p is NonNullable<typeof p> => p !== null);
  const data: ResearchedEventsResponse = {
    destinationSlug: destination.slug,
    month,
    year,
    notes: general.data.notes ?? scene?.data.notes ?? null,
    events: mergeEvents(passes.map((p) => p.data.events), cap, destination.city)
  };

  return {
    destination,
    month,
    year,
    data,
    citations: dedupeCitations(passes.flatMap((p) => p.citations)),
    searchCalls: passes.reduce((sum, p) => sum + p.searchCalls, 0),
    generatedAt: new Date().toISOString(),
    responseId: passes.map((p) => p.responseId).join("+"),
    passes: {
      general: general.data.events,
      scene: scene?.data.events ?? null,
      brands: brands?.data.events ?? null
    },
    usage: passes.map((p) => p.usage).reduce(addUsage)
  };
}
