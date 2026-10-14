import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/nav/SiteHeader";
import { notFound } from "next/navigation";
import { ItineraryPlanner } from "@/components/itineraries/ItineraryPlanner";
import { TrackedOutboundLink } from "@/components/analytics/TrackedOutboundLink";
import { bookingUrl, gygUrl, skyscannerUrl } from "@/components/destinations/StayAndTravel";
import { getDestinationBySlug } from "@/data/music-travel";
import { ogImageUrl } from "@/lib/og";
import { siteUrl } from "@/lib/structured-data";

type RouteContext = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination) return { robots: { index: false } };
  const path = `/destinations/${destination.slug}/plan`;
  const title = `Plan a music trip to ${destination.city}`;
  const subtitle = `Pick days and a vibe — we generate a curated day-by-day plan from real ${destination.city} events and venues.`;
  return {
    title,
    description: subtitle,
    alternates: { canonical: path },
    openGraph: {
      title,
      description: subtitle,
      type: "article",
      url: `${siteUrl()}${path}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: `${destination.city} · plan a trip`,
            title: `${destination.city}`,
            subtitle: "Curated day-by-day music itineraries.",
            stat: "Where Next"
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

export default async function PlanPage({
  params,
  searchParams
}: RouteContext & { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const query = await searchParams;
  const start = typeof query.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.start) ? query.start : undefined;
  const days = typeof query.days === "string" ? Number(query.days) : undefined;
  const fromBestWeek = query.from === "best-week";
  const destination = getDestinationBySlug(slug);
  if (!destination) notFound();
  const nights = days && Number.isFinite(days) && days > 0 ? Math.min(14, Math.round(days)) : null;
  const end = start && nights ? new Date(Date.parse(`${start}T00:00:00Z`) + nights * 86_400_000).toISOString().slice(0, 10) : undefined;
  const range = start && end ? { startDate: start, endDate: end } : null;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader />

      <section className="mx-auto w-full max-w-[820px] px-6 pb-24 pt-8 sm:px-10">
        <Link
          href={`/destinations/${destination.slug}`}
          className="text-[14px] font-medium text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← {destination.city} guide
        </Link>
        <h1 className="mt-4 text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--foreground)]">
          Plan your {destination.city} trip
        </h1>
        <p className="mt-4 max-w-2xl text-[16px] leading-7 text-[var(--muted)]">
          Pick your days and a vibe. Each day is built around a real event or venue from our calendar.
        </p>

        {range ? (
          <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[var(--border)] px-4 py-3">
            <span className="text-[14px] font-semibold text-[var(--foreground)]">
              Book {shortRange(range.startDate, range.endDate)}
            </span>
            <span className="flex flex-wrap gap-2">
              <PartnerLink href={bookingUrl(destination, range)} provider="booking" slug={destination.slug} label="Stays" />
              <PartnerLink href={skyscannerUrl(destination, range)} provider="skyscanner" slug={destination.slug} label="Flights" />
              <PartnerLink href={gygUrl(destination, range)} provider="gyg" slug={destination.slug} label="Things to do" />
            </span>
            {fromBestWeek ? (
              <span className="basis-full text-[13px] text-[var(--muted)]">
                These are {destination.city}&apos;s busiest music days that month, from the quick look.
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-8">
          <ItineraryPlanner destination={destination} initialStartDate={start} initialDays={days} />
        </div>
      </section>
    </main>
  );
}

function PartnerLink({
  href,
  provider,
  slug,
  label
}: {
  href: string;
  provider: "booking" | "skyscanner" | "gyg";
  slug: string;
  label: string;
}) {
  return (
    <TrackedOutboundLink
      href={href}
      provider={provider}
      destinationSlug={slug}
      eventLabel={`plan-${provider}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-[14px] font-medium text-[var(--foreground)] ring-1 ring-inset ring-[var(--border-strong)] transition hover:ring-[var(--foreground)]"
    >
      {label}
      <span aria-hidden className="opacity-60">
        ↗
      </span>
    </TrackedOutboundLink>
  );
}

function shortRange(from: string, to: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.toLocaleDateString("en-US", opts)}–${b.getUTCDate()}`;
  return `${a.toLocaleDateString("en-US", opts)} – ${b.toLocaleDateString("en-US", opts)}`;
}
