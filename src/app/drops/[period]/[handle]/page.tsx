import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MiniMap } from "@/components/visual/MiniMap";
import { dropPeriodSlug, parseDropPeriod } from "@/lib/drops/generate";
import type { DropPick } from "@/lib/drops/rank";
import { DESTINATIONS } from "@/data/music-travel";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { getMonthLabel } from "@/data/taxonomy";

type DropPageProps = {
  params: Promise<{ period: string; handle: string }>;
};

type DropRow = {
  id: string;
  drop_month: number;
  drop_year: number;
  picks: DropPick[];
  sent_at: string;
};

async function loadDrop(period: string, handle: string): Promise<DropRow | null> {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const parsed = parseDropPeriod(period);
  if (!parsed) return null;

  const { data: prefRow } = await supabase
    .from("user_preferences")
    .select("user_id")
    .eq("handle", handle)
    .maybeSingle();

  if (!prefRow) return null;

  const { data } = await supabase
    .from("drop_sends")
    .select("id, drop_month, drop_year, picks, sent_at")
    .eq("user_id", prefRow.user_id)
    .eq("drop_month", parsed.month)
    .eq("drop_year", parsed.year)
    .maybeSingle();

  return data ? (data as DropRow) : null;
}

export async function generateMetadata({ params }: DropPageProps): Promise<Metadata> {
  const { period, handle } = await params;
  const parsed = parseDropPeriod(period);
  if (!parsed) return { robots: { index: false } };
  return {
    title: `The drop · ${getMonthLabel(parsed.month).toLowerCase()} ${parsed.year}`,
    description: `Where Next monthly drop for ${handle}.`,
    alternates: { canonical: `/drops/${dropPeriodSlug(parsed.month, parsed.year)}/${handle}` },
    openGraph: {
      title: `The drop · ${getMonthLabel(parsed.month).toLowerCase()} ${parsed.year}`,
      description: "Five cities for music travelers, curated monthly.",
      type: "article"
    }
  };
}

export default async function DropPage({ params }: DropPageProps) {
  const { period, handle } = await params;
  const parsed = parseDropPeriod(period);
  if (!parsed) notFound();

  const drop = await loadDrop(period, handle);
  if (!drop) notFound();

  const monthLabel = getMonthLabel(parsed.month);

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
          href="/auth/login"
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          get your own drop →
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[760px] px-6 py-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          the drop · {monthLabel.toLowerCase()} {parsed.year}
        </p>
        <h1 className="mt-5 text-[clamp(2.25rem,5.5vw,4rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Where to go this {monthLabel.toLowerCase()}.
        </h1>
        <p className="mt-5 max-w-md text-[14px] leading-7 text-[var(--muted)]">
          Five cities tuned to {handle}&apos;s scenes, regions, and budget.
        </p>

        {drop.picks.length > 0 ? (
          <div className="mt-10 flex items-center gap-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <MiniMap
              dots={drop.picks
                .map((pick) => {
                  const destination = DESTINATIONS.find((d) => d.slug === pick.slug);
                  return destination
                    ? {
                        lat: destination.coordinates.lat,
                        lng: destination.coordinates.lng,
                        label: destination.city,
                        size: "peak" as const
                      }
                    : null;
                })
                .filter((d): d is NonNullable<typeof d> => Boolean(d))}
              size={120}
              connect
            />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                this month&apos;s constellation
              </p>
              <p className="mt-2 text-[15px] leading-6 text-[var(--foreground)]">
                {drop.picks.map((p) => p.city).join(" → ")}
              </p>
            </div>
          </div>
        ) : null}

        {drop.picks.length === 0 ? (
          <p className="mt-12 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            No matches this month. Update your preferences at <Link href="/onboarding" className="text-[var(--foreground)]">your settings</Link>.
          </p>
        ) : (
          <ol className="mt-12 divide-y divide-[var(--border)]">
            {drop.picks.map((pick, index) => (
              <li key={pick.slug} className="py-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {String(index + 1).padStart(2, "0")} · {pick.region} · score {pick.score}/100
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.01em] text-[var(--foreground)]">
                  <Link
                    href={`/destinations/${pick.slug}?month=${parsed.month}&utm_source=drop&utm_medium=permalink&utm_campaign=${dropPeriodSlug(parsed.month, parsed.year)}`}
                    className="transition hover:text-[var(--signal)]"
                  >
                    {pick.city}, {pick.country}
                  </Link>
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[var(--foreground)]/85">{pick.tagline}</p>
                {pick.whyNow[0] ? (
                  <p className="mt-3 max-w-2xl text-[14px] leading-7 text-[var(--muted)]">{pick.whyNow[0]}</p>
                ) : null}
                {pick.topEventTitle ? (
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    headline · {pick.topEventTitle}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}

        <p className="mt-16 border-t border-[var(--border)] pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
          curated · sent {new Date(drop.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase()}
        </p>
      </section>
    </main>
  );
}
