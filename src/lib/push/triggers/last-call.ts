import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { sendPushToUsers, type PushPayload } from "@/lib/push/server";
import { DESTINATIONS, getEventsForDestination } from "@/data/music-travel";

const LAST_CALL_DAYS_BEFORE = 14;

// Daily-fired trigger. Looks for events starting within ~14 days that have a
// ticketUrl and notifies users who have saved that destination. Idempotency is
// soft (tag-based) — the service worker dedupes via `tag: "last-call-{event}"`
// so a re-run on the same day silently replaces rather than stacks.

export async function notifyLastCall(now: Date = new Date()) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "supabase-not-configured", delivered: 0 };

  const horizonStart = new Date(now);
  horizonStart.setUTCHours(0, 0, 0, 0);
  const horizonEnd = new Date(horizonStart);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + LAST_CALL_DAYS_BEFORE);

  let totalDelivered = 0;

  for (const destination of DESTINATIONS) {
    const events = getEventsForDestination(destination.slug);
    const upcoming = events.filter((event) => {
      if (!event.ticketUrl) return false;
      const start = new Date(event.startDate);
      if (Number.isNaN(start.getTime())) return false;
      return start >= horizonStart && start <= horizonEnd;
    });

    if (upcoming.length === 0) continue;

    const { data: savers } = await supabase
      .from("saved_destinations")
      .select("user_id")
      .eq("slug", destination.slug);
    const userIds = Array.from(new Set(((savers ?? []) as Array<{ user_id: string }>).map((row) => row.user_id)));
    if (userIds.length === 0) continue;

    const { data: optedIn } = await supabase
      .from("user_preferences")
      .select("user_id")
      .eq("push_enabled", true)
      .in("user_id", userIds);
    const targets = ((optedIn ?? []) as Array<{ user_id: string }>).map((row) => row.user_id);
    if (targets.length === 0) continue;

    const top = upcoming.slice().sort((a, b) => b.importanceScore - a.importanceScore)[0];

    const payload: PushPayload = {
      title: `Last call · ${destination.city}`,
      body: `${top.title} starts in <${LAST_CALL_DAYS_BEFORE}d. Tap to grab tickets.`,
      url: top.ticketUrl ?? `/destinations/${destination.slug}`,
      tag: `last-call-${top.id}`,
      requireInteraction: true
    };

    const result = await sendPushToUsers(targets, payload);
    totalDelivered += result.delivered;
  }

  return { ok: true, delivered: totalDelivered };
}
