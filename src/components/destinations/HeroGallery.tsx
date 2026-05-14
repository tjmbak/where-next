"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import type { Destination } from "@/types/content";
import { heroVariantsForGallery } from "@/lib/hero-images";

const ROTATE_MS = 7000;

type HeroGalleryProps = {
  destination: Destination;
};

/**
 * Crossfading 3-shot hero gallery for the destination guide.
 *
 * - Auto-advances every 7s
 * - Pauses on hover or when document loses focus
 * - Respects prefers-reduced-motion (defaults to single peak frame)
 * - Manual prev / next + numbered dots
 */
export function HeroGallery({ destination }: HeroGalleryProps) {
  const slides = useMemo(() => heroVariantsForGallery(destination), [destination]);
  const [active, setActive] = useState(0);
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
            idx === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}

      {slides.length > 1 ? (
        <div className="pointer-events-auto absolute right-6 top-20 z-30 flex items-center gap-2 rounded-full border border-white/15 bg-black/45 py-1.5 pl-2 pr-3 backdrop-blur sm:right-10 sm:top-24">
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
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-white/75 sm:inline">
            {slides[active].caption}
          </span>
        </div>
      ) : null}
    </div>
  );
}
