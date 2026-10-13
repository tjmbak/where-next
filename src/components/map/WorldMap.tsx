"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { WORLD_DOTS } from "@/data/world-dots";
import { TIER_COLORS, TIER_LABELS, tierFromScore } from "@/lib/tiers";
import { trackEvent } from "@/lib/analytics";
import type { Destination, MonthNumber, MonthlyDestinationScore } from "@/types/content";

type WorldMapProps = {
  month: MonthNumber;
  destinations: Array<{ destination: Destination; score: MonthlyDestinationScore }>;
  selectedSlug?: string;
  hoveredSlug?: string | null;
  onSelect: (slug: string) => void;
  onHoverCity?: (slug: string | null) => void;
};

// Crop of the equirectangular world that holds every city we cover, in
// degrees: x = longitude, y = -latitude.
const VIEW = { west: -130, north: 68, width: 288, height: 113 };
const ASPECT = VIEW.width / VIEW.height;

const LAND_PATH = (() => {
  const { step, latTop, rows } = WORLD_DOTS;
  let d = "";
  rows.forEach((row, index) => {
    if (!row) return;
    const lat = latTop - index * step;
    if (lat > VIEW.north + step || lat < VIEW.north - VIEW.height - step) return;
    const offset = index % 2 ? step / 2 : 0;
    for (const run of row.split(",")) {
      const [startRaw, lengthRaw] = run.split(".");
      const start = parseInt(startRaw, 36);
      const length = parseInt(lengthRaw, 36);
      for (let c = start; c < start + length; c++) {
        const lng = -180 + offset + c * step;
        if (lng < VIEW.west - step || lng > VIEW.west + VIEW.width + step) continue;
        d += `M${lng} ${-lat}h0`;
      }
    }
  });
  return d;
})();

export function toPercent(lat: number, lng: number) {
  return {
    x: ((lng - VIEW.west) / VIEW.width) * 100,
    y: ((VIEW.north - lat) / VIEW.height) * 100
  };
}

type Box = { x: number; y: number; w: number; h: number };
type Placed = { box: Box; leader: { x1: number; y1: number; x2: number; y2: number } | null };

const LABEL_H = 24;
const GAP = 7;

function labelWidth(city: string) {
  return Math.round(city.length * 6.6 + 44);
}

// Snug placements first; when a crowded region (Europe) has no room, labels
// step further out along eight directions and hang off a thin leader line.
const ADJACENT: Array<(px: number, py: number, w: number) => Box> = [
  (px, py, w) => ({ x: px + GAP, y: py - LABEL_H / 2, w, h: LABEL_H }),
  (px, py, w) => ({ x: px - GAP - w, y: py - LABEL_H / 2, w, h: LABEL_H }),
  (px, py, w) => ({ x: px - w / 2, y: py - GAP - LABEL_H, w, h: LABEL_H }),
  (px, py, w) => ({ x: px - w / 2, y: py + GAP, w, h: LABEL_H })
];
const LEADER_DIRECTIONS = [
  [0, -1],
  [-0.8, -0.6],
  [0.8, -0.6],
  [-1, 0],
  [1, 0],
  [-0.8, 0.6],
  [0.8, 0.6],
  [0, 1]
] as const;
const LEADER_DISTANCES = [34, 52];

function leaderBox(px: number, py: number, w: number, dx: number, dy: number, distance: number): Placed {
  const ax = px + dx * distance;
  const ay = py + dy * distance;
  const x = dx > 0.2 ? ax : dx < -0.2 ? ax - w : ax - w / 2;
  const y = ay - LABEL_H / 2;
  const edgeX = dx > 0.2 ? x : dx < -0.2 ? x + w : ax;
  const edgeY = Math.abs(dx) <= 0.2 ? (dy < 0 ? y + LABEL_H : y) : ay;
  return {
    box: { x, y, w, h: LABEL_H },
    leader: { x1: px + dx * 5, y1: py + dy * 5, x2: edgeX, y2: edgeY }
  };
}

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w + 3 && a.x + a.w + 3 > b.x && a.y < b.y + b.h + 2 && a.y + a.h + 2 > b.y;
}

export function WorldMap({
  month,
  destinations,
  selectedSlug,
  hoveredSlug,
  onSelect,
  onHoverCity
}: WorldMapProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [localHover, setLocalHover] = useState<string | null>(null);
  const activeHover = localHover ?? hoveredSlug ?? null;

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const cities = useMemo(
    () =>
      [...destinations]
        .sort((a, b) => b.score.overallScore - a.score.overallScore)
        .map(({ destination, score }, rank) => {
          const tier = tierFromScore(score.overallScore);
          return {
            slug: destination.slug,
            city: destination.city,
            country: destination.country,
            score: score.overallScore,
            tier,
            color: TIER_COLORS[tier],
            rank,
            ...toPercent(destination.coordinates.lat, destination.coordinates.lng)
          };
        }),
    [destinations]
  );

  // Greedy label placement by rank, four snug sides then leader lines, skipping
  // collisions. Depends only on the cities and width: hover and selection must
  // never re-run it, or neighbouring labels jump around under the cursor.
  const labels = useMemo(() => {
    const placed = new Map<string, Placed>();
    if (width === 0) return placed;
    const height = width / ASPECT;
    const budget = width < 520 ? 4 : width < 820 ? 9 : 40;
    const dots = cities.map((city) => ({ x: (city.x / 100) * width, y: (city.y / 100) * height, slug: city.slug }));
    const boxes: Box[] = [];
    for (const city of cities) {
      if (placed.size >= budget) break;
      const px = (city.x / 100) * width;
      const py = (city.y / 100) * height;
      const w = labelWidth(city.city);
      const adjacent = px > width * 0.78 ? [ADJACENT[1], ADJACENT[2], ADJACENT[3], ADJACENT[0]] : ADJACENT;
      const candidates: Placed[] = adjacent.map((place) => ({ box: place(px, py, w), leader: null }));
      for (const distance of width >= 520 ? LEADER_DISTANCES : [26]) {
        for (const [dx, dy] of LEADER_DIRECTIONS) candidates.push(leaderBox(px, py, w, dx, dy, distance));
      }
      for (const candidate of candidates) {
        const { box } = candidate;
        if (box.x < 4 || box.y < 4 || box.x + box.w > width - 4 || box.y + box.h > height - 4) continue;
        if (boxes.some((other) => overlaps(box, other))) continue;
        const coversDot = dots.some(
          (dot) => dot.slug !== city.slug && dot.x > box.x - 3 && dot.x < box.x + box.w + 3 && dot.y > box.y - 3 && dot.y < box.y + box.h + 3
        );
        if (coversDot) continue;
        placed.set(city.slug, candidate);
        boxes.push(box);
        break;
      }
    }
    return placed;
  }, [cities, width]);

  const setHover = (slug: string | null) => {
    setLocalHover(slug);
    onHoverCity?.(slug);
  };

  // A hovered or selected city without a label gets a floating pill on the
  // first free side of its dot, falling back to whichever side fits on screen.
  const focusSlug = activeHover ?? selectedSlug ?? null;
  const focus = useMemo(() => {
    if (!focusSlug || labels.has(focusSlug) || width === 0) return null;
    const city = cities.find((c) => c.slug === focusSlug);
    if (!city) return null;
    const height = width / ASPECT;
    const px = (city.x / 100) * width;
    const py = (city.y / 100) * height;
    const w = labelWidth(city.city);
    const taken = [...labels.values()].map((label) => label.box);
    const candidates: Placed[] = ADJACENT.map((place) => ({ box: place(px, py, w), leader: null }));
    for (const distance of width >= 520 ? LEADER_DISTANCES : [26]) {
      for (const [dx, dy] of LEADER_DIRECTIONS) candidates.push(leaderBox(px, py, w, dx, dy, distance));
    }
    const inBounds = candidates
      .map(({ box, leader }) => {
        const x = Math.min(Math.max(box.x, 4), width - 4 - box.w);
        if (x === box.x) return { box, leader };
        const shifted = { ...box, x };
        if (!leader) return { box: shifted, leader };
        const x2 = Math.min(Math.max(leader.x2, x + 10), x + box.w - 10);
        return { box: shifted, leader: { ...leader, x2 } };
      })
      .filter(
        ({ box }) =>
          box.y >= 4 &&
          box.y + box.h <= height - 4 &&
          !(px > box.x - 4 && px < box.x + box.w + 4 && py > box.y - 4 && py < box.y + box.h + 4)
      );
    const placed = inBounds.find(({ box }) => !taken.some((other) => overlaps(box, other))) ?? inBounds[0];
    return placed ? { city, ...placed } : null;
  }, [focusSlug, labels, cities, width]);

  return (
    <div className="relative">
      <div
        ref={frameRef}
        className="wn-worldmap relative w-full select-none"
        style={{ aspectRatio: `${VIEW.width} / ${VIEW.height}` }}
        onMouseLeave={() => setHover(null)}
      >
        <svg
          aria-hidden
          viewBox={`${VIEW.west} ${-VIEW.north} ${VIEW.width} ${VIEW.height}`}
          className="absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {cities.map((city) => (
              <radialGradient key={city.slug} id={`wn-glow-${city.slug}`}>
                <stop offset="0%" stopColor={city.color} stopOpacity={0.55} />
                <stop offset="45%" stopColor={city.color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={city.color} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>
          <path d={LAND_PATH} stroke="rgba(28,22,18,0.17)" strokeWidth={1.05} strokeLinecap="round" fill="none" />
          {cities.map((city) => {
            const lng = VIEW.west + (city.x / 100) * VIEW.width;
            const lat = VIEW.north - (city.y / 100) * VIEW.height;
            const hot = city.slug === activeHover || city.slug === selectedSlug;
            const radius = (city.tier === "peak" ? 10 : city.tier === "in season" ? 7.5 : 5.5) * (hot ? 1.25 : 1);
            return (
              <circle
                key={city.slug}
                cx={lng}
                cy={-lat}
                r={radius}
                fill={`url(#wn-glow-${city.slug})`}
                className="wn-worldmap-glow"
                style={{ mixBlendMode: "multiply" }}
              />
            );
          })}
        </svg>

        {cities.map((city) => {
          const hot = city.slug === activeHover;
          const selected = city.slug === selectedSlug;
          return (
            <button
              key={city.slug}
              type="button"
              onClick={() => {
                trackEvent("destination_map_click", { slug: city.slug, month, score: city.score });
                onSelect(city.slug);
              }}
              onMouseEnter={() => setHover(city.slug)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(city.slug)}
              onBlur={() => setHover(null)}
              aria-label={`${city.city}, ${city.country}: ${city.score}, ${TIER_LABELS[city.tier]}`}
              className="wn-worldmap-city group absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-2.5 focus:outline-none"
              style={{ left: `${city.x}%`, top: `${city.y}%`, animationDelay: `${Math.min(city.rank, 12) * 45}ms` }}
            >
              {city.rank < 3 ? (
                <span aria-hidden className="wn-worldmap-pulse absolute inset-1 rounded-full" style={{ background: city.color }} />
              ) : null}
              <span
                aria-hidden
                className={`relative block rounded-full ring-2 ring-[var(--background)] transition-transform duration-300 ${
                  hot || selected ? "scale-[1.45]" : "group-hover:scale-125"
                } ${city.tier === "peak" ? "h-2.5 w-2.5" : "h-2 w-2"}`}
                style={{ background: city.color }}
              />
            </button>
          );
        })}

        {width > 0 ? (
          <svg aria-hidden className="pointer-events-none absolute inset-0 z-[5] h-full w-full overflow-visible">
            {cities.map((city) => {
              const leader = labels.get(city.slug)?.leader;
              if (!leader) return null;
              const hot = city.slug === activeHover || city.slug === selectedSlug;
              return (
                <line
                  key={city.slug}
                  {...leader}
                  stroke={hot ? "rgba(28,22,18,0.55)" : "rgba(28,22,18,0.28)"}
                  strokeWidth={1}
                  strokeLinecap="round"
                  className="wn-worldmap-label"
                />
              );
            })}
          </svg>
        ) : null}

        {cities.map((city) => {
          const label = labels.get(city.slug);
          if (!label || width === 0) return null;
          const hot = city.slug === activeHover;
          const selected = city.slug === selectedSlug;
          return (
            <button
              key={`label-${city.slug}`}
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => onSelect(city.slug)}
              onMouseEnter={() => setHover(city.slug)}
              onMouseLeave={() => setHover(null)}
              className={`wn-worldmap-label absolute z-20 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11.5px] font-medium leading-none transition-[left,top,background-color,color,box-shadow,transform] duration-300 ${
                hot || selected
                  ? "bg-[var(--foreground)] text-[var(--background)] shadow-[0_8px_20px_-8px_rgba(28,22,18,0.5)]"
                  : "wn-glass text-[var(--foreground)] hover:-translate-y-px"
              }`}
              style={{ left: label.box.x, top: label.box.y, height: LABEL_H, animationDelay: `${Math.min(city.rank, 12) * 45 + 120}ms` }}
            >
              {city.city}
              <span
                className="font-mono text-[10px] tabular-nums"
                style={{ color: hot || selected ? "inherit" : city.color, opacity: hot || selected ? 0.75 : 1 }}
              >
                {city.score}
              </span>
            </button>
          );
        })}

      </div>

      {focus?.leader ? (
        <svg aria-hidden className="pointer-events-none absolute left-0 top-0 z-30 overflow-visible" style={{ width, height: width / ASPECT }}>
          <line {...focus.leader} stroke="rgba(28,22,18,0.55)" strokeWidth={1} strokeLinecap="round" />
        </svg>
      ) : null}
      {focus ? (
        <div
          key={focus.city.slug}
          aria-hidden
          className="wn-worldmap-label pointer-events-none absolute z-30 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--foreground)] px-2.5 text-[11.5px] font-medium leading-none text-[var(--background)] shadow-[0_8px_20px_-8px_rgba(28,22,18,0.5)]"
          style={{ left: focus.box.x, top: focus.box.y, height: LABEL_H, animationDuration: "200ms", animationDelay: "0ms" }}
        >
          {focus.city.city}
          <span className="font-mono text-[10px] tabular-nums opacity-75">{focus.city.score}</span>
        </div>
      ) : null}

      <div className="pointer-events-none mt-2 hidden justify-end px-6 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted-2)] sm:flex sm:px-10 lg:px-0">
        <span className="flex items-center gap-3">
          {(["peak", "in season", "shoulder"] as const).map((tier) => (
            <span key={tier} className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: TIER_COLORS[tier] }} />
              {TIER_LABELS[tier]}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
