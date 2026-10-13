"use client";

// Product memory: remember the last destination-month a visitor engaged with
// (guide visit or quick look) so the homepage can offer to resume — and say
// what changed — instead of re-introducing itself every session.

import type { MonthNumber } from "@/types/content";

export type LastVisit = {
  slug: string;
  month: MonthNumber;
  year: number;
  /** Event count for that city-month at the time of the visit. */
  eventCount: number;
  ts: number;
};

const KEY = "wn:last-visit:v1";

export function recordVisit(visit: Omit<LastVisit, "ts">) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...visit, ts: Date.now() }));
  } catch {
    // ignore private mode / quota errors
  }
}

export function readLastVisit(): LastVisit | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastVisit;
    if (
      typeof parsed?.slug !== "string" ||
      typeof parsed?.month !== "number" ||
      typeof parsed?.year !== "number" ||
      typeof parsed?.ts !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastVisit() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
