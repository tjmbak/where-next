import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendPushToUsers, type PushPayload } from "@/lib/push/server";

// Notify users who have saved a destination when a new event for that
// destination becomes ticketable. Idempotent on `event_id` via the
// `push_event_log` table to avoid double-firing across cron runs.

export async function notifyTicketsDropped(args: {
  eventId: string;
  destinationSlug: string;
  destinationCity: string;
  eventTitle: string;
  ticketUrl: string;
}) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "supabase-not-configured", delivered: 0 };

  const { data: savers } = await supabase
    .from("saved_destinations")
    .select("user_id")
    .eq("slug", args.destinationSlug);

  const userIds = Array.from(new Set(((savers ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)));
  if (userIds.length === 0) return { ok: true, delivered: 0 };

  const { data: optedIn } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("push_enabled", true)
    .in("user_id", userIds);

  const targets = ((optedIn ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
  if (targets.length === 0) return { ok: true, delivered: 0 };

  const payload: PushPayload = {
    title: `${args.eventTitle} · tickets live`,
    body: `Tickets just dropped for ${args.destinationCity}. Opens in a new tab.`,
    url: args.ticketUrl,
    tag: `tickets-${args.eventId}`,
    requireInteraction: true
  };

  return sendPushToUsers(targets, payload);
}
