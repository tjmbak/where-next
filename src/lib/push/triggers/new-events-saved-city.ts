import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendPushToUsers, type PushPayload } from "@/lib/push/server";

// Sends one push per (user, destinationSlug) summarizing how many new events
// landed for cities they have saved. Designed to be called daily after the
// ingest cron with a list of `(slug, count, sampleTitle)` triples.

export type NewEventsBatch = Array<{
  destinationSlug: string;
  destinationCity: string;
  newEventCount: number;
  sampleTitle?: string;
}>;

export async function notifyNewEventsForSavedCities(batch: NewEventsBatch) {
  const supabase = createSupabaseServiceClient();
  if (!supabase || batch.length === 0) return { ok: true, delivered: 0 };

  let totalDelivered = 0;

  for (const entry of batch) {
    if (entry.newEventCount <= 0) continue;

    const { data: savers } = await supabase
      .from("saved_destinations")
      .select("user_id")
      .eq("slug", entry.destinationSlug);

    const userIds = Array.from(new Set(((savers ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)));
    if (userIds.length === 0) continue;

    const { data: optedIn } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("push_enabled", true)
      .in("user_id", userIds);

    const targets = ((optedIn ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
    if (targets.length === 0) continue;

    const body = entry.sampleTitle
      ? `${entry.newEventCount} new in ${entry.destinationCity}, including ${entry.sampleTitle}.`
      : `${entry.newEventCount} new events just dropped in ${entry.destinationCity}.`;

    const payload: PushPayload = {
      title: `${entry.destinationCity} · ${entry.newEventCount} new events`,
      body,
      url: `/destinations/${entry.destinationSlug}`,
      tag: `new-events-${entry.destinationSlug}`
    };

    const result = await sendPushToUsers(targets, payload);
    totalDelivered += result.delivered;
  }

  return { ok: true, delivered: totalDelivered };
}
