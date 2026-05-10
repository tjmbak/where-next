// Provider config for affiliate URL rewriting. Adding a new provider only
// requires adding a row here and a webhook handler under
// `src/app/api/webhooks/[provider]/route.ts`.

export type AffiliateProvider = "booking" | "skyscanner" | "gyg" | "viagogo" | "raw";

export type ProviderConfig = {
  id: AffiliateProvider;
  param: string | null; // null = no rewrite, just track
  envVar: string | null;
  hostMatcher?: RegExp;
};

export const PROVIDERS: Record<AffiliateProvider, ProviderConfig> = {
  booking: { id: "booking", param: "aid", envVar: "BOOKING_AID", hostMatcher: /booking\.com$/ },
  skyscanner: {
    id: "skyscanner",
    param: "associateid",
    envVar: "SKYSCANNER_PARTNER_ID",
    hostMatcher: /skyscanner\./
  },
  gyg: {
    id: "gyg",
    param: "partner_id",
    envVar: "GYG_PARTNER_ID",
    hostMatcher: /getyourguide\.com$/
  },
  viagogo: { id: "viagogo", param: "AID", envVar: "VIAGOGO_AID", hostMatcher: /viagogo\.com$/ },
  raw: { id: "raw", param: null, envVar: null }
};

export function isAffiliateProvider(value: string): value is AffiliateProvider {
  return value in PROVIDERS;
}

export function rewriteUrl(provider: AffiliateProvider, target: string, clickId: string): string {
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return target;
  }

  const config = PROVIDERS[provider];
  if (config.param && config.envVar) {
    const tag = process.env[config.envVar];
    if (tag) parsed.searchParams.set(config.param, tag);
  }

  parsed.searchParams.set("label", clickId);
  parsed.searchParams.set("utm_source", "wherenext");
  parsed.searchParams.set("utm_medium", "affiliate");

  return parsed.toString();
}
