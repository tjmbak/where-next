import { NextResponse } from "next/server";
import { z } from "zod";
import { setPendingComposeCookie } from "@/lib/compose/pending";
import { generateItinerarySlug } from "@/lib/itineraries/slug";
import type { Itinerary } from "@/lib/itineraries/generate";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const runtime = "nodejs";

const itinerarySchema = z.object({
  destinationSlug: z.string(),
  title: z.string(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  durationDays: z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(7), z.literal(10), z.literal(14)]),
  legs: z
    .array(z.object({ destinationSlug: z.string(), days: z.number().int().min(1).max(14) }))
    .min(1)
    .max(4),
  vibeTags: z.array(z.string()),
  budgetBand: z.enum(["low", "medium", "high", "luxury"]),
  days: z.array(z.unknown()),
  generatedAt: z.string(),
  model: z.string()
});

const bodySchema = z.object({
  itinerary: itinerarySchema,
  city: z.string().trim().max(80)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const itinerary = parsed.data.itinerary as Itinerary;
  const supabase = await createSupabaseServerAuthClient();

  if (!supabase) {
    return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });
  }

  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    // Anonymous: stash the *spec* so we can regenerate post-auth.
    await setPendingComposeCookie({
      destinationSlug: itinerary.destinationSlug,
      durationDays: itinerary.durationDays,
      startDate: itinerary.startDate,
      vibeTags: itinerary.vibeTags,
      budgetBand: itinerary.budgetBand,
      city: parsed.data.city
    });
    return NextResponse.json({ needsAuth: true });
  }

  // Authed → write the row.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateItinerarySlug(parsed.data.city, itinerary.vibeTags, itinerary.durationDays);
    const { data, error } = await supabase
      .from("itineraries")
      .insert({
        slug,
        owner_id: userData.user.id,
        destination_slug: itinerary.destinationSlug,
        title: itinerary.title,
        start_date: itinerary.startDate,
        end_date: itinerary.endDate,
        duration_days: itinerary.durationDays,
        legs: itinerary.legs,
        vibe_tags: itinerary.vibeTags,
        budget_band: itinerary.budgetBand,
        days: itinerary.days,
        visibility: "private",
        generation_meta: {
          model: itinerary.model,
          generatedAt: itinerary.generatedAt,
          source: "composer"
        }
      })
      .select("id, slug")
      .single();

    if (!error && data) {
      await supabase
        .from("itinerary_collaborators")
        .upsert(
          { itinerary_id: data.id, user_id: userData.user.id, role: "owner" },
          { onConflict: "itinerary_id,user_id" }
        );
      return NextResponse.json({ ok: true, slug: data.slug });
    }
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "slug-collision" }, { status: 500 });
}
