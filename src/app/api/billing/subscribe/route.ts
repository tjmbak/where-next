import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/client";
import { siteUrl } from "@/lib/structured-data";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return NextResponse.json({ error: "auth-not-configured" }, { status: 503 });

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ error: "stripe-not-configured" }, { status: 503 });

  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: "missing-pro-price" }, { status: 503 });

  const service = createSupabaseServiceClient();
  let customerId: string | null = null;
  if (service) {
    const { data: existing } = await service
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    customerId = existing?.stripe_customer_id ?? null;
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.user.email ?? undefined,
      metadata: { user_id: userData.user.id }
    });
    customerId = customer.id;
    if (service) {
      await service.from("subscriptions").upsert(
        {
          user_id: userData.user.id,
          plan: "pro",
          status: "incomplete",
          stripe_customer_id: customer.id
        },
        { onConflict: "user_id" }
      );
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl()}/membership?status=ok`,
    cancel_url: `${siteUrl()}/membership?status=cancelled`,
    metadata: { user_id: userData.user.id }
  });

  return NextResponse.json({ ok: true, url: session.url });
}
