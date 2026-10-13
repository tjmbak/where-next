import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { redirect } from "next/navigation";
import { PushToggle } from "@/components/push/PushToggle";
import { ForkEmailToggle } from "@/components/settings/ForkEmailToggle";
import { WatchList } from "@/components/watch/WatchList";
import { GENRE_LABELS, MONTHS } from "@/data/taxonomy";
import { normalizePreferencesRow } from "@/lib/preferences";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const metadata: Metadata = {
  title: "Your settings",
  robots: { index: false }
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) redirect("/auth/login?next=/settings");
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/settings");

  const { data: row } = await supabase
    .from("user_preferences")
    .select("home_city, genres, regions, budget, travel_windows, push_enabled, drop_enabled, fork_email_enabled, handle")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  const prefs = normalizePreferencesRow(row);
  const handle = (row as { handle?: string | null })?.handle ?? null;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader
        action={
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
            >
              sign out
            </button>
          </form>
        }
      />

      <section className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-8 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          settings · {userData.user.email}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)]">
          Tune your account.
        </h1>

        <section className="mt-12 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
            push notifications
          </p>
          <h2 className="mt-2 text-xl font-medium text-[var(--foreground)]">Alerts for the cities you saved.</h2>
          <p className="mt-3 max-w-xl text-[14px] leading-7 text-[var(--muted)]">
            One-tap alerts when tickets drop in your saved cities, when an event is 14 days out, or when 5+ new shows
            land for somewhere you saved. Nothing else.
          </p>
          <div className="mt-5">
            <PushToggle initialEnabled={prefs.pushEnabled} />
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">watching</p>
          <h2 className="mt-2 text-xl font-medium text-[var(--foreground)]">City-months on your radar.</h2>
          <p className="mt-3 max-w-xl text-[14px] leading-7 text-[var(--muted)]">
            One email when new events are confirmed for a window you watch — nothing on quiet weeks.
          </p>
          <WatchList />
        </section>

        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">monthly drop</p>
          <h2 className="mt-2 text-xl font-medium text-[var(--foreground)]">Five cities, first of every month.</h2>
          <p className="mt-3 max-w-xl text-[14px] leading-7 text-[var(--muted)]">
            Drops are tuned to your scenes ({prefs.genres.map((g) => GENRE_LABELS[g] ?? g).join(", ") || "—"}),
            regions ({prefs.regions.join(", ") || "—"}), and budget ({prefs.budget ?? "—"}).
            {handle ? <> Permalinked at <code>/drops/[period]/{handle}</code> for sharing.</> : null}
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--border-strong)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--foreground)] transition hover:border-[var(--foreground)]"
          >
            edit preferences
            <span aria-hidden>→</span>
          </Link>
        </section>

        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                creator emails
              </p>
              <h2 className="mt-2 text-xl font-medium text-[var(--foreground)]">
                Know when your trips get forked.
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-7 text-[var(--muted)]">
                One email when another traveler copies one of your public itineraries — throttled to at most
                one per trip per 24 hours. Off and you&apos;ll never hear from us about forks.
              </p>
            </div>
            <ForkEmailToggle initialEnabled={prefs.forkEmailEnabled} />
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">profile</p>
          <h2 className="mt-2 text-xl font-medium text-[var(--foreground)]">{userData.user.email}</h2>
          <p className="mt-3 max-w-xl text-[14px] leading-7 text-[var(--muted)]">
            Travel windows: {prefs.travelWindows.length > 0 ? prefs.travelWindows.map((m) => MONTHS[m - 1]?.shortLabel ?? m).join(", ") : "—"}
            {prefs.homeCity ? <> · Home: {prefs.homeCity}</> : null}
          </p>
        </section>
      </section>
    </main>
  );
}
