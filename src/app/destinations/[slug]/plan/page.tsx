import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItineraryPlanner } from "@/components/itineraries/ItineraryPlanner";
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

export default async function PlanPage({ params }: RouteContext) {
  const { slug } = await params;
  const destination = getDestinationBySlug(slug);
  if (!destination) notFound();

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <header className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
            W
          </span>
          <span>where next</span>
        </Link>
        <Link
          href={`/destinations/${destination.slug}`}
          className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)] transition hover:text-[var(--foreground)]"
        >
          ← back to {destination.city.toLowerCase()}
        </Link>
      </header>

      <section className="mx-auto w-full max-w-[820px] px-6 pb-24 pt-12 sm:px-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          plan a trip · {destination.city.toLowerCase()}
        </p>
        <h1 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.0] tracking-[-0.03em] text-[var(--foreground)]">
          A trip to {destination.city.toLowerCase()},
          <br />
          <span className="text-[var(--muted)]">stitched from your scenes.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-[var(--muted)]">
          Pick days and a vibe. We anchor each day on a real event or venue from the curated calendar — no LLM-invented restaurants, no scraped tour guides, no filler.
        </p>

        <div className="mt-12">
          <ItineraryPlanner destination={destination} />
        </div>
      </section>
    </main>
  );
}
