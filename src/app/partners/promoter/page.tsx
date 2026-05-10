import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PromoterClaimForm } from "@/components/partners/PromoterClaimForm";
import { PromoterEventList } from "@/components/partners/PromoterEventList";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const metadata: Metadata = {
  title: "Promoter portal",
  robots: { index: false }
};

export const dynamic = "force-dynamic";

type PromoterRow = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  contact_email: string | null;
  approved: boolean;
};

type PromoterEventRow = {
  id: string;
  destination_slug: string;
  title: string;
  start_date: string;
  end_date: string | null;
  ticket_url: string | null;
  summary: string | null;
  status: "draft" | "submitted" | "approved" | "rejected";
};

export default async function PromoterPortalPage() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) redirect("/auth/login?next=/partners/promoter");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/partners/promoter");

  const { data: promoterRow } = await supabase
    .from("promoters")
    .select("id, name, city, country, contact_email, approved")
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  const promoter = (promoterRow as PromoterRow | null) ?? null;

  let events: PromoterEventRow[] = [];
  if (promoter) {
    const { data } = await supabase
      .from("promoter_events")
      .select("id, destination_slug, title, start_date, end_date, ticket_url, summary, status")
      .eq("promoter_id", promoter.id)
      .order("start_date", { ascending: true });
    events = ((data ?? []) as PromoterEventRow[]);
  }

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

      <section className="mx-auto w-full max-w-[820px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">promoter portal</p>
        <h1 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)]">
          Submit events. Reach planners.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          Where Next surfaces approved promoter events to travelers planning trips around your city. Submit events, share pre-sale codes, and reach members directly.
        </p>

        {promoter ? (
          <div className="mt-12 space-y-12">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                promoter · {promoter.approved ? "approved" : "pending review"}
              </p>
              <h2 className="mt-2 text-xl font-medium text-[var(--foreground)]">{promoter.name}</h2>
              <p className="mt-2 text-[13px] text-[var(--muted)]">
                {promoter.city ?? "—"}
                {promoter.country ? `, ${promoter.country}` : ""} ·{" "}
                {promoter.contact_email ?? "no contact"}
              </p>
            </div>

            <PromoterEventList promoterId={promoter.id} initialEvents={events} canSubmit={promoter.approved} />
          </div>
        ) : (
          <div className="mt-12">
            <PromoterClaimForm />
          </div>
        )}
      </section>
    </main>
  );
}
