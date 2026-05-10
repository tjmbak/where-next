import type { Metadata } from "next";
import Link from "next/link";
import { DESTINATIONS } from "@/data/music-travel";
import {
  listApproved,
  listDraftSummaries
} from "@/lib/research/draft-store";
import { ResearchConsole } from "./ResearchConsole";

export const metadata: Metadata = {
  title: "AI Research Console",
  robots: { index: false, follow: false }
};

export const dynamic = "force-dynamic";

export default function AdminResearchPage() {
  const drafts = listDraftSummaries();
  const approved = listApproved().map((entry) => ({
    slug: entry.slug,
    month: entry.month,
    year: entry.year,
    approvedAt: entry.approvedAt,
    eventsCount: entry.data.events?.length ?? 0
  }));

  const destinations = DESTINATIONS.map((d) => ({
    slug: d.slug,
    city: d.city,
    country: d.country,
    activeMonths: d.activeMonths,
    peakMonths: d.peakMonths
  }));

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1180px] px-6 pb-20 pt-6 sm:px-10">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-5">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <nav className="flex items-center gap-5 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <Link href="/admin" className="transition hover:text-[var(--foreground)]">
            ← curation
          </Link>
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            map →
          </Link>
        </nav>
      </header>

      <section className="mt-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          internal · gpt-5.5 + web_search
        </p>
        <h1 className="mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1] tracking-[-0.03em] text-[var(--foreground)]">
          Research console
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Pick a destination + month, run gpt-5.5 with web_search to generate a verified event calendar,
          then review citations and approve. Approved drafts overlay onto the static event blueprints in real time.
        </p>
      </section>

      <ResearchConsole
        destinations={destinations}
        initialDrafts={drafts}
        initialApproved={approved}
      />
    </main>
  );
}
