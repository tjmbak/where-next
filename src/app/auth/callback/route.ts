import { NextResponse } from "next/server";
import { clearReferralCookie, readReferralCookie } from "@/lib/referral";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

async function applyReferralIfPresent(userId: string) {
  const referral = await readReferralCookie();
  if (!referral) return;
  const service = createSupabaseServiceClient();
  if (!service) return;

  // Refuse self-referral
  if (referral.referrerId === userId) {
    await clearReferralCookie();
    return;
  }

  await service.from("referrals").insert({
    referrer_id: referral.referrerId,
    referred_user_id: userId,
    source: referral.source,
    signed_up_at: new Date().toISOString()
  });

  // Grant the referrer a concierge unlock credit
  await service.from("referral_credits").insert({
    user_id: referral.referrerId,
    kind: "concierge_unlock",
    amount: 1
  });

  await clearReferralCookie();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") || "/onboarding";

  const supabase = await createSupabaseServerAuthClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/auth/login?error=auth-not-configured", url.origin));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as "magiclink" | "email" | "signup" | "recovery" | "invite",
      token_hash: tokenHash
    });
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
  } else {
    return NextResponse.redirect(new URL("/auth/login?error=missing-code", url.origin));
  }

  // After session is established, apply any pending referral attribution.
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) {
    await applyReferralIfPresent(userData.user.id);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
