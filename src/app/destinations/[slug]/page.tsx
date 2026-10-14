import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CityPageView } from "@/components/city/CityView";
import { PopularTrips } from "@/components/destinations/PopularTrips";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { loadPopularItinerariesForDestination } from "@/lib/itineraries/popular";
import {
  DESTINATIONS,
  getDestinationBySlug,
  getEventsForDestinationInMonth,
  getLastEditedForDestination,
  getVenuesForDestination
} from "@/data/music-travel";
import { EDITION_YEAR, getCurrentMonth, SUPPORTED_YEARS, upcomingYearForMonth } from "@/data/taxonomy";
import { ogImageUrl } from "@/lib/og";
import { breadcrumbJsonLd, destinationToJsonLd, eventToJsonLd, jsonLdScript, siteUrl } from "@/lib/structured-data";
import type { MonthNumber } from "@/types/content";

type DestinationPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
};

export function generateStaticParams() {
  return DESTINATIONS.map((destination) => ({ slug: destination.slug }));
}

// ISR: refresh popular trips + counts every 10 minutes
export const revalidate = 600;

export async function generateMetadata({ params }: DestinationPageProps): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);

  if (!destination) return {};

  const path = `/destinations/${destination.slug}`;
  const subtitle = destination.tagline.length > 120
    ? `${destination.tagline.slice(0, 117)}…`
    : destination.tagline;

  return {
    title: `${destination.city} Music Travel Guide`,
    description: `${destination.city}, ${destination.country}: ${destination.tagline}`,
    alternates: { canonical: path },
    openGraph: {
      title: `${destination.city} · Music Travel Guide`,
      description: destination.tagline,
      type: "article",
      url: `${siteUrl()}${path}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: `${destination.region} · ${destination.country}`,
            title: destination.city,
            subtitle,
            stat: `${destination.activeMonths.length} active months`
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

export default async function DestinationPage({ params, searchParams }: DestinationPageProps) {
  const { slug } = await params;
  const { month: monthParam, year: yearParam } = await searchParams;
  const destination = getDestinationBySlug(slug);

  if (!destination) notFound();

  const requested = parseMonthSelection(monthParam);
  const selectedMonth: MonthNumber =
    requested && requested !== "year"
      ? requested
      : hasUpcomingThisMonth(destination.slug)
        ? getCurrentMonth()
        : nextSeasonMonth(destination.peakMonths.length > 0 ? destination.peakMonths : destination.activeMonths);
  const selectedYear = parseYearSelection(yearParam, selectedMonth);
  const events = getEventsForDestinationInMonth(destination.slug, selectedMonth, selectedYear)
    .slice()
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const venues = getVenuesForDestination(destination.slug);
  const popularItineraries = await loadPopularItinerariesForDestination(destination.slug, 3);
  const lastEditedLabel = formatEditedDate(getLastEditedForDestination(destination.slug));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: destination.city, href: `/destinations/${destination.slug}` }
  ]);
  const destinationLd = destinationToJsonLd(destination);

  return (
    <main className="min-h-screen w-full">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: jsonLdScript(destinationLd) }}
      />
      {events.slice(0, 12).map((event) => {
        const venue = event.venueId ? venues.find((v) => v.id === event.venueId) : undefined;
        return (
          <script
            key={event.id}
            type="application/ld+json"
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: jsonLdScript(eventToJsonLd(event, destination, venue)) }}
          />
        );
      })}
      <SiteHeader />

      <div className="mx-auto w-full max-w-[1180px] px-5 pb-28 sm:px-10 sm:pb-24">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 text-[14px] text-[var(--muted)]">
          <nav aria-label="Breadcrumb">
            <Link href="/" className="font-medium transition hover:text-[var(--foreground)]">
              Explore
            </Link>
            <span aria-hidden> / </span>
            <span className="text-[var(--foreground)]">{destination.city}</span>
          </nav>
          <p>{lastEditedLabel ? `Updated ${lastEditedLabel}` : `${EDITION_YEAR} edition`}</p>
        </div>

        <CityPageView
          key={`${destination.slug}-${selectedMonth}-${selectedYear}`}
          slug={destination.slug}
          month={selectedMonth}
          year={selectedYear}
          extras={
            <>
              {popularItineraries.length > 0 ? (
                <div className="mt-12">
                  <PopularTrips
                    itineraries={popularItineraries}
                    destinationSlug={destination.slug}
                    destinationCity={destination.city}
                  />
                </div>
              ) : null}
              <section className="mt-12">
                <h3 className="text-[22px] font-semibold tracking-[-0.01em] text-[var(--foreground)] sm:text-[26px]">Good to know</h3>
                <p className="mt-3 text-[16px] leading-8 text-[var(--foreground)]/85">{destination.summary}</p>
                <p className="mt-3 text-[15px] leading-7 text-[var(--muted)]">{destination.travelNotes}</p>
                <Link
                  href="/methodology"
                  className="mt-4 inline-flex min-h-11 items-center text-[14px] font-semibold text-[var(--foreground)] underline underline-offset-4 transition hover:text-[var(--signal)]"
                >
                  How scores work →
                </Link>
              </section>
            </>
          }
        />
      </div>
    </main>
  );
}

function parseMonthSelection(value?: string): MonthNumber | "year" | undefined {
  if (value === "year") return "year";
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 12) return parsed as MonthNumber;
  return undefined;
}

function parseYearSelection(value: string | undefined, month: MonthNumber): number {
  const parsed = Number(value);
  if (Number.isInteger(parsed) && SUPPORTED_YEARS.includes(parsed)) return parsed;
  return upcomingYearForMonth(month);
}

function hasUpcomingThisMonth(slug: string): boolean {
  const month = getCurrentMonth();
  const today = new Date().toISOString().slice(0, 10);
  return getEventsForDestinationInMonth(slug, month, upcomingYearForMonth(month)).some(
    (event) => (event.endDate ?? event.startDate) >= today
  );
}

/** The season month that comes around soonest from today (this month counts). */
function nextSeasonMonth(months: MonthNumber[]): MonthNumber {
  if (months.length === 0) return getCurrentMonth();
  const current = getCurrentMonth();
  return [...months].sort((a, b) => ((a - current + 12) % 12) - ((b - current + 12) % 12))[0];
}

function formatEditedDate(raw: string | null): string | null {
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date
    .toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC"
    });
}
