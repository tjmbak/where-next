import type { Metadata } from "next";
import Link from "next/link";
import { ACTIVITY_RUBRIC, getMonthLabel } from "@/data/taxonomy";
import { CURATION_SOURCES, DESTINATIONS, EVENTS, MONTHLY_DESTINATION_SCORES, VENUES, getScoresForDestination } from "@/data/music-travel";

export const metadata: Metadata = {
  title: "Curation Workflow",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminPage() {
  const referenceDate = new Date("2026-05-05").getTime();
  const staleSources = CURATION_SOURCES.filter((source) => {
    const daysSinceChecked = (referenceDate - new Date(source.lastChecked).getTime()) / 86_400_000;
    return daysSinceChecked > 30;
  });

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
          <Link href="/admin/research" className="transition hover:text-[var(--foreground)]">
            ai research →
          </Link>
          <Link href="/" className="transition hover:text-[var(--foreground)]">
            ← back to map
          </Link>
        </nav>
      </header>

      <section className="mt-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">internal · curation</p>
        <h1 className="mt-4 text-[clamp(2.5rem,5vw,4rem)] font-medium leading-[1] tracking-[-0.03em] text-[var(--foreground)]">
          Curation command center
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Keep curated launch data high quality: destinations, monthly scores, events, venues, and source freshness.
        </p>
      </section>

      <section className="mt-12 grid gap-px overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="destinations" value={DESTINATIONS.length} />
        <Metric label="monthly scores" value={MONTHLY_DESTINATION_SCORES.length} />
        <Metric label="events" value={EVENTS.length} />
        <Metric label="sources" value={CURATION_SOURCES.length} />
      </section>

      <section className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Launch destinations" index="01">
          <div className="overflow-hidden border-y border-[var(--border)]">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <Th>destination</Th>
                  <Th>peak months</Th>
                  <Th>scores</Th>
                  <Th>budget</Th>
                </tr>
              </thead>
              <tbody>
                {DESTINATIONS.map((destination) => (
                  <tr key={destination.slug} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-3 py-4">
                      <Link
                        href={`/destinations/${destination.slug}`}
                        className="font-medium text-[var(--foreground)] transition hover:text-[var(--signal)]"
                      >
                        {destination.city}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                        {destination.country}
                      </p>
                    </td>
                    <td className="px-3 py-4 text-[var(--foreground)]/90">
                      {destination.peakMonths.map((month) => getMonthLabel(month)).join(", ")}
                    </td>
                    <td className="px-3 py-4 font-mono text-[var(--foreground)]/90">
                      {getScoresForDestination(destination.slug).length}
                    </td>
                    <td className="px-3 py-4 font-mono uppercase tracking-[0.16em] text-[var(--muted)]">
                      {destination.budget}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <aside className="space-y-12">
          <Panel title="Maintenance queue" index="02">
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              <QueueItem label="sources older than 30 days" value={staleSources.length} />
              <QueueItem label="venues missing coordinates" value={VENUES.filter((venue) => !venue.coordinates).length} />
              <QueueItem label="events needing lineup confirmation" value={EVENTS.length} />
            </ul>
          </Panel>

          <Panel title="Scoring rubric" index="03">
            <ul className="space-y-3">
              {ACTIVITY_RUBRIC.map((item) => (
                <li key={item.id} className="border-l border-[var(--border)] pl-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                    <span className="font-mono text-[11px] text-[var(--muted)]">{item.weight}%</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{item.description}</p>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col justify-between bg-[var(--background)] p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
      <p className="mt-6 font-mono text-4xl font-medium text-[var(--foreground)]">
        {value.toString().padStart(2, "0")}
      </p>
    </div>
  );
}

function Panel({ title, index, children }: { title: string; index?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-baseline gap-3 border-b border-[var(--border)] pb-2">
        {index ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">{index}</span>
        ) : null}
        <h2 className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--foreground)]">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--muted)]">
      {children}
    </th>
  );
}

function QueueItem({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between py-3 text-sm">
      <span className="text-[var(--foreground)]/90">{label}</span>
      <span className="font-mono text-[var(--foreground)]">{value.toString().padStart(2, "0")}</span>
    </li>
  );
}
