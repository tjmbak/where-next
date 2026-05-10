import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { EMPTY_PREFERENCES, normalizePreferencesRow } from "@/lib/preferences";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const metadata: Metadata = {
  title: "Set up your account",
  description: "Tell Where Next which scenes, regions, months, and budget to tune your monthly drop around.",
  robots: { index: false }
};

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) redirect("/auth/login?next=/onboarding");

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/login?next=/onboarding");

  const { data: row } = await supabase
    .from("user_preferences")
    .select("home_city, genres, regions, budget, travel_windows, push_enabled, drop_enabled")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const initial = row ? normalizePreferencesRow(row) : EMPTY_PREFERENCES;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight text-[var(--foreground)]">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
          >
            sign out
          </button>
        </form>
      </header>

      <section className="mx-auto w-full max-w-[720px] px-6 py-12 sm:px-10">
        <OnboardingFlow initial={initial} email={userData.user.email ?? null} />
      </section>
    </main>
  );
}
