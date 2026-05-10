import type { Metadata } from "next";
import Link from "next/link";
import { MembershipCheckoutButton } from "@/components/membership/MembershipCheckoutButton";
import { getCurrentUser } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/structured-data";
import { ogImageUrl } from "@/lib/og";

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
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <Link
          href="/"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← back to map
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">where next pro</p>
        <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Move first when it matters.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          $12 / month. Cancel anytime. Built for travelers who actually book.
        </p>

        <ul className="mt-12 grid gap-3 text-[14px] leading-6 text-[var(--foreground)] sm:grid-cols-2">
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            Pre-sale alerts on tickets in your saved cities
          </li>
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            Refundable 24h hotel holds on peak weekends
          </li>
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            Priority concierge: 24h instead of 72h
          </li>
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            Drop pre-release on the 28th of each month
          </li>
        </ul>

        <div className="mt-12">
          {active ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                you&apos;re on pro · {subscription?.status}
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
              className="inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              sign in to subscribe
              <span aria-hidden>→</span>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
