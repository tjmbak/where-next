"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function ensureServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export type PushSubscribeResult =
  | { kind: "ok" }
  | { kind: "denied" }
  | { kind: "unsupported" }
  | { kind: "not-configured" }
  | { kind: "error"; message: string };

export async function subscribeToPush(): Promise<PushSubscribeResult> {
  if (typeof window === "undefined") return { kind: "unsupported" };
  if (!("Notification" in window) || !("PushManager" in window)) {
    return { kind: "unsupported" };
  }
  if (!VAPID_PUBLIC_KEY) return { kind: "not-configured" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { kind: "denied" };

  const registration = await ensureServiceWorker();
  if (!registration) return { kind: "unsupported" };

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const keyBytes = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    // Copy into a fresh ArrayBuffer to satisfy the BufferSource type, which
    // doesn't accept SharedArrayBuffer-backed views.
    const applicationServerKey = new Uint8Array(keyBytes.byteLength);
    applicationServerKey.set(keyBytes);
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer
    });
  }

  const json = subscription.toJSON();
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { kind: "error", message: "auth-not-configured" };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { kind: "error", message: "unauthorized" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userData.user.id,
      endpoint: json.endpoint,
      p256dh_key: json.keys?.p256dh,
      auth_key: json.keys?.auth,
      device_kind: "web"
    },
    { onConflict: "endpoint" }
  );

  if (error) return { kind: "error", message: error.message };

  await supabase
    .from("user_preferences")
    .update({ push_enabled: true })
    .eq("user_id", userData.user.id);

  return { kind: "ok" };
}

export async function unsubscribeFromPush(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    const supabase = createSupabaseBrowserClient();
    if (supabase) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from("user_preferences")
          .update({ push_enabled: false })
          .eq("user_id", userData.user.id);
      }
    }
  }
}
