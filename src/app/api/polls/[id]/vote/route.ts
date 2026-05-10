import { NextResponse } from "next/server";
import { pollVoteSchema } from "@/lib/trips";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = pollVoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { error } = await supabase.from("trip_poll_votes").upsert(
    {
      poll_id: id,
      user_id: userData.user.id,
      option_id: parsed.data.optionId
    },
    { onConflict: "poll_id,user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
