/**
 * Single source of truth for activity-score tiers.
 *
 * Every surface that turns an `overallScore` (0-100) into a label or color
 * should use this so the map, cards, compare, and preview never disagree.
 */
export type Tier = "peak" | "in season" | "shoulder" | "warm";

export function tierFromScore(score: number): Tier {
  if (score >= 90) return "peak";
  if (score >= 80) return "in season";
  if (score >= 70) return "shoulder";
  return "warm";
}

/** Editorial labels used in card/sheet badges. */
export const TIER_LABELS: Record<Tier, string> = {
  peak: "peak",
  "in season": "in season",
  shoulder: "shoulder",
  warm: "warm"
};

/** Warm cream-theme palette shared across map markers, dots, and badges. */
export const TIER_COLORS: Record<Tier, string> = {
  peak: "#e8590c",
  "in season": "#d97706",
  shoulder: "#a8957f",
  warm: "#9a8979"
};

/**
 * The map's heat layer only needs three visual weights. Shoulder + warm both
 * read as the coolest tier on the heatmap so the world doesn't light up evenly.
 */
export type HeatTier = "peak" | "hot" | "warm";

export function heatTierFromScore(score: number): HeatTier {
  if (score >= 90) return "peak";
  if (score >= 75) return "hot";
  return "warm";
}

export const HEAT_TIER_COLORS: Record<HeatTier, string> = {
  peak: "#e8590c",
  hot: "#d97706",
  warm: "#9a8979"
};
