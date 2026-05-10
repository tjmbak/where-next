import { NextResponse } from "next/server";
import { generateTripSlug, tripCreateSchema } from "@/lib/trips";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = tripCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  // Up to 5 attempts to dodge slug collisions; vanishingly unlikely with the
  // 6-char base32 suffix.
  let slug = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    slug = generateTripSlug(parsed.data.title);
    const { data: insert, error } = await supabase
      .from("trips")
      .insert({
        slug,
        owner_id: userData.user.id,
        title: parsed.data.title,
        destination_slugs: parsed.data.destinationSlugs,
        visibility: parsed.data.visibility,
        notes: parsed.data.notes ?? null
      })
      .select("id, slug")
      .single();
    if (!error && insert) {
      // Author becomes implicit collaborator with role=owner
      await supabase
        .from("trip_collaborators")
        .upsert(
          { trip_id: insert.id, user_id: userData.user.id, role: "owner" },
          { onConflict: "trip_id,user_id" }
        );
      return NextResponse.json({ ok: true, trip: insert });
    }
    if (error && error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "slug-collision" }, { status: 500 });
}
