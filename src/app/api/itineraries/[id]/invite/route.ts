import { NextResponse } from "next/server";
import { z } from "zod";
import { signItineraryInviteToken } from "@/lib/itineraries/invite-token";
import { siteUrl } from "@/lib/structured-data";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  role: z.enum(["editor", "viewer"]).default("editor"),
  ttlHours: z.number().int().min(1).max(720).default(336)
});

export async function POST(request: Request, ctx: RouteContext) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: itinerary } = await supabase
    .from("itineraries")
    .select("id, owner_id")
    .eq("id", id)
    .maybeSingle();
  if (!itinerary) return NextResponse.json({ error: "not-found" }, { status: 404 });
  if (itinerary.owner_id !== userData.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const token = signItineraryInviteToken(id, parsed.data.role, parsed.data.ttlHours * 60 * 60 * 1000);
  return NextResponse.json({
    ok: true,
    token,
    inviteUrl: `${siteUrl()}/itineraries/join/${token}`
  });
}
