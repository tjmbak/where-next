import { DESTINATIONS, EVENTS } from "@/data/music-travel";
import { GENRE_LABELS, VIBE_LABELS } from "@/data/taxonomy";
import type { MonthNumber } from "@/types/content";

export type SearchAction =
  | { kind: "selectDestination"; slug: string; month?: MonthNumber }
  | { kind: "applyFilter"; field: "genre" | "vibe"; value: string }
  | { kind: "navigate"; href: string };

export type SearchResultType = "destination" | "event" | "genre" | "vibe";

export type SearchResult = {
  id: string;
  type: SearchResultType;
  label: string;
  sublabel?: string;
  image?: string;
  apply: SearchAction;
};

export type GroupedSearchResults = {
  cities: SearchResult[];
  filters: SearchResult[];
  events: SearchResult[];
  /** True when a sound or vibe is a closer match than any city name. */
  filtersFirst: boolean;
};

type IndexEntry = {
  result: SearchResult;
  haystack: string;
  primaryWord: string;
  /** Last day of an event; past events are left out of results. */
  endsOn?: string;
  startsOn?: string;
  /** Sound and vibe labels a city is known for. */
  tags?: string[];
};

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
        sublabel: dest.country,
        image: dest.heroImage,
        apply: { kind: "selectDestination", slug: dest.slug }
      },
      haystack,
      primaryWord: dest.city.toLowerCase().split(/[\s/]+/)[0] ?? "",
      tags: [
        ...dest.genres.map((g) => GENRE_LABELS[g]?.toLowerCase() ?? g),
        ...dest.vibes.map((v) => VIBE_LABELS[v]?.toLowerCase() ?? v)
      ]
    });
  }

  for (const event of EVENTS) {
    const dest = DESTINATIONS.find((d) => d.slug === event.destinationSlug);
    if (!dest) continue;
    const startMonth = Number(event.startDate.slice(5, 7)) as MonthNumber;
    const startYear = Number(event.startDate.slice(0, 4));
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
        sublabel: `${formatDay(event.startDate)} · ${dest.city}`,
        image: dest.heroImage,
        apply: {
          kind: "navigate",
          href: `/destinations/${dest.slug}?month=${startMonth}&year=${startYear}#event-${event.id}`
        }
      },
      haystack,
      primaryWord: event.title.toLowerCase().split(/[\s/]+/)[0] ?? "",
      startsOn: event.startDate.slice(0, 10),
      endsOn: (event.endDate ?? event.startDate).slice(0, 10)
    });
  }

  for (const [value, label] of Object.entries(GENRE_LABELS)) {
    entries.push({
      result: {
        id: `genre-${value}`,
        type: "genre",
        label,
        sublabel: "Sound",
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
        sublabel: "Vibe",
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

function scoreEntries(query: string): Array<{ entry: IndexEntry; score: number }> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const today = new Date().toISOString().slice(0, 10);
  const scored: Array<{ entry: IndexEntry; score: number }> = [];
  for (const entry of buildIndex()) {
    if (entry.endsOn && entry.endsOn < today) continue;
    const label = entry.result.label.toLowerCase();
    let score = 0;
    if (label === q) score = 100;
    else if (label.startsWith(q)) score = 70;
    else if (entry.primaryWord === q) score = 60;
    else if (entry.primaryWord.startsWith(q)) score = 45;
    else if (label.includes(q)) score = 30;
    else if (entry.tags?.some((tag) => tag.startsWith(q))) score = 25;
    else if (entry.haystack.includes(q)) score = 12;
    if (score === 0) continue;
    score += TYPE_PRIORITY[entry.result.type];
    scored.push({ entry, score });
  }
  return scored.sort(
    (a, b) => b.score - a.score || (a.entry.startsOn ?? "").localeCompare(b.entry.startsOn ?? "")
  );
}

export function searchUniverse(query: string, limit = 8): SearchResult[] {
  return scoreEntries(query)
    .slice(0, limit)
    .map((s) => s.entry.result);
}

/** Results split by kind so the dropdown can show cities and scenes ahead of one-off events. */
export function searchGrouped(query: string): GroupedSearchResults {
  const groups: GroupedSearchResults = { cities: [], filters: [], events: [], filtersFirst: false };
  let bestCity = 0;
  let bestFilter = 0;
  for (const { entry, score } of scoreEntries(query)) {
    if (entry.result.type === "destination") bestCity = Math.max(bestCity, score);
    else if (entry.result.type !== "event") bestFilter = Math.max(bestFilter, score);
    const { result } = entry;
    if (result.type === "destination" && groups.cities.length < 3) groups.cities.push(result);
    else if ((result.type === "genre" || result.type === "vibe") && groups.filters.length < 3) groups.filters.push(result);
    else if (result.type === "event" && groups.events.length < 4) groups.events.push(result);
  }
  groups.filtersFirst = bestFilter > bestCity;
  return groups;
}

const DAY_FORMAT = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function formatDay(iso: string) {
  return DAY_FORMAT.format(new Date(`${iso.slice(0, 10)}T00:00:00Z`));
}
