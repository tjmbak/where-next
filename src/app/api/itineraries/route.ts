import { NextResponse } from "next/server";
import { z } from "zod";
import { generateItinerarySlug } from "@/lib/itineraries/slug";
import type { Itinerary } from "@/lib/itineraries/generate";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

const itinerarySaveSchema = z.object({
  itinerary: z.object({
    destinationSlug: z.string(),
    title: z.string(),
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    durationDays: z.number().int().min(1).max(14),
    vibeTags: z.array(z.string()),
    budgetBand: z.enum(["low", "medium", "high", "luxury"]),
    days: z.array(z.unknown()),
    generatedAt: z.string(),
    model: z.string()
  }),
  visibility: z.enum(["public", "unlisted", "private"]).default("public"),
  city: z.string().trim().max(80)
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = itinerarySaveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const itinerary = parsed.data.itinerary as Itinerary;
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
        vibe_tags: itinerary.vibeTags,
        budget_band: itinerary.budgetBand,
        days: itinerary.days,
        visibility: parsed.data.visibility,
        generation_meta: {
          model: itinerary.model,
          generatedAt: itinerary.generatedAt
        }
      })
      .select("id, slug")
      .single();
    if (!error && data) {
      return NextResponse.json({ ok: true, itinerary: data });
    }
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "slug-collision" }, { status: 500 });
}
