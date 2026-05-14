import { NextResponse } from "next/server";
import { clearPendingComposeCookie, readPendingComposeCookie } from "@/lib/compose/pending";
import { clearPendingForkCookie, readPendingForkCookie } from "@/lib/fork-pending";
import { forkItinerary } from "@/lib/itineraries/fork";
import { generateItinerary } from "@/lib/itineraries/generate";
import { generateItinerarySlug } from "@/lib/itineraries/slug";
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

    // If the user clicked "fork this trip" while anonymous, complete the fork
    // server-side and redirect them directly to their new itinerary.
    const pendingFork = await readPendingForkCookie();
    if (pendingFork) {
      const result = await forkItinerary({
        sourceId: pendingFork.sourceId,
        viewerId: userData.user.id
      });
      await clearPendingForkCookie();
      if (result.ok) {
        return NextResponse.redirect(new URL(`/itineraries/${result.slug}?forked=1`, url.origin));
      }
    }

    // If the user clicked "save this trip" in the composer while anonymous,
    // regenerate from their stashed spec and write the row.
    const pendingCompose = await readPendingComposeCookie();
    if (pendingCompose) {
      try {
        const itinerary = await generateItinerary({
          destinationSlug: pendingCompose.destinationSlug,
          durationDays: pendingCompose.durationDays,
          startDate: pendingCompose.startDate ?? undefined,
          vibeTags: pendingCompose.vibeTags,
          budgetBand: pendingCompose.budgetBand ?? undefined
        });
        const service = createSupabaseServiceClient();
        if (service) {
          for (let attempt = 0; attempt < 5; attempt++) {
            const slug = generateItinerarySlug(pendingCompose.city, itinerary.vibeTags, itinerary.durationDays);
            const { data, error } = await service
              .from("itineraries")
              .insert({
                slug,
                owner_id: userData.user.id,
                destination_slug: itinerary.destinationSlug,
                title: itinerary.title,
                start_date: itinerary.startDate,
                end_date: itinerary.endDate,
                duration_days: itinerary.durationDays,
                legs: itinerary.legs,
                vibe_tags: itinerary.vibeTags,
                budget_band: itinerary.budgetBand,
                days: itinerary.days,
                visibility: "private",
                generation_meta: {
                  model: itinerary.model,
                  generatedAt: itinerary.generatedAt,
                  source: "composer-postauth"
                }
              })
              .select("id, slug")
              .single();
            if (!error && data) {
              await service
                .from("itinerary_collaborators")
                .upsert(
                  { itinerary_id: data.id, user_id: userData.user.id, role: "owner" },
                  { onConflict: "itinerary_id,user_id" }
                );
              await clearPendingComposeCookie();
              return NextResponse.redirect(new URL(`/itineraries/${data.slug}?from=composer`, url.origin));
            }
            if (error && error.code !== "23505") break;
          }
        }
      } catch (err) {
        console.warn("[auth/callback] pending compose failed:", err);
      }
      await clearPendingComposeCookie();
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
