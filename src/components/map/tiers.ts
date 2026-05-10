export type Tier = "peak" | "hot" | "warm";

export const TIER_COLORS: Record<Tier, string> = {
  peak: "#ff8b3d",
  hot: "#f5d971",
  warm: "#9aa0a6"
};

export function tierFromScore(score: number): Tier {
  if (score >= 90) return "peak";
  if (score >= 75) return "hot";
  return "warm";
}
