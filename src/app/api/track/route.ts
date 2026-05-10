import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { analyticsEventSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = analyticsEventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (supabase) {
    await supabase.from("analytics_events").insert({
      name: parsed.data.name,
      payload: parsed.data.payload ?? {}
    });
  }

  return NextResponse.json({ ok: true });
}
