import { getDestinationBySlug } from "@/data/music-travel";
import { notifyForkOwner } from "@/lib/email/triggers/fork-notification";
import type { Itinerary } from "@/lib/itineraries/generate";
import { generateItinerarySlug } from "@/lib/itineraries/slug";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type SourceRow = {
  id: string;
  slug: string;
  owner_id: string | null;
  destination_slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  legs: Itinerary["legs"];
  vibe_tags: string[];
  budget_band: "low" | "medium" | "high" | "luxury";
  days: Itinerary["days"];
  visibility: "public" | "unlisted" | "private";
  generation_meta: { model?: string; generatedAt?: string } | null;
};

export type ForkResult =
  | { ok: true; slug: string; id: string }
  | { ok: false; reason: "not-found" | "forbidden" | "service-unavailable" | "slug-collision" | "insert-failed"; message?: string };

/**
 * Server-side trip fork. Reads the source via service-role so RLS doesn't block
 * the read for public/unlisted parents, then inserts a new itinerary owned by
 * `viewerId` with `parent_id` pointing at the source. Increments fork_count
 * via the SQL RPC.
 *
 * Refuses to fork a private trip you don't own.
 */
export async function forkItinerary(params: { sourceId: string; viewerId: string }): Promise<ForkResult> {
  const service = createSupabaseServiceClient();
  if (!service) return { ok: false, reason: "service-unavailable" };

  const { data: source } = await service
    .from("itineraries")
    .select(
      "id, slug, owner_id, destination_slug, title, start_date, end_date, duration_days, legs, vibe_tags, budget_band, days, visibility, generation_meta"
    )
    .eq("id", params.sourceId)
    .maybeSingle();

  if (!source) return { ok: false, reason: "not-found" };
  const row = source as SourceRow;
  if (row.visibility === "private" && row.owner_id !== params.viewerId) {
    return { ok: false, reason: "forbidden" };
  }

  const destination = getDestinationBySlug(row.destination_slug);
  const cityForSlug = destination?.city ?? row.destination_slug;
  const legs: Itinerary["legs"] = row.legs?.length
    ? row.legs
    : [{ destinationSlug: row.destination_slug, days: row.duration_days }];

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateItinerarySlug(cityForSlug, row.vibe_tags, row.duration_days);
    const titlePrefix = row.title.toLowerCase().startsWith("your ") ? row.title : `Your ${row.title}`;
    const { data, error } = await service
      .from("itineraries")
      .insert({
        slug,
        owner_id: params.viewerId,
        destination_slug: row.destination_slug,
        title: titlePrefix.length > 120 ? row.title : titlePrefix,
        start_date: row.start_date,
        end_date: row.end_date,
        duration_days: row.duration_days,
        legs,
        parent_id: row.id,
        vibe_tags: row.vibe_tags,
        budget_band: row.budget_band,
        days: row.days,
        visibility: "private",
        generation_meta: row.generation_meta ?? {}
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      await service
        .from("itinerary_collaborators")
        .upsert(
          { itinerary_id: data.id, user_id: params.viewerId, role: "owner" },
          { onConflict: "itinerary_id,user_id" }
        );
      await service.rpc("bump_itinerary_fork_count", { itinerary_id: row.id });
      // Notify the parent owner. Awaited inline (typical add ~200ms via Resend)
      // because Vercel serverless functions can be killed after response. The
      // notifier swallows its own errors so fork still succeeds if email fails.
      await notifyForkOwner({
        sourceId: row.id,
        forkId: data.id,
        viewerId: params.viewerId
      });
      return { ok: true, slug: data.slug, id: data.id };
    }
    if (error && error.code !== "23505") {
      return { ok: false, reason: "insert-failed", message: error.message };
    }
  }
  return { ok: false, reason: "slug-collision" };
}
