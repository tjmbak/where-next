export type AnalyticsEventName =
  | "compare_open"
  | "compare_open_guide"
  | "compare_pick"
  | "destination_card_click"
  | "destination_map_click"
  | "destination_saved_toggle"
  | "destination_share"
  | "filter_change"
  | "outbound_link_click"
  | "search_intent_apply"
  | "search_apply"
  | "waitlist_signup";

type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({ name, payload });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true
  });
}
