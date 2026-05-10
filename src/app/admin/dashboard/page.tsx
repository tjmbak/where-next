import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Operator dashboard",
  robots: { index: false }
};

export const dynamic = "force-dynamic";

type FunnelMetrics = {
  totalUsers: number;
  preferencesCompleted: number;
  hasSavedAtLeastOne: number;
  dropsSentLast30: number;
  dropsOpenedLast30: number;
  pushSubscribers: number;
  outboundClicksLast30: number;
  commissionsLast30Usd: number;
  conciergePending: number;
  conciergePaid: number;
  proSubscribers: number;
};

async function loadMetrics(): Promise<FunnelMetrics | { error: string }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { error: "supabase-not-configured" };

  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    usersCount,
    prefsCount,
    savesUsers,
    dropsSent,
    dropsOpened,
    pushSubs,
    clicks30,
    commissions30,
    conciergePending,
    conciergePaid,
    proSubs
  ] = await Promise.all([
    supabase.from("user_preferences").select("user_id", { count: "exact", head: true }),
    supabase
      .from("user_preferences")
      .select("user_id", { count: "exact", head: true })
      .or("genres.neq.{},regions.neq.{}"),
    supabase.from("saved_destinations").select("user_id", { count: "exact", head: true }),
    supabase
      .from("drop_sends")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", since30),
    supabase
      .from("drop_sends")
      .select("id", { count: "exact", head: true })
      .gte("sent_at", since30)
      .not("opened_at", "is", null),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    supabase.from("click_events").select("click_id", { count: "exact", head: true }).gte("created_at", since30),
    supabase
      .from("commissions")
      .select("amount_usd")
      .gte("received_at", since30),
    supabase
      .from("concierge_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.from("concierge_requests").select("id", { count: "exact", head: true }).eq("status", "paid"),
    supabase
      .from("subscriptions")
      .select("user_id", { count: "exact", head: true })
      .in("status", ["active", "trialing"])
  ]);

  const commissions30Usd = ((commissions30.data ?? []) as Array<{ amount_usd: number }>).reduce(
    (sum, row) => sum + Number(row.amount_usd ?? 0),
    0
  );

  return {
    totalUsers: usersCount.count ?? 0,
    preferencesCompleted: prefsCount.count ?? 0,
    hasSavedAtLeastOne: savesUsers.count ?? 0,
    dropsSentLast30: dropsSent.count ?? 0,
    dropsOpenedLast30: dropsOpened.count ?? 0,
    pushSubscribers: pushSubs.count ?? 0,
    outboundClicksLast30: clicks30.count ?? 0,
    commissionsLast30Usd: commissions30Usd,
    conciergePending: conciergePending.count ?? 0,
    conciergePaid: conciergePaid.count ?? 0,
    proSubscribers: proSubs.count ?? 0
  };
}

export default async function OperatorDashboardPage() {
  const metrics = await loadMetrics();

  if ("error" in metrics) {
    return (
      <main className="mx-auto w-full max-w-[1100px] px-6 py-12 sm:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">operator dashboard</p>
        <h1 className="mt-3 text-2xl font-medium text-[var(--foreground)]">Supabase not configured</h1>
        <p className="mt-3 text-[14px] text-[var(--muted)]">Add Supabase env vars to surface metrics.</p>
      </main>
    );
  }

  const dropOpenRate =
    metrics.dropsSentLast30 > 0
      ? Math.round((metrics.dropsOpenedLast30 / metrics.dropsSentLast30) * 1000) / 10
      : 0;

  const cards: Array<{ label: string; value: string; hint?: string }> = [
    { label: "users", value: metrics.totalUsers.toLocaleString() },
    {
      label: "preferences set",
      value: metrics.preferencesCompleted.toLocaleString(),
      hint:
        metrics.totalUsers > 0
          ? `${Math.round((metrics.preferencesCompleted / metrics.totalUsers) * 100)}% of users`
          : undefined
    },
    {
      label: "users with saves",
      value: metrics.hasSavedAtLeastOne.toLocaleString(),
      hint:
        metrics.totalUsers > 0
          ? `${Math.round((metrics.hasSavedAtLeastOne / metrics.totalUsers) * 100)}% of users`
          : undefined
    },
    { label: "drops sent · 30d", value: metrics.dropsSentLast30.toLocaleString() },
    { label: "drops opened · 30d", value: metrics.dropsOpenedLast30.toLocaleString(), hint: `${dropOpenRate}% open rate` },
    { label: "push subscribers", value: metrics.pushSubscribers.toLocaleString() },
    { label: "outbound clicks · 30d", value: metrics.outboundClicksLast30.toLocaleString() },
    {
      label: "commissions · 30d",
      value: `$${metrics.commissionsLast30Usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    },
    { label: "concierge · pending", value: metrics.conciergePending.toLocaleString() },
    { label: "concierge · paid", value: metrics.conciergePaid.toLocaleString() },
    { label: "pro subscribers", value: metrics.proSubscribers.toLocaleString() }
  ];

  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-12 sm:px-10">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">operator</p>
          <h1 className="mt-1 text-2xl font-medium text-[var(--foreground)]">Funnel and revenue · 30d</h1>
        </div>
        <Link href="/admin/rpm" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]">
          rpm by page →
        </Link>
      </header>

      <section className="mt-10 grid gap-px overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-[var(--background)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 font-mono text-3xl font-medium tracking-tight text-[var(--foreground)]">{card.value}</p>
            {card.hint ? (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">{card.hint}</p>
            ) : null}
          </div>
        ))}
      </section>

      <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
        windows are the trailing 30 days. commissions reflect partner-reported amounts.
      </p>
    </main>
  );
}
