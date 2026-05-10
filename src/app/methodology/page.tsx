import type { Metadata } from "next";
import Link from "next/link";
import { ACTIVITY_RUBRIC } from "@/data/taxonomy";

export const metadata: Metadata = {
  title: "Methodology · where next",
  description:
    "How where next scores destinations and events for music-led travel. The rubric, the sources, and how to read the numbers."
};

export default function MethodologyPage() {
  return (
    <main className="min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]">
      <header className="absolute left-0 right-0 top-0 z-30 mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <span className="hidden text-[var(--foreground)] sm:inline">methodology</span>
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            ← back to map
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[860px] px-6 pb-32 pt-32 sm:px-10 sm:pt-40">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          where next / methodology
        </p>
        <h1 className="mt-4 text-[clamp(2.5rem,6vw,4.25rem)] font-medium leading-[1.02] tracking-[-0.03em]">
          How we score
        </h1>
        <p className="mt-6 max-w-2xl text-[17px] leading-8 text-[var(--foreground)]/85">
          Every destination on where next gets a 0–100 activity score for each
          month of the year. The score answers a single question:{" "}
          <span className="text-[var(--foreground)]">
            how worth it is this place, this month, for music-led travel?
          </span>
        </p>

        <div className="mt-14 border-t border-[var(--border)]" />

        <section className="mt-14">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">01 / rubric</p>
          <h2 className="mt-3 text-[28px] font-medium leading-tight">
            Five inputs, weighted
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-8 text-[var(--foreground)]/80">
            We combine five inputs per (city, month) pair. Weights are fixed
            across every destination so a 92 in Lisbon means the same thing
            as a 92 in Tokyo.
          </p>

          <ul className="mt-10 space-y-7">
            {ACTIVITY_RUBRIC.map((item, idx) => (
              <li key={item.id} className="flex items-start gap-6 border-l border-[var(--border)] pl-6">
                <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {(idx + 1).toString().padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-[19px] font-medium text-[var(--foreground)]">
                      {item.label}
                    </h3>
                    <span className="font-mono text-[12px] text-[var(--signal)]">
                      {item.weight}%
                    </span>
                  </div>
                  <p className="mt-2 max-w-xl text-[15px] leading-7 text-[var(--muted)]">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">02 / tiers</p>
          <h2 className="mt-3 text-[28px] font-medium leading-tight">
            What the numbers mean
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            <Tier range="90+" label="peak" copy="Plan a trip around it. Once-a-year cultural moments, headline festivals, residencies you'd specifically book flights for." />
            <Tier range="80–89" label="in season" copy="Strong all-rounder. Great calendar, dense lineup, no wasted nights." />
            <Tier range="70–79" label="shoulder" copy="Selectively worth it. A few standout dates around quieter weekday programming." />
            <Tier range="<70" label="off-season" copy="Either dormant or pre-/post-peak. We surface it so you know it's not where to go this month." />
          </ul>
        </section>

        <section className="mt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">03 / sources</p>
          <h2 className="mt-3 text-[28px] font-medium leading-tight">
            Where the data comes from
          </h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-8 text-[var(--foreground)]/80">
            Events, dates, and venue claims are researched against live
            festival lineups, official venue calendars, ticketing platforms,
            and music journalism. Every event card on a city guide links out
            to its primary source — click <span className="font-mono text-[12px] uppercase tracking-[0.18em] text-[var(--signal)]">official source ↗</span> to verify
            dates yourself before booking.
          </p>
          <p className="mt-5 max-w-2xl text-[16px] leading-8 text-[var(--foreground)]/80">
            Every (city, month) entry is human-reviewed before it ships, and
            we update the corpus on a rolling cadence as new tour dates and
            club seasons get announced.
          </p>
        </section>

        <section className="mt-20">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">04 / caveats</p>
          <h2 className="mt-3 text-[28px] font-medium leading-tight">
            What we don&apos;t do
          </h2>
          <ul className="mt-8 space-y-4 text-[15px] leading-8 text-[var(--foreground)]/85">
            <li className="border-l border-[var(--border)] pl-5">
              We don&apos;t sell tickets. Where next links you to the
              promoter or venue&apos;s own page so you transact directly.
            </li>
            <li className="border-l border-[var(--border)] pl-5">
              We don&apos;t take affiliate kickbacks for hotels or
              experiences ranked on city guides.
            </li>
            <li className="border-l border-[var(--border)] pl-5">
              We don&apos;t publish unreviewed scores: a human signs off every
              (city, month) before the score and event list go live.
            </li>
            <li className="border-l border-[var(--border)] pl-5">
              Always double-check show dates on the official source. Tour
              schedules shift; we update on a rolling cadence but the
              promoter&apos;s page is canonical.
            </li>
          </ul>
        </section>

        <section className="mt-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-7 py-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            see it in practice
          </p>
          <h2 className="mt-3 text-[24px] font-medium leading-tight">
            Read a city guide
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-7 text-[var(--muted)]">
            Each guide opens with the activity score for the selected month,
            an event timeline, and the venues that anchor the scene.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--foreground)]/30 bg-[var(--foreground)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--background)] transition hover:opacity-90"
          >
            browse the map
            <span aria-hidden>→</span>
          </Link>
        </section>
      </section>
    </main>
  );
}

function Tier({ range, label, copy }: { range: string; label: string; copy: string }) {
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-5">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[12px] uppercase tracking-[0.22em] text-[var(--signal)]">
          {range}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          {label}
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-7 text-[var(--foreground)]/80">{copy}</p>
    </li>
  );
}
