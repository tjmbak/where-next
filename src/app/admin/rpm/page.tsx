import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "RPM by page",
  robots: { index: false }
};

export const dynamic = "force-dynamic";

type RpmRow = {
  destinationSlug: string;
  clicks: number;
  commissionUsd: number;
  rpmUsd: number;
};

async function loadRpm(): Promise<RpmRow[] | { error: string }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { error: "supabase-not-configured" };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clicks, error: clicksError } = await supabase
    .from("click_events")
    .select("click_id, destination_slug")
    .gte("created_at", since);
  if (clicksError) return { error: clicksError.message };

  const { data: commissions, error: comError } = await supabase
    .from("commissions")
    .select("click_id, amount_usd")
    .gte("received_at", since);
  if (comError) return { error: comError.message };

  const clicksBySlug = new Map<string, number>();
  const clickIdToSlug = new Map<string, string>();
  for (const row of (clicks ?? []) as Array<{ click_id: string; destination_slug: string | null }>) {
    if (!row.destination_slug) continue;
    clicksBySlug.set(row.destination_slug, (clicksBySlug.get(row.destination_slug) ?? 0) + 1);
    clickIdToSlug.set(row.click_id, row.destination_slug);
  }

  const commissionsBySlug = new Map<string, number>();
  for (const row of (commissions ?? []) as Array<{ click_id: string | null; amount_usd: number }>) {
    if (!row.click_id) continue;
    const slug = clickIdToSlug.get(row.click_id);
    if (!slug) continue;
    commissionsBySlug.set(slug, (commissionsBySlug.get(slug) ?? 0) + Number(row.amount_usd ?? 0));
  }

  const rows: RpmRow[] = Array.from(clicksBySlug.keys()).map((slug) => {
    const clicks = clicksBySlug.get(slug) ?? 0;
    const commissionUsd = commissionsBySlug.get(slug) ?? 0;
    return {
      destinationSlug: slug,
      clicks,
      commissionUsd,
      rpmUsd: clicks > 0 ? (commissionUsd / clicks) * 1000 : 0
    };
  });

  rows.sort((a, b) => b.commissionUsd - a.commissionUsd || b.clicks - a.clicks);
  return rows;
}

export default async function RpmPage() {
  const data = await loadRpm();

  if ("error" in data) {
    return (
      <main className="mx-auto w-full max-w-[1100px] px-6 py-12 sm:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">operator</p>
        <h1 className="mt-3 text-2xl font-medium text-[var(--foreground)]">No data yet</h1>
        <p className="mt-3 text-[14px] text-[var(--muted)]">{data.error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-12 sm:px-10">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">operator</p>
          <h1 className="mt-1 text-2xl font-medium text-[var(--foreground)]">RPM by destination · 30d</h1>
        </div>
        <Link href="/admin/dashboard" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]">
          ← funnel
        </Link>
      </header>

      {data.length === 0 ? (
        <p className="mt-10 text-[14px] text-[var(--muted)]">No clicks recorded in the last 30 days.</p>
      ) : (
        <table className="mt-10 w-full table-auto border-separate border-spacing-y-2 font-mono text-[12px]">
          <thead>
            <tr className="text-left uppercase tracking-[0.18em] text-[var(--muted)]">
              <th className="px-4 py-2 font-normal">destination</th>
              <th className="px-4 py-2 text-right font-normal">clicks</th>
              <th className="px-4 py-2 text-right font-normal">commission</th>
              <th className="px-4 py-2 text-right font-normal">RPM ($/1k)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.destinationSlug} className="rounded-md border border-[var(--border)] bg-[var(--surface)]">
                <td className="px-4 py-3 text-[var(--foreground)]">
                  <Link href={`/destinations/${row.destinationSlug}`} className="transition hover:text-[var(--signal)]">
                    {row.destinationSlug}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right text-[var(--foreground)]">{row.clicks.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-[var(--foreground)]">
                  ${row.commissionUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right text-[var(--foreground)]">
                  ${row.rpmUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
