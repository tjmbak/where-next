import type { Metadata } from "next";
import Link from "next/link";
import { PendingEventActions } from "@/components/admin/PendingEventActions";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pending events",
  robots: { index: false }
};

export const dynamic = "force-dynamic";

type PendingEventRow = {
  id: string;
  destination_slug: string;
  source: string;
  source_url: string;
  external_id: string | null;
  payload: {
    title?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    type?: string;
    importanceScore?: number;
  };
  status: string;
  created_at: string;
};

async function loadPending(): Promise<PendingEventRow[] | { error: string }> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return { error: "supabase-not-configured" };
  const { data, error } = await supabase
    .from("pending_events")
    .select("id, destination_slug, source, source_url, external_id, payload, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return { error: error.message };
  return (data ?? []) as PendingEventRow[];
}

export default async function PendingEventsPage() {
  const data = await loadPending();
  if ("error" in data) {
    return (
      <main className="mx-auto w-full max-w-[1100px] px-6 py-12 sm:px-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">operator</p>
        <h1 className="mt-3 text-2xl font-medium text-[var(--foreground)]">Ingestion not ready</h1>
        <p className="mt-3 text-[14px] text-[var(--muted)]">{data.error}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-6 py-12 sm:px-10">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">operator</p>
          <h1 className="mt-1 text-2xl font-medium text-[var(--foreground)]">Pending events · review queue</h1>
        </div>
        <Link href="/admin/dashboard" className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]">
          ← funnel
        </Link>
      </header>

      {data.length === 0 ? (
        <p className="mt-10 text-[14px] text-[var(--muted)]">No pending events. The ingest cron either has not run or all events are already approved.</p>
      ) : (
        <ol className="mt-10 space-y-5">
          {data.map((row) => (
            <li key={row.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {row.source} · {row.destination_slug}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
                  {row.payload?.startDate ?? "tba"}
                  {row.payload?.endDate ? ` → ${row.payload.endDate}` : ""}
                </span>
              </div>
              <h2 className="mt-2 text-xl font-medium text-[var(--foreground)]">
                {row.payload?.title ?? "Untitled"}
              </h2>
              {row.payload?.summary ? (
                <p className="mt-2 text-[14px] leading-7 text-[var(--muted)]">{row.payload.summary}</p>
              ) : null}
              <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
                {row.payload?.type ?? "—"} · score {row.payload?.importanceScore ?? "—"} ·{" "}
                <a
                  href={row.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline transition hover:text-[var(--foreground)]"
                >
                  source ↗
                </a>
              </p>
              <PendingEventActions id={row.id} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
