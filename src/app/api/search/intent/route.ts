import { NextResponse } from "next/server";
import { z } from "zod";
import { parseSearchQuery } from "@/lib/search-parser";
import {
  ALLOWED_GENRES,
  ALLOWED_REGIONS,
  ALLOWED_VIBES
} from "@/lib/search-intent";
import type { SearchCitation, SearchIntent } from "@/lib/search-intent";
import { DESTINATIONS } from "@/data/music-travel";
import type {
  Budget,
  Genre,
  MonthNumber,
  Region,
  Vibe
} from "@/types/content";
import { researchJSON } from "@/lib/research/openai-research";
import { localAnswerForDestination } from "@/lib/local-answer";

export const runtime = "nodejs";

const DESTINATION_SLUGS = DESTINATIONS.map((d) => d.slug);
const CITY_NAMES = DESTINATIONS.map((d) => d.city);

const llmIntentSchema = z
  .object({
    month: z.number().int().min(1).max(12).nullable(),
    stayLength: z.number().int().min(1).max(3).nullable(),
    budget: z.enum(["low", "medium", "high", "luxury"]).nullable(),
    genre: z
      .enum([
        "afro-house",
        "amapiano",
        "house",
        "techno",
        "electronic",
        "hip-hop",
        "r-and-b",
        "latin",
        "jazz",
        "pop",
        "festival"
      ])
      .nullable(),
    vibe: z
      .enum([
        "beach",
        "luxury",
        "underground",
        "festival",
        "city",
        "cultural",
        "group-trip",
        "late-night"
      ])
      .nullable(),
    region: z
      .enum([
        "Africa",
        "Asia",
        "Europe",
        "Middle East",
        "North America",
        "Oceania",
        "South America"
      ])
      .nullable(),
    cityFocus: z.string().nullable(),
    artist: z.string().nullable(),
    discoverySummary: z.string().nullable(),
    discoveryCitySlugs: z.array(z.string()),
    discoveryCitations: z.array(
      z
        .object({
          url: z.string(),
          title: z.string().nullable()
        })
        .strict()
    )
  })
  .strict();

type LlmIntent = z.infer<typeof llmIntentSchema>;

function clampMonth(value: number | null | undefined): MonthNumber | undefined {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 1 || value > 12) return undefined;
  return value as MonthNumber;
}

function clampStay(value: number | null | undefined): 1 | 2 | 3 | undefined {
  if (value === 1 || value === 2 || value === 3) return value;
  return undefined;
}

function resolveCity(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const lowered = value.trim().toLowerCase();
  const bySlug = DESTINATIONS.find((d) => d.slug === lowered);
  if (bySlug) return bySlug.slug;
  const byCity = DESTINATIONS.find((d) => d.city.toLowerCase() === lowered);
  if (byCity) return byCity.slug;
  const partial = DESTINATIONS.find((d) =>
    d.city.toLowerCase().startsWith(lowered.split(/\s+/)[0] ?? "")
  );
  return partial?.slug;
}

function resolveCitySlugs(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const slug = resolveCity(v);
    if (slug && !seen.has(slug)) {
      seen.add(slug);
      out.push(slug);
    }
  }
  return out;
}

function buildSystemPrompt(): string {
  return `You are a strict structured-output parser for a music-travel app.

You receive a user's natural-language trip query. Your job is to (a) extract structured filters when the query talks about month / scene / budget / region / city, and (b) when the query asks about a specific DJ, artist, or "where is X playing/next", call the web_search tool, find verified upcoming dates, and summarize them with the relevant city slug(s).

Filter rules:
- month: integer 1-12 (1 = January) or null. "summer" alone = null (use stayLength). "july" = 7. "december" = 12. "detty december" = 12.
- stayLength: 1, 2, or 3 months, or null. weekend / week / few days = 1. "two months" = 2. "summer" / "season" / "all winter" / "three months" = 3.
- budget: "low" | "medium" | "high" | "luxury" or null. cheap → low, mid → medium, premium → high, splurge → luxury.
- genre: one of: ${ALLOWED_GENRES.join(", ")} (or null). Pick at most one.
- vibe: one of: ${ALLOWED_VIBES.join(", ")} (or null). Pick at most one.
- region: one of: ${ALLOWED_REGIONS.join(", ")} (or null).
- cityFocus: a single city slug from this list (or null): ${DESTINATION_SLUGS.join(", ")}. If user says "like X" or "similar to X", set cityFocus to X.

Artist / discovery rules:
- artist: if the query mentions a DJ, producer, band, or artist by name, set this to the artist's name. Otherwise null.
- If artist is set OR the query asks "where is X next", "where can I see X", "is X playing in Y" — USE the web_search tool to find verified upcoming shows in 2026. Otherwise DO NOT call web_search; rely on the query alone.
- discoverySummary: a 1–3 sentence answer based ONLY on web_search results. Include venue + date for each confirmed show. If web_search found no concrete info, set to null. NEVER invent dates, venues, or shows.
- discoveryCitySlugs: city slugs from this list ONLY: ${DESTINATION_SLUGS.join(", ")}. Include a slug ONLY if the artist is confirmed to play in or very near that exact city. Do NOT loosely map by country (e.g. don't map Cannes to paris). Empty array if no exact city match.
- discoveryCitations: source URL+title for each web result that backs your summary. Required if discoverySummary is non-null. Empty array otherwise.

Available cities (for reference; map any web-found city to the nearest slug here): ${CITY_NAMES.join(", ")}.

Output rules:
- Return only the JSON object specified by the schema. No prose outside it.
- For any field you are unsure about, return null.
- Pick at most ONE of each enum field.
- Never invent values not present in the user query or in web_search results.`;
}

function intentFromLlm(
  query: string,
  llm: LlmIntent,
  apiCitations: SearchCitation[]
): SearchIntent {
  const month = clampMonth(llm.month);
  const stayLength = clampStay(llm.stayLength);
  const budget = (llm.budget ?? undefined) as Budget | undefined;
  const genre = (llm.genre ?? undefined) as Genre | undefined;
  const vibe = (llm.vibe ?? undefined) as Vibe | undefined;
  const region = (llm.region ?? undefined) as Region | undefined;
  const cityFocus = resolveCity(llm.cityFocus);
  const artist = llm.artist?.trim() || undefined;
  const discoveryCitySlugs = resolveCitySlugs(llm.discoveryCitySlugs ?? []);
  const summary = llm.discoverySummary?.trim();

  // Prefer model-emitted citations; fall back to any url_citation annotations.
  const modelCitations: SearchCitation[] = (llm.discoveryCitations ?? [])
    .filter((c) => typeof c.url === "string" && /^https?:\/\//i.test(c.url))
    .map((c) => ({ url: c.url, title: c.title ?? undefined }));
  const mergedCitations: SearchCitation[] = modelCitations.length > 0
    ? modelCitations
    : apiCitations;

  const intent: SearchIntent = {
    query,
    source: "llm",
    confidence: "low",
    unparsed: []
  };

  if (month !== undefined) intent.month = month;
  if (stayLength !== undefined) intent.stayLength = stayLength;
  if (budget !== undefined) intent.budget = budget;
  if (genre !== undefined) intent.genre = genre;
  if (vibe !== undefined) intent.vibe = vibe;
  if (region !== undefined) intent.region = region;
  if (cityFocus !== undefined) intent.cityFocus = cityFocus;
  if (artist !== undefined) intent.artist = artist;

  // Only emit a discovery block when the model both summarized AND backed it
  // with at least one citation. No citation = no claim = don't surface it.
  if (summary && mergedCitations.length > 0) {
    intent.discovery = {
      summary,
      citySlugs: discoveryCitySlugs,
      citations: mergedCitations
    };
  }

  let signals = 0;
  for (const f of [month, stayLength, budget, genre, vibe, region, cityFocus, artist]) {
    if (f !== undefined) signals += 1;
  }
  if (intent.discovery) signals += 2;
  intent.confidence = signals >= 4 ? "high" : signals >= 2 ? "medium" : "low";

  return intent;
}

export async function POST(req: Request) {
  let payload: { query?: unknown };
  try {
    payload = (await req.json()) as { query?: unknown };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const query = typeof payload.query === "string" ? payload.query.trim() : "";
  if (!query) return NextResponse.json({ error: "empty_query" }, { status: 400 });
  if (query.length > 500) return NextResponse.json({ error: "query_too_long" }, { status: 413 });

  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await researchJSON({
        systemPrompt: buildSystemPrompt(),
        userPrompt: query,
        schema: llmIntentSchema,
        schemaName: "search_intent",
        webSearch: true,
        timeoutMs: 60_000
      });
      const intent = intentFromLlm(query, result.data, result.citations);
      hydrateLocalAnswer(intent);
      return NextResponse.json({
        intent,
        meta: { searchCalls: result.searchCalls, model: "gpt-5.5" }
      });
    } catch (err) {
      console.warn("[search-intent] llm failed, falling back to parser:", err);
    }
  }

  const intent = parseSearchQuery(query);
  hydrateLocalAnswer(intent);
  return NextResponse.json({ intent });
}

/**
 * If the user asked a factual question about a known destination but the
 * LLM didn't return a discovery summary (because the system prompt only
 * triggers web_search for artist queries), answer locally from our dataset.
 */
function hydrateLocalAnswer(intent: SearchIntent) {
  if (intent.discovery) return;
  const slug = intent.cityFocus;
  if (!slug) return;
  const local = localAnswerForDestination(intent.query, slug);
  if (!local) return;
  intent.discovery = {
    summary: local.summary,
    citySlugs: [slug],
    citations: local.citations
  };
}
