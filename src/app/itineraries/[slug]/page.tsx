import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItineraryView } from "@/components/itineraries/ItineraryView";
import { ShareButtons } from "@/components/sharing/ShareButtons";
import { getDestinationBySlug } from "@/data/music-travel";
import type { Itinerary } from "@/lib/itineraries/generate";
import { ogImageUrl } from "@/lib/og";
import { breadcrumbJsonLd, jsonLdScript, siteUrl } from "@/lib/structured-data";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ slug: string }> };

type ItineraryRow = {
  id: string;
  slug: string;
  owner_id: string | null;
  destination_slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  vibe_tags: string[];
  budget_band: "low" | "medium" | "high" | "luxury";
  days: Itinerary["days"];
  visibility: "public" | "unlisted" | "private";
  created_at: string;
  generation_meta: { model?: string; generatedAt?: string } | null;
};

async function loadItinerary(slug: string): Promise<ItineraryRow | null> {
  const service = createSupabaseServiceClient();
  if (!service) return null;
  const { data } = await service
    .from("itineraries")
    .select(
      "id, slug, owner_id, destination_slug, title, start_date, end_date, duration_days, vibe_tags, budget_band, days, visibility, created_at, generation_meta"
    )
    .eq("slug", slug)
    .maybeSingle();
  return data ? (data as ItineraryRow) : null;
}

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const { slug } = await params;
  const itinerary = await loadItinerary(slug);
  if (!itinerary || itinerary.visibility === "private") return { robots: { index: false } };
  const destination = getDestinationBySlug(itinerary.destination_slug);
  const subtitle = `${itinerary.duration_days} days in ${destination?.city ?? itinerary.destination_slug}, anchored on real events.`;

  return {
    title: itinerary.title,
    description: subtitle,
    alternates: { canonical: `/itineraries/${itinerary.slug}` },
    robots: itinerary.visibility === "unlisted" ? { index: false } : undefined,
    openGraph: {
      title: itinerary.title,
      description: subtitle,
      type: "article",
      url: `${siteUrl()}/itineraries/${itinerary.slug}`,
      images: [
        {
          url: ogImageUrl({
            eyebrow: "where next · itinerary",
            title: itinerary.title,
            subtitle,
            stat: `${itinerary.duration_days} days`
          }),
          width: 1200,
          height: 630
        }
      ]
    }
  };
}

export default async function ItineraryPage({ params }: RouteContext) {
  const { slug } = await params;
  const itinerary = await loadItinerary(slug);
  if (!itinerary) notFound();

  if (itinerary.visibility === "private") {
    const auth = await createSupabaseServerAuthClient();
    const { data } = (await auth?.auth.getUser()) ?? { data: { user: null } };
    if (!data.user || data.user.id !== itinerary.owner_id) {
      notFound();
    }
  }

  const destination = getDestinationBySlug(itinerary.destination_slug);
  if (!destination) notFound();

  const auth = await createSupabaseServerAuthClient();
  const { data: viewer } = (await auth?.auth.getUser()) ?? { data: { user: null } };
  const isOwner = Boolean(viewer.user && viewer.user.id === itinerary.owner_id);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Where Next", href: "/" },
    { name: destination.city, href: `/destinations/${destination.slug}` },
    { name: itinerary.title, href: `/itineraries/${itinerary.slug}` }
  ]);

  const itineraryShape: Itinerary = {
    destinationSlug: itinerary.destination_slug,
    title: itinerary.title,
    startDate: itinerary.start_date,
    endDate: itinerary.end_date,
    durationDays: itinerary.duration_days as Itinerary["durationDays"],
    vibeTags: itinerary.vibe_tags,
    budgetBand: itinerary.budget_band,
    days: itinerary.days,
    generatedAt: itinerary.generation_meta?.generatedAt ?? itinerary.created_at,
    model: itinerary.generation_meta?.model ?? "saved"
  };

  const shareUrl = `${siteUrl()}/itineraries/${itinerary.slug}`;

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
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
        <nav className="flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
          <Link
            href={`/destinations/${destination.slug}`}
            className="transition hover:text-[var(--foreground)]"
          >
            {destination.city.toLowerCase()} guide
          </Link>
          <Link
            href={`/destinations/${destination.slug}/plan`}
            className="transition hover:text-[var(--foreground)]"
          >
            plan another
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full max-w-[820px] px-6 pb-24 pt-12 sm:px-10">
        <ItineraryView itinerary={itineraryShape} destination={destination} />

        <div className="mt-12 border-t border-[var(--border)] pt-6">
          <ShareButtons url={shareUrl} title={itinerary.title} />
        </div>

        {!isOwner ? (
          <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">your turn</p>
            <p className="mt-2 text-[15px] leading-7 text-[var(--foreground)]">
              Plan your own {destination.city} trip in 30 seconds.
            </p>
            <Link
              href={`/destinations/${destination.slug}/plan`}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-5 py-2 text-sm font-medium text-[var(--background)] transition hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            >
              build my own
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
