import type { Destination } from "@/types/content";

/**
 * Implicit taste profile derived from the cities a user has saved. Used to
 * gently re-rank the shortlist ("for you") without any backend or account —
 * the saved list already lives in localStorage.
 */
export type Affinity = {
  genres: Map<string, number>;
  regions: Map<string, number>;
  vibes: Map<string, number>;
  budgets: Map<string, number>;
  count: number;
};

function bump(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

export function buildAffinity(saved: Destination[]): Affinity {
  const genres = new Map<string, number>();
  const regions = new Map<string, number>();
  const vibes = new Map<string, number>();
  const budgets = new Map<string, number>();
  for (const dest of saved) {
    dest.genres.forEach((g) => bump(genres, g));
    bump(regions, dest.region);
    dest.vibes.forEach((v) => bump(vibes, v));
    bump(budgets, dest.budget);
  }
  return { genres, regions, vibes, budgets, count: saved.length };
}

/**
 * How well a destination matches the saved-city taste profile. Genres and
 * region carry the most weight; budget is a light tiebreaker.
 */
export function affinityScore(dest: Destination, affinity: Affinity): number {
  if (affinity.count === 0) return 0;
  let score = 0;
  for (const g of dest.genres) score += (affinity.genres.get(g) ?? 0) * 2;
  score += (affinity.regions.get(dest.region) ?? 0) * 1.5;
  for (const v of dest.vibes) score += (affinity.vibes.get(v) ?? 0);
  score += (affinity.budgets.get(dest.budget) ?? 0) * 0.5;
  return score;
}
