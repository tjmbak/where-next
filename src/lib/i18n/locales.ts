// Locale scaffolding for Engine 6.4. We intentionally do *not* refactor every
// app route to live under /[locale]/ in this pass — that's a structural change
// that needs its own PR. This module gives every consumer (server components,
// emails, structured data) a single source of truth for the supported locales,
// the matching logic, and the translation lookup, so individual pages can be
// internationalized incrementally without breaking the existing English
// surface.

export const SUPPORTED_LOCALES = ["en", "es", "pt", "de", "fr", "it"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const LOCALE_MAP: Record<string, Locale> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  pt: "pt",
  "pt-br": "pt",
  "pt-pt": "pt",
  de: "de",
  "de-de": "de",
  fr: "fr",
  "fr-fr": "fr",
  it: "it",
  "it-it": "it"
};

export function matchLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  const ranges = acceptLanguage
    .split(",")
    .map((entry) => {
      const [tag, qPart] = entry.trim().split(";");
      const q = qPart && qPart.startsWith("q=") ? Number(qPart.slice(2)) : 1;
      return { tag: tag.toLowerCase(), q };
    })
    .filter((entry) => Number.isFinite(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranges) {
    if (LOCALE_MAP[tag]) return LOCALE_MAP[tag];
    const base = tag.split("-")[0];
    if (LOCALE_MAP[base]) return LOCALE_MAP[base];
  }
  return DEFAULT_LOCALE;
}

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
