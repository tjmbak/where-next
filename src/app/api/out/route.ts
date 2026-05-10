import { NextResponse } from "next/server";
import { isAffiliateProvider, rewriteUrl } from "@/lib/affiliate/providers";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("u");
  const providerParam = url.searchParams.get("p") ?? "raw";
  const destinationSlug = url.searchParams.get("d");
  const context = url.searchParams.get("ctx");

  if (!target) return NextResponse.json({ ok: false }, { status: 400 });
  if (!isAffiliateProvider(providerParam)) {
    return NextResponse.json({ ok: false, error: "unknown-provider" }, { status: 400 });
  }
  const provider = providerParam;

  // Try to extract authenticated user (best-effort; click attribution still
  // works for anonymous traffic via the click_id).
  let userId: string | null = null;
  const auth = await createSupabaseServerAuthClient();
  if (auth) {
    const { data } = await auth.auth.getUser();
    userId = data.user?.id ?? null;
  }

  const clickId = crypto.randomUUID();
  const rewritten = rewriteUrl(provider, target, clickId);
  let targetHost: string | null = null;
  try {
    targetHost = new URL(rewritten).host;
  } catch {
    targetHost = null;
  }

  const service = createSupabaseServiceClient();
  if (service) {
    await service.from("click_events").insert({
      click_id: clickId,
      user_id: userId,
      provider,
      destination_slug: destinationSlug,
      context,
      target_host: targetHost,
      user_agent: request.headers.get("user-agent"),
      referer: request.headers.get("referer")
    });
  }

  return NextResponse.redirect(rewritten, 302);
}
