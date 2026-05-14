export type AnalyticsEventName =
  | "compare_open"
  | "compare_open_guide"
  | "compare_pick"
  | "destination_card_click"
  | "destination_map_click"
  | "destination_saved_toggle"
  | "destination_share"
  | "compose_entry_click"
  | "compose_send"
  | "compose_tool_result"
  | "compose_save_click"
  | "compose_save_success"
  | "compose_save_auth_prompt"
  | "filter_change"
  | "itinerary_fork_click"
  | "itinerary_fork_success"
  | "itinerary_fork_auth_prompt"
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
