import type { Metadata } from "next";
import Link from "next/link";
import { ConciergeForm } from "@/components/concierge/ConciergeForm";
import { getCurrentUser } from "@/lib/supabase/server-auth";
import { siteUrl } from "@/lib/structured-data";
import { ogImageUrl } from "@/lib/og";

export const metadata: Metadata = {
  title: "Concierge · plan a single trip end-to-end",
  description: "A music-travel concierge plans your trip end-to-end — flights, hotels, tickets, scenes — for a flat fee.",
  alternates: { canonical: "/concierge" },
  openGraph: {
    title: "Where Next Concierge",
    description: "A flat-fee music-travel concierge. One brief, one trip, full plan.",
    type: "article",
    url: `${siteUrl()}/concierge`,
    images: [
      {
        url: ogImageUrl({
          eyebrow: "where next",
          title: "Concierge",
          subtitle: "We plan one music trip end-to-end. Flat fee.",
          stat: "$199"
        }),
        width: 1200,
        height: 630
      }
    ]
  }
};

export default async function ConciergePage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            ← back to map
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[760px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">concierge · $199</p>
        <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          One brief. One trip. Fully planned.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          We pick the city, the weekend, the venues, the stay, and the transfers — tailored to your scenes, group, and budget.
          Delivered as a single dossier within 72 hours.
        </p>

        <ul className="mt-10 grid gap-3 text-[14px] leading-6 text-[var(--foreground)] sm:grid-cols-2">
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            One destination + dates picked from your scenes
          </li>
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            Hand-built nightly plan with venue picks
          </li>
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            Stay + transfers shortlisted to your budget
          </li>
          <li className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            Two revisions within 14 days
          </li>
        </ul>

        <div className="mt-12">
          {user ? (
            <ConciergeForm />
          ) : (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="text-[14px] leading-6 text-[var(--muted)]">
                Sign in to start your concierge brief — we use your saved trips and preferences as the starting point.
              </p>
              <Link
                href="/auth/login?next=/concierge"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-6 py-3 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
              >
                sign in to continue
                <span aria-hidden>→</span>
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
