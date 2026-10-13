import type { ResearchedEventsResponse } from "./schemas";

type ResearchedEvent = ResearchedEventsResponse["events"][number];

const SEARCH_PARAMS = ["q", "query", "keyword", "keywords", "search", "searchTerm"];

/** True for search-engine pages and on-site search/listing results, which must never be linked. */
export function isSearchResultsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return true;
    if (/(^|\.)(google|bing|duckduckgo|yahoo)\.[a-z.]+$/i.test(u.hostname)) return true;
    const hasQuery = SEARCH_PARAMS.some((p) => u.searchParams.has(p));
    if (/\/search(\/|$)/i.test(u.pathname) && hasQuery) return true;
    return hasQuery && /^\/?(home|events|results)?\/?$/i.test(u.pathname);
  } catch {
    return true;
  }
}

const TITLE_STOPWORDS = new Set([
  "the", "and", "presents", "present", "pres", "with", "party", "closing", "opening", "night", "nights",
  "festival", "fest", "live", "tour", "edition", "part", "official", "tickets", "season", "weekend", "more"
]);
const VENUE_STOPWORDS = new Set(["the", "club", "beach", "bar", "venue", "venues", "various", "multiple", "around", "tba", "and", "hotel", "room"]);

function tokens(text: string | null | undefined, cityTokens: Set<string>, stop: Set<string>): Set<string> {
  return new Set(
    (text ?? "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(19|20)\d{2}\b/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !stop.has(t) && !cityTokens.has(t))
      .map((t) => (t.length > 4 && t.endsWith("s") ? t.slice(0, -1) : t))
  );
}

/**
 * Collapse rows that describe the same listing: same start date, same venue,
 * and titles sharing their distinctive words. Words common across the month's
 * list ("NYE", "Afronation Week") are down-weighted so different parties
 * sharing a theme stay separate. Keeps the higher-importance row and borrows
 * a ticket link from the dropped one when the keeper has none.
 */
export function dedupeListings(events: ResearchedEvent[], city: string): { events: ResearchedEvent[]; removed: Array<[kept: ResearchedEvent, dropped: ResearchedEvent]> } {
  const cityTokens = new Set(city.toLowerCase().split(/[^a-z0-9]+/));
  const titles = events.map((ev) => tokens(ev.title, cityTokens, TITLE_STOPWORDS));
  const venues = events.map((ev) => tokens(ev.venueName, cityTokens, VENUE_STOPWORDS));
  const df = new Map<string, number>();
  for (const set of titles) for (const t of set) df.set(t, (df.get(t) ?? 0) + 1);
  const weight = (t: string) => Math.log(1 + events.length / (df.get(t) ?? 1));
  const mass = (set: Set<string>) => [...set].reduce((sum, t) => sum + weight(t), 0);

  const same = (i: number, j: number) => {
    if (events[i].startDate !== events[j].startDate) return false;
    if (![...venues[i]].some((t) => venues[j].has(t))) return false;
    const a = titles[i];
    const b = titles[j];
    if (a.size === 0 || b.size === 0) return false;
    const shared = [...a].filter((t) => b.has(t));
    if (Math.min(a.size, b.size) === 1 && shared.length !== Math.max(a.size, b.size)) return false;
    return mass(new Set(shared)) / Math.min(mass(a), mass(b)) >= 0.65;
  };

  const keeper = events.map((_, i) => i);
  const removed: Array<[ResearchedEvent, ResearchedEvent]> = [];
  const out = [...events];
  for (let i = 0; i < events.length; i++) {
    for (let j = 0; j < i; j++) {
      if (keeper[j] !== j || !same(i, j)) continue;
      const [win, lose] = events[i].importance > out[j].importance ? [i, j] : [j, i];
      const merged = { ...(win === i ? events[i] : out[j]) };
      const loser = lose === i ? events[i] : out[j];
      if (!merged.ticketUrl && loser.ticketUrl) merged.ticketUrl = loser.ticketUrl;
      out[j] = merged;
      keeper[i] = j;
      removed.push([merged, loser]);
      break;
    }
  }
  return { events: out.filter((_, i) => keeper[i] === i), removed };
}
