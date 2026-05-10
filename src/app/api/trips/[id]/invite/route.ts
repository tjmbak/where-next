import { NextResponse } from "next/server";
import { z } from "zod";
import { signInviteToken } from "@/lib/trips/invite-token";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { siteUrl } from "@/lib/structured-data";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.enum(["editor", "viewer"]).default("editor"),
  ttlHours: z.number().int().min(1).max(720).default(168)
});

export async function POST(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: trip } = await supabase
    .from("trips")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!trip) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (trip.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const token = signInviteToken(id, parsed.data.role, parsed.data.ttlHours * 60 * 60 * 1000);
  return NextResponse.json({
    ok: true,
    token,
    inviteUrl: `${siteUrl()}/trips/join/${token}`
  });
}
