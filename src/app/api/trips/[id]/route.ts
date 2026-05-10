import { NextResponse } from "next/server";
import { tripUpdateSchema } from "@/lib/trips";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = tripUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.destinationSlugs !== undefined) update.destination_slugs = parsed.data.destinationSlugs;
  if (parsed.data.visibility !== undefined) update.visibility = parsed.data.visibility;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  // RLS will block non-owners; the editor role gets a special policy below
  const { data, error } = await supabase
    .from("trips")
    .update(update)
    .eq("id", id)
    .select("id, slug")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not-found-or-forbidden" }, { status: 404 });

  return NextResponse.json({ ok: true, trip: data });
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { error } = await supabase.from("trips").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
