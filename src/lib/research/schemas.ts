import { z } from "zod";

/**
 * Schema enforced on every AI-generated event row.
 *
 * Strict requirements:
 *  - sourceUrl is mandatory and must be http(s). Without a citation, the row
 *    is rejected — that's the whole point of grounded research.
 *  - importance is 0–100 (matches our existing `importanceScore` convention).
 *  - dates are ISO YYYY-MM-DD; month/day match what `events.json` expects.
 *  - genres / type are constrained to our taxonomy.
 */

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

const httpUrl = z.string().regex(/^https?:\/\/.+/i, "URL must start with http(s)://");

export const researchedEventSchema = z
  .object({
    id: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9-]+$/, "id must be kebab-case"),
    title: z.string().min(2).max(200),
    type: z.enum([
      "festival",
      "club-night",
      "residency",
      "beach-club",
      "carnival",
      "concert",
      "conference"
    ]),
    startDate: isoDate,
    endDate: isoDate.nullable(),
    importance: z.number().int().min(0).max(100),
    venueName: z.string().nullable(),
    venueId: z.string().nullable(),
    sourceUrl: httpUrl,
    ticketUrl: httpUrl.nullable(),
    summary: z.string().min(10).max(400),
    genres: z.array(
      z.enum([
        "afro-house",
        "amapiano",
        "house",
        "techno",
        "electronic",
        "hip-hop",
        "r-and-b",
        "latin",
        "jazz",
        "pop",
        "festival"
      ])
    )
  })
  .strict();

export const researchedEventsResponseSchema = z
  .object({
    destinationSlug: z.string().regex(/^[a-z0-9-]+$/),
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2025).max(2030),
    notes: z.string().nullable(),
    events: z.array(researchedEventSchema).min(0).max(20)
  })
  .strict();

export type ResearchedEvent = z.infer<typeof researchedEventSchema>;
export type ResearchedEventsResponse = z.infer<typeof researchedEventsResponseSchema>;
