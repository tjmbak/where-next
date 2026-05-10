/**
 * Local-data answers for the AI search bar.
 *
 * When the LLM extracts a `cityFocus` but doesn't return a discovery block —
 * because the query is a factual destination question, not a "where is X
 * playing" artist query — we fall back to answering directly from our
 * curated dataset (peak months, peakHook, summary, tagline).
 *
 * No external API calls. Always grounded in our data.
 */
import { DESTINATIONS, PEAK_HOOKS } from "@/data/music-travel";
import { getMonthLabel } from "@/data/taxonomy";
import type { MonthNumber } from "@/types/content";
import type { SearchCitation } from "@/lib/search-intent";

export type LocalAnswer = {
  summary: string;
  citations: SearchCitation[];
};

const PEAK_QUESTION =
  /\b(peak|best|prime|busiest|hottest|highest|when|month|season|time to|when's|when is)\b/;

const WHY_QUESTION = /\b(why|tell me|describe|what's|whats|what is)\b/;

const SCENE_QUESTION = /\b(scene|vibe|programming|nightlife|club|festival|event|music)\b/;

function joinHumanList(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function monthRange(months: MonthNumber[]): string {
  return joinHumanList(months.map((m) => getMonthLabel(m)));
}

/**
 * Try to answer `query` from local destination data for `slug`.
 * Returns null when the query doesn't look like a question we can answer
 * confidently from the dataset (we'd rather show the city chips than a weak
 * canned summary).
 */
export function localAnswerForDestination(
  query: string,
  slug: string
): LocalAnswer | null {
  const dest = DESTINATIONS.find((d) => d.slug === slug);
  if (!dest) return null;

  const lower = query.toLowerCase();
  const peakLabel = monthRange(dest.peakMonths);
  const activeLabel = monthRange(dest.activeMonths);
  const peakHook = PEAK_HOOKS[slug] ?? "";

  const cite: SearchCitation = {
    url: `/destinations/${slug}`,
    title: `${dest.city} city guide`
  };

  // Peak / best / when to go.
  if (PEAK_QUESTION.test(lower)) {
    const lead = `${dest.city}'s peak music-travel ${dest.peakMonths.length === 1 ? "month is" : "months are"} ${peakLabel}.`;
    const detail = peakHook || `Active months stretch across ${activeLabel}.`;
    return { summary: `${lead} ${detail}`.trim(), citations: [cite] };
  }

  // Why / what / describe — fall back to the destination summary + tagline.
  if (WHY_QUESTION.test(lower) || SCENE_QUESTION.test(lower)) {
    const summary = dest.summary;
    const peakNote = peakLabel ? ` Peak: ${peakLabel}.` : "";
    return {
      summary: `${summary}${peakNote}`,
      citations: [cite]
    };
  }

  return null;
}
