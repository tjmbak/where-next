import { DESTINATIONS } from "@/data/music-travel";
import { GENRE_LABELS, REGIONS, VIBE_LABELS } from "@/data/taxonomy";
import type {
  ComposeDestinationCard,
  ComposeItineraryCard
} from "@/lib/compose/types";
import { generateItinerary } from "@/lib/itineraries/generate";
import type {
  Budget,
  Destination,
  Genre,
  MonthNumber,
  Region,
  Vibe
} from "@/types/content";

// ---------------------------------------------------------------------------
// Tool descriptors (OpenAI-format function definitions)
// ---------------------------------------------------------------------------

export const COMPOSE_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_destinations",
      description:
        "Search Where Next's curated destinations catalog. Use this BEFORE suggesting itineraries when the user hasn't picked a city, so you can present 3-5 candidates that match their vibe/budget/region/dates and let them pick. Returns city, country, region, budget tier, and a one-line tagline.",
      parameters: {
        type: "object",
        properties: {
          genres: {
            type: "array",
            description: "Music genres the user mentioned (e.g. techno, house, deep-house, hardcore, jazz, hip-hop)",
            items: { type: "string" }
          },
          vibes: {
            type: "array",
            description: "Vibe tags from underground/festival-energy/beach/late-night/intimate/big-room/etc.",
            items: { type: "string" }
          },
          regions: {
            type: "array",
            description: "Regions: Europe, North America, South America, Asia, Oceania, Africa, Middle East",
            items: { type: "string" }
          },
          budget: {
            type: "string",
            description: "Budget band: low | medium | high | luxury"
          },
          months: {
            type: "array",
            description: "Calendar months (1-12) when the user wants to travel",
            items: { type: "integer" }
          },
          limit: {
            type: "integer",
            description: "Max results (default 5, cap 8)"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "suggest_itineraries",
      description:
        "Generate 1-3 FULL itinerary previews the user can save. Use this when you and the user have agreed on a city + duration + dates + vibe. Each suggestion is a complete day-by-day plan with real events, venues, neighborhoods, meals, and costs — anchored on Where Next's curated supply. Prefer ONE focused suggestion unless the user explicitly asked to compare; pass 2-3 only when you genuinely have distinct shapes (e.g. different cities or vibes).",
      parameters: {
        type: "object",
        required: ["plans"],
        properties: {
          plans: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
              type: "object",
              required: ["destinationSlug", "durationDays", "pitch"],
              properties: {
                pitch: {
                  type: "string",
                  description: "One short sentence framing this plan (e.g. 'Lisbon's underground at peak season, 5 days, mid budget')."
                },
                destinationSlug: {
                  type: "string",
                  description: "Where Next destination slug (e.g. 'lisbon', 'berlin', 'mexico-city')."
                },
                durationDays: {
                  type: "integer",
                  enum: [3, 4, 5, 7, 10, 14],
                  description: "Trip length in days. MUST be one of: 3, 4, 5, 7, 10, 14."
                },
                startDate: {
                  type: "string",
                  description: "Optional ISO date (YYYY-MM-DD) to anchor the trip. Omit if the user hasn't specified."
                },
                vibeTags: {
                  type: "array",
                  description: "1-4 vibe tags driving the curation.",
                  items: { type: "string" }
                },
                budgetBand: {
                  type: "string",
                  enum: ["low", "medium", "high", "luxury"]
                }
              }
            }
          }
        }
      }
    }
  }
];

// ---------------------------------------------------------------------------
// Tool dispatch
// ---------------------------------------------------------------------------

export type ToolCallArgs = Record<string, unknown>;

export type ToolDispatchResult =
  | { kind: "destinations"; items: ComposeDestinationCard[] }
  | { kind: "itineraries"; items: ComposeItineraryCard[] }
  | { kind: "error"; message: string };

export async function dispatchTool(name: string, args: ToolCallArgs): Promise<ToolDispatchResult> {
  if (name === "search_destinations") {
    return runSearchDestinations(args);
  }
  if (name === "suggest_itineraries") {
    return runSuggestItineraries(args);
  }
  return { kind: "error", message: `unknown-tool:${name}` };
}

// ---------------------------------------------------------------------------
// search_destinations
// ---------------------------------------------------------------------------

const KNOWN_GENRES = new Set<string>(Object.keys(GENRE_LABELS));
const KNOWN_VIBES = new Set<string>(Object.keys(VIBE_LABELS));
const KNOWN_REGIONS = new Set<string>(REGIONS as readonly string[]);
const KNOWN_BUDGETS = new Set<Budget>(["low", "medium", "high", "luxury"]);

function runSearchDestinations(args: ToolCallArgs): ToolDispatchResult {
  const genres = sanitizeArray(args.genres, KNOWN_GENRES) as Genre[];
  const vibes = sanitizeArray(args.vibes, KNOWN_VIBES) as Vibe[];
  const regions = sanitizeArray(args.regions, KNOWN_REGIONS) as Region[];
  const budget =
    typeof args.budget === "string" && KNOWN_BUDGETS.has(args.budget as Budget)
      ? (args.budget as Budget)
      : null;
  const months = Array.isArray(args.months)
    ? args.months.filter((m): m is number => typeof m === "number" && m >= 1 && m <= 12).map((m) => m as MonthNumber)
    : [];
  const limit = Math.min(8, Math.max(1, typeof args.limit === "number" ? Math.floor(args.limit) : 5));

  const scored = DESTINATIONS.map((destination) => {
    let score = 0;
    const reasons: string[] = [];

    if (genres.length > 0) {
      const overlap = destination.genres.filter((g) => genres.includes(g));
      if (overlap.length > 0) {
        score += overlap.length * 3;
        reasons.push(`${overlap.map((g) => GENRE_LABELS[g]).join(", ")} scene`);
      }
    }
    if (vibes.length > 0) {
      const overlap = destination.vibes.filter((v) => vibes.includes(v));
      if (overlap.length > 0) {
        score += overlap.length * 2;
        reasons.push(`${overlap.map((v) => VIBE_LABELS[v]).join(", ")} vibe`);
      }
    }
    if (regions.length > 0) {
      if (regions.includes(destination.region)) {
        score += 2;
      } else {
        score -= 4; // hard-bias away from off-region picks
      }
    }
    if (budget && destination.budget === budget) {
      score += 2;
      reasons.push(`${budget} budget fit`);
    }
    if (months.length > 0) {
      const monthOverlap = months.filter((m) => destination.activeMonths.includes(m));
      const peakOverlap = months.filter((m) => destination.peakMonths.includes(m));
      if (peakOverlap.length > 0) {
        score += peakOverlap.length * 3;
        reasons.push(`peak in ${peakOverlap.map((m) => monthShort(m)).join("/")}`);
      } else if (monthOverlap.length > 0) {
        score += monthOverlap.length;
      } else {
        score -= 3; // off-season penalty
      }
    }

    return { destination, score, reasons };
  })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    kind: "destinations",
    items: scored.map(({ destination, reasons }) => ({
      slug: destination.slug,
      city: destination.city,
      country: destination.country,
      region: destination.region,
      tagline: destination.tagline,
      budget: destination.budget,
      matchReason: reasons.slice(0, 2).join(" · ") || destination.tagline
    }))
  };
}

// ---------------------------------------------------------------------------
// suggest_itineraries
// ---------------------------------------------------------------------------

type PlanArg = {
  pitch?: string;
  destinationSlug?: string;
  durationDays?: number;
  startDate?: string;
  vibeTags?: string[];
  budgetBand?: string;
};

async function runSuggestItineraries(args: ToolCallArgs): Promise<ToolDispatchResult> {
  const rawPlans = Array.isArray(args.plans) ? (args.plans as PlanArg[]) : [];
  if (rawPlans.length === 0) {
    return { kind: "error", message: "no plans provided" };
  }

  // Cap to 3 to bound LLM cost + UI noise. Filter invalid up-front.
  const plans = rawPlans.slice(0, 3).filter((p) => {
    if (typeof p.destinationSlug !== "string") return false;
    if (typeof p.durationDays !== "number") return false;
    if (![3, 4, 5, 7, 10, 14].includes(p.durationDays)) return false;
    return true;
  });

  const items: ComposeItineraryCard[] = [];
  // Sequential to avoid blowing OpenAI rate limits on parallel generations
  for (const plan of plans) {
    try {
      const itinerary = await generateItinerary({
        destinationSlug: plan.destinationSlug as string,
        durationDays: plan.durationDays as 3 | 4 | 5 | 7 | 10 | 14,
        startDate: plan.startDate,
        vibeTags: plan.vibeTags,
        budgetBand: (plan.budgetBand as Budget | undefined) ?? undefined
      });
      const destination = DESTINATIONS.find((d) => d.slug === itinerary.destinationSlug);
      const totalLow = itinerary.days.reduce((sum, d) => sum + d.costBandUsd.low, 0);
      const totalHigh = itinerary.days.reduce((sum, d) => sum + d.costBandUsd.high, 0);

      items.push({
        pitch: plan.pitch ?? itinerary.title,
        city: destination?.city ?? plan.destinationSlug ?? "—",
        country: destination?.country ?? "",
        durationDays: itinerary.durationDays,
        vibeSummary: itinerary.vibeTags.slice(0, 3).join(" · ") || "curated",
        startDate: itinerary.startDate,
        endDate: itinerary.endDate,
        totalLow,
        totalHigh,
        itinerary
      });
    } catch (err) {
      console.warn("[compose] suggest_itineraries plan failed:", err);
    }
  }

  if (items.length === 0) {
    return { kind: "error", message: "all generations failed" };
  }
  return { kind: "itineraries", items };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitizeArray(value: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (typeof v === "string") {
      const normalized = v.toLowerCase().trim().replace(/\s+/g, "-");
      if (allowed.has(normalized)) out.push(normalized);
    }
  }
  return out;
}

function monthShort(month: MonthNumber): string {
  const labels = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  return labels[month - 1] ?? String(month);
}

// Export a snapshot of the destinations catalog the LLM can ground on. We
// inject this into the system prompt so the model knows what slugs exist
// without having to call search_destinations for every interaction.
export function destinationsCatalogSnippet(): string {
  const lines = DESTINATIONS.map((d) => {
    const tags = [
      d.region,
      `budget:${d.budget}`,
      `genres:${d.genres.slice(0, 3).join("/")}`,
      `vibes:${d.vibes.slice(0, 3).join("/")}`,
      `peak:${d.peakMonths.map(monthShort).join("/")}`
    ].join(" · ");
    return `- ${d.slug} (${d.city}, ${d.country}) — ${tags}`;
  });
  return lines.join("\n");
}

export type ToolCatalog = typeof COMPOSE_TOOLS;
