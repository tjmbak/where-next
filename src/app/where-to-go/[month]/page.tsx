import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AxisDestinationList } from "@/components/discovery/AxisDestinationList";
import { GENRE_LABELS, MONTHS, REGIONS, getMonthLabel } from "@/data/taxonomy";
import { getFilteredDestinations } from "@/data/music-travel";
import { breadcrumbJsonLd, itemListJsonLd, jsonLdScript, siteUrl } from "@/lib/structured-data";
import { ogImageUrl } from "@/lib/og";
import type { Genre, MonthNumber, MonthlyDestinationScore, Region } from "@/types/content";

type PageProps = { params: Promise<{ month: string }> };

const GENRES = Object.keys(GENRE_LABELS) as Genre[];

function monthSlug(month: MonthNumber) {
  return getMonthLabel(month).toLowerCase();
}

function regionSlug(region: Region) {
  return region.toLowerCase().replace(/ /g, "-");
}

function parseMonthSlug(value: string): MonthNumber | null {
  const found = MONTHS.find((m) => m.label.toLowerCase() === value.toLowerCase());
  return found ? found.value : null;
}

export function generateStaticParams() {
  return MONTHS.map((month) => ({ month: monthSlug(month.value) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month: monthParam } = await params;
  const month = parseMonthSlug(monthParam);
  if (!month) return { robots: { index: false } };
  const monthLabel = getMonthLabel(month);
  const title = `Where to go in ${monthLabel.toLowerCase()} 2026`;
  const description = `Curated music-travel destinations for ${monthLabel} 2026 — festivals, club seasons, residencies, and venue scenes worth flying for.`;
  const path = `/where-to-go/${monthSlug(month)}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${siteUrl()}${path}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: "where to go",
            title: monthLabel,
            subtitle: "Curated music-travel destinations.",
            stat: "Where Next"
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

export default async function WhereToGoMonthPage({ params }: PageProps) {
  const { month: monthParam } = await params;
  const month = parseMonthSlug(monthParam);
  if (!month) notFound();

  const items = getFilteredDestinations({ month })
    .filter(
      (item): item is { destination: typeof item.destination; score: MonthlyDestinationScore } =>
        Boolean(item.score)
    );

  const monthLabel = getMonthLabel(month);
  const path = `/where-to-go/${monthSlug(month)}`;

  const itemList = itemListJsonLd({
    name: `Where to go in ${monthLabel}`,
    description: `${items.length} curated destinations.`,
    items: items.map(({ destination }) => ({
      name: destination.city,
      url: `${siteUrl()}/destinations/${destination.slug}?month=${month}`
    }))
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: `Where to go in ${monthLabel}`, href: path }
  ]);

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(itemList) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />

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

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          where to go · {monthLabel.toLowerCase()} 2026
        </p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          Where to go in {monthLabel.toLowerCase()}.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          {items.length} curated destinations for {monthLabel} 2026. Filter by scene or region below.
        </p>

        <div className="mt-12">
          <AxisDestinationList items={items} month={month} />
        </div>

        <nav className="mt-16 grid gap-8 border-t border-[var(--border)] pt-10 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              {monthLabel.toLowerCase()} by scene
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <li key={g}>
                  <Link
                    href={`/where-to-go/${monthSlug(month)}/genre/${g}`}
                    className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  >
                    {GENRE_LABELS[g]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              {monthLabel.toLowerCase()} by region
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <li key={r}>
                  <Link
                    href={`/where-to-go/${monthSlug(month)}/region/${regionSlug(r)}`}
                    className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  >
                    {r}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </section>
    </main>
  );
}
