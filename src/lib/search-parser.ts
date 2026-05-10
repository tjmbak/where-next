import { DESTINATIONS } from "@/data/music-travel";
import type {
  SearchIntent
} from "@/lib/search-intent";
import type {
  Budget,
  Genre,
  MonthNumber,
  Region,
  Vibe
} from "@/types/content";

const MONTH_NAMES: Record<string, MonthNumber> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12
};

const SEASON_TO_MONTH: Record<string, { month: MonthNumber; stay: 3 }> = {
  summer: { month: 7, stay: 3 },
  winter: { month: 12, stay: 3 },
  spring: { month: 4, stay: 3 },
  autumn: { month: 10, stay: 3 },
  fall: { month: 10, stay: 3 }
};

const HOLIDAY_TO_MONTH: Record<string, MonthNumber> = {
  "new year": 12,
  "new years": 12,
  "new year's": 12,
  nye: 12,
  christmas: 12,
  xmas: 12,
  carnival: 2,
  thanksgiving: 11,
  halloween: 10
};

const BUDGET_KEYWORDS: Array<{ rx: RegExp; value: Budget }> = [
  { rx: /\b(cheap|budget|broke|low cost|low-cost|backpack)\b/, value: "low" },
  { rx: /\b(mid|mid[- ]?range|moderate|affordable|reasonable)\b/, value: "medium" },
  { rx: /\b(premium|high[- ]?end|nice)\b/, value: "high" },
  { rx: /\b(luxur(y|ious)|fancy|splurge|baller|upscale|posh|5[- ]?star)\b/, value: "luxury" }
];

const GENRE_KEYWORDS: Array<{ rx: RegExp; value: Genre }> = [
  { rx: /\b(afro[- ]?house|afro)\b/, value: "afro-house" },
  { rx: /\b(amapiano|piano)\b/, value: "amapiano" },
  { rx: /\b(house music|house)\b/, value: "house" },
  { rx: /\btechno\b/, value: "techno" },
  { rx: /\b(electronic|edm|dance music)\b/, value: "electronic" },
  { rx: /\b(hip[- ]?hop|rap)\b/, value: "hip-hop" },
  { rx: /\b(r ?and ?b|rnb|r&b)\b/, value: "r-and-b" },
  { rx: /\b(latin|reggaeton|salsa|cumbia)\b/, value: "latin" },
  { rx: /\bjazz\b/, value: "jazz" },
  { rx: /\bpop\b/, value: "pop" },
  { rx: /\bfestivals?\b/, value: "festival" }
];

const VIBE_KEYWORDS: Array<{ rx: RegExp; value: Vibe }> = [
  { rx: /\b(beach|beaches|beachy|ocean|coast|coastal|seaside)\b/, value: "beach" },
  { rx: /\b(luxur(y|ious)|luxe|upscale|posh|fancy)\b/, value: "luxury" },
  { rx: /\b(underground|warehouse|grimy|raw)\b/, value: "underground" },
  { rx: /\bfestivals?\b/, value: "festival" },
  { rx: /\b(city|urban|metro|metropolis)\b/, value: "city" },
  { rx: /\b(cultural|culture|art|museum|history|historical)\b/, value: "cultural" },
  { rx: /\b(group|friends|squad|crew|with (friends|the boys|the girls))\b/, value: "group-trip" },
  { rx: /\b(late[- ]?night|nightlife|party|party[- ]?heavy|club(s|bing)?|after[- ]?hours)\b/, value: "late-night" }
];

const REGION_KEYWORDS: Array<{ rx: RegExp; value: Region }> = [
  { rx: /\b(europe|european|eu\b|mediterranean)\b/, value: "Europe" },
  { rx: /\b(africa|african)\b/, value: "Africa" },
  { rx: /\b(asia|asian|southeast asia|south[- ]?east asia|sea\b)\b/, value: "Asia" },
  { rx: /\b(middle east|mena|gulf|uae|emirates|dubai region)\b/, value: "Middle East" },
  { rx: /\b(north america|usa|us\b|america|states|canada|caribbean)\b/, value: "North America" },
  { rx: /\b(south america|latin america|latam)\b/, value: "South America" },
  { rx: /\b(oceania|australia|aussie|new zealand|nz\b|sydney|melbourne|auckland)\b/, value: "Oceania" }
];

const STAY_KEYWORDS: Array<{ rx: RegExp; value: 1 | 2 | 3 }> = [
  { rx: /\b(weekend|long weekend|few days|couple days|3 days|2 days|short trip)\b/, value: 1 },
  { rx: /\b(a week|one week|1 week|week long|7 days|weeklong)\b/, value: 1 },
  { rx: /\b(two months|2 months|2[- ]?mo)\b/, value: 2 },
  { rx: /\b(three months|3 months|3[- ]?mo|all summer|whole summer|season|seasonal)\b/, value: 3 }
];

function matchMonth(query: string): MonthNumber | undefined {
  for (const [name, value] of Object.entries(MONTH_NAMES)) {
    const rx = new RegExp(`\\b${name}\\b`, "i");
    if (rx.test(query)) return value;
  }
  for (const [name, info] of Object.entries(SEASON_TO_MONTH)) {
    const rx = new RegExp(`\\b${name}\\b`, "i");
    if (rx.test(query)) return info.month;
  }
  for (const [name, value] of Object.entries(HOLIDAY_TO_MONTH)) {
    const rx = new RegExp(`\\b${name.replace(/'/g, "'?")}\\b`, "i");
    if (rx.test(query)) return value;
  }
  return undefined;
}

function matchSeasonStay(query: string): 3 | undefined {
  for (const name of Object.keys(SEASON_TO_MONTH)) {
    const rx = new RegExp(`\\b${name}\\b`, "i");
    if (rx.test(query)) return 3;
  }
  return undefined;
}

function matchStay(query: string): 1 | 2 | 3 | undefined {
  for (const item of STAY_KEYWORDS) {
    if (item.rx.test(query)) return item.value;
  }
  return matchSeasonStay(query);
}

function matchBudget(query: string): Budget | undefined {
  for (const item of BUDGET_KEYWORDS) {
    if (item.rx.test(query)) return item.value;
  }
  return undefined;
}

function matchGenre(query: string): Genre | undefined {
  for (const item of GENRE_KEYWORDS) {
    if (item.rx.test(query)) return item.value;
  }
  return undefined;
}

function matchVibe(query: string): Vibe | undefined {
  for (const item of VIBE_KEYWORDS) {
    if (item.rx.test(query)) return item.value;
  }
  return undefined;
}

function matchRegion(query: string): Region | undefined {
  for (const item of REGION_KEYWORDS) {
    if (item.rx.test(query)) return item.value;
  }
  return undefined;
}

function matchCity(query: string): string | undefined {
  const explicit = query.match(/\b(?:like|similar to|alternative to|instead of)\s+([a-z][\w\s'/-]{2,})/i);
  if (explicit && explicit[1]) {
    const candidate = explicit[1].trim().toLowerCase();
    const exact = DESTINATIONS.find((d) => d.city.toLowerCase() === candidate);
    if (exact) return exact.slug;
    const partial = DESTINATIONS.find((d) =>
      d.city.toLowerCase().startsWith(candidate.split(/\s+/)[0])
    );
    if (partial) return partial.slug;
  }
  for (const destination of DESTINATIONS) {
    const cityLower = destination.city.toLowerCase();
    const rx = new RegExp(`\\b${cityLower.replace(/[/]/g, "\\$&")}\\b`, "i");
    if (rx.test(query)) return destination.slug;
  }
  return undefined;
}

export function parseSearchQuery(query: string): SearchIntent {
  const trimmed = query.trim();
  const normalized = trimmed.toLowerCase();

  const intent: SearchIntent = {
    query: trimmed,
    source: "parser",
    confidence: "low",
    unparsed: []
  };

  if (!normalized) return intent;

  let signals = 0;

  const month = matchMonth(normalized);
  if (month) {
    intent.month = month;
    signals += 1;
  }

  const stay = matchStay(normalized);
  if (stay) {
    intent.stayLength = stay;
    signals += 1;
  }

  const budget = matchBudget(normalized);
  if (budget) {
    intent.budget = budget;
    signals += 1;
  }

  const genre = matchGenre(normalized);
  if (genre) {
    intent.genre = genre;
    signals += 1;
  }

  const vibe = matchVibe(normalized);
  if (vibe) {
    intent.vibe = vibe;
    signals += 1;
  }

  const region = matchRegion(normalized);
  if (region) {
    intent.region = region;
    signals += 1;
  }

  const cityFocus = matchCity(normalized);
  if (cityFocus) {
    intent.cityFocus = cityFocus;
    signals += 1;
  }

  intent.confidence = signals >= 3 ? "high" : signals >= 1 ? "medium" : "low";
  return intent;
}
