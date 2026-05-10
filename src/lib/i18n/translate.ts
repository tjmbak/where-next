import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locales";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import pt from "@/locales/pt.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import it from "@/locales/it.json";

type Bundle = Record<string, string>;

const BUNDLES: Record<Locale, Bundle> = { en, es, pt, de, fr, it };

export function t(locale: Locale, key: string, fallback?: string): string {
  const bundle = BUNDLES[locale] ?? BUNDLES[DEFAULT_LOCALE];
  if (bundle[key]) return bundle[key];
  const fallbackBundle = BUNDLES[DEFAULT_LOCALE];
  if (fallbackBundle[key]) return fallbackBundle[key];
  return fallback ?? key;
}
