import { z } from "zod";
import type { Budget, Genre, MonthNumber, Region } from "@/types/content";

export type UserPreferences = {
  homeCity: string | null;
  genres: Genre[];
  regions: Region[];
  budget: Budget | null;
  travelWindows: MonthNumber[];
  pushEnabled: boolean;
  dropEnabled: boolean;
  forkEmailEnabled: boolean;
};

export const EMPTY_PREFERENCES: UserPreferences = {
  homeCity: null,
  genres: [],
  regions: [],
  budget: null,
  travelWindows: [],
  pushEnabled: false,
  dropEnabled: true,
  forkEmailEnabled: true
};

const monthEnum = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
  z.literal(11),
  z.literal(12)
]);

export const preferencesSchema = z.object({
  homeCity: z.string().trim().max(80).nullable().optional(),
  genres: z.array(z.string().trim().max(40)).max(11).optional(),
  regions: z.array(z.string().trim().max(40)).max(7).optional(),
  budget: z.enum(["low", "medium", "high", "luxury"]).nullable().optional(),
  travelWindows: z.array(monthEnum).max(12).optional(),
  pushEnabled: z.boolean().optional(),
  dropEnabled: z.boolean().optional(),
  forkEmailEnabled: z.boolean().optional()
});

export type PreferencesInput = z.infer<typeof preferencesSchema>;

type PreferencesRow = {
  home_city: string | null;
  genres: string[] | null;
  regions: string[] | null;
  budget: Budget | null;
  travel_windows: number[] | null;
  push_enabled: boolean | null;
  drop_enabled: boolean | null;
  fork_email_enabled: boolean | null;
};

export function normalizePreferencesRow(row: PreferencesRow | null): UserPreferences {
  if (!row) return EMPTY_PREFERENCES;
  return {
    homeCity: row.home_city,
    genres: (row.genres ?? []) as Genre[],
    regions: (row.regions ?? []) as Region[],
    budget: row.budget,
    travelWindows: ((row.travel_windows ?? []) as MonthNumber[]),
    pushEnabled: row.push_enabled ?? false,
    dropEnabled: row.drop_enabled ?? true,
    forkEmailEnabled: row.fork_email_enabled ?? true
  };
}
