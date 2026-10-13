/**
 * The map's heat layer uses three visual weights. Both the type and the
 * thresholds/colors now come from the single source of truth in
 * `@/lib/tiers` so the map can never drift from the cards / preview.
 */
export type { HeatTier as Tier } from "@/lib/tiers";
export { heatTierFromScore as tierFromScore, HEAT_TIER_COLORS as TIER_COLORS } from "@/lib/tiers";
