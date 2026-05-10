import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ ok: false, error: "stripe-not-configured" }, { status: 503 });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "missing-webhook-secret" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ ok: false, error: "missing-signature" }, { status: 400 });

  const body = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "bad-signature" },
      { status: 400 }
    );
  }

  const service = createSupabaseServiceClient();
  if (!service) return NextResponse.json({ ok: false, error: "supabase-not-configured" }, { status: 503 });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        const requestId = session.metadata?.concierge_request_id;
        if (requestId) {
          await service
            .from("concierge_requests")
            .update({ paid_at: new Date().toISOString(), status: "paid" })
            .eq("id", requestId);
        }
      } else if (session.mode === "subscription" && session.subscription && session.metadata?.user_id) {
        await service
          .from("subscriptions")
          .upsert(
            {
              user_id: session.metadata.user_id,
              plan: "pro",
              status: "active",
              stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
              stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription.id
            },
            { onConflict: "user_id" }
          );
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      // current_period_end has moved to a per-item field in the newer Stripe
      // type defs but still exists in payloads — read it loosely.
      const periodEndUnix = (sub as unknown as { current_period_end?: number })
        .current_period_end ?? sub.items?.data?.[0]?.current_period_end;
      const periodEnd = periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null;
      const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
      await service
        .from("subscriptions")
        .update({
          status,
          stripe_subscription_id: sub.id,
          current_period_end: periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end ?? false
        })
        .eq("stripe_customer_id", customerId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true, received: event.type });
}
