import { createSupabaseServiceClient } from "@/lib/supabase/server";

export type PopularItineraryRow = {
  id: string;
  slug: string;
  title: string;
  duration_days: number;
  vibe_tags: string[];
  budget_band: "low" | "medium" | "high" | "luxury";
  fork_count: number;
  view_count: number;
  start_date: string | null;
  end_date: string | null;
  days_cost_low: number;
  days_cost_high: number;
};

type RawRow = {
  id: string;
  slug: string;
  title: string;
  duration_days: number;
  vibe_tags: string[];
  budget_band: PopularItineraryRow["budget_band"];
  fork_count: number;
  view_count: number;
  start_date: string | null;
  end_date: string | null;
  days: Array<{ costBandUsd?: { low?: number; high?: number } }> | null;
};

/**
 * Fetches the most popular public/unlisted itineraries that anchor on or
 * include this destination. Sorted by fork_count desc, then view_count desc,
 * then recency. Private itineraries and itineraries with empty day arrays
 * are excluded so the social-proof surface stays trustworthy.
 */
export async function loadPopularItinerariesForDestination(
  destinationSlug: string,
  limit = 3
): Promise<PopularItineraryRow[]> {
  const service = createSupabaseServiceClient();
  if (!service) return [];

  const { data, error } = await service
    .from("itineraries")
    .select(
      "id, slug, title, duration_days, vibe_tags, budget_band, fork_count, view_count, start_date, end_date, days"
    )
    .eq("destination_slug", destinationSlug)
    .in("visibility", ["public", "unlisted"])
    .order("fork_count", { ascending: false })
    .order("view_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit * 3); // overfetch so we can filter out empty/malformed rows

  if (error || !data) return [];

  const rows = (data as RawRow[]).filter((row) => Array.isArray(row.days) && row.days.length > 0);
  return rows.slice(0, limit).map((row) => {
    const days = row.days ?? [];
    const totalLow = days.reduce((sum, d) => sum + (d?.costBandUsd?.low ?? 0), 0);
    const totalHigh = days.reduce((sum, d) => sum + (d?.costBandUsd?.high ?? 0), 0);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      duration_days: row.duration_days,
      vibe_tags: row.vibe_tags ?? [],
      budget_band: row.budget_band,
      fork_count: row.fork_count ?? 0,
      view_count: row.view_count ?? 0,
      start_date: row.start_date,
      end_date: row.end_date,
      days_cost_low: totalLow,
      days_cost_high: totalHigh
    };
  });
}
