import { NextResponse } from "next/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { normalizePreferencesRow, preferencesSchema } from "@/lib/preferences";

export async function GET() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_preferences")
    .select("home_city, genres, regions, budget, travel_windows, push_enabled, drop_enabled")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ preferences: normalizePreferencesRow(data) });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.homeCity !== undefined) update.home_city = parsed.data.homeCity;
  if (parsed.data.genres !== undefined) update.genres = parsed.data.genres;
  if (parsed.data.regions !== undefined) update.regions = parsed.data.regions;
  if (parsed.data.budget !== undefined) update.budget = parsed.data.budget;
  if (parsed.data.travelWindows !== undefined) update.travel_windows = parsed.data.travelWindows;
  if (parsed.data.pushEnabled !== undefined) update.push_enabled = parsed.data.pushEnabled;
  if (parsed.data.dropEnabled !== undefined) update.drop_enabled = parsed.data.dropEnabled;

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: userData.user.id, ...update }, { onConflict: "user_id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
