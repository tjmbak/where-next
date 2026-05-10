import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/research/admin-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  decision: z.enum(["approved", "rejected"])
});

export async function POST(request: Request, ctx: RouteContext) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const supabase = createSupabaseServiceClient();
  if (!supabase) return NextResponse.json({ error: "supabase-not-configured" }, { status: 503 });

  const { error } = await supabase
    .from("pending_events")
    .update({ status: parsed.data.decision, reviewed_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
