"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Destination, MonthNumber } from "@/types/content";
import { heroVariantsForGallery, pickHeroForMonth } from "@/lib/hero-images";

const ROTATE_MS = 7000;

type HeroGalleryProps = {
  destination: Destination;
  /** When set, the gallery opens on the shot that best matches the month. */
  month?: MonthNumber;
};

/**
 * Crossfading 3-shot hero gallery for the destination guide.
 *
 * - Auto-advances every 7s
 * - Pauses on hover or when document loses focus
 * - Respects prefers-reduced-motion (defaults to single peak frame)
 * - Manual prev / next + numbered dots
 */
export function HeroGallery({ destination, month }: HeroGalleryProps) {
  const slides = useMemo(() => heroVariantsForGallery(destination), [destination]);
  // Open on the shot that matches the selected month (peak vs shoulder).
  const initialIndex = useMemo(() => {
    const target = pickHeroForMonth(destination, month);
    const idx = slides.findIndex((s) => s.src === target);
    return idx >= 0 ? idx : 0;
  }, [destination, month, slides]);
  // Opens on the month-matched frame. Selecting a different month is a full
  // navigation, which remounts this component (see the `key` in the parent),
  // so no in-place sync is needed.
  const [active, setActive] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setReduceMotion("matches" in e ? e.matches : false);
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || slides.length <= 1) return;
    const interval = window.setInterval(() => {
      setActive((idx) => (idx + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(interval);
  }, [reduceMotion, paused, slides.length]);

  // Pause whenever the page isn't visible to avoid silently churning images
  // while the user is on another tab.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => setPaused(document.visibilityState !== "visible");
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const goTo = useCallback((idx: number) => {
    setActive(((idx % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // Left/right arrow keys cycle slides when the gallery (or any of its
  // controls) has focus. Doesn't hijack keys when nothing inside is focused.
  useEffect(() => {
    if (slides.length <= 1) return;
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      const target = e.target as Node | null;
      if (!target || !containerRef.current.contains(target)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, slides.length]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {slides.map((slide, idx) => (
        <Image
          key={slide.variant}
          src={slide.src}
          alt={`${destination.city} — ${slide.caption}`}
          fill
          priority={idx === 0}
          sizes="100vw"
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            idx === active ? "wn-kenburns opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {slides.length > 1 ? (
        <div className="pointer-events-auto absolute right-6 top-20 z-30 flex items-center gap-2 wn-glass-dark rounded-full py-1.5 pl-2 pr-3 sm:right-10 sm:top-24">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="grid h-11 w-11 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:h-9 sm:w-9"
          >
            <span aria-hidden className="text-[18px] leading-none sm:text-[14px]">‹</span>
          </button>
          <div className="flex items-center gap-1.5 px-1">
            {slides.map((slide, idx) => (
              <button
                key={slide.variant}
                type="button"
                onClick={() => goTo(idx)}
                aria-label={`Show ${slide.caption} photo`}
                aria-current={idx === active}
                className={`h-1.5 rounded-full transition-all ${
                  idx === active ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="grid h-11 w-11 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:h-9 sm:w-9"
          >
            <span aria-hidden className="text-[18px] leading-none sm:text-[14px]">›</span>
          </button>
          <span aria-hidden className="ml-1 hidden h-3 w-px bg-white/15 sm:block" />
          <span className="hidden pr-2 text-[13px] font-medium text-white/80 sm:inline">
            {slides[active].caption}
          </span>
        </div>
      ) : null}
    </div>
  );
}
