// Reverse search: "I have these dates (and maybe a budget/scene) — rank my
// options." Pure functions over the local corpus; no network calls. Used by
// the /find page.

import {
  DESTINATIONS,
  getEventsForDestination,
  getScoreForDestinationMonth
} from "@/data/music-travel";
import { BUDGET_LABELS, EDITION_YEAR, SUPPORTED_YEARS, getMonthLabel } from "@/data/taxonomy";
import type {
  Budget,
  Destination,
  Event,
  Genre,
  MonthNumber,
  Region
} from "@/types/content";

export type WindowQuery = {
  /** ISO dates (YYYY-MM-DD), inclusive. */
  from: string;
  to: string;
  genres: Genre[];
  budget: Budget | "all";
  region: Region | "all";
};

export type WindowMatch = {
  destination: Destination;
  /** 0–100 composite for this window. */
  score: number;
  /** Peak seasonal score across the window months. */
  seasonalScore: number;
  /** Events overlapping the window, importance-sorted. */
  events: Event[];
  /** Number of in-window events matching the requested genres. */
  genreMatches: number;
  /** At least one window month is a peak month for this destination. */
  peak: boolean;
  /** True when every in-window event is a forward estimate. */
  allEstimates: boolean;
  reasons: string[];
};

export type StretchPick = {
  destination: Destination;
  event: Event;
  /** Days between the window edge and the event start. */
  deltaDays: number;
  direction: "before" | "after";
};

export type WindowResult =
  | { ok: true; matches: WindowMatch[]; stretch: StretchPick[]; months: Array<{ month: MonthNumber; year: number }> }
  | { ok: false; error: string };

const BUDGET_ORDER: Budget[] = ["low", "medium", "high", "luxury"];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_WINDOW_DAYS = 60;
const STRETCH_DAYS = 5;
const STRETCH_MIN_IMPORTANCE = 82;

function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Distinct (month, year) pairs the window touches, in order. */
function monthsCovered(from: Date, to: Date): Array<{ month: MonthNumber; year: number }> {
  const out: Array<{ month: MonthNumber; year: number }> = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  while (cursor <= to && out.length < 12) {
    out.push({ month: (cursor.getUTCMonth() + 1) as MonthNumber, year: cursor.getUTCFullYear() });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function eventOverlapsWindow(event: Event, fromIso: string, toIso: string): boolean {
  const end = event.endDate ?? event.startDate;
  return event.startDate <= toIso && end >= fromIso;
}

/** Events for a destination across every supported year the window touches. */
function eventsInWindow(slug: string, years: number[], fromIso: string, toIso: string): Event[] {
  const seen = new Set<string>();
  const collected: Event[] = [];
  for (const year of years) {
    for (const event of getEventsForDestination(slug, year)) {
      if (!eventOverlapsWindow(event, fromIso, toIso)) continue;
      const key = `${event.id}@${event.startDate}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(event);
    }
  }
  return collected.sort((a, b) => b.importanceScore - a.importanceScore);
}

export function findWindows(query: WindowQuery): WindowResult {
  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (!from || !to) return { ok: false, error: "Pick a start and end date." };
  if (from > to) return { ok: false, error: "The start date must come before the end date." };
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (to < today) return { ok: false, error: "Those dates have already passed — pick a window that's still ahead." };
  if ((to.getTime() - from.getTime()) / DAY_MS > MAX_WINDOW_DAYS) {
    return { ok: false, error: `Keep the window under ${MAX_WINDOW_DAYS} days — that's a season, not a trip.` };
  }

  const months = monthsCovered(from, to);
  const years = Array.from(new Set(months.map((m) => m.year)));
  const unsupported = years.filter((y) => !SUPPORTED_YEARS.includes(y));
  if (unsupported.length > 0) {
    return {
      ok: false,
      error: `We cover ${SUPPORTED_YEARS.join(" and ")} right now — ${unsupported.join(", ")} isn't researched yet.`
    };
  }

  const wantsGenres = query.genres.length > 0;
  const genreSet = new Set(query.genres);
  const budgetCap = query.budget === "all" ? Infinity : BUDGET_ORDER.indexOf(query.budget);

  const matches: WindowMatch[] = [];
  const stretch: StretchPick[] = [];

  for (const destination of DESTINATIONS) {
    if (query.region !== "all" && destination.region !== query.region) continue;
    if (BUDGET_ORDER.indexOf(destination.budget) > budgetCap) continue;

    const destGenreMatch = destination.genres.some((g) => genreSet.has(g));
    const inWindow = eventsInWindow(destination.slug, years, query.from, query.to);
    const genreMatches = wantsGenres
      ? inWindow.filter((ev) => ev.genres.some((g) => genreSet.has(g))).length
      : 0;

    // Genre acts as a soft-hard filter: the city stays only if its scene or
    // its window lineup actually matches what was asked for.
    if (wantsGenres && !destGenreMatch && genreMatches === 0) continue;

    const seasonalScore = months.reduce((best, m) => {
      const s = getScoreForDestinationMonth(destination.slug, m.month);
      return s && s.overallScore > best ? s.overallScore : best;
    }, 0);
    if (seasonalScore === 0 && inWindow.length === 0) continue;

    const peak = months.some((m) => destination.peakMonths.includes(m.month));
    const topImportance = inWindow[0]?.importanceScore ?? 0;
    const eventScore = Math.min(100, topImportance * 0.75 + Math.min(inWindow.length, 8) * 5);
    const genreScore = wantsGenres
      ? Math.min(100, (genreMatches / Math.max(1, Math.min(inWindow.length, 6))) * 90 + (destGenreMatch ? 10 : 0))
      : 0;

    const score = wantsGenres
      ? 0.4 * seasonalScore + 0.4 * eventScore + 0.2 * genreScore
      : 0.5 * seasonalScore + 0.5 * eventScore;

    const allEstimates = inWindow.length > 0 && inWindow.every((ev) => ev.confirmed === false);

    const reasons: string[] = [];
    if (peak) {
      const peakMonth = months.find((m) => destination.peakMonths.includes(m.month));
      reasons.push(`peak season${peakMonth ? ` (${getMonthLabel(peakMonth.month).toLowerCase()})` : ""}`);
    }
    if (inWindow.length > 0) {
      reasons.push(`${inWindow.length} ${inWindow.length === 1 ? "event" : "events"} in your dates`);
    } else {
      reasons.push("in season, calendar still filling in");
    }
    if (wantsGenres && genreMatches > 0) {
      reasons.push(`${genreMatches} match${genreMatches === 1 ? "es" : ""} your scene`);
    }
    if (query.budget !== "all") {
      reasons.push(`fits ${BUDGET_LABELS[destination.budget]} budget`);
    }
    if (allEstimates) {
      reasons.push("dates are forward estimates");
    }

    matches.push({
      destination,
      score: Math.round(score),
      seasonalScore,
      events: inWindow.slice(0, 6),
      genreMatches,
      peak,
      allEstimates,
      reasons
    });

    // Stretch picks: big events just outside the window (worth shifting for).
    for (const year of years) {
      for (const event of getEventsForDestination(destination.slug, year)) {
        if (event.importanceScore < STRETCH_MIN_IMPORTANCE) continue;
        if (eventOverlapsWindow(event, query.from, query.to)) continue;
        if (wantsGenres && !event.genres.some((g) => genreSet.has(g))) continue;
        const start = parseDate(event.startDate);
        const end = parseDate(event.endDate ?? event.startDate);
        if (!start || !end) continue;
        if (start > to) {
          const delta = Math.round((start.getTime() - to.getTime()) / DAY_MS);
          if (delta <= STRETCH_DAYS) {
            stretch.push({ destination, event, deltaDays: delta, direction: "after" });
          }
        } else if (end < from) {
          const delta = Math.round((from.getTime() - end.getTime()) / DAY_MS);
          if (delta <= STRETCH_DAYS) {
            stretch.push({ destination, event, deltaDays: delta, direction: "before" });
          }
        }
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  stretch.sort((a, b) => b.event.importanceScore - a.event.importanceScore);

  // One stretch pick per destination, top 4 overall.
  const seenStretch = new Set<string>();
  const dedupedStretch = stretch.filter((pick) => {
    if (seenStretch.has(pick.destination.slug)) return false;
    seenStretch.add(pick.destination.slug);
    return true;
  }).slice(0, 4);

  return { ok: true, matches, stretch: dedupedStretch, months };
}

/** Default window suggestion: a Fri–Mon long weekend about five weeks out. */
export function suggestDefaultWindow(now = new Date()): { from: string; to: string } {
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + 35);
  // Roll forward to the next Friday.
  while (base.getUTCDay() !== 5) base.setUTCDate(base.getUTCDate() + 1);
  const end = new Date(base);
  end.setUTCDate(end.getUTCDate() + 3);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  // Clamp inside supported years so the suggestion never errors.
  const maxYear = Math.max(...SUPPORTED_YEARS);
  if (end.getUTCFullYear() > maxYear) {
    return { from: `${maxYear}-12-27`, to: `${maxYear}-12-30` };
  }
  if (base.getUTCFullYear() < EDITION_YEAR) {
    return { from: `${EDITION_YEAR}-01-02`, to: `${EDITION_YEAR}-01-05` };
  }
  return { from: iso(base), to: iso(end) };
}
