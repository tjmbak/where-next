import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

const unsubscribeSchema = z.object({ endpoint: z.string().url() });

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userData.user.id)
    .eq("endpoint", parsed.data.endpoint);

  const { count } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userData.user.id);

  if (!count || count === 0) {
    await supabase
      .from("user_preferences")
      .update({ push_enabled: false })
      .eq("user_id", userData.user.id);
  }

  return NextResponse.json({ ok: true });
}
