import { NextResponse } from "next/server";
import { setPendingForkCookie } from "@/lib/fork-pending";
import { forkItinerary } from "@/lib/itineraries/fork";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) {
    return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });
  }

  const { data: userData } = await supabase.auth.getUser();

  // Anonymous: stash a pending-fork cookie and ask the client to bounce to login.
  // The auth callback completes the fork on the way back.
  if (!userData.user) {
    const service = createSupabaseServiceClient();
    const { data: lookup } = service
      ? await service
          .from("itineraries")
          .select("slug, visibility")
          .eq("id", id)
          .maybeSingle()
      : { data: null };
    if (!lookup) return NextResponse.json({ error: "not-found" }, { status: 404 });
    if (lookup.visibility === "private") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    await setPendingForkCookie(id, lookup.slug as string);
    return NextResponse.json({ needsAuth: true, sourceSlug: lookup.slug }, { status: 200 });
  }

  const result = await forkItinerary({ sourceId: id, viewerId: userData.user.id });
  if (!result.ok) {
    const status =
      result.reason === "not-found"
        ? 404
        : result.reason === "forbidden"
          ? 403
          : result.reason === "service-unavailable"
            ? 503
            : 500;
    return NextResponse.json({ error: result.reason, message: result.message }, { status });
  }

  return NextResponse.json({ ok: true, slug: result.slug });
}
