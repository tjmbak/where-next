import { NextResponse } from "next/server";
import { verifyInviteToken } from "@/lib/trips/invite-token";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(request: Request, ctx: RouteContext) {
  const { token } = await ctx.params;
  const url = new URL(request.url);

  const payload = verifyInviteToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/?invite=invalid", url.origin));
  }

  const auth = await createSupabaseServerAuthClient();
  if (!auth) {
    return NextResponse.redirect(new URL(`/auth/login?next=${encodeURIComponent(url.pathname)}`, url.origin));
  }

  const { data: userData } = await auth.auth.getUser();
  if (!userData.user) {
    return NextResponse.redirect(
      new URL(`/auth/login?next=${encodeURIComponent(url.pathname)}`, url.origin)
    );
  }

  // Use service-role to insert the collaborator row across the RLS boundary
  // (the inviter's signed token is the authorization here, not the user).
  const service = createSupabaseServiceClient();
  if (!service) return NextResponse.redirect(new URL("/?invite=err", url.origin));

  const { data: trip } = await service
    .from("trips")
    .select("slug")
    .eq("id", payload.tripId)
    .maybeSingle();

  if (!trip) return NextResponse.redirect(new URL("/?invite=missing", url.origin));

  await service.from("trip_collaborators").upsert(
    { trip_id: payload.tripId, user_id: userData.user.id, role: payload.role },
    { onConflict: "trip_id,user_id" }
  );

  return NextResponse.redirect(new URL(`/trips/${trip.slug}`, url.origin));
}
