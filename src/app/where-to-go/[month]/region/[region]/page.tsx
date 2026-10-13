import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AxisDestinationList } from "@/components/discovery/AxisDestinationList";
import { MONTHS, REGIONS, getMonthLabel, upcomingYearForMonth } from "@/data/taxonomy";
import { getFilteredDestinations } from "@/data/music-travel";
import {
  breadcrumbJsonLd,
  itemListJsonLd,
  jsonLdScript,
  siteUrl
} from "@/lib/structured-data";
import { ogImageUrl } from "@/lib/og";
import type { MonthNumber, MonthlyDestinationScore, Region } from "@/types/content";
import { SiteHeader } from "@/components/nav/SiteHeader";

type RouteParams = { month: string; region: string };
type PageProps = { params: Promise<RouteParams> };

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

function parseRegionSlug(value: string): Region | null {
  const found = REGIONS.find((r) => regionSlug(r) === value.toLowerCase());
  return found ?? null;
}

// Copy names the upcoming edition of each month, which rolls forward daily.
export const revalidate = 86400;

// Unknown params must 404 before streaming starts; the root loading boundary would otherwise commit a 200.
export const dynamicParams = false;

export function generateStaticParams() {
  return MONTHS.flatMap((month) =>
    REGIONS.map((region) => ({ month: monthSlug(month.value), region: regionSlug(region) }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { month: monthParam, region: regionParam } = await params;
  const month = parseMonthSlug(monthParam);
  const region = parseRegionSlug(regionParam);
  if (!month || !region) return { robots: { index: false } };
  const monthLabel = getMonthLabel(month);
  const title = `Where to go in ${region} in ${monthLabel.toLowerCase()}`;
  const description = `Curated music-travel destinations across ${region} for ${monthLabel} ${upcomingYearForMonth(month)} — festivals, club seasons, and cultural music moments worth flying for.`;
  const path = `/where-to-go/${monthSlug(month)}/region/${regionSlug(region)}`;

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
            eyebrow: `where to go · ${monthLabel.toLowerCase()}`,
            title: `${region} · ${monthLabel}`,
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

export default async function WhereToGoRegionPage({ params }: PageProps) {
  const { month: monthParam, region: regionParam } = await params;
  const month = parseMonthSlug(monthParam);
  const region = parseRegionSlug(regionParam);
  if (!month || !region) notFound();

  const items = getFilteredDestinations({ month, region })
    .filter(
      (item): item is { destination: typeof item.destination; score: MonthlyDestinationScore } =>
        Boolean(item.score)
    );

  const monthLabel = getMonthLabel(month);
  const path = `/where-to-go/${monthSlug(month)}/region/${regionSlug(region)}`;

  const itemList = itemListJsonLd({
    name: `Where to go in ${region} in ${monthLabel}`,
    description: `${items.length} curated destinations.`,
    items: items.map(({ destination }) => ({
      name: destination.city,
      url: `${siteUrl()}/destinations/${destination.slug}?month=${month}`
    }))
  });

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: `Where to go in ${monthLabel}`, href: `/where-to-go/${monthSlug(month)}` },
    { name: region, href: path }
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

      <SiteHeader />

      <section className="mx-auto w-full max-w-[1100px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          where to go · {monthLabel.toLowerCase()} {upcomingYearForMonth(month)}
        </p>
        <h1 className="mt-5 max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          {region} in {monthLabel.toLowerCase()}.
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          {items.length} {items.length === 1 ? "destination" : "destinations"}, ranked by signature events, seasonality, venue density, and travel intent.
        </p>

        <div className="mt-12">
          <AxisDestinationList items={items} month={month} />
        </div>

        <nav className="mt-16 grid gap-8 border-t border-[var(--border)] pt-10 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              other regions in {monthLabel.toLowerCase()}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {REGIONS.filter((r) => r !== region).map((r) => (
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
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              {region.toLowerCase()} in other months
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {MONTHS.filter((m) => m.value !== month).map((m) => (
                <li key={m.value}>
                  <Link
                    href={`/where-to-go/${monthSlug(m.value)}/region/${regionSlug(region)}`}
                    className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  >
                    {m.shortLabel}
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
