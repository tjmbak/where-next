import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1)
  }),
  deviceKind: z.string().max(40).optional()
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userData.user.id,
      endpoint: parsed.data.endpoint,
      p256dh_key: parsed.data.keys.p256dh,
      auth_key: parsed.data.keys.auth,
      device_kind: parsed.data.deviceKind ?? "web"
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase
    .from("user_preferences")
    .update({ push_enabled: true })
    .eq("user_id", userData.user.id);

  return NextResponse.json({ ok: true });
}
