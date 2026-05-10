import { createSupabaseServiceClient } from "@/lib/supabase/server";

type WebPushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
};

let webPushModule: typeof import("web-push") | null = null;
let webPushTried = false;
let configured = false;

async function getWebPush() {
  if (webPushModule || webPushTried) return webPushModule;
  webPushTried = true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_CONTACT;
  if (!publicKey || !privateKey) return null;

  try {
    const mod = await import("web-push");
    mod.setVapidDetails(contact ?? "mailto:hello@wherenext.fm", publicKey, privateKey);
    webPushModule = mod;
    configured = true;
    return webPushModule;
  } catch (error) {
    console.warn("[push] web-push module unavailable:", error);
    return null;
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "supabase-not-configured", delivered: 0 };

  const webpush = await getWebPush();
  if (!webpush || !configured) {
    if (process.env.NODE_ENV === "development") {
      console.info("[push:dev] would send", { userId, payload });
      return { ok: true, delivered: 0, skipped: true };
    }
    return { ok: false, reason: "push-not-configured", delivered: 0 };
  }

  const { data } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh_key, auth_key")
    .eq("user_id", userId);

  if (!data || data.length === 0) return { ok: true, delivered: 0 };

  let delivered = 0;
  const stale: string[] = [];
  await Promise.all(
    data.map(async (row) => {
      const subscription: WebPushSubscription = {
        endpoint: row.endpoint as string,
        keys: { p256dh: row.p256dh_key as string, auth: row.auth_key as string }
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
        delivered++;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 410 || status === 404) {
          stale.push(subscription.endpoint);
        } else {
          console.warn("[push] send error", error);
        }
      }
    })
  );

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return { ok: true, delivered };
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  let total = 0;
  for (const id of userIds) {
    const result = await sendPushToUser(id, payload);
    total += result.delivered;
  }
  return { ok: true, delivered: total };
}
