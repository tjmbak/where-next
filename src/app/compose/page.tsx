import type { Metadata } from "next";
import Link from "next/link";
import { ComposeChat } from "@/components/compose/ComposeChat";

export const metadata: Metadata = {
  title: "Composer · where next",
  description:
    "Tell Where Next what kind of trip you want — vibe, dates, budget — and the Composer drafts a real itinerary you can save in one tap.",
  robots: { index: true }
};

const SUGGESTIONS = [
  "i have 5 days in late august, love deep house, mid budget",
  "long weekend somewhere warm with proper techno",
  "10 days in europe in june, festival energy",
  "cheapest hard-techno scene in europe right now",
  "first solo trip — 4 days, hip-hop scene, beach"
];

export default function ComposePage() {
  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            map ↗
          </Link>
          <Link href="/methodology" className="hidden transition hover:text-[var(--foreground)] sm:inline">
            methodology
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[820px] px-6 pb-20 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--signal)]">
          composer · beta
        </p>
        <h1 className="mt-3 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[0.95] tracking-[-0.03em] text-[var(--foreground)]">
          Tell me what kind of trip.<br />
          <span className="text-[var(--muted)]">I&apos;ll draft the rest.</span>
        </h1>
        <p className="mt-6 max-w-xl text-[15px] leading-7 text-[var(--muted)]">
          Vibe, dates, budget — even just one of those is enough. The Composer pulls real events
          and venues from Where Next&apos;s catalog into a day-by-day plan you can save in one tap.
        </p>

        <div className="mt-10">
          <ComposeChat suggestions={SUGGESTIONS} />
        </div>
      </section>
    </main>
  );
}
