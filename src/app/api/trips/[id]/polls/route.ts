import { NextResponse } from "next/server";
import { pollCreateSchema } from "@/lib/trips";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = pollCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  // Owner check: simple — fetch trip, verify owner
  const { data: trip } = await supabase
    .from("trips")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (trip.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const options = parsed.data.options.map((label, index) => ({
    id: `opt-${index + 1}`,
    label
  }));

  const { data: poll, error } = await supabase
    .from("trip_polls")
    .insert({ trip_id: id, question: parsed.data.question, options })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, poll });
}
