import type { Destination, MonthNumber } from "@/types/content";
import HERO_MANIFEST from "@/data/generated/hero-manifest.json";

export type HeroVariant = "peak" | "shoulder" | "detail";

const SHOULDER_AVAILABLE = new Set<string>(HERO_MANIFEST.shoulder);
const DETAIL_AVAILABLE = new Set<string>(HERO_MANIFEST.detail);

/**
 * Convention-based hero image URLs.
 *
 * `destination.heroImage` is the canonical "peak" image
 * (e.g. /images/heroes/ibiza.png). The shoulder/detail variants
 * sit alongside it as `{slug}-shoulder.png` and `{slug}-detail.png`.
 */
export function heroVariantUrl(heroImage: string, variant: HeroVariant): string {
  if (variant === "peak") return heroImage;
  return heroImage.replace(/\.png$/i, `-${variant}.png`);
}

function slugFromHero(heroImage: string): string {
  const match = /\/heroes\/([a-z0-9-]+)\.png$/i.exec(heroImage);
  return match?.[1] ?? "";
}

export function hasVariant(heroImage: string, variant: HeroVariant): boolean {
  if (variant === "peak") return true;
  const slug = slugFromHero(heroImage);
  return variant === "shoulder" ? SHOULDER_AVAILABLE.has(slug) : DETAIL_AVAILABLE.has(slug);
}

/**
 * Returns the URL of the hero that best matches the user's currently
 * selected month for this destination:
 *  - if the month falls inside the destination's peak season → peak hero
 *  - otherwise, if a shoulder hero exists                    → shoulder hero
 *  - otherwise                                              → peak hero (graceful fallback)
 *
 * Storytelling intent: when the user is viewing Ibiza in January, we want
 * to show the empty-winter-beach Ibiza, not the high-summer-pergola one.
 */
export function pickHeroForMonth(destination: Destination, month: MonthNumber | undefined): string {
  if (!month) return destination.heroImage;
  if (destination.peakMonths.includes(month)) return destination.heroImage;
  if (!hasVariant(destination.heroImage, "shoulder")) return destination.heroImage;
  return heroVariantUrl(destination.heroImage, "shoulder");
}

/**
 * The ordered set of variants used in the destination guide gallery.
 * Variants that haven't been generated yet are silently skipped, so a
 * city with only its peak hero shows a single non-cycling slide.
 */
export function heroVariantsForGallery(destination: Destination): Array<{
  variant: HeroVariant;
  src: string;
  caption: string;
}> {
  const slides: Array<{ variant: HeroVariant; src: string; caption: string }> = [
    { variant: "peak", src: heroVariantUrl(destination.heroImage, "peak"), caption: "peak season" }
  ];
  if (hasVariant(destination.heroImage, "shoulder")) {
    slides.push({
      variant: "shoulder",
      src: heroVariantUrl(destination.heroImage, "shoulder"),
      caption: "off-peak"
    });
  }
  if (hasVariant(destination.heroImage, "detail")) {
    slides.push({
      variant: "detail",
      src: heroVariantUrl(destination.heroImage, "detail"),
      caption: "venue & street"
    });
  }
  return slides;
}
