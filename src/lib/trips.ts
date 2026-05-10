import { z } from "zod";
import type { MonthNumber } from "@/types/content";

export const TRIP_VISIBILITIES = ["public", "unlisted", "private"] as const;
export type TripVisibility = (typeof TRIP_VISIBILITIES)[number];

export const tripCreateSchema = z.object({
  title: z.string().trim().min(2).max(120),
  destinationSlugs: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  visibility: z.enum(TRIP_VISIBILITIES).default("public"),
  notes: z.string().trim().max(2000).optional(),
  month: z.number().int().min(1).max(12).optional()
});

export const tripUpdateSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  destinationSlugs: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  visibility: z.enum(TRIP_VISIBILITIES).optional(),
  notes: z.string().trim().max(2000).optional()
});

export type TripRow = {
  id: string;
  slug: string;
  owner_id: string;
  title: string;
  destination_slugs: string[];
  visibility: TripVisibility;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function generateTripSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "trip";

  const suffix = Array.from({ length: 6 }, () => {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    return chars[Math.floor(Math.random() * chars.length)];
  }).join("");

  return `${base}-${suffix}`;
}

export type TripPollOption = { id: string; label: string };
export type TripPoll = {
  id: string;
  trip_id: string;
  question: string;
  options: TripPollOption[];
  created_at: string;
};

export const pollCreateSchema = z.object({
  question: z.string().trim().min(2).max(200),
  options: z.array(z.string().trim().min(1).max(80)).min(2).max(8)
});

export const pollVoteSchema = z.object({
  optionId: z.string().trim().min(1).max(40)
});

export function summarizeTrip(trip: TripRow, monthHint?: MonthNumber) {
  const cityCount = trip.destination_slugs.length;
  return {
    title: trip.title,
    cityCount,
    monthHint,
    visibility: trip.visibility
  };
}
