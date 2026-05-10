import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe/client";
import { siteUrl } from "@/lib/structured-data";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

const conciergeBriefSchema = z.object({
  brief: z.object({
    whoFor: z.string().trim().max(200),
    genres: z.string().trim().max(200),
    windows: z.string().trim().max(200),
    budget: z.string().trim().max(80),
    notes: z.string().trim().max(2000).optional()
  })
});

export async function POST(request: Request) {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = conciergeBriefSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid", issues: parsed.error.issues }, { status: 400 });

  const service = createSupabaseServiceClient();
  if (!service) return NextResponse.json({ error: "supabase-not-configured" }, { status: 503 });

  // Check if the user has a referral credit that unlocks concierge for free
  const { data: credit } = await service
    .from("referral_credits")
    .select("id")
    .eq("user_id", userData.user.id)
    .eq("kind", "concierge_unlock")
    .is("redeemed_at", null)
    .limit(1)
    .maybeSingle();

  // Insert the request row in pending status
  const { data: row, error: insertError } = await service
    .from("concierge_requests")
    .insert({
      user_id: userData.user.id,
      brief: parsed.data.brief,
      status: credit ? "paid" : "pending"
    })
    .select("id")
    .single();
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  if (credit) {
    // Burn the credit, mark concierge ready
    await service
      .from("referral_credits")
      .update({ redeemed_at: new Date().toISOString() })
      .eq("id", credit.id);
    await service
      .from("concierge_requests")
      .update({ paid_at: new Date().toISOString() })
      .eq("id", row.id);
    return NextResponse.json({ ok: true, url: `${siteUrl()}/concierge/thanks?id=${row.id}` });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "stripe-not-configured" }, { status: 503 });
  }

  const priceId = process.env.STRIPE_CONCIERGE_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "missing-concierge-price" }, { status: 503 });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: userData.user.email ?? undefined,
    success_url: `${siteUrl()}/concierge/thanks?id=${row.id}&session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/concierge?cancelled=1`,
    metadata: {
      concierge_request_id: row.id,
      user_id: userData.user.id
    }
  });

  await service
    .from("concierge_requests")
    .update({ stripe_session_id: session.id })
    .eq("id", row.id);

  return NextResponse.json({ ok: true, url: session.url });
}
