import type { Metadata } from "next";
import Link from "next/link";
import { MembershipCheckoutButton } from "@/components/membership/MembershipCheckoutButton";
import { getCurrentUser } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/structured-data";
import { ogImageUrl } from "@/lib/og";
import { SiteHeader } from "@/components/nav/SiteHeader";

export const metadata: Metadata = {
  title: "Pro · alerts, presale, holds",
  description: "Where Next Pro: pre-sale alerts, refundable holds on hot weekends, priority concierge.",
  alternates: { canonical: "/membership" },
  openGraph: {
    title: "Where Next Pro",
    description: "Pre-sale alerts, refundable holds, priority concierge.",
    type: "article",
    url: `${siteUrl()}/membership`,
    images: [
      {
        url: ogImageUrl({
          eyebrow: "where next",
          title: "Pro",
          subtitle: "Pre-sale alerts. Refundable holds. Priority concierge.",
          stat: "$12/mo"
        }),
        width: 1200,
        height: 630
      }
    ]
  }
};

async function loadSubscription(userId: string) {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data } = await service
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export default async function MembershipPage() {
  const user = await getCurrentUser();
  const subscription = user ? await loadSubscription(user.id) : null;
  const active = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader />

      <section className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-12 sm:px-10">
        <p className="text-[13px] font-medium text-[var(--muted)]">Where Next Pro</p>
        <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Move first when it matters.
        </h1>
        <p className="mt-5 max-w-xl text-[16px] leading-7 text-[var(--muted)]">
          Alerts, holds, and a faster concierge for travelers who actually book.
        </p>

        <div className="mt-12 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_-32px_rgba(28,22,18,0.35)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
              <p className="text-[13px] font-medium text-[var(--signal)]">Pro</p>
              <p className="mt-2 flex items-baseline gap-1.5 text-[var(--foreground)]">
                <span className="text-[44px] font-medium leading-none tracking-[-0.03em]">$12</span>
                <span className="text-[15px] text-[var(--muted)]">/ month</span>
              </p>
            </div>
            <p className="text-[13px] text-[var(--muted)]">Cancel anytime.</p>
          </div>

          <ul className="mt-6 grid gap-3.5 text-[15px] leading-6 text-[var(--foreground)] sm:grid-cols-2">
            {[
              "Pre-sale alerts on tickets in your saved cities",
              "Refundable 24h hotel holds on peak weekends",
              "Priority concierge: 24h instead of 72h",
              "Drop pre-release on the 28th of each month"
            ].map((perk) => (
              <li key={perk} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--signal)]/12 text-[var(--signal)]"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 5 5 9-10" />
                  </svg>
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-8">
            {active ? (
              <div className="rounded-2xl bg-[var(--surface-2)] p-5">
                <p className="text-[13px] font-medium text-[var(--muted)]">
                  You&apos;re on Pro · {subscription?.status}
                </p>
                <p className="mt-2 text-[15px] text-[var(--foreground)]">
                  {subscription?.current_period_end
                    ? `Next renewal: ${new Date(subscription.current_period_end).toLocaleDateString("en-US", { dateStyle: "medium" })}`
                    : "Active subscription."}
                </p>
              </div>
            ) : user ? (
              <MembershipCheckoutButton />
            ) : (
              <Link
                href="/auth/login?next=/membership"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--foreground)] px-7 text-[15px] font-medium text-[var(--background)] shadow-[0_12px_28px_-12px_rgba(28,22,18,0.6)] transition hover:-translate-y-0.5"
              >
                Sign in to subscribe
                <span aria-hidden>→</span>
              </Link>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
