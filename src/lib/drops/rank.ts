import {
  DESTINATIONS,
  getEventsForDestinationInMonth,
  getScoreForDestinationMonth
} from "@/data/music-travel";
import type {
  Budget,
  Destination,
  Genre,
  MonthNumber,
  MonthlyDestinationScore,
  Region
} from "@/types/content";

export type DropPick = {
  slug: string;
  city: string;
  country: string;
  region: Region;
  tagline: string;
  score: number;
  whyNow: string[];
  topEventTitle: string | null;
  topEventStartDate: string | null;
};

export type RankInputs = {
  month: MonthNumber;
  year: number;
  preferences: {
    genres: Genre[];
    regions: Region[];
    budget: Budget | null;
    travelWindows: MonthNumber[];
    savedSlugs: string[];
  };
  limit?: number;
};

const BUDGET_ORDER: Budget[] = ["low", "medium", "high", "luxury"];

function budgetWithinCeiling(destinationBudget: Budget, ceiling: Budget) {
  return BUDGET_ORDER.indexOf(destinationBudget) <= BUDGET_ORDER.indexOf(ceiling);
}

function affinityBoost(destination: Destination, preferences: RankInputs["preferences"]) {
  let boost = 0;
  if (preferences.genres.length > 0) {
    const genreOverlap = destination.genres.filter((g) => preferences.genres.includes(g)).length;
    boost += genreOverlap * 4;
  }
  if (preferences.regions.length > 0 && preferences.regions.includes(destination.region)) {
    boost += 6;
  }
  if (preferences.savedSlugs.includes(destination.slug)) {
    boost += 8;
  }
  return boost;
}

function topEventForMonth(slug: string, month: MonthNumber) {
  const events = getEventsForDestinationInMonth(slug, month);
  if (events.length === 0) return null;
  return events.slice().sort((a, b) => b.importanceScore - a.importanceScore)[0];
}

export function rankForDrop({ month, preferences, limit = 5 }: RankInputs): DropPick[] {
  const candidates = DESTINATIONS
    .filter((destination) => {
      if (preferences.budget && !budgetWithinCeiling(destination.budget, preferences.budget)) {
        return false;
      }
      if (preferences.travelWindows.length > 0 && !preferences.travelWindows.includes(month)) {
        return false;
      }
      if (!destination.activeMonths.includes(month) && !destination.peakMonths.includes(month)) {
        return false;
      }
      return true;
    })
    .map((destination) => {
      const score = getScoreForDestinationMonth(destination.slug, month);
      return { destination, score };
    })
    .filter((entry): entry is { destination: Destination; score: MonthlyDestinationScore } =>
      Boolean(entry.score)
    );

  if (candidates.length === 0 && preferences.travelWindows.length === 0) {
    // Fallback: ignore travel windows if too restrictive (handled above) — and
    // if we have nothing for the month, return nothing rather than padding.
    return [];
  }

  return candidates
    .map(({ destination, score }) => ({
      destination,
      score,
      adjusted: score.overallScore + affinityBoost(destination, preferences)
    }))
    .sort((a, b) => b.adjusted - a.adjusted)
    .slice(0, limit)
    .map(({ destination, score }): DropPick => {
      const event = topEventForMonth(destination.slug, month);
      return {
        slug: destination.slug,
        city: destination.city,
        country: destination.country,
        region: destination.region,
        tagline: destination.tagline,
        score: score.overallScore,
        whyNow: score.whyNow ?? [],
        topEventTitle: event?.title ?? null,
        topEventStartDate: event?.startDate ?? null
      };
    });
}
