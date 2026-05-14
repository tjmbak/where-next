import { getDestinationBySlug } from "@/data/music-travel";
import { sendEmail } from "@/lib/email/client";
import { renderTripForkedEmail } from "@/lib/email/templates/trip-forked";
import { siteUrl } from "@/lib/structured-data";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type NotifyForkOwnerInput = {
  sourceId: string;
  forkId: string;
  viewerId: string;
};

const THROTTLE_WINDOW_HOURS = 24;

/**
 * Fired after a successful fork. Looks up the source owner, respects their
 * fork_email_enabled preference, and sends at most one email per source per
 * 24h regardless of how many forks land in that window. Never throws —
 * failures are logged so the surrounding fork flow stays fast and atomic.
 */
export async function notifyForkOwner(input: NotifyForkOwnerInput): Promise<void> {
  try {
    const service = createSupabaseServiceClient();
    if (!service) return;

    const { data: source } = await service
      .from("itineraries")
      .select("id, title, slug, owner_id, destination_slug, duration_days, fork_count, visibility")
      .eq("id", input.sourceId)
      .maybeSingle();

    if (!source || !source.owner_id) return;
    // Refuse self-notification: forking your own trip shouldn't email you.
    if (source.owner_id === input.viewerId) return;
    // Don't email about private trips — they shouldn't be forkable, but defense in depth.
    if (source.visibility === "private") return;

    // Preferences gate
    const { data: prefs } = await service
      .from("user_preferences")
      .select("fork_email_enabled, handle")
      .eq("user_id", source.owner_id)
      .maybeSingle();

    if (prefs && prefs.fork_email_enabled === false) return;

    // Throttle: bail if we've notified this owner about this source in the last window.
    const sinceIso = new Date(Date.now() - THROTTLE_WINDOW_HOURS * 3600 * 1000).toISOString();
    const { count: recentCount } = await service
      .from("fork_notifications")
      .select("id", { count: "exact", head: true })
      .eq("source_itinerary_id", source.id)
      .eq("recipient_user_id", source.owner_id)
      .gte("sent_at", sinceIso);

    if ((recentCount ?? 0) > 0) {
      // Still log the fork → ensures future throttling decisions reflect this attempt.
      await service.from("fork_notifications").insert({
        source_itinerary_id: source.id,
        recipient_user_id: source.owner_id,
        fork_itinerary_id: input.forkId,
        sent_at: new Date().toISOString()
      });
      return;
    }

    // Resolve recipient email via Supabase Auth admin (cheap, owner is one user).
    const { data: userLookup } = await service.auth.admin.getUserById(source.owner_id);
    const recipientEmail = userLookup?.user?.email ?? null;
    if (!recipientEmail) return;

    const recipientFirstName = pickFirstName(userLookup?.user?.user_metadata);
    const { data: forkerPrefs } = await service
      .from("user_preferences")
      .select("handle")
      .eq("user_id", input.viewerId)
      .maybeSingle();

    const destination = getDestinationBySlug(source.destination_slug);
    const cityLabel = destination?.city ?? source.destination_slug;
    const base = siteUrl();
    const originalUrl = `${base}/itineraries/${source.slug}`;
    const unsubscribeUrl = `${base}/api/preferences/unsubscribe?channel=fork&token=${encodeURIComponent(source.owner_id)}`;

    const rendered = renderTripForkedEmail({
      recipientEmail,
      recipientFirstName,
      originalTitle: source.title as string,
      originalCity: cityLabel,
      originalUrl,
      originalDurationDays: source.duration_days as number,
      // fork_count was already incremented before this trigger runs.
      originalForkCount: (source.fork_count as number) ?? 1,
      forkerHandle: (forkerPrefs?.handle as string | null) ?? null,
      unsubscribeUrl,
      siteUrl: base
    });

    const sendResult = await sendEmail({
      to: recipientEmail,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: "trip-forked"
    });

    if (!sendResult.ok && !sendResult.skipped) {
      console.warn("[fork-notification] send failed", sendResult.error);
      return;
    }

    await service.from("fork_notifications").insert({
      source_itinerary_id: source.id,
      recipient_user_id: source.owner_id,
      fork_itinerary_id: input.forkId,
      sent_at: new Date().toISOString()
    });
  } catch (error) {
    console.warn("[fork-notification] threw", error);
  }
}

function pickFirstName(metadata: Record<string, unknown> | undefined | null): string | null {
  if (!metadata) return null;
  const candidates = ["first_name", "given_name", "name", "full_name"] as const;
  for (const key of candidates) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().split(/\s+/)[0];
    }
  }
  return null;
}
