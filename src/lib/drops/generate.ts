import { rankForDrop, type DropPick } from "@/lib/drops/rank";
import type { Budget, Genre, MonthNumber, Region } from "@/types/content";

export type DropPayload = {
  userId: string;
  month: MonthNumber;
  year: number;
  picks: DropPick[];
  generatedAt: string;
};

export function nextDropPeriod(now: Date = new Date()): { month: MonthNumber; year: number } {
  const next = new Date(now);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return {
    month: ((next.getUTCMonth() + 1) as MonthNumber),
    year: next.getUTCFullYear()
  };
}

export function generateDropForUser(args: {
  userId: string;
  month: MonthNumber;
  year: number;
  preferences: {
    genres: Genre[];
    regions: Region[];
    budget: Budget | null;
    travelWindows: MonthNumber[];
  };
  savedSlugs: string[];
  limit?: number;
}): DropPayload {
  const picks = rankForDrop({
    month: args.month,
    year: args.year,
    preferences: {
      genres: args.preferences.genres,
      regions: args.preferences.regions,
      budget: args.preferences.budget,
      travelWindows: args.preferences.travelWindows,
      savedSlugs: args.savedSlugs
    },
    limit: args.limit ?? 5
  });

  return {
    userId: args.userId,
    month: args.month,
    year: args.year,
    picks,
    generatedAt: new Date().toISOString()
  };
}

export function dropPeriodSlug(month: MonthNumber, year: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseDropPeriod(period: string): { month: MonthNumber; year: number } | null {
  const match = period.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month: month as MonthNumber };
}
