import { z } from "zod";

export const waitlistSchema = z.object({
  email: z.email(),
  homeCity: z.string().trim().max(80).optional(),
  favoriteGenres: z.array(z.string().trim().max(40)).max(8).optional()
});

export const analyticsEventSchema = z.object({
  name: z.string().trim().min(1).max(80),
  payload: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]).optional()).optional()
});
