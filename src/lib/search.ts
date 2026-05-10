import { DESTINATIONS, EVENTS } from "@/data/music-travel";
import { GENRE_LABELS, VIBE_LABELS } from "@/data/taxonomy";
import type { MonthNumber } from "@/types/content";

export type SearchAction =
  | { kind: "selectDestination"; slug: string; month?: MonthNumber }
  | { kind: "applyFilter"; field: "genre" | "vibe"; value: string };

export type SearchResultType = "destination" | "event" | "genre" | "vibe";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  label: string;
  sublabel?: string;
  apply: SearchAction;
};

type IndexEntry = {
  result: SearchResult;
  haystack: string;
  primaryWord: string;
};

const SHORT_MONTHS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec"
] as const;

let cachedIndex: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  if (cachedIndex) return cachedIndex;
  const entries: IndexEntry[] = [];

  for (const dest of DESTINATIONS) {
    const haystack = [
      dest.city,
      dest.country,
      dest.region,
      dest.tagline,
      dest.summary,
      dest.genres.join(" "),
      dest.vibes.join(" "),
      dest.whoFor.join(" ")
    ]
      .join(" ")
      .toLowerCase();
    entries.push({
      result: {
        id: `dest-${dest.slug}`,
        type: "destination",
        label: dest.city,
        sublabel: dest.country.toLowerCase(),
        apply: { kind: "selectDestination", slug: dest.slug }
      },
      haystack,
      primaryWord: dest.city.toLowerCase().split(/[\s/]+/)[0] ?? ""
    });
  }

  for (const event of EVENTS) {
    const dest = DESTINATIONS.find((d) => d.slug === event.destinationSlug);
    if (!dest) continue;
    const startMonth = Number(event.startDate.slice(5, 7)) as MonthNumber;
    const monthLabel = SHORT_MONTHS[startMonth - 1] ?? "";
    const haystack = [
      event.title,
      event.summary,
      event.genres.join(" "),
      dest.city,
      dest.country
    ]
      .join(" ")
      .toLowerCase();
    entries.push({
      result: {
        id: `event-${event.id}`,
        type: "event",
        label: event.title,
        sublabel: `${dest.city.toLowerCase()} · ${monthLabel}`,
        apply: { kind: "selectDestination", slug: dest.slug, month: startMonth }
      },
      haystack,
      primaryWord: event.title.toLowerCase().split(/[\s/]+/)[0] ?? ""
    });
  }

  for (const [value, label] of Object.entries(GENRE_LABELS)) {
    entries.push({
      result: {
        id: `genre-${value}`,
        type: "genre",
        label,
        sublabel: "filter scene",
        apply: { kind: "applyFilter", field: "genre", value }
      },
      haystack: `${label} ${value}`.toLowerCase(),
      primaryWord: label.toLowerCase().split(/[\s/]+/)[0] ?? ""
    });
  }

  for (const [value, label] of Object.entries(VIBE_LABELS)) {
    entries.push({
      result: {
        id: `vibe-${value}`,
        type: "vibe",
        label,
        sublabel: "filter vibe",
        apply: { kind: "applyFilter", field: "vibe", value }
      },
      haystack: `${label} ${value}`.toLowerCase(),
      primaryWord: label.toLowerCase().split(/[\s/]+/)[0] ?? ""
    });
  }

  cachedIndex = entries;
  return entries;
}

const TYPE_PRIORITY: Record<SearchResultType, number> = {
  destination: 4,
  event: 3,
  genre: 2,
  vibe: 1
};

export function searchUniverse(query: string, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const index = buildIndex();
  const scored: Array<{ result: SearchResult; score: number }> = [];
  for (const entry of index) {
    const label = entry.result.label.toLowerCase();
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 70;
    else if (entry.primaryWord === q) score = 60;
    else if (entry.primaryWord.startsWith(q)) score = 45;
    else if (label.includes(q)) score = 30;
    else if (entry.haystack.includes(q)) score = 12;
    if (score === 0) continue;
    score += TYPE_PRIORITY[entry.result.type];
    scored.push({ result: entry.result, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.result);
}
