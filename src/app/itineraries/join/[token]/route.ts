import { NextResponse } from "next/server";
import { verifyItineraryInviteToken } from "@/lib/itineraries/invite-token";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, ctx: RouteContext) {
  const { token } = await ctx.params;
  const url = new URL(request.url);

  const payload = verifyItineraryInviteToken(token);
  if (!payload) return NextResponse.redirect(new URL("/?invite=invalid", url.origin));

  const auth = await createSupabaseServerAuthClient();
  if (!auth) {
    return NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(url.pathname)}`, url.origin));
  }
  const { data: userData } = await auth.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(url.pathname)}`, url.origin));
  }

  const service = createSupabaseServiceClient();
  if (!service) return NextResponse.redirect(new URL("/?invite=err", url.origin));

  const { data: itinerary } = await service
    .from("itineraries")
    .select("slug")
    .eq("id", payload.itineraryId)
    .maybeSingle();
  if (!itinerary) return NextResponse.redirect(new URL("/?invite=missing", url.origin));

  await service.from("itinerary_collaborators").upsert(
    { itinerary_id: payload.itineraryId, user_id: userData.user.id, role: payload.role },
    { onConflict: "itinerary_id,user_id" }
  );

  return NextResponse.redirect(new URL(`/itineraries/${itinerary.slug}`, url.origin));
}
